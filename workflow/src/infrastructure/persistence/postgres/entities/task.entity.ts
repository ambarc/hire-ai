import { EntitySchema } from 'typeorm';
import { TaskStatus } from '../../../../core/entities/task';

export interface TaskEntity {
  id: string;
  type: string;
  description: string;
  status: TaskStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  workflowId: string;
}

export const TaskEntitySchema = new EntitySchema<TaskEntity>({
  name: 'tasks',
  columns: {
    id: {
      type: 'uuid',
      primary: true
    },
    type: {
      type: String
    },
    description: {
      type: String
    },
    status: {
      type: 'enum',
      enum: TaskStatus,
      default: TaskStatus.NOT_STARTED
    },
    input: {
      type: 'jsonb'
    },
    output: {
      type: 'jsonb',
      nullable: true
    },
    error: {
      type: String,
      nullable: true
    },
    createdAt: {
      type: Date,
      createDate: true
    },
    updatedAt: {
      type: Date,
      updateDate: true
    },
    workflowId: {
      type: 'uuid'
    }
  },
  relations: {
    workflowId: {
      type: 'many-to-one',
      target: 'workflows',
      joinColumn: {
        name: 'workflowId'
      },
      onDelete: 'CASCADE'
    }
  }
}); 