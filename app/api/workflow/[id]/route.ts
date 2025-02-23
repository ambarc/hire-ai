import { NextRequest, NextResponse } from 'next/server';
import { WorkflowStore } from '@/app/lib/workflow-store';

const store = WorkflowStore.getInstance();

export async function GET(
    request: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const workflow = await store.getWorkflow(context.params.id);
        if (!workflow) {
            return NextResponse.json(
                { error: 'Workflow not found' },
                { status: 404 }
            );
        }
        return NextResponse.json(workflow);
    } catch (error) {
        console.error('Failed to get workflow:', error);
        return NextResponse.json(
            { error: 'Failed to get workflow' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const updates = await request.json();
        
        // Ensure ID matches
        updates.id = context.params.id;
        
        // Update timestamps
        updates.updatedAt = new Date().toISOString();
        
        const updated = await store.createWorkflow(updates);
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Failed to update workflow:', error);
        return NextResponse.json(
            { error: 'Failed to update workflow' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: { id: string } }
) {
    try {
        const success = await store.deleteWorkflow(context.params.id);
        if (!success) {
            return NextResponse.json(
                { error: 'Workflow not found' },
                { status: 404 }
            );
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete workflow:', error);
        return NextResponse.json(
            { error: 'Failed to delete workflow' },
            { status: 500 }
        );
    }
} 