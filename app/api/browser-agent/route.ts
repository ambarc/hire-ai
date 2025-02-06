import { NextResponse } from 'next/server';

// In-memory store for active sessions (replace with proper DB in production)
export const activeSessions: Record<string, {
  id: string;
  status: 'initializing' | 'running' | 'completed' | 'error';
  createdAt: number;
}> = {};

export async function POST(request: Request) {
  try {
    // Create new session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    activeSessions[sessionId] = {
      id: sessionId,
      status: 'initializing',
      createdAt: Date.now()
    };

    return NextResponse.json({ sessionId });
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

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching browser session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch browser session' },
      { status: 500 }
    );
  }
}

// DELETE to clean up sessions
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