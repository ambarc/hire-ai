import { TaskQueue, QueueStatus } from '../interfaces/queue';
import { WorkerPool } from '../interfaces/worker';
import { TaskExecutor } from '../interfaces/executor';
import { WorkflowRepository } from '../interfaces/repositories';
import { TaskStatus, Task } from '../entities/task';

export class QueueManager {
  constructor(
    private taskQueue: TaskQueue,
    private workerPool: WorkerPool,
    private taskExecutor: TaskExecutor,
    private workflowRepository: WorkflowRepository
  ) {}

  async enqueueTask(workflowId: string, taskId: string, priority = 0): Promise<void> {
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const task = workflow.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== TaskStatus.NOT_STARTED) {
      throw new Error(`Task is already in state: ${task.status}`);
    }

    // Update task status to QUEUED
    await this.workflowRepository.updateTask(workflowId, taskId, {
      status: TaskStatus.QUEUED,
      executionDetails: {
        queuedAt: new Date(),
        attempts: 0
      }
    });

    // Add to queue
    await this.taskQueue.enqueue(workflowId, taskId, priority);
  }

  async processNextTask(): Promise<void> {
    const queuedTask = await this.taskQueue.dequeue();
    if (!queuedTask) {
      return;
    }

    const { workflowId, taskId } = queuedTask;
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      return;
    }

    const task = workflow.tasks.find(t => t.id === taskId);
    if (!task) {
      return;
    }

    // Get available worker
    const worker = await this.workerPool.getAvailableWorker(task.type);
    if (!worker) {
      // Re-queue the task if no worker is available
      await this.taskQueue.enqueue(workflowId, taskId, queuedTask.priority);
      return;
    }

    try {
      // Update task status to IN_PROGRESS
      await this.workflowRepository.updateTask(workflowId, taskId, {
        status: TaskStatus.IN_PROGRESS,
        executionDetails: {
          ...task.executionDetails,
          startedAt: new Date(),
          workerId: worker.id
        }
      });

      // Execute the task
      const result = await this.taskExecutor.execute(workflowId, taskId);

      // Update task based on result
      if (result.success) {
        await this.workflowRepository.updateTask(workflowId, taskId, {
          status: TaskStatus.COMPLETED,
          output: result.output,
          executionDetails: {
            ...task.executionDetails,
            completedAt: new Date()
          }
        });
        await this.taskQueue.markTaskComplete(workflowId, taskId);
      } else {
        await this.workflowRepository.updateTask(workflowId, taskId, {
          status: TaskStatus.FAILED,
          error: result.error,
          executionDetails: {
            ...task.executionDetails,
            lastError: result.error
          }
        });
        await this.taskQueue.markTaskFailed(workflowId, taskId);
      }
    } catch (error) {
      // Handle execution error
      await this.workflowRepository.updateTask(workflowId, taskId, {
        status: TaskStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionDetails: {
          ...task.executionDetails,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      await this.taskQueue.markTaskFailed(workflowId, taskId);
    }
  }

  async getQueueStatus(): Promise<QueueStatus> {
    return this.taskQueue.getStatus();
  }

  async cancelTask(workflowId: string, taskId: string): Promise<void> {
    // Try to remove from queue first
    const removed = await this.taskQueue.remove(workflowId, taskId);
    
    if (removed) {
      // Update task status to CANCELLED
      await this.workflowRepository.updateTask(workflowId, taskId, {
        status: TaskStatus.CANCELLED
      });
      return;
    }

    // If task is in progress, try to stop it
    await this.taskExecutor.stop(workflowId, taskId);
    
    // Update task status to CANCELLED
    await this.workflowRepository.updateTask(workflowId, taskId, {
      status: TaskStatus.CANCELLED
    });
  }
} 