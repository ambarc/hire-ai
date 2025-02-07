import { NextResponse } from 'next/server';

// In-memory store for active sessions
export const activeSessions: Record<string, {
  id: string;
  status: 'initializing' | 'running' | 'completed' | 'error';
  type: 'video' | 'browser-use';
  createdAt: number;
  result?: any;
  prompt: string;
  url: string;
}> = {};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode = 'video', url, prompt } = body;

    if (mode === 'browser-use') {
      // Forward to Python service
      const response = await fetch('http://localhost:3001/api/browser-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, prompt })
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
        prompt,
        url
      };

      return NextResponse.json({ sessionId, type: mode, prompt, url });
    } else {
      // Video session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      activeSessions[sessionId] = {
        id: sessionId,
        status: 'initializing',
        type: 'video',
        createdAt: Date.now()
      };

      return NextResponse.json({ sessionId, type: mode });
    }
  } catch (error) {
    console.error('Error creating browser session:', error);
    return NextResponse.json(
      { error: 'Failed to create browser session' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const session = activeSessions[sessionId];
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.type === 'browser-use') {
      // Forward to Python service
      const response = await fetch(`/api/browser-agent/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session status');
      }

      const data = await response.json();
      session.status = data.status;
      session.result = data.result;
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching browser session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch browser session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const session = activeSessions[sessionId];
    if (session?.type === 'browser-use') {
      // Forward to Python service
      const response = await fetch(`/api/browser-agent/${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete browser session');
      }
    }

    delete activeSessions[sessionId];
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting browser session:', error);
    return NextResponse.json(
      { error: 'Failed to delete browser session' },
      { status: 500 }
    );
  }
} 