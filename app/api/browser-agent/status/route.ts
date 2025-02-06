import { NextResponse } from 'next/server';
import { activeSessions } from '../route';

export async function POST(request: Request) {
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

    const body = await request.json();
    if (!body.status || !['initializing', 'running', 'completed', 'error'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update session status
    session.status = body.status;
    
    return NextResponse.json(session);
  } catch (error) {
    console.error('Error updating browser session status:', error);
    return NextResponse.json(
      { error: 'Failed to update browser session status' },
      { status: 500 }
    );
  }
} 