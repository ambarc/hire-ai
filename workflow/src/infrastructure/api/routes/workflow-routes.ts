import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { WorkflowUseCases } from '../../../core/usecases/workflow-usecases';
import { QueueManager } from '../../../core/usecases/queue-manager';
import { CreateWorkflowDTO, UpdateWorkflowDTO } from '../../../core/entities/workflow';
import { UpdateTaskDTO } from '../../../core/entities/task';

interface WorkflowRouteOptions extends FastifyPluginOptions {
  workflowUseCases: WorkflowUseCases;
  queueManager: QueueManager;
}

export async function workflowRoutes(
  fastify: FastifyInstance,
  options: WorkflowRouteOptions
): Promise<void> {
  const { workflowUseCases, queueManager } = options;

  // List all workflows
  fastify.get('/', async () => {
    return workflowUseCases.listWorkflows();
  });

  // Create workflow
  fastify.post<{ Body: CreateWorkflowDTO }>('/', async (request, reply) => {
    const workflow = await workflowUseCases.createWorkflow(request.body);
    return reply.status(201).send(workflow);
  });

  // Get workflow by ID
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const workflow = await workflowUseCases.getWorkflow(request.params.id);
    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }
    return workflow;
  });

  // Update workflow
  fastify.put<{ Params: { id: string }; Body: UpdateWorkflowDTO }>(
    '/:id',
    async (request, reply) => {
      try {
        const workflow = await workflowUseCases.updateWorkflow(
          request.params.id,
          request.body
        );
        return workflow;
      } catch (error) {
        if (error instanceof Error && error.message === 'Workflow not found') {
          return reply.status(404).send({ error: 'Workflow not found' });
        }
        throw error;
      }
    }
  );

  // Delete workflow
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      await workflowUseCases.deleteWorkflow(request.params.id);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === 'Workflow not found') {
        return reply.status(404).send({ error: 'Workflow not found' });
      }
      throw error;
    }
  });

  // Update task
  fastify.patch<{
    Params: { id: string; taskId: string };
    Body: UpdateTaskDTO;
  }>('/:id/tasks/:taskId', async (request, reply) => {
    try {
      const workflow = await workflowUseCases.updateTask(
        request.params.id,
        request.params.taskId,
        request.body
      );
      return workflow;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Workflow not found') {
          return reply.status(404).send({ error: 'Workflow not found' });
        }
        if (error.message === 'Task not found') {
          return reply.status(404).send({ error: 'Task not found' });
        }
      }
      throw error;
    }
  });

  // Enqueue a task for execution
  fastify.post<{
    Params: { id: string; taskId: string };
    Body: { priority?: number };
  }>('/:id/tasks/:taskId/enqueue', async (request, reply) => {
    try {
      const { id: workflowId, taskId } = request.params;
      const { priority } = request.body;

      await queueManager.enqueueTask(workflowId, taskId, priority);
      return reply.status(202).send({ 
        message: 'Task queued successfully',
        workflowId,
        taskId
      });
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

  // Cancel a task execution
  fastify.post<{
    Params: { id: string; taskId: string };
  }>('/:id/tasks/:taskId/cancel', async (request, reply) => {
    try {
      const { id: workflowId, taskId } = request.params;
      await queueManager.cancelTask(workflowId, taskId);
      return reply.status(200).send({ 
        message: 'Task cancelled successfully',
        workflowId,
        taskId
      });
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