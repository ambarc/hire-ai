import { NextResponse } from 'next/server';

export const runtime = 'edge';

// This endpoint will be used for WebSocket upgrade
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID required' },
      { status: 400 }
    );
  }

  // Check if it's a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');
  if (upgrade?.toLowerCase() !== 'websocket') {
    return NextResponse.json(
      { error: 'Expected WebSocket connection' },
      { status: 400 }
    );
  }

  try {
    // Forward the WebSocket connection to the Python service
    const response = await fetch(`http://localhost:3001/ws/${sessionId}`, {
      method: 'GET',
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        ...Object.fromEntries(request.headers)
      }
    });

    return new Response(null, {
      status: 101,
      headers: response.headers
    });
  } catch (error) {
    console.error('Error establishing WebSocket connection:', error);
    return NextResponse.json(
      { error: 'Failed to establish WebSocket connection' },
      { status: 500 }
    );
  }
} 