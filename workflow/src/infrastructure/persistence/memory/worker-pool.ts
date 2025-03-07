import { WorkerPool, Worker, WorkerStatus } from '../../../core/interfaces/worker';
import { v4 as uuidv4 } from 'uuid';

export class InMemoryWorkerPool implements WorkerPool {
  private workers: Map<string, Worker> = new Map();
  private heartbeatTimeout = 30000; // 30 seconds

  constructor(initializeDefaultWorker = true) {
    if (initializeDefaultWorker) {
      this.initializeDefaultWorker();
    }
  }

  private initializeDefaultWorker(): void {
    console.log('initializing default worker');
    const defaultWorker: Worker = {
      id: `default-worker-${uuidv4()}`,
      name: 'Default In-Memory Worker',
      status: WorkerStatus.AVAILABLE,
      capabilities: {
        supportedTaskTypes: ['default', 'processing', 'calculation', 'validation'],
        maxConcurrentTasks: 5
      },
      lastHeartbeat: new Date(),
      currentTasks: []
    };

    this.registerWorker(defaultWorker);
    console.log(`Initialized default worker with ID: ${defaultWorker.id}`);
    console.log('workers after default initialization:', this.workers);
  }

  async registerWorker(worker: Worker): Promise<void> {
    this.registerWorkerSync(worker);
  }

  registerWorkerSync(worker: Worker): void {
    this.workers.set(worker.id, {
      ...worker,
      status: WorkerStatus.AVAILABLE,
      lastHeartbeat: new Date(),
      currentTasks: []
    });
  }

  async unregisterWorker(workerId: string): Promise<void> {
    this.unregisterWorkerSync(workerId);
  }

  unregisterWorkerSync(workerId: string): void {
    this.workers.delete(workerId);
  }

  async getAvailableWorker(taskType: string): Promise<Worker | null> {
    return this.getAvailableWorkerSync(taskType);
  }

  getAvailableWorkerSync(taskType: string): Worker | null {
    // Clean up stale workers first
    // this.cleanupSync();

    console.log('workers:', this.workers);

    // Find an available worker that supports the task type
    for (const worker of this.workers.values()) {
      console.log('considering worker:', worker);
      if (
        worker.status === WorkerStatus.AVAILABLE // &&
        // worker.capabilities.supportedTaskTypes.includes(taskType)
      ) {
        return worker;
      }
    }

    return null;
  }

  async getWorkerStatus(workerId: string): Promise<WorkerStatus> {
    return this.getWorkerStatusSync(workerId);
  }

  getWorkerStatusSync(workerId: string): WorkerStatus {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    // Check if worker is stale
    if (this.isWorkerStale(worker)) {
      worker.status = WorkerStatus.OFFLINE;
    }

    return worker.status;
  }

  async updateWorkerStatus(workerId: string, status: WorkerStatus): Promise<void> {
    this.updateWorkerStatusSync(workerId, status);
  }

  updateWorkerStatusSync(workerId: string, status: WorkerStatus): void {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    worker.status = status;
    worker.lastHeartbeat = new Date();
  }

  async getWorkerLoad(): Promise<Map<string, number>> {
    return this.getWorkerLoadSync();
  }

  getWorkerLoadSync(): Map<string, number> {
    const workerLoad = new Map<string, number>();
    
    for (const [id, worker] of this.workers.entries()) {
      if (!this.isWorkerStale(worker)) {
        workerLoad.set(id, worker.currentTasks.length);
      }
    }

    return workerLoad;
  }

  async cleanup(): Promise<void> {
    this.cleanupSync();
  }

  cleanupSync(): void {
    for (const [id, worker] of this.workers.entries()) {
      if (this.isWorkerStale(worker)) {
        // If worker has tasks, mark them for retry
        if (worker.currentTasks.length > 0) {
          worker.status = WorkerStatus.ERROR;
        } else {
          // Remove worker if it has no tasks
          this.workers.delete(id);
        }
      }
    }
  }

  // Helper methods
  private isWorkerStale(worker: Worker): boolean {
    const now = new Date().getTime();
    const lastHeartbeat = worker.lastHeartbeat.getTime();
    return now - lastHeartbeat > this.heartbeatTimeout;
  }

  // Additional methods for task management
  async assignTaskToWorker(workerId: string, taskId: string): Promise<void> {
    this.assignTaskToWorkerSync(workerId, taskId);
  }

  assignTaskToWorkerSync(workerId: string, taskId: string): void {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    worker.currentTasks.push(taskId);
    if (worker.currentTasks.length >= worker.capabilities.maxConcurrentTasks) {
      worker.status = WorkerStatus.BUSY;
    }
  }

  async removeTaskFromWorker(workerId: string, taskId: string): Promise<void> {
    this.removeTaskFromWorkerSync(workerId, taskId);
  }

  removeTaskFromWorkerSync(workerId: string, taskId: string): void {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    worker.currentTasks = worker.currentTasks.filter(id => id !== taskId);
    if (worker.currentTasks.length < worker.capabilities.maxConcurrentTasks) {
      worker.status = WorkerStatus.AVAILABLE;
    }
  }
} 