import { v4 as uuidv4 } from 'uuid';
import { Workflow, CreateWorkflowDTO, UpdateWorkflowDTO, WorkflowStatus } from '../entities/workflow';
import { Task, UpdateTaskDTO, TaskStatus } from '../entities/task';
import { WorkflowRepository, TaskTypeRegistry } from '../interfaces/repositories';

export class WorkflowUseCases {
  constructor(
    private workflowRepository: WorkflowRepository,
    private taskTypeRegistry: TaskTypeRegistry
  ) {}

  async createWorkflow(data: CreateWorkflowDTO): Promise<Workflow> {
    const now = new Date();
    const workflowId = uuidv4();
    
    // Generate IDs for tasks if they don't have one
    const tasksWithIds = data.tasks.map(task => {
      if (!task.id) {
        return {
          ...task,
          id: uuidv4(),
          status: TaskStatus.NOT_STARTED,
          createdAt: now,
          updatedAt: now
        };
      }
      return task;
    });

    const workflow = {
      ...data,
      id: workflowId,
      tasks: tasksWithIds,
      status: WorkflowStatus.NOT_STARTED,
      createdAt: now,
      updatedAt: now
    };

    return this.workflowRepository.create(workflow);
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    return this.workflowRepository.findById(id);
  }

  async listWorkflows(): Promise<Workflow[]> {
    return this.workflowRepository.findAll();
  }

  async updateWorkflow(id: string, data: UpdateWorkflowDTO): Promise<Workflow> {
    const workflow = await this.workflowRepository.findById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const updatedWorkflow = {
      ...data,
      updatedAt: new Date()
    };

    return this.workflowRepository.update(id, updatedWorkflow);
  }

  async deleteWorkflow(id: string): Promise<void> {
    const workflow = await this.workflowRepository.findById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    return this.workflowRepository.delete(id);
  }

  async updateTask(workflowId: string, taskId: string, data: UpdateTaskDTO): Promise<Workflow> {
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const taskIndex = workflow.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    const updatedTask = {
      ...data,
      updatedAt: new Date()
    };

    return this.workflowRepository.updateTask(workflowId, taskId, updatedTask);
  }

  async registerTaskType(type: string, schema: { input: Record<string, unknown>; output: Record<string, unknown> }): Promise<void> {
    await this.taskTypeRegistry.registerTaskType(type, schema);
  }

  async getAvailableTaskTypes(): Promise<Array<{ type: string; input: Record<string, unknown>; output: Record<string, unknown> }>> {
    return this.taskTypeRegistry.getAllTaskTypes();
  }

  async getTaskType(type: string): Promise<{ input: Record<string, unknown>; output: Record<string, unknown> } | null> {
    return this.taskTypeRegistry.getTaskType(type);
  }

  validateTaskType(type: string): boolean {
    return this.taskTypeRegistry.getTaskType(type) !== null;
  }
} 