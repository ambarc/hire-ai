import { TaskQueue, QueueStatus } from '../interfaces/queue';
import { WorkerPool } from '../interfaces/worker';
import { TaskExecutor } from '../interfaces/executor';
import { WorkflowRepository } from '../interfaces/repositories';
import { TaskStatus, Task } from '../entities/task';
import { WorkflowUseCases } from './workflow-usecases';
import { Logger } from '../../utils/logger';
import { EventEmitter } from 'events';

export class QueueManager extends EventEmitter {
  private queue: Task[] = [];
  private logger: Logger;

  constructor(
    private taskQueue: TaskQueue,
    private workerPool: WorkerPool,
    private taskExecutor: TaskExecutor,
    private workflowRepository: WorkflowRepository,
    private workflowUseCases: WorkflowUseCases
  ) {
    super();
    this.logger = new Logger('QueueManager');
  }

  async enqueueTask(workflowId: string, taskId: string, priority = 0): Promise<void> {
    console.log('calling enqueue task:', workflowId, taskId, priority);
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

    console.log('Enqueuing task:', workflowId, taskId, priority);

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

    console.log('going to search for workers')

    // Get available worker
    const worker = await this.workerPool.getAvailableWorker(task.type);
    console.log('worker:', worker);
    if (!worker) {
      // Re-queue the task if no worker is available
      console.log('no worker found, re-queuing task');
      await this.taskQueue.enqueue(workflowId, taskId, queuedTask.priority);
      return;
    }

    console.log('Processing task:', workflowId, taskId);
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

      console.log('Task result post execution:', result);
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

  public async queueTask(workflowId: string, taskId: string): Promise<void> {
    const workflow = await this.workflowUseCases.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const task = workflow.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId} in workflow ${workflowId}`);
    }

    // Check if task is already in the queue
    const isAlreadyQueued = this.queue.some(t => t.id === taskId);
    if (isAlreadyQueued) {
      this.logger.warn(`Task ${taskId} is already in the queue`);
      return;
    }

    // Check if task is eligible to be queued (all dependencies completed)
    const canBeQueued = this.canTaskBeQueued(workflow.tasks, task);
    if (!canBeQueued) {
      throw new Error(`Task ${taskId} cannot be queued because its dependencies are not completed`);
    }

    // Add task to queue
    const queuedTask = {
      ...task,
      workflowId
    };
    
    this.queue.push(queuedTask);
    
    // Update task status to QUEUED
    await this.workflowUseCases.updateTaskStatus(workflowId, taskId, TaskStatus.QUEUED);
    
    this.logger.info(`Task ${taskId} added to queue`);
    this.emit('taskQueued', queuedTask);
  }

  public async queueWorkflow(workflowId: string): Promise<void> {
    const workflow = await this.workflowUseCases.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    this.logger.info(`Queueing all eligible tasks for workflow: ${workflowId}`);
    
    // Find tasks with no dependencies or all dependencies completed
    const tasksToQueue = workflow.tasks.filter(task => 
      this.canTaskBeQueued(workflow.tasks, task) && 
      task.status === TaskStatus.NOT_STARTED
    );

    for (const task of tasksToQueue) {
      await this.queueTask(workflowId, task.id);
    }

    this.logger.info(`Queued ${tasksToQueue.length} tasks for workflow: ${workflowId}`);
  }

  public async queueReadyTasks(workflowId: string): Promise<void> {
    const workflow = await this.workflowUseCases.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Find tasks that are ready to be queued after a task completion
    const tasksToQueue = workflow.tasks.filter(task => 
      task.status === TaskStatus.NOT_STARTED && 
      this.canTaskBeQueued(workflow.tasks, task)
    );

    for (const task of tasksToQueue) {
      await this.queueTask(workflowId, task.id);
    }

    if (tasksToQueue.length > 0) {
      this.logger.info(`Queued ${tasksToQueue.length} newly eligible tasks for workflow: ${workflowId}`);
    }
  }

  public async getNextTask(): Promise<Task | null> {
    if (this.queue.length === 0) {
      return null;
    }

    // Get the first task in the queue
    const task = this.queue.shift();
    this.logger.info(`Retrieved task ${task.id} from queue`);
    this.emit('taskDequeued', task);
    
    return task;
  }

  private canTaskBeQueued(allTasks: Task[], task: Task): boolean {
    // If task has no dependencies, it can be queued
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    // Check if all dependencies are completed
    return task.dependencies.every(depId => {
      const dependency = allTasks.find(t => t.id === depId);
      return dependency && dependency.status === TaskStatus.COMPLETED;
    });
  }
} 