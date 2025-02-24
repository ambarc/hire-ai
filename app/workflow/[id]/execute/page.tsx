'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Workflow } from '../../../types/workflow';
import { Worker, WorkerContext } from '../../../types/worker';

// ... worker definition stays the same ...

export default function ExecuteWorkflowPage() {
    const params = useParams();
    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<'loading' | 'executing' | 'completed' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function initializeAndExecute() {
            try {
                // Start execution
                const response = await fetch(`/api/workflow/${params.id}/execute`, {
                    method: 'POST'
                });
                
                if (!response.ok) {
                    throw new Error('Failed to execute workflow');
                }

                setStatus('completed');
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to execute workflow');
                setStatus('error');
            }
        }

        initializeAndExecute();
    }, [params.id]);

    // Periodically fetch workflow to show latest status
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/api/workflow/${params.id}`);
                if (!response.ok) throw new Error('Failed to fetch workflow');
                const workflowData = await response.json();
                setWorkflow(workflowData);
            } catch (err) {
                console.error('Failed to fetch workflow status:', err);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [params.id]);

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Execute Workflow</h1>
            
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Status</h2>
                <div className={`rounded-lg p-4 ${
                    status === 'executing' ? 'bg-yellow-50 border-yellow-200' :
                    status === 'completed' ? 'bg-green-50 border-green-200' :
                    status === 'error' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                } border`}>
                    <p className="font-medium">
                        {status === 'loading' && 'Starting workflow execution...'}
                        {status === 'executing' && 'Executing workflow...'}
                        {status === 'completed' && 'Workflow execution started'}
                        {status === 'error' && `Error: ${error}`}
                    </p>
                </div>
            </div>

            {workflow && (
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Tasks</h2>
                    <div className="space-y-4">
                        {workflow.tasks.map(task => (
                            <div key={task.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-medium">{task.type}</h3>
                                    <span className={`px-2 py-1 rounded-full text-sm ${
                                        task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                        task.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                        task.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {task.status}
                                    </span>
                                </div>
                                {task.error && (
                                    <p className="mt-2 text-red-600 text-sm">{task.error}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
} 