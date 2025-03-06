"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const typeorm_1 = require("typeorm");
const config_1 = __importDefault(require("./config"));
const workflow_usecases_1 = require("./core/usecases/workflow-usecases");
const workflow_repository_1 = require("./infrastructure/persistence/file/workflow-repository");
const workflow_repository_2 = require("./infrastructure/persistence/postgres/workflow-repository");
const task_type_registry_1 = require("./infrastructure/persistence/task-type-registry");
const server_1 = require("./infrastructure/api/server");
const workflow_entity_1 = require("./infrastructure/persistence/postgres/entities/workflow.entity");
const task_entity_1 = require("./infrastructure/persistence/postgres/entities/task.entity");
// Function to create a PostgreSQL data source
function createDataSource(config) {
    if (!config.PG_HOST || !config.PG_PORT || !config.PG_USER || !config.PG_PASSWORD || !config.PG_DATABASE) {
        throw new Error('PostgreSQL configuration is incomplete. Please check your environment variables.');
    }
    return new typeorm_1.DataSource({
        type: 'postgres',
        host: config.PG_HOST,
        port: config.PG_PORT,
        username: config.PG_USER,
        password: config.PG_PASSWORD,
        database: config.PG_DATABASE,
        synchronize: config.NODE_ENV === 'development',
        logging: config.NODE_ENV === 'development',
        entities: [workflow_entity_1.WorkflowEntity, task_entity_1.TaskEntity],
    });
}
async function main() {
    try {
        // Load configuration
        const config = (0, config_1.default)();
        console.log(`Starting workflow service in ${config.NODE_ENV} mode`);
        // Initialize task type registry
        const taskTypeRegistry = new task_type_registry_1.InMemoryTaskTypeRegistry();
        // Register task types
        taskTypeRegistry.registerTaskType('READ_OBESITY_INTAKE_FORM', {
            input: { url: { type: 'string' } },
            output: { rawText: { type: 'string', optional: true } }
        });
        taskTypeRegistry.registerTaskType('EXTRACT_PATIENT_PROFILE', {
            input: {
                source: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['APPLICATION_MEMORY', 'BROWSER'] },
                        applicationMemoryKey: { type: 'string', optional: true },
                        browserLocation: { type: 'string', optional: true }
                    }
                }
            },
            output: {
                profile: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        dateOfBirth: { type: 'string' },
                        gender: { type: 'string' },
                        phoneNumber: { type: 'string', optional: true },
                        email: { type: 'string', optional: true },
                        address: { type: 'string', optional: true }
                    }
                }
            }
        });
        taskTypeRegistry.registerTaskType('IDENTIFY_CHART_IN_ATHENA', {
            input: {
                profile: {
                    type: 'object',
                    optional: true,
                    properties: {
                        name: { type: 'string' },
                        dateOfBirth: { type: 'string' },
                        gender: { type: 'string' },
                        phoneNumber: { type: 'string', optional: true },
                        email: { type: 'string', optional: true },
                        address: { type: 'string', optional: true }
                    }
                }
            },
            output: { url: { type: 'string' } }
        });
        // Initialize repository based on configuration
        let workflowRepository;
        if (config.STORAGE_TYPE === 'postgres') {
            console.log('Using PostgreSQL storage');
            const dataSource = createDataSource(config);
            await dataSource.initialize();
            console.log('PostgreSQL connection established');
            workflowRepository = new workflow_repository_2.PostgresWorkflowRepository(dataSource);
        }
        else {
            console.log('Using file storage');
            const baseDir = path_1.default.resolve(process.cwd(), config.FILE_STORAGE_PATH);
            workflowRepository = new workflow_repository_1.FileWorkflowRepository(baseDir);
        }
        // Initialize use cases
        const workflowUseCases = new workflow_usecases_1.WorkflowUseCases(workflowRepository, taskTypeRegistry);
        // Create and start server
        const server = await (0, server_1.createServer)(config, workflowUseCases);
        await (0, server_1.startServer)(server, config);
    }
    catch (error) {
        console.error('Failed to start workflow service:', error);
        process.exit(1);
    }
}
// Start the application
main();
