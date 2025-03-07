export interface ResourceRequirements {
  memory?: number; // in MB
  cpu?: number; // in cores/units
  gpu?: boolean;
}

export interface TaskExecutorCapabilities {
  maxConcurrentTasks: number;
  supportedTaskTypes: string[];
  resourceRequirements: ResourceRequirements;
}

export interface ExecutionMetrics {
  startTime: Date;
  endTime: Date;
  memoryUsage: number;
  cpuUsage: number;
}

export interface TaskResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  metrics?: ExecutionMetrics;
}

export interface TaskExecutor {
  execute(workflowId: string, taskId: string): Promise<TaskResult>;
  validateInput(workflowId: string, taskId: string): Promise<boolean>;
  getCapabilities(): TaskExecutorCapabilities;
  stop(workflowId: string, taskId: string): Promise<void>;
} 