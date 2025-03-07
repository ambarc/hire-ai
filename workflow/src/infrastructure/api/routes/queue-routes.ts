import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { QueueManager } from '../../../core/usecases/queue-manager';

interface QueueRouteOptions extends FastifyPluginOptions {
  queueManager: QueueManager;
}

export async function queueRoutes(
  fastify: FastifyInstance,
  options: QueueRouteOptions
): Promise<void> {
  const { queueManager } = options;

  // Get queue status
  fastify.get('/status', async () => {
    return queueManager.getQueueStatus();
  });

  // Enqueue a task
  fastify.post<{
    Params: { workflowId: string; taskId: string };
    Body: { priority?: number };
  }>('/workflows/:workflowId/tasks/:taskId', async (request, reply) => {
    try {
      const { workflowId, taskId } = request.params;
      const { priority } = request.body;

      await queueManager.enqueueTask(workflowId, taskId, priority);
      return reply.status(202).send({ message: 'Task queued successfully' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        if (error.message.includes('already in state')) {
          return reply.status(400).send({ error: error.message });
        }
      }
      throw error;
    }
  });

  // Cancel a queued or in-progress task
  fastify.delete<{
    Params: { workflowId: string; taskId: string };
  }>('/workflows/:workflowId/tasks/:taskId', async (request, reply) => {
    try {
      const { workflowId, taskId } = request.params;
      await queueManager.cancelTask(workflowId, taskId);
      return reply.status(200).send({ message: 'Task cancelled successfully' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
      }
      throw error;
    }
  });
} 