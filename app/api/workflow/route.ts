import { NextRequest, NextResponse } from 'next/server';
import { WorkflowStore } from '@/app/lib/workflow-store';
import { Workflow, TaskStatus } from '@/app/types/workflow';
import { randomUUID } from 'crypto';

const store = WorkflowStore.getInstance();

export async function GET() {
    try {
        const workflows = await store.listWorkflows();
        return NextResponse.json(workflows);
    } catch (error) {
        console.error('Failed to list workflows:', error);
        return NextResponse.json(
            { error: 'Failed to list workflows' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Validate required fields
        if (!body.name || !Array.isArray(body.tasks)) {
            return NextResponse.json(
                { error: 'Invalid workflow: name and tasks are required' },
                { status: 400 }
            );
        }

        // Create workflow with generated ID and timestamps
        const workflow: Workflow = {
            id: randomUUID(),
            name: body.name,
            description: body.description,
            tasks: body.tasks.map((task: {
                id?: string;
                name: string;
                description?: string;
            }) => ({
                ...task,
                id: task.id || randomUUID(),
                status: TaskStatus.NOT_STARTED,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            })),
            status: TaskStatus.NOT_STARTED,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: body.metadata || {}
        };

        const created = await store.createWorkflow(workflow);
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('Failed to create workflow:', error);
        return NextResponse.json(
            { error: 'Failed to create workflow' },
            { status: 500 }
        );
    }
} 