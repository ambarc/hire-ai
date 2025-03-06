import { Workflow, CreateWorkflowDTO, UpdateWorkflowDTO } from '../entities/workflow';
import { UpdateTaskDTO } from '../entities/task';

export interface WorkflowRepository {
  create(workflow: CreateWorkflowDTO & { id: string }): Promise<Workflow>;
  findById(id: string): Promise<Workflow | null>;
  findAll(): Promise<Workflow[]>;
  update(id: string, data: UpdateWorkflowDTO): Promise<Workflow>;
  delete(id: string): Promise<void>;
  updateTask(workflowId: string, taskId: string, data: UpdateTaskDTO): Promise<Workflow>;
}

export interface TaskTypeRegistry {
  registerTaskType(type: string, schema: { input: Record<string, unknown>; output: Record<string, unknown> }): void;
  getTaskType(type: string): { input: Record<string, unknown>; output: Record<string, unknown> } | null;
  getAllTaskTypes(): Array<{ type: string; input: Record<string, unknown>; output: Record<string, unknown> }>;
} 