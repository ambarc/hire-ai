'use client';

import { useState, useEffect } from 'react';
import { Workflow, TaskStatus } from '../types/workflow';
import Link from 'next/link';

export default function WorkflowList() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const fetchWorkflows = async () => {
        try {
            const response = await fetch('/api/workflow');
            if (!response.ok) throw new Error('Failed to fetch workflows');
            const data = await response.json();
            setWorkflows(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load workflows');
        } finally {
            setLoading(false);
        }
    };

    const deleteWorkflow = async (id: string) => {
        if (!confirm('Are you sure you want to delete this workflow?')) return;
        
        try {
            const response = await fetch(`/api/workflow/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete workflow');
            await fetchWorkflows();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete workflow');
        }
    };

    const getStatusColor = (status: TaskStatus) => {
        switch (status) {
            case TaskStatus.COMPLETED:
                return 'bg-green-100 text-green-800';
            case TaskStatus.IN_PROGRESS:
                return 'bg-blue-100 text-blue-800';
            case TaskStatus.FAILED:
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Workflows</h2>
                <Link
                    href="/workflows/new"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Create New Workflow
                </Link>
            </div>

            <div className="grid gap-6">
                {workflows.map((workflow) => (
                    <div
                        key={workflow.id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                    {workflow.name}
                                </h3>
                                {workflow.description && (
                                    <p className="mt-1 text-gray-600">{workflow.description}</p>
                                )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(workflow.status)}`}>
                                {workflow.status}
                            </span>
                        </div>

                        <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700">Tasks ({workflow.tasks.length})</h4>
                            <div className="mt-2 space-y-2">
                                {workflow.tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                                    >
                                        <span className="text-sm text-gray-700">{task.type}</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                            {task.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                            <Link
                                href={`/workflows/${workflow.id}`}
                                className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                            >
                                View Details
                            </Link>
                            <button
                                onClick={() => deleteWorkflow(workflow.id)}
                                className="text-red-600 hover:text-red-700 font-medium text-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}

                {workflows.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">No workflows found</p>
                        <Link
                            href="/workflows/new"
                            className="mt-2 inline-block text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            Create your first workflow
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
} 