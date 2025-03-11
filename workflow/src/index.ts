import path from 'path';
import { DataSource } from 'typeorm';
import loadConfig from './config';
import { WorkflowUseCases } from './core/usecases/workflow-usecases';
import { QueueManager } from './core/usecases/queue-manager';
import { FileWorkflowRepository } from './infrastructure/persistence/file/workflow-repository';
import { FileTaskTypeRegistry } from './infrastructure/persistence/file/task-type-registry';
import { PostgresWorkflowRepository } from './infrastructure/persistence/postgres/workflow-repository';
import { InMemoryWorkflowRepository } from './infrastructure/persistence/workflow-repository';
import { InMemoryTaskTypeRegistry } from './infrastructure/persistence/task-type-registry';
import { InMemoryTaskQueue } from './infrastructure/persistence/memory/task-queue';
import { InMemoryWorkerPool } from './infrastructure/persistence/memory/worker-pool';
import { LocalTaskExecutor } from './infrastructure/execution/local-executor';
import { createServer, startServer } from './infrastructure/api/server';
import { WorkflowEntitySchema } from './infrastructure/persistence/postgres/entities/workflow.entity';
import { TaskEntitySchema } from './infrastructure/persistence/postgres/entities/task.entity';

// Function to create a PostgreSQL data source
function createDataSource(config: ReturnType<typeof loadConfig>) {
  if (!config.PG_HOST || !config.PG_PORT || !config.PG_USER || !config.PG_PASSWORD || !config.PG_DATABASE) {
    throw new Error('PostgreSQL configuration is incomplete. Please check your environment variables.');
  }

  return new DataSource({
    type: 'postgres',
    host: config.PG_HOST,
    port: config.PG_PORT,
    username: config.PG_USER,
    password: config.PG_PASSWORD,
    database: config.PG_DATABASE,
    synchronize: config.NODE_ENV === 'development',
    logging: config.NODE_ENV === 'development',
    entities: [WorkflowEntitySchema, TaskEntitySchema],
  });
}

async function main() {
  try {
    // Load configuration
    const config = loadConfig();
    console.log(`Starting workflow service in ${config.NODE_ENV} mode`);

    // Initialize task type registry
    let taskTypeRegistry;
    if (config.STORAGE_TYPE === 'postgres') {
      // TODO: Implement PostgreSQL-based task type registry if needed
      const baseDir = path.resolve(process.cwd(), config.FILE_STORAGE_PATH);
      taskTypeRegistry = new FileTaskTypeRegistry(baseDir);
    } else if (config.STORAGE_TYPE === 'file') {
      const baseDir = path.resolve(process.cwd(), config.FILE_STORAGE_PATH);
      taskTypeRegistry = new FileTaskTypeRegistry(baseDir);
    } else {
      console.log('Using in-memory task type registry');
      taskTypeRegistry = new InMemoryTaskTypeRegistry();
    } 

    // Initialize repository based on configuration
    let workflowRepository;
    if (config.STORAGE_TYPE === 'postgres') {
      console.log('Using PostgreSQL storage');
      const dataSource = createDataSource(config);
      await dataSource.initialize();
      console.log('PostgreSQL connection established');
      workflowRepository = new PostgresWorkflowRepository(dataSource);
    } else if (config.STORAGE_TYPE === 'file') {
      console.log('Using file storage');
      const baseDir = path.resolve(process.cwd(), config.FILE_STORAGE_PATH);
      workflowRepository = new FileWorkflowRepository(baseDir);
    } else {
      console.log('Using in-memory storage');
      workflowRepository = new InMemoryWorkflowRepository();
    }

    // Initialize task queue components
    const taskQueue = new InMemoryTaskQueue();
    const workerPool = new InMemoryWorkerPool();
    const taskExecutor = new LocalTaskExecutor(workflowRepository);

    // Initialize use cases
    const workflowUseCases = new WorkflowUseCases(workflowRepository, taskTypeRegistry);
    const queueManager = new QueueManager(taskQueue, workerPool, taskExecutor, workflowRepository, workflowUseCases);

    // Start task processing loop
    // const processInterval = setInterval(async () => {
    //   try {
    //     await queueManager.processNextTask();
    //   } catch (error) {
    //     console.error('Error processing task:', error);
    //   }
    // }, 1000); // Process tasks every second

    // Create and start server
    const server = await createServer(config, workflowUseCases, queueManager);
    await startServer(server, config);

    // Cleanup on shutdown
    // const cleanup = async () => {
    //   clearInterval(processInterval);
    //   await server.close();
    //   process.exit(0);
    // };

    // process.on('SIGINT', cleanup);
    // process.on('SIGTERM', cleanup);
  } catch (error) {
    console.error('Failed to start workflow service:', error);
    process.exit(1);
  }
}

// Start the application
main(); 