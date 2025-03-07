import { 
  TaskExecutor, 
  TaskExecutorCapabilities, 
  TaskResult, 
  ResourceRequirements 
} from '../../core/interfaces/executor';
import { WorkflowRepository } from '../../core/interfaces/repositories';
import { Task } from '../../core/entities/task';

export class LocalTaskExecutor implements TaskExecutor {
  private activeExecutions: Map<string, AbortController> = new Map();

  constructor(
    private workflowRepository: WorkflowRepository,
    private capabilities: TaskExecutorCapabilities = {
      maxConcurrentTasks: 5,
      supportedTaskTypes: ['*'], // Supports all task types
      resourceRequirements: {
        memory: 1024, // 1GB
        cpu: 1
      }
    }
  ) {}

  async execute(workflowId: string, taskId: string): Promise<TaskResult> {
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const task = workflow.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Create abort controller for this execution
    const abortController = new AbortController();
    const executionKey = `${workflowId}:${taskId}`;
    this.activeExecutions.set(executionKey, abortController);

    try {
      const startTime = new Date();
      const result = await this.executeTask(task, abortController.signal);
      const endTime = new Date();

      return {
        ...result,
        metrics: {
          startTime,
          endTime,
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
          cpuUsage: 0 // Not implemented for local executor
        }
      };
    } finally {
      this.activeExecutions.delete(executionKey);
    }
  }

  async validateInput(workflowId: string, taskId: string): Promise<boolean> {
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      return false;
    }

    const task = workflow.tasks.find(t => t.id === taskId);
    if (!task) {
      return false;
    }

    // Basic validation - ensure required fields exist
    return task.input !== undefined;
  }

  getCapabilities(): TaskExecutorCapabilities {
    return this.capabilities;
  }

  async stop(workflowId: string, taskId: string): Promise<void> {
    const executionKey = `${workflowId}:${taskId}`;
    const controller = this.activeExecutions.get(executionKey);
    if (controller) {
      controller.abort();
      this.activeExecutions.delete(executionKey);
    }
  }

  private async executeTask(task: Task, signal: AbortSignal): Promise<TaskResult> {
    // Check for abort before starting
    if (signal.aborted) {
      return {
        success: false,
        error: 'Task execution was cancelled'
      };
    }

    try {
      // This is where you would implement the actual task execution logic
      // For now, we'll just simulate task execution
      this.simulateTaskExecution(task.type, signal);

      return {
        success: true,
        output: {
          message: `Successfully executed task of type: ${task.type}`,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Task execution was cancelled'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private simulateTaskExecution(taskType: string, signal: AbortSignal): void {
    // Simulate different execution times for different task types
    const executionTime = Math.random() * 2000 + 1000; // 1-3 seconds
    
    // Check if already aborted
    if (signal.aborted) {
      throw new Error('Task was cancelled');
    }
    
    // Synchronous simulation - just return immediately
    // In a real implementation, you would perform the actual task work here
    console.log(`Simulating execution of ${taskType} task (would take ${executionTime}ms in async version)`);
  }
} 