import { NextResponse } from 'next/server';

// In-memory store for active sessions
export const activeSessions: Record<string, {
  id: string;
  status: 'initializing' | 'started' | 'navigating' | 'ready' | 'executing' | 'completed' | 'error' | 'closed';
  type: 'browser-use';
  createdAt: number;
  result?: any;
  prompt: string;
  url: string;
  taskData?: any;
  lastScreenshot?: string;
  currentUrl?: string;
  agentResponse?: string;
  recordingGif?: string;
}> = {};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, prompt, task } = body;

    // Forward to Python service
    const response = await fetch('http://localhost:3001/api/browser-agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        url: url || task?.url,
        prompt: prompt || task?.prompt,
        task: task ? {
          type: task.type || 'browser-use',
          action: task.action,
          prompt: task.prompt,
          expectedOutput: task.expectedOutput
        } : undefined
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create browser session! response:' + response);
    }

    const data = await response.json();
    const sessionId = data.session_id;
    
    activeSessions[sessionId] = {
      id: sessionId,
      status: data.status,
      type: 'browser-use',
      createdAt: Date.now(),
      prompt: prompt || task?.prompt,
      url: url || task?.url,
      agentResponse: data.status.agent_response,
      recordingGif: data.status.recording_gif
    };

    return NextResponse.json({ 
      sessionId, 
      status: data.status, 
      prompt: prompt || task?.prompt, 
      url: url || task?.url,
      agent_response: data.status.agent_response,
      recording_gif: data.status.recording_gif
    });
  } catch (error) {
    console.error('Error creating browser session:', error);
    return NextResponse.json(
      { error: 'Session complete.' },
      { status: 500 }
    );
  }
} 