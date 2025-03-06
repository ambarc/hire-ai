import { Task } from './task';

export enum WorkflowStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface Workflow {
  id: string;
  version: string;
  name: string;
  description: string;
  tasks: Task[];
  status: WorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateWorkflowDTO {
  name: string;
  description: string;
  version: string;
  tasks: Task[];
  metadata?: Record<string, unknown>;
}

export interface UpdateWorkflowDTO {
  name?: string;
  description?: string;
  version?: string;
  status?: WorkflowStatus;
  metadata?: Record<string, unknown>;
} 