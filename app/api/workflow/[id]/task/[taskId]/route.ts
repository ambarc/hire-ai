import { NextRequest, NextResponse } from 'next/server';
import { WorkflowStore } from '@/app/lib/workflow-store';

const store = WorkflowStore.getInstance();

export async function POST(request: NextRequest) {
    try {
        const { pathname } = new URL(request.url);
        const parts = pathname.split('/');
        const taskId = parts.pop();
        const id = parts[parts.length - 2]; // Get the workflow ID, which is 2 segments before the end
        
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