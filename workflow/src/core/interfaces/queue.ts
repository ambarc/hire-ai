export interface QueuedTask {
  workflowId: string;
  taskId: string;
  priority: number;
  enqueuedAt: Date;
  attempts: number;
  lastAttempt?: Date;
}

export interface QueueStatus {
  size: number;
  activeWorkers: number;
  pendingTasks: QueuedTask[];
  inProgressTasks: QueuedTask[];
}

export interface TaskQueue {
  enqueue(workflowId: string, taskId: string, priority?: number): Promise<void>;
  dequeue(): Promise<QueuedTask | null>;
  peek(): Promise<QueuedTask | null>;
  getStatus(): Promise<QueueStatus>;
  remove(workflowId: string, taskId: string): Promise<boolean>;
  clear(): Promise<void>;
  size(): Promise<number>;
  markTaskComplete(workflowId: string, taskId: string): Promise<void>;
  markTaskFailed(workflowId: string, taskId: string): Promise<void>;
} 