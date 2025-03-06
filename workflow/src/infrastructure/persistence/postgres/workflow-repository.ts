import { DataSource, Repository } from 'typeorm';
import { WorkflowRepository } from '../../../core/interfaces/repositories';
import { Workflow, CreateWorkflowDTO, UpdateWorkflowDTO } from '../../../core/entities/workflow';
import { UpdateTaskDTO } from '../../../core/entities/task';
import { WorkflowEntity } from './entities/workflow.entity';
import { TaskEntity } from './entities/task.entity';

export class PostgresWorkflowRepository implements WorkflowRepository {
  private workflowRepo: Repository<WorkflowEntity>;
  private taskRepo: Repository<TaskEntity>;

  constructor(dataSource: DataSource) {
    this.workflowRepo = dataSource.getRepository(WorkflowEntity);
    this.taskRepo = dataSource.getRepository(TaskEntity);
  }

  private toEntity(workflow: Workflow): WorkflowEntity {
    const entity = new WorkflowEntity();
    entity.id = workflow.id;
    entity.name = workflow.name;
    entity.description = workflow.description;
    entity.status = workflow.status;
    entity.createdAt = workflow.createdAt;
    entity.updatedAt = workflow.updatedAt;
    entity.metadata = workflow.metadata;
    entity.tasks = workflow.tasks.map(task => {
      const taskEntity = new TaskEntity();
      taskEntity.id = task.id;
      taskEntity.type = task.type;
      taskEntity.description = task.description;
      taskEntity.status = task.status;
      taskEntity.input = task.input;
      taskEntity.output = task.output;
      taskEntity.error = task.error;
      taskEntity.createdAt = task.createdAt;
      taskEntity.updatedAt = task.updatedAt;
      return taskEntity;
    });
    return entity;
  }

  private toDomain(entity: WorkflowEntity): Workflow {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      status: entity.status,
      tasks: entity.tasks.map(task => ({
        id: task.id,
        type: task.type,
        description: task.description,
        status: task.status,
        input: task.input,
        output: task.output,
        error: task.error,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      })),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      metadata: entity.metadata
    };
  }

  async create(workflow: CreateWorkflowDTO & { id: string }): Promise<Workflow> {
    const entity = this.toEntity(workflow as Workflow);
    const saved = await this.workflowRepo.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Workflow | null> {
    const entity = await this.workflowRepo.findOne({
      where: { id },
      relations: ['tasks']
    });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(): Promise<Workflow[]> {
    const entities = await this.workflowRepo.find({
      relations: ['tasks']
    });
    return entities.map(entity => this.toDomain(entity));
  }

  async update(id: string, data: UpdateWorkflowDTO): Promise<Workflow> {
    const workflow = await this.findById(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const updated = {
      ...workflow,
      ...data,
      updatedAt: new Date()
    };

    const entity = this.toEntity(updated);
    const saved = await this.workflowRepo.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.workflowRepo.delete(id);
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
      updatedAt: new Date()
    };

    workflow.updatedAt = new Date();

    const entity = this.toEntity(workflow);
    const saved = await this.workflowRepo.save(entity);
    return this.toDomain(saved);
  }
} 