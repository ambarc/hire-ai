import { NextRequest, NextResponse } from 'next/server';
import { activeSessions } from '../route';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID required' },
      { status: 400 }
    );
  }

  try {
    const session = activeSessions[sessionId];
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Forward to Python service
    const response = await fetch(`http://localhost:3001/api/browser-agent/${sessionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch session status');
    }

    const data = await response.json();
    
    // Update local session state
    session.status = data.status;
    session.taskData = data.task_data;
    session.lastScreenshot = data.last_screenshot;
    session.currentUrl = data.current_url;
    session.agentResponse = data.agent_response;
    session.recordingGif = data.recording_gif;

    return NextResponse.json({
      ...session,
      agent_response: data.agent_response,
      recording_gif: data.recording_gif
    });
  } catch (error) {
    console.error('Error fetching browser session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch browser session' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID required' },
      { status: 400 }
    );
  }

  try {
    const session = activeSessions[sessionId];
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Forward to Python service
    const response = await fetch(`http://localhost:3001/api/browser-agent/${sessionId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete browser session');
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