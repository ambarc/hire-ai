export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
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
}

export interface UpdateTaskDTO {
  status?: TaskStatus;
  output?: Record<string, unknown>;
  error?: string;
}

export interface TaskTypeDefinition {
  type: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
} 