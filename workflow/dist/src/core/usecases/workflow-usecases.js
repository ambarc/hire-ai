"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowUseCases = void 0;
const uuid_1 = require("uuid");
const workflow_1 = require("../entities/workflow");
const task_1 = require("../entities/task");
class WorkflowUseCases {
    constructor(workflowRepository, taskTypeRegistry) {
        this.workflowRepository = workflowRepository;
        this.taskTypeRegistry = taskTypeRegistry;
    }
    async createWorkflow(data) {
        const now = new Date();
        const workflowId = (0, uuid_1.v4)();
        // Generate IDs for tasks if they don't have one
        const tasksWithIds = data.tasks.map(task => {
            if (!task.id) {
                return {
                    ...task,
                    id: (0, uuid_1.v4)(),
                    status: task_1.TaskStatus.NOT_STARTED,
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
            status: workflow_1.WorkflowStatus.NOT_STARTED,
            createdAt: now,
            updatedAt: now
        };
        return this.workflowRepository.create(workflow);
    }
    async getWorkflow(id) {
        return this.workflowRepository.findById(id);
    }
    async listWorkflows() {
        return this.workflowRepository.findAll();
    }
    async updateWorkflow(id, data) {
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
    async deleteWorkflow(id) {
        const workflow = await this.workflowRepository.findById(id);
        if (!workflow) {
            throw new Error('Workflow not found');
        }
        return this.workflowRepository.delete(id);
    }
    async updateTask(workflowId, taskId, data) {
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
    getAvailableTaskTypes() {
        return this.taskTypeRegistry.getAllTaskTypes().map(({ type, input, output }) => ({
            type,
            inputSchema: input,
            outputSchema: output
        }));
    }
    validateTaskType(type) {
        return this.taskTypeRegistry.getTaskType(type) !== null;
    }
}
exports.WorkflowUseCases = WorkflowUseCases;
