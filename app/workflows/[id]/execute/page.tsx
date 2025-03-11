'use client';
import React from 'react';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Workflow, Task, TaskStatus, TaskType } from '../../../types/workflow';
// import mockData from '../../../mock-data/test-scrape.json';

// Application memory for storing temporary data
// const applicationMemory: Record<string, string> = {};

// Utility function to format task type constants into readable titles
const formatTaskType = (type: TaskType): string => {
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

// Utility function to recursively render nested data structures
const renderNestedValue = (
  value: Record<string, unknown> | unknown[] | string | number | boolean | null | unknown,
  depth: number = 0
): React.ReactElement => {
    if (Array.isArray(value)) {
        return (
            <div className="ml-4">
                {value.map((item, index) => (
                    <div key={index} className="flex items-start mt-2">
                        <span className="text-sm font-medium text-gray-500 min-w-[30px]">{index}:</span>
                        <div className="flex-1">{renderNestedValue(item, depth + 1)}</div>
                    </div>
                ))}
            </div>
        );
    }
    
    if (typeof value === 'object' && value !== null) {
        return (
            <div className={depth > 0 ? 'ml-4' : ''}>
                {Object.entries(value).map(([key, val]) => (
                    <div key={key} className="flex items-start mt-2">
                        <span className="text-sm font-medium text-gray-500 min-w-[120px]">{key}:</span>
                        <div className="flex-1">{renderNestedValue(val, depth + 1)}</div>
                    </div>
                ))}
            </div>
        );
    }

    // Handle primitive values
    if (typeof value === 'string') {
        try {
            new URL(value);
            return <span className="text-sm text-blue-600 hover:underline">🔗 {value}</span>;
        } catch {
            return <span className="text-sm text-gray-900">{value}</span>;
        }
    }
    
    return <span className="text-sm text-gray-900">{String(value)}</span>;
};

export default function ExecuteWorkflowPage() {
    const params = useParams();
    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [status, setStatus] = useState<'loading' | 'idle' | 'executing' | 'completed' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

    const toggleTaskDetails = (taskId: string) => {
        setExpandedTasks(prev => ({
            ...prev,
            [taskId]: !prev[taskId]
        }));
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

    // Function to render task input details
    const renderTaskInput = (task: Task) => {
        if (!task.input) {
            return (
                <div className="mt-2">
                    <p className="text-sm text-gray-500 italic">No input data available</p>
                </div>
            );
        }

        return (
            <div className="mt-4">
                <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
                    <div className="px-4 py-3 border-b border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900">Input Parameters</h4>
                    </div>
                    <div className="px-4 py-3">
                        {renderNestedValue(task.input)}
                    </div>
                </div>
            </div>
        );
    };

    // Function to render task output details
    const renderTaskOutput = (task: Task) => {
        if (!task.output) {
            return (
                <div className="mt-2">
                    <p className="text-sm text-gray-500 italic">No output available</p>
                </div>
            );
        }

        return (
            <div className="mt-4">
                <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
                    <div className="px-4 py-3 border-b border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900">Output Details</h4>
                    </div>
                    <div className="px-4 py-3">
                        {renderNestedValue(task.output)}
                    </div>
                </div>
            </div>
        );
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
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 mb-2">Input Details</h4>
                                            {renderTaskInput(task)}
                                        </div>
                                        
                                        {task.output && (
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-500 mb-2">Output Details</h4>
                                                {renderTaskOutput(task)}
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
                                            <div className="border-t pt-4 mt-4">
                                                <h4 className="text-sm font-medium text-gray-500 mb-2">Execution Details</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm text-gray-500">Attempts</p>
                                                        <p className="text-sm font-medium text-gray-900">{task.executionDetails.attempts}</p>
                                                    </div>
                                                    {task.executionDetails.queuedAt && (
                                                        <div>
                                                            <p className="text-sm text-gray-500">Queued At</p>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {new Date(task.executionDetails.queuedAt).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {task.executionDetails.startedAt && (
                                                        <div>
                                                            <p className="text-sm text-gray-500">Started At</p>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {new Date(task.executionDetails.startedAt).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {task.executionDetails.completedAt && (
                                                        <div>
                                                            <p className="text-sm text-gray-500">Completed At</p>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {new Date(task.executionDetails.completedAt).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {task.executionDetails.workerId && (
                                                        <div>
                                                            <p className="text-sm text-gray-500">Worker ID</p>
                                                            <p className="text-sm font-medium text-gray-900">{task.executionDetails.workerId}</p>
                                                        </div>
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
        </div>
    );
} 