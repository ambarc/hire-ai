import { TaskTypeRegistry } from '../../core/interfaces/repositories';

export class InMemoryTaskTypeRegistry implements TaskTypeRegistry {
  private taskTypes: Map<string, { 
    version: string;
    description: string;
    input: Record<string, unknown>; 
    output: Record<string, unknown>;
  }> = new Map();

  async registerTaskType(
    type: string, 
    schema: { 
      version: string;
      description: string;
      input: Record<string, unknown>; 
      output: Record<string, unknown>;
    }
  ): Promise<void> {
    if (this.taskTypes.has(type)) {
      throw new Error(`Task type '${type}' already exists`);
    }
    this.taskTypes.set(type, schema);
  }

  async getTaskType(type: string): Promise<{ 
    version: string;
    description: string;
    input: Record<string, unknown>; 
    output: Record<string, unknown>;
  } | null> {
    return this.taskTypes.get(type) || null;
  }

  async getAllTaskTypes(): Promise<Array<{ 
    type: string;
    version: string;
    description: string;
    input: Record<string, unknown>; 
    output: Record<string, unknown>;
  }>> {
    return Array.from(this.taskTypes.entries()).map(([type, schema]) => ({
      type,
      ...schema
    }));
  }
} 