import { EntitySchema } from 'typeorm';
import { WorkflowStatus } from '../../../../core/entities/workflow';
import { TaskEntity } from './task.entity';

export interface WorkflowEntity {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
  tasks?: TaskEntity[];
}

export const WorkflowEntitySchema = new EntitySchema<WorkflowEntity>({
  name: 'workflows',
  columns: {
    id: {
      type: 'uuid',
      primary: true
    },
    name: {
      type: String
    },
    description: {
      type: String
    },
    status: {
      type: 'enum',
      enum: WorkflowStatus,
      default: WorkflowStatus.NOT_STARTED
    },
    createdAt: {
      type: Date,
      createDate: true
    },
    updatedAt: {
      type: Date,
      updateDate: true
    }
  },
  relations: {
    tasks: {
      type: 'one-to-many',
      target: 'tasks',
      inverseSide: 'workflow_id'
    }
  }
}); 