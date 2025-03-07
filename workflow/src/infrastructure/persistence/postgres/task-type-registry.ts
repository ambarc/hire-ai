import { DataSource, Repository, EntitySchema } from 'typeorm';
// import { TaskType } from '../../../core/domain/task-type';
import { TaskTypeRegistry } from '../../../core/interfaces/repositories';

// Define the interface for the entity
export interface TaskTypeEntity {
  type: string;
  description: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

// Create the entity schema
export const TaskTypeEntitySchema = new EntitySchema<TaskTypeEntity>({
  name: 'TaskType',
  columns: {
    type: {
      type: String,
      primary: true
    },
    description: {
      type: String
    },
    input: {
      type: 'jsonb'
    },
    output: {
      type: 'jsonb'
    }
  }
});

// Using string type instead of TaskType domain object
export class PostgresTaskTypeRegistry implements TaskTypeRegistry {
  private repository: Repository<TaskTypeEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(TaskTypeEntitySchema);
  }

  async registerTaskType(
    type: string, 
    schema: { 
      description: string;
      input: Record<string, unknown>; 
      output: Record<string, unknown>;
    }
  ): Promise<void> {
    await this.repository.save({
      type,
      ...schema
    });
  }

  async getTaskType(type: string): Promise<{
    description: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  } | null> {
    const taskType = await this.repository.findOneBy({ type });
    if (!taskType) return null;
    
    return {
      description: taskType.description,
      input: taskType.input,
      output: taskType.output
    };
  }

  async getAllTaskTypes(): Promise<Array<{
    type: string;
    description: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  }>> {
    const taskTypes = await this.repository.find();
    return taskTypes.map(tt => ({
      type: tt.type,
      description: tt.description,
      input: tt.input,
      output: tt.output
    }));
  }
} 