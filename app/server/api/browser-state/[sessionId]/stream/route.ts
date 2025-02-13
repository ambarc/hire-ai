import { redis } from '@/server/lib/redis';

export async function GET(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;
  
  // Set up Server-Sent Events
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Subscribe to Redis updates in the backend
  const subscriber = redis.duplicate();
  await subscriber.subscribe(`browser_session:${sessionId}:updates`);
  
  subscriber.on('message', async (channel, message) => {
    try {
      await writer.write(
        encoder.encode(`data: ${message}\n\n`)
      );
    } catch (e) {
      console.error('Error writing to stream:', e);
    }
  });

  // Clean up subscription when client disconnects
  req.signal.addEventListener('abort', () => {
    subscriber.unsubscribe(`browser_session:${sessionId}:updates`);
    subscriber.quit();
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 