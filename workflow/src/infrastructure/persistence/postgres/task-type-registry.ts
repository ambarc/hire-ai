import { DataSource, Repository } from 'typeorm';
import { Entity, Column, PrimaryColumn } from 'typeorm';
// import { TaskType } from '../../../core/domain/task-type';
import { TaskTypeRegistry } from '../../../core/interfaces/repositories';

@Entity('TaskType')
class TaskTypeEntity {
  @PrimaryColumn()
  type!: string;

  @Column('text')
  description!: string;

  @Column('jsonb')
  input!: Record<string, unknown>;

  @Column('jsonb')
  output!: Record<string, unknown>;
}

// Using string type instead of TaskType domain object
export class PostgresTaskTypeRegistry implements TaskTypeRegistry {
  private repository: Repository<TaskTypeEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(TaskTypeEntity);
  }

  async registerTaskType(taskType: string): Promise<void> {
    await this.repository.save(taskType);
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