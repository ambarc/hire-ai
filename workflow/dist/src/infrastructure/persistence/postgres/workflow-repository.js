"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresWorkflowRepository = void 0;
const workflow_entity_1 = require("./entities/workflow.entity");
const task_entity_1 = require("./entities/task.entity");
class PostgresWorkflowRepository {
    constructor(dataSource) {
        this.workflowRepo = dataSource.getRepository(workflow_entity_1.WorkflowEntity);
        this.taskRepo = dataSource.getRepository(task_entity_1.TaskEntity);
    }
    toEntity(workflow) {
        const entity = new workflow_entity_1.WorkflowEntity();
        entity.id = workflow.id;
        entity.version = workflow.version;
        entity.name = workflow.name;
        entity.description = workflow.description;
        entity.status = workflow.status;
        entity.createdAt = workflow.createdAt;
        entity.updatedAt = workflow.updatedAt;
        entity.metadata = workflow.metadata;
        entity.tasks = workflow.tasks.map(task => {
            const taskEntity = new task_entity_1.TaskEntity();
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
    toDomain(entity) {
        return {
            id: entity.id,
            version: entity.version,
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
    async create(workflow) {
        const entity = this.toEntity(workflow);
        const saved = await this.workflowRepo.save(entity);
        return this.toDomain(saved);
    }
    async findById(id) {
        const entity = await this.workflowRepo.findOne({
            where: { id },
            relations: ['tasks']
        });
        return entity ? this.toDomain(entity) : null;
    }
    async findAll() {
        const entities = await this.workflowRepo.find({
            relations: ['tasks']
        });
        return entities.map(entity => this.toDomain(entity));
    }
    async update(id, data) {
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
    async delete(id) {
        await this.workflowRepo.delete(id);
    }
    async updateTask(workflowId, taskId, data) {
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
exports.PostgresWorkflowRepository = PostgresWorkflowRepository;
