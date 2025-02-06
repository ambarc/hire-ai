'use client';

import { useEffect, useState, useRef } from 'react';

interface BrowserAgentViewerProps {
  sessionId: string;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export default function BrowserAgentViewer({ sessionId, onError, onComplete }: BrowserAgentViewerProps) {
  const [status, setStatus] = useState<string>('initializing');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Poll session status
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/browser-agent?sessionId=${sessionId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch session status');
        }
        
        setStatus(data.status);
      } catch (error) {
        onError?.(error as Error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionId, onError]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
      <div className="absolute top-2 right-2 z-10">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'running' ? 'bg-blue-100 text-blue-700' :
          status === 'completed' ? 'bg-green-100 text-green-700' :
          status === 'error' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {status}
        </span>
      </div>
      
      <div className="aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full"
          autoPlay
          onEnded={() => onComplete?.()}
          onError={(e) => onError?.(new Error('Video playback failed'))}
        >
          <source src={`/api/browser-agent/stream?sessionId=${sessionId}`} type="video/mp4" />
        </video>
      </div>
    </div>
  );
} 