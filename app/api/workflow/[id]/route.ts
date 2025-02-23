import { NextRequest, NextResponse } from 'next/server';
import { WorkflowStore } from '@/app/lib/workflow-store';

const store = WorkflowStore.getInstance();

export async function GET(request: NextRequest) {
    try {
        const { pathname } = new URL(request.url);
        const id = pathname.split('/').pop();

        if (!id) {
            return NextResponse.json(
                { error: 'Missing workflow ID' },
                { status: 400 }
            );
        }

        const workflow = await store.getWorkflow(id);
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

export async function PUT(request: NextRequest) {
    try {
        const { pathname } = new URL(request.url);
        const id = pathname.split('/').pop();
        
        if (!id) {
            return NextResponse.json(
                { error: 'Missing workflow ID' },
                { status: 400 }
            );
        }

        const updates = await request.json();
        
        // Ensure ID matches
        updates.id = id;
        
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

export async function DELETE(request: NextRequest) {
    try {
        const { pathname } = new URL(request.url);
        const id = pathname.split('/').pop();
        
        if (!id) {
            return NextResponse.json(
                { error: 'Missing workflow ID' },
                { status: 400 }
            );
        }

        const success = await store.deleteWorkflow(id);
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