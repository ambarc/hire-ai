import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { WorkflowUseCases } from '../../../core/usecases/workflow-usecases';

interface TaskTypeRouteOptions extends FastifyPluginOptions {
  workflowUseCases: WorkflowUseCases;
}

export async function taskTypeRoutes(
  fastify: FastifyInstance,
  options: TaskTypeRouteOptions
): Promise<void> {
  const { workflowUseCases } = options;

  // List available task types
  fastify.get('/', async () => {
    return workflowUseCases.getAvailableTaskTypes();
  });
} 