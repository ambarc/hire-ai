"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
exports.startServer = startServer;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const static_1 = __importDefault(require("@fastify/static"));
const workflow_routes_1 = require("./routes/workflow-routes");
const task_type_routes_1 = require("./routes/task-type-routes");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
async function createServer(config, workflowUseCases) {
    const server = (0, fastify_1.default)({
        logger: true
    });
    // Register CORS
    await server.register(cors_1.default, {
        origin: true
    });
    // Register Swagger
    await server.register(swagger_1.default, {
        openapi: {
            info: {
                title: 'Workflow Service API',
                description: 'API for managing workflows and tasks',
                version: '1.0.0'
            },
            servers: [
                {
                    url: `http://localhost:${config.SERVER_PORT}`,
                    description: 'Local development server'
                }
            ]
        }
    });
    // Register Swagger UI
    await server.register(swagger_ui_1.default, {
        routePrefix: '/documentation'
    });
    // Register static file server
    let staticPath = path_1.default.join(__dirname, '..', '..', '..', 'public');
    if (!fs_1.default.existsSync(staticPath)) {
        staticPath = path_1.default.join(__dirname, '..', '..', 'public');
    }
    if (fs_1.default.existsSync(staticPath)) {
        await server.register(static_1.default, {
            root: staticPath,
            prefix: '/static/'
        });
    }
    // Register routes
    await server.register(workflow_routes_1.workflowRoutes, {
        prefix: '/api/workflows',
        workflowUseCases
    });
    await server.register(task_type_routes_1.taskTypeRoutes, {
        prefix: '/api/task-types',
        workflowUseCases
    });
    // Health check route
    server.get('/health', async () => {
        return { status: 'ok' };
    });
    // Serve admin UI
    server.get('/', async (request, reply) => {
        // Look for the index.html file in the public directory relative to the current file
        let adminUiPath = path_1.default.join(__dirname, '..', '..', '..', 'public', 'index.html');
        // If running from the dist directory, adjust the path
        if (!fs_1.default.existsSync(adminUiPath)) {
            adminUiPath = path_1.default.join(__dirname, '..', '..', 'public', 'index.html');
        }
        try {
            const content = fs_1.default.readFileSync(adminUiPath, 'utf8');
            reply.type('text/html').send(content);
        }
        catch (err) {
            console.error(`Error reading admin UI file: ${err}`);
            reply.code(500).send({ error: 'Failed to load admin UI' });
        }
    });
    return server;
}
async function startServer(server, config) {
    try {
        await server.listen({
            port: config.SERVER_PORT,
            host: '0.0.0.0'
        });
        console.log(`Server is running on port ${config.SERVER_PORT}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}
