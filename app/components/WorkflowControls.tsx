import { useState } from 'react';

interface WorkflowControlsProps {
  workflowId: string;
  onStart?: (sessionId: string) => void;
}

export function WorkflowControls({ workflowId, onStart }: WorkflowControlsProps) {
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const response = await fetch(`/api/workflow/${workflowId}/start`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to start workflow');
      }

      const result = await response.json();
      if (onStart) {
        onStart(result.sessionId);
      }
    } catch (error) {
      console.error('Error starting workflow:', error);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="space-x-4">
      <button
        onClick={handleStart}
        disabled={isStarting}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isStarting ? 'Starting...' : 'Start Workflow'}
      </button>
    </div>
  );
} 