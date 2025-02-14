import { redis, getSessionState } from '@/server/lib/redis';

export async function GET(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;
  const state = await getSessionState(sessionId);
  
  if (!state) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404
    });
  }

  return new Response(JSON.stringify(state), {
    headers: { 'Content-Type': 'application/json' }
  });
} 