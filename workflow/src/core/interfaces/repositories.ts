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
  registerTaskType(
    type: string, 
    schema: { 
      description: string;
      input: Record<string, unknown>; 
      output: Record<string, unknown>;
    }
  ): Promise<void>;
  getTaskType(type: string): Promise<{ 
    description: string;
    input: Record<string, unknown>; 
    output: Record<string, unknown>;
  } | null>;
  getAllTaskTypes(): Promise<Array<{ 
    type: string;
    description: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  }>>;
} 