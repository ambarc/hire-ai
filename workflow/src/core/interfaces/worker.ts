import { TaskExecutorCapabilities } from './executor';

export enum WorkerStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR'
}

export interface Worker {
  id: string;
  capabilities: TaskExecutorCapabilities;
  status: WorkerStatus;
  lastHeartbeat: Date;
  currentTasks: string[];
}

export interface WorkerPool {
  registerWorker(worker: Worker): Promise<void>;
  unregisterWorker(workerId: string): Promise<void>;
  getAvailableWorker(taskType: string): Promise<Worker | null>;
  getWorkerStatus(workerId: string): Promise<WorkerStatus>;
  updateWorkerStatus(workerId: string, status: WorkerStatus): Promise<void>;
  getWorkerLoad(): Promise<Map<string, number>>;
  cleanup(): Promise<void>;
} 