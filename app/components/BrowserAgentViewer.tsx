'use client';

import { useEffect, useState, useRef } from 'react';

interface BrowserAgentViewerProps {
  sessionId: string;
  prompt?: string;
  onError?: (error: Error) => void;
  onComplete?: (result?: any) => void;
}

export default function BrowserAgentViewer({ 
  sessionId, 
  prompt,
  onError, 
  onComplete 
}: BrowserAgentViewerProps) {
  const [status, setStatus] = useState<string>('initializing');
  const [sessionType, setSessionType] = useState<'video' | 'browser-use'>('video');
  const [userInput, setUserInput] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Set up WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/browser-agent/ws/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);
      setIsConnected(false);
      // Try to reconnect after 3 seconds
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          const newWs = new WebSocket(`${protocol}//${window.location.host}/api/browser-agent/ws/${sessionId}`);
          wsRef.current = newWs;
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.(new Error('WebSocket connection failed'));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message:', message); // Debug log
        switch (message.type) {
          case 'page_load':
          case 'navigation':
            setScreenshot(message.data.screenshot);
            if (message.data.url) setCurrentUrl(message.data.url);
            break;
          case 'dom_content_loaded':
            setScreenshot(message.data.screenshot);
            break;
          case 'command_executed':
            setScreenshot(message.data.screenshot);
            if (message.data.result?.type === 'complete') {
              onComplete?.(message.data.result);
            }
            break;
          case 'status':
            setStatus(message.data.status);
            break;
          case 'error':
            onError?.(new Error(message.data.error));
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    // Keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [sessionId, onError, onComplete]);

  // Poll session status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/browser-agent?sessionId=${sessionId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch session status');
        }
        
        setStatus(data.status);
        setSessionType(data.type);

        if (data.status === 'completed' && data.result) {
          onComplete?.(data.result);
        }
      } catch (error) {
        onError?.(error as Error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionId, onError, onComplete]);

  const handleSubmitInput = async () => {
    try {
      const response = await fetch(`/api/browser-agent/execute?sessionId=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: userInput }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute command');
      }

      setUserInput('');
    } catch (error) {
      onError?.(error as Error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'running' ? 'bg-blue-100 text-blue-700' :
          status === 'completed' ? 'bg-green-100 text-green-700' :
          status === 'error' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {status}
        </span>
        <span className="text-xs text-gray-500">
          {sessionType === 'browser-use' ? 'Browser Session' : 'Video Stream'}
        </span>
      </div>

      {/* Prompt Display */}
      {prompt && (
        <div className="p-4 bg-yellow-50 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-1">Instructions:</h4>
          <p className="text-sm text-yellow-700">{prompt}</p>
        </div>
      )}
      
      {/* Browser View */}
      <div className="relative rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
        <div className="aspect-video">
          {screenshot ? (
            <img
              src={`data:image/png;base64,${screenshot}`}
              alt="Browser View"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              Waiting for browser content...
            </div>
          )}
        </div>
        {currentUrl && (
          <div className="absolute top-0 left-0 right-0 px-4 py-2 bg-black bg-opacity-50 text-white text-sm">
            {currentUrl}
          </div>
        )}
      </div>

      {/* Input Area for Browser-Use Mode */}
      {sessionType === 'browser-use' && status === 'running' && (
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter command or instruction..."
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmitInput()}
          />
          <button
            onClick={handleSubmitInput}
            disabled={!isConnected}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isConnected
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
} 