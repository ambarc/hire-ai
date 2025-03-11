'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Workflow, Task, TaskStatus, TaskType, isTaskOfType } from '../../../types/workflow';
import { Allergy, Medication, Insurance } from '../../../types/clinical';
// import mockData from '../../../mock-data/test-scrape.json';

interface Profile {
    name: string;
    dateOfBirth: string;
    gender: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
}

// Application memory for storing temporary data
// const applicationMemory: Record<string, string> = {};

// Function to get text from a browser location
const getBrowserText = async (): Promise<string> => {
    // TODO: Implement browser text extraction
    return '';
};

// Utility function to format task type constants into readable titles
const formatTaskType = (type: TaskType): string => {
  return type
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

// Utility function to format source types
const formatSourceType = (type: string): string => {
  return type
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

// Utility function to get status styling
const getStatusStyles = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.COMPLETED:
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: (
          <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      };
    case TaskStatus.IN_PROGRESS:
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: (
          <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )
      };
    case TaskStatus.FAILED:
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      };
    default:
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        border: 'border-gray-200',
        icon: (
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
      };
  }
};

export default function ExecuteWorkflowPage() {
    const params = useParams();
    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<'loading' | 'idle' | 'executing' | 'completed' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [ingestExtractedText, setIngestExtractedText] = useState<string>('');
    const [extractedMedications, setExtractedMedications] = useState<Medication[]>([]);
    const [extractedAllergies, setExtractedAllergies] = useState<Allergy[]>([]);
    const [extractedInsurance, setExtractedInsurance] = useState<Insurance | null>(null);
    const [extractedProfile, setExtractedProfile] = useState<Profile | null>(null);
    
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

    const toggleTaskDetails = (taskId: string) => {
        setExpandedTasks(prev => ({
            ...prev,
            [taskId]: !prev[taskId]
        }));
    };

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
    };

    useEffect(() => {
        const fetchWorkflow = async () => {
            try {
                console.log('fetching workflow');

                
                const response = await fetch(`/api/workflow/workflows/${params.id}`);
                if (!response.ok) throw new Error('Failed to fetch workflow');
                const workflow = await response.json();
                setWorkflow(workflow);
                setStatus('idle');
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load workflow');
                setStatus('error');
            }
        };

        // Initial fetch
        fetchWorkflow();

        // Set up polling every 5 seconds
        const pollInterval = setInterval(fetchWorkflow, 5000);

        // Cleanup on unmount or when ID changes
        return () => clearInterval(pollInterval);
    }, [params.id]);

    const updateTask = async (taskId: string, updates: Partial<Task>) => {
        try {
            const response = await fetch(`/workflow/${params.id}/task/${taskId}`, {
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

    const executeTask = async (taskId: string) => {
        try {
            const response = await fetch('/api/workflow/execute-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    workflowId: params.id,
                    taskId: taskId 
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to execute task');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to execute task');
        }
    };

    const processNextTask = async () => {
        try {
            const response = await fetch('/api/workflow/queue/process-next', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workflowId: params.id })
            });
            
            if (!response.ok) {
                throw new Error('Failed to process next task');
            }
            
            // Refresh workflow data
            const workflowResponse = await fetch(`/api/workflow/workflows/${params.id}`);
            if (workflowResponse.ok) {
                const data = await workflowResponse.json();
                setWorkflow(data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process task');
        }
    };

    // Function to render task input details
    const renderTaskInput = (task: Task) => {
        switch (task.type) {
            case TaskType.READ_OBESITY_INTAKE_FORM:
                return (
                    <div className="mt-2 text-sm">
                        <p className="font-medium text-gray-700">Browser Task</p>
                        {task.input && 'url' in task.input.data && (
                            <p className="text-gray-600">URL: {task.input.data.url || 'Not specified'}</p>
                        )}
                    </div>
                );
            case TaskType.WRITE_MEDICATIONS:
                if (task.input && 'source' in task.input.data) {
                    return (
                        <div className="mt-2 text-sm">
                            <p className="font-medium text-gray-700">Source: {formatSourceType(task.input.data.source.type)}</p>
                            {'path' in task.input.data.source && task.input.data.source.path && (
                                <p className="text-gray-600">Path: {task.input.data.source.path}</p>
                            )}
                        </div>
                    );
                }
                return <p className="mt-2 text-sm text-gray-600">No input details available</p>;
            case TaskType.WRITE_ALLERGIES:
                break;
            case TaskType.WRITE_INSURANCE:
                if (task.input && 'source' in task.input.data) {
                    return (
                        <div className="mt-2 text-sm">
                            <p className="font-medium text-gray-700">Source: {formatSourceType(task.input.data.source.type)}</p>
                        </div>
                    );
                }
                return <p className="mt-2 text-sm text-gray-600">No input details available</p>;
            case TaskType.WRITE_TO_ATHENA: {
                const writeToAthenaBrowserInput = task.input.type === TaskType.WRITE_TO_ATHENA ? task.input.data : null;
                if (!writeToAthenaBrowserInput) {
                    return <p className="mt-2 text-sm text-gray-600">No input details available</p>;
                }

    return (
                    <div className="mt-2 text-sm">
                        <p className="font-medium text-gray-700">{writeToAthenaBrowserInput.field}</p>
                        
                        {writeToAthenaBrowserInput.field === 'medications' && extractedMedications.length > 0 && (
                            <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-gray-600">Medications to write:</p>
                                <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
                                    {extractedMedications.map((med, index) => (
                                        <li key={index} className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50">
                                            <span className="font-medium text-gray-900">{med.name}</span>
                                            {med.dosage && (
                                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                                                    {med.dosage}
                                                </span>
                                            )}
                                            {med.frequency && (
                                                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                                                    {med.frequency}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                    </div>
                        )}
                        
                        {writeToAthenaBrowserInput.field === 'allergies' && extractedAllergies.length > 0 && (
                            <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-gray-600">Allergies to write:</p>
                                <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
                                    {extractedAllergies.map((allergy, index) => (
                                        <li key={index} className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50">
                                            <span className="font-medium text-gray-900">{allergy.name}</span>
                                            {allergy.severity && (
                                                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                                                    {allergy.severity}
                                                </span>
                                            )}
                                            {allergy.reaction && (
                                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                                                    {allergy.reaction}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {writeToAthenaBrowserInput.field === 'insurance' && extractedInsurance && (
                            <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-gray-600">Insurance to write:</p>
                                <p className="text-gray-600">{JSON.stringify(extractedInsurance)}</p>
                            </div>
                        )}
                    </div>
                );
            }
            case TaskType.IDENTIFY_CHART_IN_ATHENA:
                if (!isTaskOfType(TaskType.IDENTIFY_CHART_IN_ATHENA, task)) {
                    return <p className="mt-2 text-sm text-gray-600">Invalid task input</p>;
                }
                return (
                    <div className="mt-2 text-sm">
                        <p className="font-medium text-gray-700">Patient Profile Search</p>
                        {extractedProfile ? (
                            <div className="mt-1 space-y-1">
                                <p className="text-gray-600">Name: {extractedProfile.name}</p>
                                <p className="text-gray-600">DOB: {extractedProfile.dateOfBirth}</p>
                                <p className="text-gray-600">Gender: {extractedProfile.gender}</p>
                            </div>
                        ) : (
                            <p className="text-gray-600 italic">No profile data available</p>
                        )}
                    </div>
                );
            default:
                return <p className="mt-2 text-sm text-gray-600">No input details available</p>;
        }
    };

    // Function to render task output details
    const renderTaskOutput = (task: Task) => {
        if (!task.output) return <p className="text-sm text-gray-600">No output available</p>;

        switch (task.output.type) {
            case TaskType.READ_OBESITY_INTAKE_FORM:
                return (
                    <div className="mt-2">
                        <p className="font-medium text-sm text-gray-700">Status: {task.output.success ? 'Success' : 'Failed'}</p>
                        {task.output.data?.rawText && (
                            <div className="mt-1">
                                <p className="text-xs text-gray-600">Text length: {task.output.data.rawText.length} characters</p>
                            </div>
                        )}
                    </div>
                );
            case TaskType.WRITE_MEDICATIONS:
                return (
                    <div className="mt-2">
                        <p className="font-medium text-sm text-gray-700">Status: {task.output.success ? 'Success' : 'Failed'}</p>
                        {task.output.data?.medications && (
                            <div className="mt-1">
                                <p className="text-xs text-gray-600">Medications found: {task.output.data.medications.length}</p>
                                {task.output.data.medications.length > 0 && (
                                    <ul className="mt-1 list-disc list-inside text-xs text-gray-600">
                                        {task.output.data.medications.map((med: Medication, i: number) => (
                                            <li key={i}>{med.name} {med.dosage && `- ${med.dosage}`} {med.frequency && `(${med.frequency})`}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                );
            case TaskType.WRITE_ALLERGIES:
                return (
                    <div className="mt-2">
                        <p className="font-medium text-sm text-gray-700">Status: {task.output.success ? 'Success' : 'Failed'}</p>
                        {task.output.data?.allergies && (
                            <div className="mt-1">
                                <p className="text-xs text-gray-600">Allergies found: {task.output.data.allergies.length}</p>
                                {task.output.data.allergies.length > 0 && (
                                    <ul className="mt-1 list-disc list-inside text-xs text-gray-600">
                                        {task.output.data.allergies.map((allergy: Allergy, i: number) => (
                                            <li key={i}>{allergy.name} - {allergy.severity} ({allergy.reaction})</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                );
            case TaskType.WRITE_INSURANCE:
                return (
                    <div className="mt-2">
                        <p className="font-medium text-sm text-gray-700">Status: {task.output.success ? 'Success' : 'Failed'}</p>
                        {task.output.data?.insurance && (
                            <div className="mt-1 text-xs text-gray-600">
                                <p>Provider: {task.output.data.insurance.name}</p>
                                <p>Policy #: {task.output.data.insurance.policyNumber}</p>
                                <p>Group #: {task.output.data.insurance.groupNumber}</p>
                                <p>Member ID: {task.output.data.insurance.memberId}</p>
                            </div>
                        )}
                    </div>
                );
            case TaskType.WRITE_TO_ATHENA:
                return (
                    <div className="mt-2">
                        <p className="font-medium text-sm text-gray-700">Status: {task.output.success ? 'Success' : 'Failed'}</p>
                    </div>
                );
            case TaskType.EXTRACT_PATIENT_PROFILE:
                const profileData = task.output.data?.profile as Profile;
                return (
                    <div className="mt-2">
                        <p className="font-medium text-sm text-gray-700">Status: {task.output.success ? 'Success' : 'Failed'}</p>
                        {profileData && (
                            <div className="mt-1 text-xs text-gray-600">
                                <p>Name: {profileData.name}</p>
                                <p>Date of Birth: {profileData.dateOfBirth}</p>
                                <p>Gender: {profileData.gender}</p>
                                {profileData.phoneNumber && (
                                    <p>Phone: {profileData.phoneNumber}</p>
                                )}
                                {profileData.email && (
                                    <p>Email: {profileData.email}</p>
                                )}
                                {profileData.address && (
                                    <p>Address: {profileData.address}</p>
                                )}
                            </div>
                        )}
                    </div>
                );
            case TaskType.IDENTIFY_CHART_IN_ATHENA:
                return (
                    <div className="mt-2">
                        <p className="font-medium text-sm text-gray-700">Status: {task.output.success ? 'Success' : 'Failed'}</p>
                        {task.output.data?.url && (
                            <div className="mt-1 text-xs text-gray-600">
                                <p>Patient Chart URL: {task.output.data.url}</p>
                            </div>
                        )}
                    </div>
                );
            default:
                return <p className="text-sm text-gray-600">No output details available</p>;
        }
    };

    if (status === 'loading') {
        return (
            <div className="p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (status === 'error' || !workflow) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
                    {error || 'Failed to load workflow'}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">

            <div className="space-y-4">
                {workflow.tasks.map((task) => {
                    const statusStyles = getStatusStyles(task.status);
                    const isExpanded = expandedTasks[task.id];

                    return (
                        <div 
                            key={task.id}
                            className={`border rounded-lg overflow-hidden ${statusStyles.border}`}
                        >
                            <div 
                                className={`${statusStyles.bg} p-4 cursor-pointer`}
                                onClick={() => toggleTaskDetails(task.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        {statusStyles.icon}
                                        <div>
                                            <h3 className={`font-medium ${statusStyles.text}`}>
                                                {formatTaskType(task.type)}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                ID: {task.id}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles.bg} ${statusStyles.text}`}>
                                            {task.status}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                executeTask(task.id);
                                            }}
                                            disabled={task.status === TaskStatus.IN_PROGRESS}
                                            className={`px-3 py-1 rounded-md text-white text-sm font-medium ${
                                                task.status === TaskStatus.IN_PROGRESS
                                                    ? 'bg-gray-400 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-700'
                                            }`}
                                        >
                                            {task.status === TaskStatus.IN_PROGRESS ? (
                                                <span className="flex items-center">
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Executing...
                                                </span>
                                            ) : (
                                                'Execute'
                                            )}
                                        </button>
                                        <svg 
                                            className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="p-4 bg-white border-t">
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500">Input</h4>
                                            <pre className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                                {JSON.stringify(task.input, null, 2)}
                                            </pre>
                                        </div>
                                        
                                        {task.output && (
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-500">Output</h4>
                                                <pre className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                                                    {JSON.stringify(task.output, null, 2)}
                                                </pre>
                                            </div>
                                        )}

                                        {task.error && (
                                            <div>
                                                <h4 className="text-sm font-medium text-red-500">Error</h4>
                                                <pre className="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded">
                                                    {task.error}
                                                </pre>
                                            </div>
                                        )}

                                        {task.executionDetails && (
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-500">Execution Details</h4>
                                                <div className="mt-1 text-sm text-gray-600">
                                                    <p>Attempts: {task.executionDetails.attempts}</p>
                                                    {task.executionDetails.queuedAt && (
                                                        <p>Queued: {new Date(task.executionDetails.queuedAt).toLocaleString()}</p>
                                                    )}
                                                    {task.executionDetails.startedAt && (
                                                        <p>Started: {new Date(task.executionDetails.startedAt).toLocaleString()}</p>
                                                    )}
                                                    {task.executionDetails.completedAt && (
                                                        <p>Completed: {new Date(task.executionDetails.completedAt).toLocaleString()}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {logs.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Execution Logs</h2>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm">
                            {logs.join('\n')}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
} 