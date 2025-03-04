'use client';

import { useState } from 'react';
import { Workflow, Task, TaskType, TaskInput, TaskStatus } from '../types/workflow';
import { useRouter } from 'next/navigation';

interface WorkflowFormProps {
    initialWorkflow?: Workflow;
}

export default function WorkflowForm({ initialWorkflow }: WorkflowFormProps) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [workflow, setWorkflow] = useState<Partial<Workflow>>(() => ({
        ...(initialWorkflow || {
            id: crypto.randomUUID(),
            name: '',
            description: '',
            tasks: [],
            metadata: {},
            status: TaskStatus.NOT_STARTED,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        })
    }));

    const [newTask, setNewTask] = useState<Partial<Task>>({
        type: TaskType.READ_OBESITY_INTAKE_FORM,
        description: '',
        input: {
            type: TaskType.READ_OBESITY_INTAKE_FORM,
            data: {
                url: '',
            }
        }
    });

    const [showTaskForm, setShowTaskForm] = useState(false);

    const getDefaultInputForTaskType = (type: TaskType): TaskInput => {
        switch (type) {
            case TaskType.READ_OBESITY_INTAKE_FORM:
                return {
                    type: TaskType.READ_OBESITY_INTAKE_FORM,
                    data: { url: '' }
                };
            case TaskType.VALIDATE_DATA:
                return {
                    type: TaskType.VALIDATE_DATA,
                    data: { validationFn: () => true }
                };
            case TaskType.WRITE_MEDICATIONS:
                return {
                    type: TaskType.WRITE_MEDICATIONS,
                    data: {
                        source: {
                            type: 'APPLICATION_MEMORY',
                            applicationMemoryKey: '',
                            path: '',
                            medications: []
                        },
                        destination: {
                            type: 'ATHENA'
                        }
                    }
                };
            case TaskType.WRITE_ALLERGIES:
                return {
                    type: TaskType.WRITE_ALLERGIES,
                    data: {
                        source: {
                            type: 'APPLICATION_MEMORY', 
                            applicationMemoryKey: '',
                            allergies: []
                        },
                        destination: {
                            type: 'ATHENA'
                        }
                    }
                };
            case TaskType.WRITE_INSURANCE:
                return {
                    type: TaskType.WRITE_INSURANCE,
                    data: {
                        source: {
                            type: 'APPLICATION_MEMORY', 
                            applicationMemoryKey: '',
                        },
                        destination: {
                            type: 'ATHENA'
                        },
                    }
                };
            case TaskType.WRITE_TO_ATHENA:
                return {
                    type: TaskType.WRITE_TO_ATHENA,
                    data: {
                        field: '',
                        prompt: '',
                    }
                };
            case TaskType.EXTRACT_PATIENT_PROFILE:
                return {
                    type: TaskType.EXTRACT_PATIENT_PROFILE,
                    data: {
                        source: {
                            type: 'APPLICATION_MEMORY',
                            applicationMemoryKey: ''
                        }
                    }
                };
            default:
                return {
                    type: TaskType.READ_OBESITY_INTAKE_FORM,
                    data: { url: '' }
                };
        }
    };

    const addTask = () => {
        if (!newTask.type || !newTask.input || !newTask.description) {
            setError('Please fill in all required fields');
            return;
        }

        if(!newTask.description.trim()) {
            setError('A description is required for all tasks');
            return;
        }

        if(newTask.type === TaskType.WRITE_TO_ATHENA && 
           newTask.input?.type === TaskType.WRITE_TO_ATHENA && 
           !newTask.input.data.prompt.trim()) {
            setError('A prompt is required for write to athena browser tasks');
            return;
        }

        if(newTask.type === TaskType.WRITE_TO_ATHENA && 
           newTask.input?.type === TaskType.WRITE_TO_ATHENA && 
           !newTask.input.data.field.trim()) {
            setError('A field is required for write to athena browser tasks');
            return; 
        }

        const task: Task = {
            id: crypto.randomUUID(),
            type: newTask.type,
            description: newTask.description,
            status: TaskStatus.NOT_STARTED,
            input: newTask.input,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        setWorkflow(prev => {
            const updatedTasks = [...(prev.tasks || []), task];
            return {
                ...prev,
                tasks: updatedTasks,
                status: TaskStatus.NOT_STARTED,
                updatedAt: new Date().toISOString()
            };
        });

        setError(null);
        // Reset new task form
        setNewTask({
            type: TaskType.READ_OBESITY_INTAKE_FORM,
            description: '',
            input: getDefaultInputForTaskType(TaskType.READ_OBESITY_INTAKE_FORM)
        });
        
        setShowTaskForm(false);
    };

    const removeTask = (taskId: string) => {
        setWorkflow(prev => ({
            ...prev,
            tasks: prev.tasks?.filter(t => t.id !== taskId) || []
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const method = initialWorkflow ? 'PUT' : 'POST';
            const url = initialWorkflow 
                ? `/api/workflow/${initialWorkflow.id}`
                : '/api/workflow';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(workflow)
            });

            if (!response.ok) {
                throw new Error('Failed to save workflow');
            }

            router.push('/workflows');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save workflow');
        } finally {
            setLoading(false);
        }
    };

    // Add this new type-safe component for task input forms
    const TaskInputForm = ({ 
        taskType, 
        input, 
        onChange 
    }: { 
        taskType: TaskType;
        input: TaskInput;
        onChange: (input: TaskInput) => void;
    }) => {
        switch (taskType) {
            case TaskType.READ_OBESITY_INTAKE_FORM:
                return (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm text-gray-700">URL</label>
                            <input
                                type="url"
                                value={input.type === TaskType.READ_OBESITY_INTAKE_FORM ? input.data.url : ''}
                                onChange={e => onChange({
                                    type: TaskType.READ_OBESITY_INTAKE_FORM,
                                    data: {
                                        url: e.target.value
                                    }
                                })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                            />
                        </div>
                    </div>
                );
            
            case TaskType.VALIDATE_DATA:
                return (
                    <div>
                        <label className="block text-sm text-gray-700">Validation Function</label>
                        <div className="mt-1 p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                                Validation function will be provided during task execution.
                            </p>
                        </div>
                    </div>
                );
            
            case TaskType.EXTRACT_PATIENT_PROFILE:
                const extractProfileInput = input.type === TaskType.EXTRACT_PATIENT_PROFILE ? input.data : null;
                if (!extractProfileInput) return null;

                return (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm text-gray-700">Source Type</label>
                            <select
                                value={extractProfileInput.source.type}
                                onChange={e => onChange({
                                    type: TaskType.EXTRACT_PATIENT_PROFILE,
                                    data: {
                                        source: {
                                            ...extractProfileInput.source,
                                            type: e.target.value as 'APPLICATION_MEMORY' | 'BROWSER'
                                        }
                                    }
                                })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                            >
                                <option value="APPLICATION_MEMORY">Application Memory</option>
                                <option value="BROWSER">Browser</option>
                            </select>
                        </div>

                        {extractProfileInput.source.type === 'APPLICATION_MEMORY' && (
                            <div>
                                <label className="block text-sm text-gray-700">Application Memory Key</label>
                                <input
                                    type="text"
                                    value={extractProfileInput.source.applicationMemoryKey || ''}
                                    onChange={e => onChange({
                                        type: TaskType.EXTRACT_PATIENT_PROFILE,
                                        data: {
                                            source: {
                                                ...extractProfileInput.source,
                                                applicationMemoryKey: e.target.value
                                            }
                                        }
                                    })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                    placeholder="Enter memory key..."
                                />
                            </div>
                        )}

                        {extractProfileInput.source.type === 'BROWSER' && (
                            <div>
                                <label className="block text-sm text-gray-700">Browser Location</label>
                                <input
                                    type="text"
                                    value={extractProfileInput.source.browserLocation || ''}
                                    onChange={e => onChange({
                                        type: TaskType.EXTRACT_PATIENT_PROFILE,
                                        data: {
                                            source: {
                                                ...extractProfileInput.source,
                                                browserLocation: e.target.value
                                            }
                                        }
                                    })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                    placeholder="Enter browser location..."
                                />
                            </div>
                        )}
                    </div>
                );
            
            case TaskType.WRITE_MEDICATIONS:
                const writeMedicationsInput = input.type === TaskType.WRITE_MEDICATIONS ? input.data : null;
                if (!writeMedicationsInput) return null;

                return (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm text-gray-700">Source Type</label>
                            <select
                                value={writeMedicationsInput.source.type}
                                onChange={e => onChange({
                                    type: TaskType.WRITE_MEDICATIONS,
                                    data: {
                                        source: {
                                            ...writeMedicationsInput.source,
                                            type: e.target.value as 'APPLICATION_MEMORY' | 'BROWSER'
                                        },
                                        destination: {
                                            type: 'ATHENA'
                                        }
                                    }
                                })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                            >
                                <option value="APPLICATION_MEMORY">Application Memory</option>
                                <option value="BROWSER">Browser</option>
                            </select>
                        </div>

                        {writeMedicationsInput.source.type === 'APPLICATION_MEMORY' && (
                            <div>
                                <label className="block text-sm text-gray-700">Application Memory Key</label>
                                <input
                                    type="text"
                                    value={writeMedicationsInput.source.applicationMemoryKey || ''}
                                    onChange={e => onChange({
                                        type: TaskType.WRITE_MEDICATIONS,
                                        data: {
                                            source: {
                                                ...writeMedicationsInput.source,
                                                applicationMemoryKey: e.target.value
                                            },
                                            destination: {
                                                type: 'ATHENA'
                                            }
                                        }
                                    })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                    placeholder="Enter memory key..."
                                />
                            </div>
                        )}

                        {writeMedicationsInput.source.type === 'BROWSER' && (
                            <div>
                                <label className="block text-sm text-gray-700">Browser Location</label>
                                <input
                                    type="text"
                                    value={writeMedicationsInput.source.browserLocation || ''}
                                    onChange={e => onChange({
                                        type: TaskType.WRITE_MEDICATIONS,
                                        data: {
                                            source: {
                                                ...writeMedicationsInput.source,
                                                browserLocation: e.target.value
                                            },
                                            destination: {
                                                type: 'ATHENA'
                                            }
                                        }
                                    })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                    placeholder="Enter browser location..."
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm text-gray-700">Destination Type</label>
                            <input
                                type="text"
                                value="ATHENA"
                                disabled
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                            />
                        </div>
                    </div>
                );
            
            case TaskType.WRITE_ALLERGIES:
                const extractAllergiesInput = input.type === TaskType.WRITE_ALLERGIES ? input.data : null;
                if (!extractAllergiesInput) return null;

                return (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm text-gray-700">Source Type</label>
                            <select
                                value={extractAllergiesInput.source.type}
                                onChange={e => onChange({
                                    type: TaskType.WRITE_ALLERGIES,
                                    data: {
                                        source: {
                                            ...extractAllergiesInput.source,
                                            type: e.target.value as 'APPLICATION_MEMORY' | 'BROWSER'
                                        },
                                        destination: {
                                            type: 'ATHENA'
                                        }
                                    }
                                })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                            >
                                <option value="APPLICATION_MEMORY">Application Memory</option>
                                <option value="BROWSER">Browser</option>
                            </select>
                        </div>

                        {extractAllergiesInput.source.type === 'APPLICATION_MEMORY' && (
                            <div>
                                <label className="block text-sm text-gray-700">Application Memory Key</label>
                                <input
                                    type="text"
                                    value={extractAllergiesInput.source.applicationMemoryKey || ''}
                                    onChange={e => onChange({
                                        type: TaskType.WRITE_ALLERGIES,
                                        data: {
                                            source: {
                                                ...extractAllergiesInput.source,
                                                applicationMemoryKey: e.target.value
                                            },
                                            destination: {
                                                type: 'ATHENA'
                                            }
                                        }
                                    })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                    placeholder="Enter memory key..."
                                />
                            </div>
                        )}

                        {extractAllergiesInput.source.type === 'BROWSER' && (
                            <div>
                                <label className="block text-sm text-gray-700">Browser Location</label>
                                <input
                                    type="text"
                                    value={extractAllergiesInput.source.browserLocation || ''}
                                    onChange={e => onChange({
                                        type: TaskType.WRITE_ALLERGIES,
                                        data: {
                                            source: {
                                                ...extractAllergiesInput.source,
                                                browserLocation: e.target.value
                                            },
                                            destination: {
                                                type: 'ATHENA'
                                            }
                                        }
                                    })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                    placeholder="Enter browser location..."
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm text-gray-700">Destination Type</label>
                            <input
                                type="text"
                                value="ATHENA"
                                disabled
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                            />
                        </div>
                    </div>
                );
            
            case TaskType.WRITE_INSURANCE:
                const writeInsuranceInput = input.type === TaskType.WRITE_INSURANCE ? input.data : null;
                if (!writeInsuranceInput) return null;
    
                    return (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-gray-700">Source Type</label>
                                <select
                                    value={writeInsuranceInput.source.type}
                                    onChange={e => onChange({
                                        type: TaskType.WRITE_INSURANCE,
                                        data: {
                                            source: {
                                                ...writeInsuranceInput.source,
                                                type: e.target.value as 'APPLICATION_MEMORY' | 'BROWSER'
                                            },
                                            destination: {
                                                type: 'ATHENA'
                                            }
                                        }
                                    })}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                >
                                    <option value="APPLICATION_MEMORY">Application Memory</option>
                                    <option value="BROWSER">Browser</option>
                                </select>
                            </div>
    
                            {writeInsuranceInput.source.type === 'APPLICATION_MEMORY' && (
                                <div>
                                    <label className="block text-sm text-gray-700">Application Memory Key</label>
                                    <input
                                        type="text"
                                        value={writeInsuranceInput.source.applicationMemoryKey || ''}
                                        onChange={e => onChange({
                                            type: TaskType.WRITE_INSURANCE,
                                            data: {
                                                source: {
                                                    ...writeInsuranceInput.source,
                                                    applicationMemoryKey: e.target.value
                                                },
                                                destination: {
                                                    type: 'ATHENA'
                                                }
                                            }
                                        })}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                        placeholder="Enter memory key..."
                                    />
                                </div>
                            )}
    
                            {writeInsuranceInput.source.type === 'BROWSER' && (
                                <div>
                                    <label className="block text-sm text-gray-700">Browser Location</label>
                                    <input
                                        type="text"
                                        value={writeInsuranceInput.source.browserLocation || ''}
                                        onChange={e => onChange({
                                            type: TaskType.WRITE_INSURANCE,
                                            data: {
                                                source: {
                                                    ...writeInsuranceInput.source,
                                                    browserLocation: e.target.value
                                                },
                                                destination: {
                                                    type: 'ATHENA'
                                                }
                                            }
                                        })}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                        placeholder="Enter browser location..."
                                    />
                                </div>
                            )}
    
                            <div>
                                <label className="block text-sm text-gray-700">Destination Type</label>
                                <input
                                    type="text"
                                    value="ATHENA"
                                    disabled
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                                />
                            </div>
                        </div>
                ); 
            
            case TaskType.WRITE_TO_ATHENA:
                const writeToAthenaBrowserInput = input.type === TaskType.WRITE_TO_ATHENA ? input.data : null;
                if (!writeToAthenaBrowserInput) return null;

                return (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm text-gray-700">Field</label>
                            <input
                                type="text"
                                value={writeToAthenaBrowserInput.field}
                                onChange={e => onChange({
                                    type: TaskType.WRITE_TO_ATHENA,
                                    data: {
                                        field: e.target.value,
                                        prompt: writeToAthenaBrowserInput.prompt
                                    }
                                })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700">Prompt</label>
                            <textarea
                                value={writeToAthenaBrowserInput.prompt}
                                onChange={e => onChange({
                                    type: TaskType.WRITE_TO_ATHENA,
                                    data: {
                                        field: writeToAthenaBrowserInput.field,
                                        prompt: e.target.value
                                    }
                                })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                rows={3}
                                placeholder="Enter the prompt for generating content..."
                            />
                        </div>
                    </div>
                );
            
            default:
                return <div>Unsupported task type</div>;
        }
    };

    // Add this component to display task details
    const TaskDisplay = ({ task }: { task: Task }) => {
        switch (task.type) {
            case TaskType.READ_OBESITY_INTAKE_FORM:
                return (
                    <p className="text-sm text-gray-600">
                        URL: {task.input.type === TaskType.READ_OBESITY_INTAKE_FORM && task.input.data.url}
                    </p>
                );
            
            case TaskType.VALIDATE_DATA:
                return (
                    <p className="text-sm text-gray-600">
                        Validation task
                    </p>
                );
            
            case TaskType.WRITE_MEDICATIONS:
                const writeMedTask = task.input.type === TaskType.WRITE_MEDICATIONS ? task.input.data : null;
                if (!writeMedTask) return null;
                
                return (
                    <div className="text-sm text-gray-600">
                        <p>Source Type: {writeMedTask.source.type}</p>
                        {writeMedTask.source.type === 'APPLICATION_MEMORY' ? (
                            <p>Memory Key: {writeMedTask.source.applicationMemoryKey}</p>
                        ) : (
                            <p>Browser Location: {writeMedTask.source.browserLocation}</p>
                        )}
                        <p>Destination: {writeMedTask.destination.type}</p>
                    </div>
                );
            
            case TaskType.WRITE_ALLERGIES:
                const extractAllergiesTask = task.input.type === TaskType.WRITE_ALLERGIES ? task.input.data : null;
                if (!extractAllergiesTask) return null;

                return (
                    <div className="text-sm text-gray-600">
                        <p>Source Type: {extractAllergiesTask.source.type}</p>
                        {extractAllergiesTask.source.type === 'APPLICATION_MEMORY' ? (
                            <p>Memory Key: {extractAllergiesTask.source.applicationMemoryKey}</p>
                        ) : (
                            <p>Browser Location: {extractAllergiesTask.source.browserLocation}</p>
                        )}
                        <p>Destination: {extractAllergiesTask.destination.type}</p>
                    </div>
                );

            case TaskType.WRITE_INSURANCE:
                const writeInsuranceTask = task.input.type === TaskType.WRITE_INSURANCE ? task.input.data : null;
                if (!writeInsuranceTask) return null;

                return (
                    <div className="text-sm text-gray-600">
                        <p>Source Type: {writeInsuranceTask.source.type}</p>
                        {writeInsuranceTask.source.type === 'APPLICATION_MEMORY' ? (
                            <p>Memory Key: {writeInsuranceTask.source.applicationMemoryKey}</p>
                        ) : (
                            <p>Browser Location: {writeInsuranceTask.source.browserLocation}</p>
                        )}
                    </div>
                );
            
            case TaskType.WRITE_TO_ATHENA:
                const writeToAthenaBrowserTask = task.input.type === TaskType.WRITE_TO_ATHENA ? task.input.data : null;
                if (!writeToAthenaBrowserTask) return null;

                return (
                    <div className="text-sm text-gray-600">
                        <p>Field: {writeToAthenaBrowserTask.field}</p>
                        <p>Prompt: {writeToAthenaBrowserTask.prompt}</p>
                    </div>
                );
            
            default:
                return <p className="text-sm text-gray-600">Unsupported task type</p>;
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Name
                    </label>
                    <input
                        type="text"
                        id="name"
                        value={workflow.name || ''}
                        onChange={e => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                    </label>
                    <textarea
                        id="description"
                        value={workflow.description || ''}
                        onChange={e => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
                        rows={3}
                        required
                        placeholder="Enter a detailed description of the workflow's purpose and expected outcomes..."
                    />
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
                    <div className="mt-4 space-y-4">
                        {workflow.tasks?.map((task) => (
                            <div
                                key={task.id}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                            >
                                <div className="flex-grow">
                                    <p className="font-medium text-gray-900">{task.type}</p>
                                    <p className="text-sm text-gray-600">
                                        Description: {task.description}
                                    </p>
                                    <TaskDisplay task={task} />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeTask(task.id)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => {
                                setNewTask({
                                    type: TaskType.READ_OBESITY_INTAKE_FORM,
                                    description: '',
                                    input: {
                                        type: TaskType.READ_OBESITY_INTAKE_FORM,
                                        data: {
                                            url: '',
                                        }
                                    }
                                });
                                setShowTaskForm(true);
                            }}
                            className="w-full mt-4 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 flex items-center justify-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Task
                        </button>

                        {showTaskForm && (
                            <div className="border rounded-lg p-4 mt-4 bg-white">
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm text-gray-700">Task Type</label>
                                        <select
                                            value={newTask.type}
                                            onChange={e => {
                                                const selectedType = e.target.value as TaskType;
                                                setNewTask({
                                                    type: selectedType,
                                                    description: newTask.description || '',
                                                    input: getDefaultInputForTaskType(selectedType)
                                                });
                                            }}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                        >
                                            {Object.values(TaskType).map(type => (
                                                <option key={type} value={type}>
                                                    {type}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm text-gray-700">
                                            Task Description
                                            {newTask.type === TaskType.WRITE_MEDICATIONS && (
                                                <span className="text-red-500 ml-1">*</span>
                                            )}
                                        </label>
                                        <textarea
                                            value={newTask.description || ''}
                                            onChange={e => setNewTask(prev => ({
                                                ...prev,
                                                description: e.target.value
                                            }))}
                                            className={`mt-1 block w-full rounded-md border px-3 py-2 ${
                                                newTask.type === TaskType.WRITE_MEDICATIONS && !newTask.description
                                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                                            }`}
                                            rows={2}
                                            placeholder={
                                                newTask.type === TaskType.WRITE_MEDICATIONS
                                                    ? "Describe the medications to be written (required)..."
                                                    : "Describe the purpose of this task..."
                                            }
                                            required={newTask.type === TaskType.WRITE_MEDICATIONS}
                                        />
                                        {newTask.type === TaskType.WRITE_MEDICATIONS && !newTask.description && (
                                            <p className="mt-1 text-sm text-red-600">
                                                Description is required for medication tasks
                                            </p>
                                        )}
                                    </div>

                                    <TaskInputForm
                                        taskType={newTask.type!}
                                        input={newTask.input as TaskInput}
                                        onChange={(input) => setNewTask(prev => ({ ...prev, input }))}
                                    />

                                    <div className="flex justify-end space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowTaskForm(false)}
                                            className="px-4 py-2 text-gray-700 hover:text-gray-900"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                addTask();
                                                setShowTaskForm(false);
                                            }}
                                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                                        >
                                            Add Task
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={() => router.push('/workflows')}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loading ? 'Saving...' : (initialWorkflow ? 'Update' : 'Create')} Workflow
                </button>
            </div>
        </form>
    );
} 