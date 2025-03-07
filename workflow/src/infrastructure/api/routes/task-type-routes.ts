import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { WorkflowUseCases } from '../../../core/usecases/workflow-usecases';

export interface TaskTypeRouteOptions extends FastifyPluginOptions {
  workflowUseCases: WorkflowUseCases;
}

export async function taskTypeRoutes(fastify: FastifyInstance, options: TaskTypeRouteOptions): Promise<void> {
  const { workflowUseCases } = options;

  // Get all task types
  fastify.get('/', async () => {
    const taskTypes = await workflowUseCases.getAvailableTaskTypes();
    return taskTypes;
  });

  // Register a new task type
  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['type', 'description', 'input', 'output'],
        properties: {
          type: { type: 'string' },
          description: { type: 'string' },
          input: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                optional: { type: 'boolean' }
              },
              required: ['type']
            }
          },
          output: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                optional: { type: 'boolean' }
              },
              required: ['type']
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { type, description, input, output } = request.body as {
      type: string;
      description: string;
      input: Record<string, unknown>;
      output: Record<string, unknown>;
    };

    try {
      await workflowUseCases.registerTaskType(type, { 
        description,
        input, 
        output 
      });
      reply.code(201).send({ message: 'Task type registered successfully' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        reply.code(400).send({ error: error.message });
      } else {
        throw error;
      }
    }
  });
} 