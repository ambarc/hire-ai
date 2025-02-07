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
}> = {};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, prompt } = body;

    // Forward to Python service
    const response = await fetch('http://localhost:3001/api/browser-agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, prompt })
    });

    console.log('response', response);

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
      prompt,
      url
    };

    return NextResponse.json({ sessionId, status: data.status, prompt, url });
  } catch (error) {
    console.error('Error creating browser session:', error);
    return NextResponse.json(
      { error: 'Failed to create browser session' },
      { status: 500 }
    );
  }
} 