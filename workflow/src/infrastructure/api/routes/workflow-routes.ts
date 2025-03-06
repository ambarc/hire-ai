import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { WorkflowUseCases } from '../../../core/usecases/workflow-usecases';
import { CreateWorkflowDTO, UpdateWorkflowDTO } from '../../../core/entities/workflow';
import { UpdateTaskDTO } from '../../../core/entities/task';

interface WorkflowRouteOptions extends FastifyPluginOptions {
  workflowUseCases: WorkflowUseCases;
}

export async function workflowRoutes(
  fastify: FastifyInstance,
  options: WorkflowRouteOptions
): Promise<void> {
  const { workflowUseCases } = options;

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
} 