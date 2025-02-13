import { WorkflowStateViewer } from '@/components/WorkflowStateViewer';
import { WorkflowControls } from '@/components/WorkflowControls';
import { useState } from 'react';

export default function WorkflowPage({ params }: { params: { id: string } }) {
  const [sessionId, setSessionId] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Workflow Execution</h1>
      <WorkflowControls 
        workflowId={params.id} 
        onStart={(newSessionId) => setSessionId(newSessionId)}
      />
      {sessionId && <WorkflowStateViewer sessionId={sessionId} />}
    </div>
  );
} 