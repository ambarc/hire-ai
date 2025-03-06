"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWorkflowRepository = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class FileWorkflowRepository {
    constructor(baseDir) {
        this.workflowsDir = path_1.default.join(baseDir, 'workflows');
        this.ensureWorkflowsDir();
    }
    async ensureWorkflowsDir() {
        try {
            await promises_1.default.mkdir(this.workflowsDir, { recursive: true });
        }
        catch (error) {
            console.error('Error creating workflows directory:', error);
            throw error;
        }
    }
    getWorkflowPath(id) {
        return path_1.default.join(this.workflowsDir, `${id}.json`);
    }
    async create(workflow) {
        const workflowPath = this.getWorkflowPath(workflow.id);
        await promises_1.default.writeFile(workflowPath, JSON.stringify(workflow, null, 2));
        return workflow;
    }
    async findById(id) {
        try {
            const workflowPath = this.getWorkflowPath(id);
            const data = await promises_1.default.readFile(workflowPath, 'utf-8');
            const workflow = JSON.parse(data);
            // Convert string dates to Date objects
            workflow.createdAt = new Date(workflow.createdAt);
            workflow.updatedAt = new Date(workflow.updatedAt);
            workflow.tasks.forEach(task => {
                task.createdAt = new Date(task.createdAt);
                task.updatedAt = new Date(task.updatedAt);
            });
            return workflow;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }
    async findAll() {
        try {
            const files = await promises_1.default.readdir(this.workflowsDir);
            const workflowFiles = files.filter(file => file.endsWith('.json'));
            const workflows = [];
            for (const file of workflowFiles) {
                const id = path_1.default.basename(file, '.json');
                const workflow = await this.findById(id);
                if (workflow) {
                    workflows.push(workflow);
                }
            }
            return workflows;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }
    async update(id, data) {
        const workflow = await this.findById(id);
        if (!workflow) {
            throw new Error('Workflow not found');
        }
        const updatedWorkflow = {
            ...workflow,
            ...data,
            updatedAt: new Date()
        };
        await promises_1.default.writeFile(this.getWorkflowPath(id), JSON.stringify(updatedWorkflow, null, 2));
        return updatedWorkflow;
    }
    async delete(id) {
        try {
            await promises_1.default.unlink(this.getWorkflowPath(id));
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
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
        await promises_1.default.writeFile(this.getWorkflowPath(workflowId), JSON.stringify(workflow, null, 2));
        return workflow;
    }
}
exports.FileWorkflowRepository = FileWorkflowRepository;
