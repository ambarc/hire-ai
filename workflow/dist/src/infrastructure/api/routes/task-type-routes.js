"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskTypeRoutes = taskTypeRoutes;
async function taskTypeRoutes(fastify, options) {
    const { workflowUseCases } = options;
    // List available task types
    fastify.get('/', async () => {
        return workflowUseCases.getAvailableTaskTypes();
    });
}
