import { WorkflowRepository } from '../../core/interfaces/repositories';
import { Workflow, CreateWorkflowDTO, UpdateWorkflowDTO } from '../../core/entities/workflow';
import { UpdateTaskDTO } from '../../core/entities/task';

export class InMemoryWorkflowRepository implements WorkflowRepository {
  private workflows: Map<string, Workflow> = new Map();

  async create(workflow: CreateWorkflowDTO & { id: string }): Promise<Workflow> {
    const newWorkflow = {
      ...workflow,
      tasks: workflow.tasks || [],
      createdAt: new Date(),
      updatedAt: new Date()
    } as Workflow;
    
    this.workflows.set(workflow.id, newWorkflow);
    return newWorkflow;
  }

  async findById(id: string): Promise<Workflow | null> {
    return this.workflows.get(id) || null;
  }

  async findAll(): Promise<Workflow[]> {
    return Array.from(this.workflows.values());
  }

  async update(id: string, data: UpdateWorkflowDTO): Promise<Workflow> {
    const workflow = await this.findById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const updatedWorkflow: Workflow = {
      ...workflow,
      ...data,
      updatedAt: new Date()
    };

    this.workflows.set(id, updatedWorkflow);
    return updatedWorkflow;
  }

  async delete(id: string): Promise<void> {
    this.workflows.delete(id);
  }

  async updateTask(workflowId: string, taskId: string, data: UpdateTaskDTO): Promise<Workflow> {
    const workflow = await this.findById(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const taskIndex = workflow.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    workflow.tasks[taskIndex] = {
      ...workflow.tasks[taskIndex],
      ...data,
      executionDetails: data.executionDetails 
        ? { 
            ...workflow.tasks[taskIndex].executionDetails,
            ...data.executionDetails,
            attempts: data.executionDetails.attempts ?? workflow.tasks[taskIndex].executionDetails?.attempts ?? 0
          } 
        : workflow.tasks[taskIndex].executionDetails,
      updatedAt: new Date()
    };

    workflow.updatedAt = new Date();
    this.workflows.set(workflowId, workflow);

    return workflow;
  }
} 