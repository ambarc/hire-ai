import { useSessionState } from '@/hooks/useSessionState';

interface WorkflowStateViewerProps {
  sessionId: string;
}

export function WorkflowStateViewer({ sessionId }: WorkflowStateViewerProps) {
  const { sessionState, error } = useSessionState(sessionId);

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        Error loading workflow state: {error.message}
      </div>
    );
  }

  if (!sessionState) {
    return (
      <div className="p-4 bg-gray-50 animate-pulse">
        Loading workflow state...
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Workflow State</h2>
        <span className={`px-2 py-1 rounded-full text-sm ${
          sessionState.status === 'executing' ? 'bg-blue-100 text-blue-800' :
          sessionState.status === 'task_completed' ? 'bg-green-100 text-green-800' :
          sessionState.status === 'error' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {sessionState.status}
        </span>
      </div>

      <div className="space-y-2">
        <div>
          <span className="font-medium">Current URL:</span> {sessionState.current_url}
        </div>

        {sessionState.current_task && (
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium">Current Task:</div>
            <div className="mt-1">
              <div>Action: {sessionState.current_task.action}</div>
              {sessionState.current_task.prompt && (
                <div className="text-sm text-gray-600">
                  Prompt: {sessionState.current_task.prompt}
                </div>
              )}
            </div>
          </div>
        )}

        {sessionState.last_error && (
          <div className="bg-red-50 text-red-700 p-3 rounded">
            <div className="font-medium">Last Error:</div>
            <div className="mt-1">{sessionState.last_error}</div>
          </div>
        )}

        {sessionState.task_history && sessionState.task_history.length > 0 && (
          <div className="mt-4">
            <div className="font-medium mb-2">Task History:</div>
            <div className="space-y-2">
              {sessionState.task_history.map((entry, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{entry.task.action}</span>
                    <span className="text-gray-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {entry.result.data && (
                    <pre className="mt-1 text-xs bg-white p-2 rounded overflow-x-auto">
                      {JSON.stringify(entry.result.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 