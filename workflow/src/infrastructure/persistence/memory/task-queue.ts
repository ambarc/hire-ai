import { TaskQueue, QueuedTask, QueueStatus } from '../../../core/interfaces/queue';

export class InMemoryTaskQueue implements TaskQueue {
  private pendingTasks: QueuedTask[] = [];
  private inProgressTasks: QueuedTask[] = [];
  private activeWorkers = 0;

  async enqueue(workflowId: string, taskId: string, priority = 0): Promise<void> {
    const queuedTask: QueuedTask = {
      workflowId,
      taskId,
      priority,
      enqueuedAt: new Date(),
      attempts: 0
    };

    // Insert task in priority order
    const insertIndex = this.pendingTasks.findIndex(t => t.priority < priority);
    if (insertIndex === -1) {
      this.pendingTasks.push(queuedTask);
    } else {
      this.pendingTasks.splice(insertIndex, 0, queuedTask);
    }
  }

  async dequeue(): Promise<QueuedTask | null> {
    if (this.pendingTasks.length === 0) {
      return null;
    }

    const task = this.pendingTasks.shift()!;
    task.attempts++;
    task.lastAttempt = new Date();
    this.inProgressTasks.push(task);
    return task;
  }

  async peek(): Promise<QueuedTask | null> {
    return this.pendingTasks[0] || null;
  }

  async getStatus(): Promise<QueueStatus> {
    return {
      size: this.pendingTasks.length + this.inProgressTasks.length,
      activeWorkers: this.activeWorkers,
      pendingTasks: [...this.pendingTasks],
      inProgressTasks: [...this.inProgressTasks]
    };
  }

  async remove(workflowId: string, taskId: string): Promise<boolean> {
    const pendingIndex = this.pendingTasks.findIndex(
      t => t.workflowId === workflowId && t.taskId === taskId
    );
    
    if (pendingIndex !== -1) {
      this.pendingTasks.splice(pendingIndex, 1);
      return true;
    }

    const inProgressIndex = this.inProgressTasks.findIndex(
      t => t.workflowId === workflowId && t.taskId === taskId
    );

    if (inProgressIndex !== -1) {
      this.inProgressTasks.splice(inProgressIndex, 1);
      return true;
    }

    return false;
  }

  async clear(): Promise<void> {
    this.pendingTasks = [];
    this.inProgressTasks = [];
  }

  async size(): Promise<number> {
    return this.pendingTasks.length + this.inProgressTasks.length;
  }

  // Additional helper methods for managing in-progress tasks
  async markTaskComplete(workflowId: string, taskId: string): Promise<void> {
    const index = this.inProgressTasks.findIndex(
      t => t.workflowId === workflowId && t.taskId === taskId
    );
    if (index !== -1) {
      this.inProgressTasks.splice(index, 1);
    }
  }

  async markTaskFailed(workflowId: string, taskId: string): Promise<void> {
    const index = this.inProgressTasks.findIndex(
      t => t.workflowId === workflowId && t.taskId === taskId
    );
    if (index !== -1) {
      const task = this.inProgressTasks[index];
      this.inProgressTasks.splice(index, 1);
      // Requeue the task if it hasn't exceeded max attempts
      if (task.attempts < 3) { // TODO: Make max attempts configurable
        await this.enqueue(task.workflowId, task.taskId, task.priority);
      }
    }
  }

  setActiveWorkers(count: number): void {
    this.activeWorkers = count;
  }
} 