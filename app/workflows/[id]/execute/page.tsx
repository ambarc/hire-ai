'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Workflow, Task, TaskStatus, TaskType } from '../../../types/workflow';
import { Worker, WorkerContext } from '../../../types/worker';

// Create a mock worker (in real app, this would be managed by a worker service)
const worker: Worker = {
    id: 'worker-1',
    status: 'idle',
    async execute(context: WorkerContext) {
        const { workflowId, log, updateTask, getWorkflow } = context;
        const workflow = await getWorkflow();
        
        // Execute tasks in sequence
        for (const task of workflow.tasks) {
            log(`Starting execution of task: ${task.id} (${task.type})`);

            try {
                // Update task status to running
                // await updateTask(task.id, { status: TaskStatus.IN_PROGRESS });

                switch (task.type) {
                    case TaskType.READ_OBESITY_INTAKE:
                        log('Reading obesity intake form...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        await updateTask(task.id, {
                            status: TaskStatus.COMPLETED,
                            output: {
                                patientData: {
                                    height: 170,
                                    weight: 70,
                                    bmi: 24.2
                                }
                            }
                        });
                        break;

                    case TaskType.VALIDATE_DATA:
                        log('Validating data...');
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        await updateTask(task.id, {
                            status: TaskStatus.COMPLETED,
                            output: {
                                isValid: true,
                                validatedData: task.input
                            }
                        });
                        break;

                    case TaskType.WRITE_MEDICATIONS:
                        log('Writing medications to system...');
                        await new Promise(resolve => setTimeout(resolve, 2500));
                        await updateTask(task.id, {
                            status: TaskStatus.COMPLETED,
                            output: {
                                success: true,
                                recordId: 'MED-123'
                            }
                        });
                        break;

                    default:
                        throw new Error(`Unknown task type: ${task.type}`);
                }

                log(`Task ${task.id} completed successfully`);
            } catch (error) {
                log(`Error in task ${task.id}: ${error.message}`);
                await updateTask(task.id, {
                    status: TaskStatus.FAILED,
                    error: error.message
                });
                throw error;
            }
        }
    }
};

export default function ExecuteWorkflowPage() {
    const params = useParams();
    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<'loading' | 'idle' | 'executing' | 'completed' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
    };

    const getWorkflow = async () => {
        const response = await fetch(`/api/workflow/${params.id}`);
        if (!response.ok) throw new Error('Failed to fetch workflow');
        const workflow = await response.json();
        setWorkflow(workflow);
        return workflow;
    };

    const updateTask = async (taskId: string, updates: Partial<Task>) => {
        try {
            const response = await fetch(`/api/workflow/${params.id}/task/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error('Failed to update task');
            
            const updatedWorkflow = await response.json();
            setWorkflow(updatedWorkflow);
        } catch (error) {
            addLog(`Failed to update task: ${error.message}`);
            throw error;
        }
    };

    const executeWorkflow = useCallback(async () => {
        if (!workflow) return;

        try {
            setStatus('executing');
            worker.status = 'busy';
            worker.currentWorkflow = params.id;

            await worker.execute({
                workflowId: params.id,
                log: addLog,
                updateTask,
                getWorkflow
            });

            setStatus('completed');
            worker.status = 'idle';
            worker.currentWorkflow = undefined;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to execute workflow');
            setStatus('error');
            worker.status = 'idle';
            worker.currentWorkflow = undefined;
        }
    }, [workflow, params.id]);

    useEffect(() => {
        getWorkflow()
            .then(() => {
                setStatus('idle');
            })
            .catch(err => {
                setError(err instanceof Error ? err.message : 'Failed to load workflow');
                setStatus('error');
            });
    }, []);

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            {status === 'loading' && <div>Loading workflow...</div>}
            
            {workflow && status !== 'loading' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold">{workflow.name}</h1>
                        {status === 'idle' && (
                            <button 
                                onClick={executeWorkflow}
                                disabled={!workflow}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                            >
                                Execute Workflow
                            </button>
                        )}
                    </div>

                    <div className="border rounded-lg p-4 bg-white shadow">
                        <h2 className="text-xl font-semibold mb-4">Tasks</h2>
                        <div className="space-y-4">
                            {workflow.tasks.map((task, index) => (
                                <div 
                                    key={task.id}
                                    className="border rounded p-4 bg-gray-50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200">
                                            {index + 1}
                                        </div>
                                        <div className="flex-grow">
                                            <h3 className="font-medium">{task.type}</h3>
                                            <div className="text-sm text-gray-500">
                                                Status: {task.status || 'Pending'}
                                            </div>
                                        </div>
                                        {task.status === TaskStatus.COMPLETED && (
                                            <div className="text-green-500">✓</div>
                                        )}
                                        {task.status === TaskStatus.FAILED && (
                                            <div className="text-red-500">✗</div>
                                        )}
                                        {task.status === TaskStatus.IN_PROGRESS && (
                                            <div className="text-blue-500">⟳</div>
                                        )}
                                    </div>
                                    {task.output && (
                                        <div className="mt-2 text-sm">
                                            <div className="font-medium">Output:</div>
                                            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                                                {JSON.stringify(task.output, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                    {task.error && (
                                        <div className="mt-2 text-sm text-red-600">
                                            Error: {task.error}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-white shadow">
                        <h2 className="text-xl font-semibold mb-4">Execution Logs</h2>
                        <pre className="bg-gray-50 p-4 rounded-lg text-sm h-60 overflow-y-auto">
                            {logs.map((log, i) => (
                                <div key={i} className="font-mono">{log}</div>
                            ))}
                        </pre>
                    </div>
                </div>
            )}

            {status === 'executing' && (
                <div className="text-center text-blue-600">Executing workflow...</div>
            )}
            {status === 'completed' && (
                <div className="text-center text-green-600">Workflow completed!</div>
            )}
            {status === 'error' && (
                <div className="text-center text-red-600">Error: {error}</div>
            )}
        </div>
    );
} 