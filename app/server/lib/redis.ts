import { Redis } from 'ioredis';

// Create a Redis client with default configuration
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

export async function getSessionState(sessionId: string) {
  const state = await redis.get(`browser_session:${sessionId}`);
  return state ? JSON.parse(state) : null;
}

export async function setSessionState(sessionId: string, state: any) {
  await redis.set(
    `browser_session:${sessionId}`,
    JSON.stringify(state),
    'EX',
    3600 // 1 hour expiration
  );
  
  // Publish update for real-time subscribers
  await redis.publish(
    `browser_session:${sessionId}:updates`,
    JSON.stringify(state)
  );
} 