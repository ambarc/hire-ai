import fs from 'fs/promises';
import path from 'path';
import { TaskTypeRegistry } from '../../../core/interfaces/repositories';

export class FileTaskTypeRegistry implements TaskTypeRegistry {
  private taskTypesDir: string;

  constructor(baseDir: string) {
    this.taskTypesDir = path.join(baseDir, 'task-types');
    this.ensureTaskTypesDir();
  }

  private async ensureTaskTypesDir(): Promise<void> {
    try {
      await fs.mkdir(this.taskTypesDir, { recursive: true });
    } catch (error) {
      console.error('Error creating task types directory:', error);
      throw error;
    }
  }

  private getTaskTypePath(type: string): string {
    return path.join(this.taskTypesDir, `${type}.json`);
  }

  async registerTaskType(
    type: string, 
    schema: { 
      description: string;
      input: Record<string, unknown>; 
      output: Record<string, unknown>;
    }
  ): Promise<void> {
    const taskTypePath = this.getTaskTypePath(type);
    
    try {
      // Check if task type already exists
      try {
        await fs.access(taskTypePath);
        throw new Error(`Task type '${type}' already exists`);
      } catch (error) {
        // File doesn't exist, proceed with registration
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          await fs.writeFile(taskTypePath, JSON.stringify(schema, null, 2));
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error(`Error registering task type ${type}:`, error);
      throw error;
    }
  }

  async getTaskType(type: string): Promise<{ 
    description: string;
    input: Record<string, unknown>; 
    output: Record<string, unknown>;
  } | null> {
    try {
      const taskTypePath = this.getTaskTypePath(type);
      const data = await fs.readFile(taskTypePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async getAllTaskTypes(): Promise<Array<{ 
    type: string;
    description: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  }>> {
    try {
      const files = await fs.readdir(this.taskTypesDir);
      const taskTypeFiles = files.filter(file => file.endsWith('.json'));
      
      const taskTypes = await Promise.all(
        taskTypeFiles.map(async (file) => {
          const type = path.basename(file, '.json');
          const schema = await this.getTaskType(type);
          return schema ? { type, ...schema } : null;
        })
      );
      
      return taskTypes.filter((t): t is NonNullable<typeof t> => t !== null);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
} 