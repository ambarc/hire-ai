"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryTaskTypeRegistry = void 0;
class InMemoryTaskTypeRegistry {
    constructor() {
        this.taskTypes = new Map();
    }
    registerTaskType(type, schema) {
        this.taskTypes.set(type, schema);
    }
    getTaskType(type) {
        return this.taskTypes.get(type) || null;
    }
    getAllTaskTypes() {
        return Array.from(this.taskTypes.entries()).map(([type, schema]) => ({
            type,
            input: schema.input,
            output: schema.output
        }));
    }
}
exports.InMemoryTaskTypeRegistry = InMemoryTaskTypeRegistry;
