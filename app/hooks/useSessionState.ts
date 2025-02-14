import { useState, useEffect } from 'react';
import { BrowserSessionState } from '@/types/workflow';

export function useSessionState(sessionId: string | null) {
  const [sessionState, setSessionState] = useState<BrowserSessionState | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let eventSource: EventSource;

    async function initializeState() {
      try {
        // Get initial state
        const response = await fetch(`/api/browser-state/${sessionId}`);
        if (!response.ok) throw new Error('Failed to fetch initial state');
        const initialState = await response.json();
        setSessionState(initialState);

        // Set up SSE connection for updates
        eventSource = new EventSource(`/api/browser-state/${sessionId}/stream`);
        
        eventSource.onmessage = (event) => {
          const newState = JSON.parse(event.data);
          setSessionState(newState);
        };

        eventSource.onerror = (error) => {
          console.error('SSE Error:', error);
          eventSource.close();
        };
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    }

    initializeState();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [sessionId]);

  return { sessionState, error };
} 