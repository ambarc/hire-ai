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

  // Register new task type
  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['type', 'input', 'output'],
        properties: {
          type: { type: 'string' },
          input: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              required: ['type'],
              properties: {
                type: { type: 'string', enum: ['string', 'number', 'boolean', 'object', 'array'] }
              }
            }
          },
          output: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              required: ['type'],
              properties: {
                type: { type: 'string', enum: ['string', 'number', 'boolean', 'object', 'array'] }
              }
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { type, input, output } = request.body as {
        type: string;
        input: Record<string, { type: string }>;
        output: Record<string, { type: string }>;
      };

      try {
        workflowUseCases.registerTaskType(type, { input, output });
        reply.code(201).send({ message: 'Task type registered successfully' });
      } catch (error) {
        reply.code(400).send({ error: error instanceof Error ? error.message : 'Failed to register task type' });
      }
    }
  });
} 