import { Task, TaskType, TaskStatus, Workflow } from './workflow';

export interface WorkerContext {
    workflowId: string;
    log: (message: string) => void;
    updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
    getWorkflow: () => Promise<Workflow>;
}

export interface Worker {
    id: string;
    status: 'idle' | 'busy';
    currentWorkflow?: string;
    execute: (context: WorkerContext) => Promise<void>;
} 