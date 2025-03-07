import fs from 'fs/promises';
import path from 'path';
import { WorkflowRepository } from '../../../core/interfaces/repositories';
import { Workflow, CreateWorkflowDTO, UpdateWorkflowDTO } from '../../../core/entities/workflow';
import { UpdateTaskDTO } from '../../../core/entities/task';

export class FileWorkflowRepository implements WorkflowRepository {
  private workflowsDir: string;

  constructor(baseDir: string) {
    this.workflowsDir = path.join(baseDir, 'workflows');
    this.ensureWorkflowsDir();
  }

  private async ensureWorkflowsDir(): Promise<void> {
    try {
      await fs.mkdir(this.workflowsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating workflows directory:', error);
      throw error;
    }
  }

  private getWorkflowPath(id: string): string {
    return path.join(this.workflowsDir, `${id}.json`);
  }

  async create(workflow: CreateWorkflowDTO & { id: string }): Promise<Workflow> {
    const workflowPath = this.getWorkflowPath(workflow.id);
    await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));
    return workflow as Workflow;
  }

  async findById(id: string): Promise<Workflow | null> {
    try {
      const workflowPath = this.getWorkflowPath(id);
      const data = await fs.readFile(workflowPath, 'utf-8');
      const workflow = JSON.parse(data) as Workflow;
      
      // Convert string dates to Date objects
      workflow.createdAt = new Date(workflow.createdAt);
      workflow.updatedAt = new Date(workflow.updatedAt);
      workflow.tasks.forEach(task => {
        task.createdAt = new Date(task.createdAt);
        task.updatedAt = new Date(task.updatedAt);
      });
      
      return workflow;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async findAll(): Promise<Workflow[]> {
    try {
      const files = await fs.readdir(this.workflowsDir);
      const workflowFiles = files.filter(file => file.endsWith('.json'));
      
      const workflows: Workflow[] = [];
      for (const file of workflowFiles) {
        const id = path.basename(file, '.json');
        const workflow = await this.findById(id);
        if (workflow) {
          workflows.push(workflow);
        }
      }
      
      return workflows;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
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

    await fs.writeFile(
      this.getWorkflowPath(id),
      JSON.stringify(updatedWorkflow, null, 2)
    );

    return updatedWorkflow;
  }

  async delete(id: string): Promise<void> {
    try {
      await fs.unlink(this.getWorkflowPath(id));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
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

    await fs.writeFile(
      this.getWorkflowPath(workflowId),
      JSON.stringify(workflow, null, 2)
    );

    return workflow;
  }
} 