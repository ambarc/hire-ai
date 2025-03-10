export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  CANCELLED = 'CANCELLED'
}

export interface TaskExecutionDetails {
  queuedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  lastError?: string;
  workerId?: string;
}

export interface Task {
  id: string;
  type: string;
  description: string;
  status: TaskStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  executionDetails?: TaskExecutionDetails;
}

export interface UpdateTaskDTO {
  status?: TaskStatus;
  output?: Record<string, unknown>;
  error?: string;
  executionDetails?: Partial<TaskExecutionDetails>;
}

export interface TaskTypeDefinition {
  type: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
} 