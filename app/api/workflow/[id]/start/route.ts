import { NextRequest, NextResponse } from 'next/server';
import { exampleWorkflow } from '@/types/workflow';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflow = exampleWorkflow; // In future, fetch from your workflow store
    const firstTransformation = workflow.transformations[0];
    
    if (!firstTransformation?.source?.config?.tasks?.length) {
      throw new Error('No tasks defined in workflow');
    }

    const firstTask = firstTransformation.source.config.tasks[0];
    
    // Create a new browser session and execute first task
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/browser-agent/${params.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firstTask)
    });

    if (!response.ok) {
      throw new Error('Failed to start workflow execution');
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error starting workflow:', error);
    return NextResponse.json(
      { error: 'Failed to start workflow execution' },
      { status: 500 }
    );
  }
} 