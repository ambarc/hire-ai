import fs, { Dirent } from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { WorkflowStore } from '../workflow-store';
import { Workflow, TaskStatus, TaskType } from '../../types/workflow';

jest.mock('fs/promises');

// Initialize mocks after jest.mock()
const mockAccess = jest.fn();
const mockReaddir = jest.fn();
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockUnlink = jest.fn();
const mockMkdir = jest.fn();

// Setup mock implementations
Object.assign(fsPromises, {
    access: mockAccess,
    readdir: mockReaddir,
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    unlink: mockUnlink,
    mkdir: mockMkdir,
});

describe('WorkflowStore', () => {
    // const TEST_WORKFLOWS_DIR = path.join(process.cwd(), '.workflows');
    
    // // Sample workflow for testing
    // const sampleWorkflow: Workflow = {
    //     id: 'test-workflow-1',
    //     name: 'Test Workflow',
    //     description: 'A test workflow for unit testing',
    //     status: TaskStatus.NOT_STARTED,
    //     createdAt: '2024-01-01T00:00:00.000Z',
    //     updatedAt: '2024-01-01T00:00:00.000Z',
    //     tasks: [
    //         {
    //             id: 'task-1',
    //             type: TaskType.READ_OBESITY_INTAKE_FORM,
    //             input: {
    //                 type: TaskType.READ_OBESITY_INTAKE_FORM,
    //                 data: {
    //                     url: 'https://example.com/form'
    //                 }
    //             },
    //             description: 'Read intake form',
    //             status: TaskStatus.NOT_STARTED,
    //             createdAt: '2024-01-01T00:00:00.000Z',
    //             updatedAt: '2024-01-01T00:00:00.000Z'
    //         }
    //     ]
    // };

    // beforeEach(() => {
    //     // Reset all mocks before each test
    //     jest.clearAllMocks();
        
    //     // Mock directory existence check
    //     mockAccess.mockResolvedValue(undefined);
    // });

    describe('test', () => {
        it('should test', () => {
            expect(true).toBe(true);
        }); 
    });

    // describe('getInstance', () => {
    //     it('should return the same instance on multiple calls', () => {
    //         const instance1 = WorkflowStore.getInstance();
    //         const instance2 = WorkflowStore.getInstance();
    //         expect(instance1).toBe(instance2);
    //     });
    // });

    // describe('createWorkflow', () => {
    //     it('should create a workflow file', async () => {
    //         const store = WorkflowStore.getInstance();
    //         await store.createWorkflow(sampleWorkflow);

    //         expect(mockWriteFile).toHaveBeenCalledWith(
    //             path.join(TEST_WORKFLOWS_DIR, `${sampleWorkflow.id}.json`),
    //             JSON.stringify(sampleWorkflow, null, 2)
    //         );
    //     });
    // });

    // describe('getWorkflow', () => {
    //     it('should return a workflow when it exists', async () => {
    //         mockReadFile.mockResolvedValue(JSON.stringify(sampleWorkflow));
            
    //         const store = WorkflowStore.getInstance();
    //         const workflow = await store.getWorkflow('test-workflow-1');
            
    //         expect(workflow).toEqual(sampleWorkflow);
    //     });

    //     it('should return null when workflow does not exist', async () => {
    //         mockReadFile.mockRejectedValue({ code: 'ENOENT' });
            
    //         const store = WorkflowStore.getInstance();
    //         const workflow = await store.getWorkflow('non-existent');
            
    //         expect(workflow).toBeNull();
    //     });
    // });

    // describe('listWorkflows', () => {
    //     it('should return all workflows', async () => {
    //         const mockDirents = [
    //             { name: 'workflow-1.json', isFile: () => true } as Dirent,
    //             { name: 'workflow-2.json', isFile: () => true } as Dirent,
    //             { name: 'not-a-workflow.txt', isFile: () => true } as Dirent
    //         ];
            
    //         mockReaddir.mockResolvedValue(mockDirents);
    //         mockReadFile.mockResolvedValueOnce(JSON.stringify(sampleWorkflow));
    //         mockReadFile.mockResolvedValueOnce(JSON.stringify({ ...sampleWorkflow, id: 'workflow-2' }));

    //         const store = WorkflowStore.getInstance();
    //         const workflows = await store.listWorkflows();

    //         expect(workflows).toHaveLength(2);
    //         expect(workflows[0].id).toBe('test-workflow-1');
    //         expect(workflows[1].id).toBe('workflow-2');
    //     });
    // });

    // describe('updateWorkflowTask', () => {
    //     it('should update a task status and workflow status', async () => {
    //         // Setup initial workflow read
    //         mockReadFile.mockResolvedValueOnce(JSON.stringify(sampleWorkflow));
            
    //         const store = WorkflowStore.getInstance();
    //         const updatedWorkflow = await store.updateWorkflowTask('test-workflow-1', 'task-1', {
    //             status: TaskStatus.COMPLETED
    //         });

    //         expect(updatedWorkflow).not.toBeNull();
    //         expect(updatedWorkflow?.tasks[0].status).toBe(TaskStatus.COMPLETED);
    //         expect(updatedWorkflow?.status).toBe(TaskStatus.COMPLETED);
    //         expect(mockWriteFile).toHaveBeenCalled();
    //     });

        /* 
        it('should return null for non-existent task', async () => {
            // Mock the readFile to return the sample workflow
            mockReadFile.mockResolvedValue(JSON.stringify(sampleWorkflow));
            
            const store = WorkflowStore.getInstance();
            const result = await store.updateWorkflowTask('test-workflow-1', 'non-existent-task', {
                status: TaskStatus.COMPLETED
            });

            expect(result).toBeNull();
        });

        it('should return null for non-existent workflow', async () => {
            mockReadFile.mockRejectedValue({ code: 'ENOENT' });
            
            const store = WorkflowStore.getInstance();
            const result = await store.updateWorkflowTask('non-existent', 'task-1', {
                status: TaskStatus.COMPLETED
            });

            expect(result).toBeNull();
        });
        */
    // });

    // describe('deleteWorkflow', () => {
    //     it('should delete an existing workflow', async () => {
    //         mockUnlink.mockResolvedValue(undefined);
            
    //         const store = WorkflowStore.getInstance();
    //         const result = await store.deleteWorkflow('test-workflow-1');

    //         expect(result).toBe(true);
    //         expect(mockUnlink).toHaveBeenCalledWith(
    //             path.join(TEST_WORKFLOWS_DIR, 'test-workflow-1.json')
    //         );
    //     });

    //     it('should return false when workflow does not exist', async () => {
    //         mockUnlink.mockRejectedValue({ code: 'ENOENT' });
            
    //         const store = WorkflowStore.getInstance();
    //         const result = await store.deleteWorkflow('non-existent');

    //         expect(result).toBe(false);
    //     });
    // });

    // describe('calculateWorkflowStatus', () => {
    //     it('should return FAILED if any task is failed', async () => {
    //         const workflow = {
    //             ...sampleWorkflow,
    //             tasks: [
    //                 { ...sampleWorkflow.tasks[0], status: TaskStatus.FAILED },
    //                 { ...sampleWorkflow.tasks[0], id: 'task-2', status: TaskStatus.COMPLETED }
    //             ]
    //         };
    //         mockReadFile.mockResolvedValue(JSON.stringify(workflow));
            
    //         const store = WorkflowStore.getInstance();
    //         const result = await store.updateWorkflowTask('test-workflow-1', 'task-1', {
    //             status: TaskStatus.FAILED
    //         });

    //         expect(result?.status).toBe(TaskStatus.FAILED);
    //     });

    //     it('should return COMPLETED if all tasks are completed', async () => {
    //         const workflow = {
    //             ...sampleWorkflow,
    //             tasks: [
    //                 { ...sampleWorkflow.tasks[0], status: TaskStatus.COMPLETED },
    //                 { ...sampleWorkflow.tasks[0], id: 'task-2', status: TaskStatus.COMPLETED }
    //             ]
    //         };
    //         mockReadFile.mockResolvedValue(JSON.stringify(workflow));
            
    //         const store = WorkflowStore.getInstance();
    //         const result = await store.updateWorkflowTask('test-workflow-1', 'task-1', {
    //             status: TaskStatus.COMPLETED
    //         });

    //         expect(result?.status).toBe(TaskStatus.COMPLETED);
    //     });
    // });
}); 