"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
// Define the schema for the configuration
const configSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    // Server configuration
    SERVER_PORT: zod_1.z.string().transform(val => parseInt(val, 10)).default('3100'),
    // Storage configuration
    STORAGE_TYPE: zod_1.z.enum(['file', 'postgres']).default('file'),
    FILE_STORAGE_PATH: zod_1.z.string().default('./.workflows'),
    // PostgreSQL configuration
    PG_HOST: zod_1.z.string().optional(),
    PG_PORT: zod_1.z.string().transform(val => val ? parseInt(val, 10) : undefined).optional(),
    PG_USER: zod_1.z.string().optional(),
    PG_PASSWORD: zod_1.z.string().optional(),
    PG_DATABASE: zod_1.z.string().optional(),
});
// Load environment variables
const loadConfig = () => {
    try {
        // Parse and validate environment variables
        const config = configSchema.parse(process.env);
        return config;
    }
    catch (error) {
        console.error('Configuration error:', error);
        throw error;
    }
};
exports.default = loadConfig;
