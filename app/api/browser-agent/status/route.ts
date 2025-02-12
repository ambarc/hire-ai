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
        { error: 'Session complete.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // Forward to Python service
    const response = await fetch(`http://localhost:3001/api/browser-agent/${sessionId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      throw new Error('Failed to update session status');
    }

    const data = await response.json();
    
    // Update local session state
    session.status = data.status;
    session.taskData = data.task_data;
    session.lastScreenshot = data.last_screenshot;
    session.currentUrl = data.current_url;

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error updating browser session status:', error);
    return NextResponse.json(
      { error: 'Failed to update browser session status' },
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
        { error: 'Session complete.' },
        { status: 404 }
      );
    }

    // Forward to Python service
    const response = await fetch(`http://localhost:3001/api/browser-agent/${sessionId}/status`);
    if (!response.ok) {
      throw new Error('Failed to fetch session status');
    }

    const data = await response.json();
    
    // Update local session state
    session.status = data.status;
    session.taskData = data.task_data;
    session.lastScreenshot = data.last_screenshot;
    session.currentUrl = data.current_url;

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching browser session status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch browser session status' },
      { status: 500 }
    );
  }
} 