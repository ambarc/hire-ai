import { DataSource } from 'typeorm';
import { WorkflowRepository, TaskTypeRegistry } from '../../core/interfaces/repositories';
import { FileWorkflowRepository } from './file/workflow-repository';
import { FileTaskTypeRegistry } from './file/task-type-registry';
import { PostgresWorkflowRepository } from './postgres/workflow-repository';
import { PostgresTaskTypeRegistry } from './postgres/task-type-registry';
import { InMemoryTaskTypeRegistry } from './task-type-registry';
import { InMemoryWorkflowRepository } from './workflow-repository';
import { config } from '../../config';

export function createRepositories(): {
  workflowRepository: WorkflowRepository;
  taskTypeRegistry: TaskTypeRegistry;
} {
  switch (config.STORAGE_TYPE) {
    case 'file':
      return {
        workflowRepository: new FileWorkflowRepository(config.FILE_STORAGE_PATH),
        taskTypeRegistry: new FileTaskTypeRegistry(config.FILE_STORAGE_PATH)
      };
    case 'postgres':
      // Assuming you have a dataSource configured elsewhere
      const dataSource = getDataSource(); // You'll need to implement this
      return {
        workflowRepository: new PostgresWorkflowRepository(dataSource),
        taskTypeRegistry: new PostgresTaskTypeRegistry(dataSource)
      };
    case 'memory':
      return {
        workflowRepository: new InMemoryWorkflowRepository(),
        taskTypeRegistry: new InMemoryTaskTypeRegistry()
      };
    default:
      throw new Error(`Unsupported storage type: ${config.STORAGE_TYPE}`);
  }
}

function getDataSource(): DataSource {
  // Implementation to get your TypeORM DataSource
  // This could be imported from elsewhere in your application
} 