import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import { workflowRoutes } from './routes/workflow-routes';
import { taskTypeRoutes } from './routes/task-type-routes';
import { queueRoutes } from './routes/queue-routes';
import { WorkflowUseCases } from '../../core/usecases/workflow-usecases';
import { QueueManager } from '../../core/usecases/queue-manager';
import { Config } from '../../config';
import path from 'path';
import fs from 'fs';

const API_VERSION = 'v0.0.1';

export async function createServer(
  config: Config,
  workflowUseCases: WorkflowUseCases,
  queueManager: QueueManager
): Promise<FastifyInstance> {
  const server = fastify({
    logger: true
  });

  // Register CORS
  await server.register(cors, {
    origin: true
  });

  // Register Swagger
  await server.register(swagger, {
    openapi: {
      info: {
        title: 'Workflow Service API',
        description: 'API for managing workflows and tasks',
        version: API_VERSION
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
  await server.register(swaggerUi, {
    routePrefix: '/documentation'
  });

  // Register static file server
  let staticPath = path.join(__dirname, '..', '..', '..', 'public');
  if (!fs.existsSync(staticPath)) {
    staticPath = path.join(__dirname, '..', '..', 'public');
  }
  
  if (fs.existsSync(staticPath)) {
    await server.register(fastifyStatic, {
      root: staticPath,
      prefix: '/static/'
    });
  }

  // Register routes
  await server.register(workflowRoutes, { 
    prefix: '/workflows',
    workflowUseCases,
    queueManager
  });

  await server.register(taskTypeRoutes, {
    prefix: '/task-types',
    workflowUseCases
  });

  await server.register(queueRoutes, {
    prefix: '/queue',
    queueManager
  });

  // Health check route
  server.get('/health', async () => {
    return { status: 'ok' };
  });

  // Serve admin UI
  server.get('/admin', async (request, reply) => {
    // Look for the index.html file in the public directory relative to the current file
    let adminUiPath = path.join(__dirname, '..', '..', '..', 'public', 'admin', 'index.html');
    
    // If running from the dist directory, adjust the path
    if (!fs.existsSync(adminUiPath)) {
      adminUiPath = path.join(__dirname, '..', '..', 'public', 'admin', 'index.html');
    }
    
    try {
      const content = fs.readFileSync(adminUiPath, 'utf8');
      reply.type('text/html').send(content);
    } catch (err) {
      console.error(`Error reading admin UI file: ${err}`);
      reply.code(500).send({ error: 'Failed to load admin UI' });
    }
  });

  // Redirect root to admin
  server.get('/', async (request, reply) => {
    reply.redirect('/admin');
  });

  // Version endpoint
  server.get('/_version', async () => {
    return { version: API_VERSION };
  });

  // New endpoint to manually process the next task in the queue
  server.post('/queue/process-next', async (req, reply) => {
    try {
      await queueManager.processNextTask();
      return { success: true, message: 'Next task processing initiated' };
    } catch (error) {
      console.error('Error processing next task:', error);
      reply.code(500).send({ error: 'Failed to process next task' });
    }
  });

  return server;
}

export async function startServer(
  server: FastifyInstance,
  config: Config
): Promise<void> {
  try {
    await server.listen({ 
      port: config.SERVER_PORT,
      host: '0.0.0.0'
    });
    console.log(`Server is running on port ${config.SERVER_PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
} 