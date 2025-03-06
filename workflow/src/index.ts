import path from 'path';
import { DataSource } from 'typeorm';
import loadConfig from './config';
import { WorkflowUseCases } from './core/usecases/workflow-usecases';
import { FileWorkflowRepository } from './infrastructure/persistence/file/workflow-repository';
import { FileTaskTypeRegistry } from './infrastructure/persistence/file/task-type-registry';
import { PostgresWorkflowRepository } from './infrastructure/persistence/postgres/workflow-repository';
import { createServer, startServer } from './infrastructure/api/server';
import { WorkflowEntity } from './infrastructure/persistence/postgres/entities/workflow.entity';
import { TaskEntity } from './infrastructure/persistence/postgres/entities/task.entity';

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
    entities: [WorkflowEntity, TaskEntity],
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
    } else {
      const baseDir = path.resolve(process.cwd(), config.FILE_STORAGE_PATH);
      taskTypeRegistry = new FileTaskTypeRegistry(baseDir);
    }

    // Initialize repository based on configuration
    let workflowRepository;
    if (config.STORAGE_TYPE === 'postgres') {
      console.log('Using PostgreSQL storage');
      const dataSource = createDataSource(config);
      await dataSource.initialize();
      console.log('PostgreSQL connection established');
      workflowRepository = new PostgresWorkflowRepository(dataSource);
    } else {
      console.log('Using file storage');
      const baseDir = path.resolve(process.cwd(), config.FILE_STORAGE_PATH);
      workflowRepository = new FileWorkflowRepository(baseDir);
    }

    // Initialize use cases
    const workflowUseCases = new WorkflowUseCases(workflowRepository, taskTypeRegistry);

    // Create and start server
    const server = await createServer(config, workflowUseCases);
    await startServer(server, config);
  } catch (error) {
    console.error('Failed to start workflow service:', error);
    process.exit(1);
  }
}

// Start the application
main(); 