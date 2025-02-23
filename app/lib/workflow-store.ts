import fs from 'fs/promises';
import path from 'path';
import { Workflow, Task, TaskStatus } from '../types/workflow';

const WORKFLOWS_DIR = path.join(process.cwd(), '.workflows');

export class WorkflowStore {
    private static instance: WorkflowStore;

    private constructor() {
        // Initialize store
        this.ensureWorkflowsDir();
    }

    public static getInstance(): WorkflowStore {
        if (!WorkflowStore.instance) {
            WorkflowStore.instance = new WorkflowStore();
        }
        return WorkflowStore.instance;
    }

    private async ensureWorkflowsDir() {
        try {
            await fs.access(WORKFLOWS_DIR);
        } catch {
            await fs.mkdir(WORKFLOWS_DIR, { recursive: true });
        }
    }

    private getWorkflowPath(id: string): string {
        return path.join(WORKFLOWS_DIR, `${id}.json`);
    }

    async createWorkflow(workflow: Workflow): Promise<Workflow> {
        const filePath = this.getWorkflowPath(workflow.id);
        await fs.writeFile(filePath, JSON.stringify(workflow, null, 2));
        return workflow;
    }

    async getWorkflow(id: string): Promise<Workflow | null> {
        try {
            const filePath = this.getWorkflowPath(id);
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data) as Workflow;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    async listWorkflows(): Promise<Workflow[]> {
        const files = await fs.readdir(WORKFLOWS_DIR);
        const workflows: Workflow[] = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = await fs.readFile(path.join(WORKFLOWS_DIR, file), 'utf-8');
                workflows.push(JSON.parse(data) as Workflow);
            }
        }
        
        return workflows;
    }

    async updateWorkflowTask(workflowId: string, taskId: string, updates: Partial<Task>): Promise<Workflow | null> {
        const workflow = await this.getWorkflow(workflowId);
        if (!workflow) return null;

        const taskIndex = workflow.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return null;

        // Update task
        workflow.tasks[taskIndex] = {
            ...workflow.tasks[taskIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // Update workflow status based on tasks
        workflow.status = this.calculateWorkflowStatus(workflow.tasks);
        workflow.updatedAt = new Date().toISOString();

        // Save updated workflow
        await this.createWorkflow(workflow);
        return workflow;
    }

    async deleteWorkflow(id: string): Promise<boolean> {
        try {
            const filePath = this.getWorkflowPath(id);
            await fs.unlink(filePath);
            return true;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return false;
            }
            throw error;
        }
    }

    private calculateWorkflowStatus(tasks: Task[]): TaskStatus {
        if (tasks.some(t => t.status === TaskStatus.FAILED)) {
            return TaskStatus.FAILED;
        }
        if (tasks.every(t => t.status === TaskStatus.COMPLETED)) {
            return TaskStatus.COMPLETED;
        }
        if (tasks.some(t => t.status === TaskStatus.IN_PROGRESS)) {
            return TaskStatus.IN_PROGRESS;
        }
        return TaskStatus.NOT_STARTED;
    }
} 