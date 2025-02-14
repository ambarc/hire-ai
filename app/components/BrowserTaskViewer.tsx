import { useSessionState } from '@/hooks/useSessionState';

export function BrowserTaskViewer({ sessionId }: { sessionId: string }) {
  const { sessionState, error } = useSessionState(sessionId);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!sessionState) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div>Status: {sessionState.status}</div>
      <div>Current URL: {sessionState.current_url}</div>
      {sessionState.current_task && (
        <div>
          Current Task: {sessionState.current_task.action}
        </div>
      )}
      <div>
        Task History:
        <ul>
          {sessionState.task_history.map((entry, index) => (
            <li key={index}>
              {entry.task.action} - {entry.timestamp}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 