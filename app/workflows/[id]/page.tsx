'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import WorkflowForm from '../../components/WorkflowForm';
import { Workflow } from '../../types/workflow';

export default function EditWorkflowPage() {
    const params = useParams();
    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWorkflow = useCallback(async () => {
        try {
            const response = await fetch(`/workflow/${params.id}`);
            if (!response.ok) throw new Error('Failed to fetch workflow');
            const data = await response.json();
            setWorkflow(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load workflow');
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        fetchWorkflow();
    }, [fetchWorkflow]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex justify-center items-center min-h-[200px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </div>
        );
    }

    if (error || !workflow) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    {error || 'Workflow not found'}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Workflow</h1>
            <WorkflowForm initialWorkflow={workflow} />
        </div>
    );
} 