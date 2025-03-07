# Workflow Service

A standalone service for managing workflows and tasks with a clean architecture approach.

## Features

- RESTful API for workflow and task management
- Support for multiple storage backends (file system and PostgreSQL)
- Task type registry for defining and validating task types
- OpenAPI documentation
- Clean architecture design

## Getting Started

### Prerequisites

- Node.js 18+
- TypeScript 5+
- PostgreSQL (optional, for PostgreSQL storage)

### Installation

The workflow service uses the dependencies from the root `package.json`. No additional installation is required.

### Configuration

Copy the example environment file and modify it as needed:

```bash
cp .env.example .env
```

Configuration options:

- `NODE_ENV`: Environment mode (`development`, `production`, or `test`)
- `SERVER_PORT`: Port for the server to listen on
- `STORAGE_TYPE`: Storage backend (`file` or `postgres`)
- `FILE_STORAGE_PATH`: Path for file storage (if using `file` storage type)
- `PG_*`: PostgreSQL connection details (if using `postgres` storage type)

### Running the Service

From the root directory, you can use the following npm scripts:

```bash
# Build the service
npm run workflow:build

# Start the service
npm run workflow:start

# Development mode with watch
npm run workflow:dev
```

Or you can run the start script directly:

```bash
cd workflow
./start.sh
```

## API Documentation

Once the service is running, you can access the OpenAPI documentation at:

```
http://localhost:3100/documentation
```

## Architecture

The service follows clean architecture principles:

- **Core**: Contains business logic, entities, and interfaces
  - `entities`: Domain models and DTOs
  - `interfaces`: Repository interfaces
  - `usecases`: Business logic implementation

- **Infrastructure**: Contains implementation details
  - `persistence`: Repository implementations for different storage backends
  - `api`: API routes and server configuration
  - `config`: Configuration loading and validation

## Task Types

The service supports registering different task types with their own input and output schemas. Task types are registered in the `main` function in `src/index.ts`.

To add a new task type, add it to the task type registry:

```typescript
taskTypeRegistry.registerTaskType('NEW_TASK_TYPE', {
  input: { /* input schema */ },
  output: { /* output schema */ }
});
```

## Storage Backends

The service supports two storage backends:

- **File System**: Stores workflows as JSON files
- **PostgreSQL**: Stores workflows in a PostgreSQL database

The storage backend is selected based on the `STORAGE_TYPE` environment variable. 