// Task status enum
export enum TaskStatus {
    NOT_STARTED = 'NOT_STARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

// Task type enum
export enum TaskType {
    READ_OBESITY_INTAKE_FORM = 'READ_OBESITY_INTAKE_FORM',
    // Add more task types here as needed
}

// READ_OBESITY_INTAKE_FORM types
interface ReadObesityIntakeFormData {
    url: string;
    formSelector?: string;
}

interface ReadObesityIntakeFormResult {
    patientInfo?: {
        name?: string;
        dateOfBirth?: string;
        height?: string;
        weight?: string;
        bmi?: string;
        medicalHistory?: string[];
        currentMedications?: string[];
        allergies?: string[];
        dietaryRestrictions?: string[];
        exerciseRoutine?: {
            frequency?: string;
            type?: string;
            duration?: string;
        };
        previousWeightLossAttempts?: {
            method: string;
            duration: string;
            result: string;
        }[];
    };
    formMetadata?: {
        submissionDate?: string;
        formVersion?: string;
        completionStatus?: 'complete' | 'partial' | 'invalid';
    };
}

// Discriminated unions for task inputs and outputs
export type TaskInput = {
    type: TaskType.READ_OBESITY_INTAKE_FORM;
    data: ReadObesityIntakeFormData;
} // | { type: OtherTaskType; data: OtherTaskData }

export type TaskOutput = {
    type: TaskType.READ_OBESITY_INTAKE_FORM;
    success: boolean;
    error?: string;
    data?: ReadObesityIntakeFormResult;
} // | { type: OtherTaskType; success: boolean; error?: string; data?: OtherTaskResult }

// Task definition
export interface Task {
    id: string;
    type: TaskType;
    status: TaskStatus;
    input: TaskInput;
    output?: TaskOutput;
    createdAt: string;
    updatedAt: string;
    error?: string;
}

// Workflow definition
export interface Workflow {
    id: string;
    name: string;
    description?: string;
    tasks: Task[];
    status: TaskStatus;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
}

// Helper types for type-safe task input/output access
export type InputDataForType<T extends TaskType> = Extract<TaskInput, { type: T }>['data'];
export type OutputDataForType<T extends TaskType> = Extract<TaskOutput, { type: T }>['data'];

// Type guard functions
export function isTaskOfType<T extends TaskType>(
    type: T,
    task: Task
): task is Task & { type: T; input: Extract<TaskInput, { type: T }>; output?: Extract<TaskOutput, { type: T }> } {
    return task.type === type;
} 