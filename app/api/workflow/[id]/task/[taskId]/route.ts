import { NextRequest, NextResponse } from 'next/server';
import { WorkflowStore } from '@/app/lib/workflow-store';

const store = WorkflowStore.getInstance();

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string; taskId: string } }
) {
    try {
        const updates = await request.json();
        
        const workflow = await store.updateWorkflowTask(
            params.id,
            params.taskId,
            updates
        );

        if (!workflow) {
            return NextResponse.json(
                { error: 'Workflow or task not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(workflow);
    } catch (error) {
        console.error('Failed to update task:', error);
        return NextResponse.json(
            { error: 'Failed to update task' },
            { status: 500 }
        );
    }
} 