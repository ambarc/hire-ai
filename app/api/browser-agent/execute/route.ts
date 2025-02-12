import { NextResponse } from 'next/server';
import { activeSessions } from '../route';

export const runtime = 'edge';

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
        { error: 'Session complete.' },
        { status: 404 }
      );
    }

    if (session.type !== 'browser-use') {
      return NextResponse.json(
        { error: 'Not a browser-use session' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { command } = body;

    if (!command) {
      return NextResponse.json(
        { error: 'Command required' },
        { status: 400 }
      );
    }

    try {
      // Forward to Python service
      const response = await fetch(`/api/browser-agent/${sessionId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command })
      });

      if (!response.ok) {
        throw new Error('Failed to execute command');
      }

      const data = await response.json();
      
      // Update session status
      session.status = data.status;
      if (data.status === 'completed') {
        session.result = data.result;
      }

      return NextResponse.json({ 
        success: true, 
        result: data.result,
        status: data.status,
        prompt: session.prompt
      });
    } catch (error) {
      session.status = 'error';
      throw error;
    }
  } catch (error) {
    console.error('Error executing browser command:', error);
    return NextResponse.json(
      { error: 'Failed to execute browser command' },
      { status: 500 }
    );
  }
} 