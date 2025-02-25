import { NextRequest, NextResponse } from 'next/server';
import { WorkflowStore } from '@/app/lib/workflow-store';
import { Task } from '../../../../../types/workflow';

const store = WorkflowStore.getInstance();

export async function POST(request: NextRequest) {
    try {
        const { pathname } = new URL(request.url);
        const parts = pathname.split('/');
        const taskId = parts.pop();
        const id = parts[parts.length - 2]; // Get the workflow ID, which is 2 segments before the end
        
        // Add validation for taskId and id
        if (!taskId || !id) {
            return NextResponse.json(
                { error: 'Invalid workflow or task ID' },
                { status: 400 }
            );
        }
        
        const updates = await request.json();
        
        const workflow = await store.updateWorkflowTask(
            id,
            taskId,
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

export async function PATCH(
    request: Request,
    { params }: { params: { id: string; taskId: string } }
) {
    try {
        const updates: Partial<Task> = await request.json();
        const store = WorkflowStore.getInstance();
        
        // Ensure params is properly awaited
        const { id, taskId } = params;
        
        const updatedWorkflow = await store.updateWorkflowTask(
            id,
            taskId,
            updates
        );

        if (!updatedWorkflow) {
            return NextResponse.json(
                { error: 'Workflow or task not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(updatedWorkflow);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to update task' },
            { status: 500 }
        );
    }
} 