import { z } from 'zod';

// Define the schema for the configuration
const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Server configuration
  SERVER_PORT: z.string().transform(val => parseInt(val, 10)).default('3100'),
  
  // Storage configuration
  STORAGE_TYPE: z.enum(['file', 'postgres', 'memory']).default('memory'),
  FILE_STORAGE_PATH: z.string().default('./.workflows'),
  
  // PostgreSQL configuration
  PG_HOST: z.string().optional(),
  PG_PORT: z.string().transform(val => val ? parseInt(val, 10) : undefined).optional(),
  PG_USER: z.string().optional(),
  PG_PASSWORD: z.string().optional(),
  PG_DATABASE: z.string().optional(),
});

// Load environment variables
const loadConfig = () => {
  try {
    // Parse and validate environment variables
    const config = configSchema.parse(process.env);
    return config;
  } catch (error) {
    console.error('Configuration error:', error);
    throw error;
  }
};

export type Config = z.infer<typeof configSchema>;
export default loadConfig; 