'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Workflow, Task, TaskStatus, TaskType, TaskOutput } from '../../../types/workflow';
import { Medication } from '../../../types/clinical';
import * as mockData from '../../../mock-data/test-scrape.json'

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
            addLog(`Failed to update task: ${error}`);
            throw error;
        }
    };

    const executeTask = async (task: Task) => {
        console.log('==============================');
        console.log('TASK EXECUTION STARTED:', task.id);
        console.log('Task details:', JSON.stringify(task, null, 2));
        console.log('Current task status:', task.status);
        console.log('Task type:', task.type);
        console.log('Task input:', JSON.stringify(task.input, null, 2));
        
        try {
            console.log('Preparing to execute task type:', task.type);
            
            // Update task status to in progress
            console.log('Updating task status to IN_PROGRESS');
            await updateTask(task.id, { status: TaskStatus.IN_PROGRESS });
            console.log('Task status updated successfully');
            
            switch (task.type) {
                case TaskType.READ_OBESITY_INTAKE_FORM: {
                    console.log('Starting READ_OBESITY_INTAKE_FORM execution');
                    
                    // Define browser prompt - use the one from the curl example
                    const browserPrompt = "go to localhost:8000/ingest and scroll well through the page. Return the text from the page.";
                    console.log('Browser prompt:', browserPrompt);
                    
                    // Send command to browser service
                    console.log('Sending request to browser agent API');
                    const commandResponse = await fetch('/api/browser-agent/session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            command: {
                                prompt: browserPrompt
                            }
                        }),
                    });
                    
                    if (!commandResponse.ok) {
                        throw new Error(`Failed to send browser command: ${commandResponse.statusText}`);
                    }
                    
                    const commandData = await commandResponse.json();
                    console.log('Command response:', commandData);
                    
                    const sessionId = commandData.session_id;
                    const commandId = commandData.command_id;
                    
                    if (!sessionId || !commandId) {
                        throw new Error('Invalid response from browser service: missing session_id or command_id');
                    }
                    
                    console.log(`Browser session created with ID: ${sessionId}, command ID: ${commandId}`);
                    
                    // Poll for command completion
                    console.log('Starting to poll for command completion');
                    const maxAttempts = 30; // Prevent infinite polling
                    let attempts = 0;
                    let commandResult = null;
                    
                    while (attempts < maxAttempts) {
                        console.log(`Polling attempt ${attempts + 1}/${maxAttempts}`);
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
                        
                        const stateResponse = await fetch(`/api/browser-agent/${sessionId}/state`);
                        
                        if (!stateResponse.ok) {
                            throw new Error(`Failed to get session state: ${stateResponse.statusText}`);
                        }
                        
                        const stateData = await stateResponse.json();
                        console.log('Current session state:', stateData);
                        
                        // Check if the command has completed
                        const commandHistory = stateData.command_history || [];
                        const completedCommand = commandHistory.find((cmd: { command_id: string, result: { status: string } }) => 
                            cmd.command_id === commandId && 
                            cmd.result && 
                            cmd.result.status === 'success'
                        );
                        
                        if (completedCommand) {
                            console.log('Command completed successfully');
                            commandResult = completedCommand.result;
                            break;
                        }
                        
                        // Check if the command failed
                        const failedCommand = commandHistory.find((cmd: { command_id: string, result: { status: string } }) => 
                            cmd.command_id === commandId && 
                            cmd.result && 
                            cmd.result.status === 'error'
                        );
                        
                        if (failedCommand) {
                            throw new Error(`Browser command failed: ${failedCommand.result.message || 'Unknown error'}`);
                        }
                        
                        // If the session is in error state, throw an error
                        if (stateData.status === 'error') {
                            throw new Error(`Browser session in error state: ${stateData.error || 'Unknown error'}`);
                        }
                        
                        attempts++;
                    }
                    
                    if (!commandResult) {
                        throw new Error('Browser command timed out after multiple attempts');
                    }
                    
                    console.log('Command result:', commandResult);
                    
                    // Extract the text from the command result
                    const extractedText = commandResult.summary || '';
                    
                    // Create task output with the extracted text
                    const taskOutput: TaskOutput = {
                        type: TaskType.READ_OBESITY_INTAKE_FORM,
                        success: true,
                        data: {
                            rawText: extractedText
                        }
                    };
                    
                    console.log('Task output:', taskOutput);
                    
                    // Update task with the output
                    await updateTask(task.id, {
                        status: TaskStatus.COMPLETED,
                        output: taskOutput
                    });
                    
                    console.log('READ_OBESITY_INTAKE_FORM task completed successfully');
                    break;
                }

                case TaskType.WRITE_MEDICATIONS: {
                    console.log('Starting WRITE_MEDICATIONS execution');
                    console.log('Medication data to write:', JSON.stringify(task.input, null, 2));
                    console.log('Connecting to medication system...');
                    
                    try {
                        // Use mock data for extraction
                        console.log('Using mock data for medication extraction');
                        const rawText = mockData.rawText || '';
                        
                        // Make generic extract API call to extract medications
                        console.log('Making extract API call to extract medications');
                        const extractResponse: Response = await fetch('/api/extract', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              text: rawText,
                              extractionType: 'medications',
                              schema: {
                                type: 'object',
                                properties: {
                                  type: 'array',
                                  properties: {
                                    name: { type: 'string' },
                                    dosage: { type: 'string' },
                                    frequency: { type: 'string' },
                                    // route: { type: 'string' }
                                  },
                                  required: ['name']
                                }
                              }
                            })
                        });
                        
                        if (!extractResponse.ok) {
                            throw new Error(`Extract API error: ${extractResponse.statusText}`);
                        }
                        
                        const medications: { medications: Medication[] } = await extractResponse.json();
                        console.log('Extracted medications:', JSON.stringify(medications, null, 2));
                        
                        // Simulate writing to medication system
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        console.log('Medications written successfully');
                        
                        // Prepare write operation result
                        console.log('Write result:', JSON.stringify( medications.medications, null, 2));
                        
                        // Update task with the extracted medications
                        await updateTask(task.id, {
                            status: TaskStatus.COMPLETED,
                            output: {
                                type: TaskType.WRITE_MEDICATIONS,
                                success: true,
                                data: {
                                    medications: medications.medications ? medications.medications : [],
                                }
                            },
                        });
                    } catch (error) {
                        console.error('Error extracting medications:', error);
                        throw error;
                    }
                    break;
                }
                    
                default:
                    console.error(`Unknown task type encountered: ${task.type}`);
                    console.error('Task will not be executed');
                    throw new Error(`Unknown task type: ${task.type}`);
            }
            
            // console.log('Task execution successful');
            // console.log('Updating task status to COMPLETED');
            // await updateTask(task.id, { 
            //     status: TaskStatus.COMPLETED,
            //     output: { timestamp: new Date().toISOString() }
            // });
            // console.log('Task status updated to COMPLETED');
            
        } catch (error) {
            console.error('ERROR DURING TASK EXECUTION:', error);
            console.error('Error type:', typeof error);
            console.error('Error message:', error instanceof Error ? error.message : String(error));
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
            
            console.log('Updating task status to FAILED');
            await updateTask(task.id, {
                status: TaskStatus.FAILED,
                error: error instanceof Error ? error.message : String(error)
            });
            console.error('Task status updated to FAILED');
        } finally {
            console.log('Task execution process finished for:', task.id);
            console.log('==============================');
        }
    };

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
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-medium">{task.type}</h3>
                                                <button
                                                    onClick={() => executeTask(task)}
                                                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                                    disabled={task.status === TaskStatus.COMPLETED || task.status === TaskStatus.IN_PROGRESS}
                                                >
                                                    Start Task
                                                </button>
                                            </div>
                                            <div className="text-sm text-gray-500 space-y-1">
                                                <div>Status: {task.status || 'Pending'}</div>
                                                <div>ID: {task.id}</div>
                                                {task.description && (
                                                    <div>Description: {task.description}</div>
                                                )}
                                                <div>Created: {new Date(task.createdAt).toLocaleString()}</div>
                                                {task.updatedAt && (
                                                    <div>Last Updated: {new Date(task.updatedAt).toLocaleString()}</div>
                                                )}
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
                                    {task.input && (
                                        <div className="mt-2 text-sm">
                                            <div className="font-medium">Input:</div>
                                            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                                                {JSON.stringify(task.input, null, 2)}
                                            </pre>
                                        </div>
                                    )}
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