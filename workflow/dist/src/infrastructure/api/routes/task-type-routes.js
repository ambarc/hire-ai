"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskTypeRoutes = taskTypeRoutes;
async function taskTypeRoutes(fastify, options) {
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
            const { type, input, output } = request.body;
            try {
                workflowUseCases.registerTaskType(type, { input, output });
                reply.code(201).send({ message: 'Task type registered successfully' });
            }
            catch (error) {
                reply.code(400).send({ error: error instanceof Error ? error.message : 'Failed to register task type' });
            }
        }
    });
}
