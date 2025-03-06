import { TaskTypeRegistry } from '../../core/interfaces/repositories';

export class InMemoryTaskTypeRegistry implements TaskTypeRegistry {
  private taskTypes: Map<string, { input: Record<string, unknown>; output: Record<string, unknown> }> = new Map();

  registerTaskType(type: string, schema: { input: Record<string, unknown>; output: Record<string, unknown> }): void {
    this.taskTypes.set(type, schema);
  }

  getTaskType(type: string): { input: Record<string, unknown>; output: Record<string, unknown> } | null {
    return this.taskTypes.get(type) || null;
  }

  getAllTaskTypes(): Array<{ type: string; input: Record<string, unknown>; output: Record<string, unknown> }> {
    return Array.from(this.taskTypes.entries()).map(([type, schema]) => ({
      type,
      input: schema.input,
      output: schema.output
    }));
  }
} 