'use client';

import { useEffect, useState, useRef } from 'react';

interface BrowserAgentViewerProps {
  sessionId: string;
  prompt?: string;
  onError?: (error: Error) => void;
  onComplete?: (result?: any) => void;
}

interface SessionStatus {
  status: string;
  prompt?: string;
  url?: string;
  result?: any;
  error?: string;
  created_at: string;
  completed_at?: string;
}

export default function BrowserAgentViewer({ 
  sessionId, 
  prompt,
  onError, 
  onComplete 
}: BrowserAgentViewerProps) {
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Poll for status updates
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/browser-agent/${sessionId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch session status');
        }
        
        setStatus(data);

        if (data.status === 'completed' && data.result) {
          onComplete?.(data.result);
        } else if (data.status === 'error' && data.error) {
          onError?.(new Error(data.error));
        }
      } catch (error) {
        onError?.(error as Error);
      }
    };

    const interval = setInterval(pollStatus, 1000);
    return () => clearInterval(interval);
  }, [sessionId, onError, onComplete]);

  useEffect(() => {
    // Set up WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/browser-agent/ws/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
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
        console.log('WebSocket message:', message);
        
        if (message.data) {
          setStatus(prevStatus => ({
            ...prevStatus,
            ...message.data
          }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [sessionId, onError]);

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status?.status === 'executing_prompt' ? 'bg-blue-100 text-blue-700' :
          status?.status === 'completed' ? 'bg-green-100 text-green-700' :
          status?.status === 'error' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {status?.status || 'initializing'}
        </span>
        {status?.created_at && (
          <span className="text-xs text-gray-500">
            Started: {new Date(status.created_at).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Prompt Display */}
      {status?.prompt && (
        <div className="p-4 bg-yellow-50 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-1">Task:</h4>
          <p className="text-sm text-yellow-700">{status.prompt}</p>
        </div>
      )}

      {/* Current URL */}
      {status?.url && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-800 mb-1">Current URL:</h4>
          <p className="text-sm text-gray-600">{status.url}</p>
        </div>
      )}
      
      {/* Result Display */}
      {status?.result && (
        <div className="p-4 bg-green-50 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 mb-1">Result:</h4>
          <pre className="text-sm text-green-700 whitespace-pre-wrap">
            {typeof status.result === 'string' ? status.result : JSON.stringify(status.result, null, 2)}
          </pre>
          {status.completed_at && (
            <p className="text-xs text-green-600 mt-2">
              Completed: {new Date(status.completed_at).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      {/* Error Display */}
      {status?.error && (
        <div className="p-4 bg-red-50 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 mb-1">Error:</h4>
          <p className="text-sm text-red-700">{status.error}</p>
        </div>
      )}

      {/* Connection Status */}
      <div className="flex items-center gap-2 text-xs">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-gray-600">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  );
} 