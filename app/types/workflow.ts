import { Medication } from './clinical';

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
    VALIDATE_DATA = 'VALIDATE_DATA', // TODO(ambar): archive this.
    WRITE_MEDICATIONS = 'WRITE_MEDICATIONS',
    // INGEST_ALLERGIES = 'INGEST_ALLERGIES',
    // Add more task types here as needed
}

// READ_OBESITY_INTAKE_FORM types
interface ReadObesityIntakeFormData {
    url: string;
}

interface ReadObesityIntakeFormResult {
    rawText?: string;
    // patientInfo?: {
    //     name?: string;
    //     dateOfBirth?: string;
    //     height?: string;
    //     weight?: string;
    //     bmi?: string;
    //     medicalHistory?: string[];
    //     currentMedications?: string[];
    //     allergies?: string[];
    //     dietaryRestrictions?: string[];
    //     exerciseRoutine?: {
    //         frequency?: string;
    //         type?: string;
    //         duration?: string;
    //     };
    //     previousWeightLossAttempts?: {
    //         method: string;
    //         duration: string;
    //         result: string;
    //     }[];
    // };
    // formMetadata?: {
    //     submissionDate?: string;
    //     formVersion?: string;
    //     completionStatus?: 'complete' | 'partial' | 'invalid';
    // };
}

// VALIDATE_DATA types
interface ValidateDataInput {
    validationFn: (data: unknown) => boolean;
}

interface ValidateDataResult {
    isValid: boolean;
}

interface WriteMedicationsInput {
    source: {
        type: 'APPLICATION_MEMORY' | 'BROWSER'; // TODO(ambar): add 'API'
        applicationMemoryKey?: string;
        browserLocation?: string;
        medications?: Medication[];
        path: string;
    },
    destination: {
        type: 'ATHENA'
    },
}

interface WriteMedicationsResult {
    medications: Medication[];
}

// Discriminated unions for task inputs and outputs
export type TaskInput = {
    type: TaskType.READ_OBESITY_INTAKE_FORM;
    data: ReadObesityIntakeFormData;
} | {
    type: TaskType.VALIDATE_DATA;
    data: ValidateDataInput;
} | {
    type: TaskType.WRITE_MEDICATIONS;
    data: WriteMedicationsInput;
}

export type TaskOutput = {
    type: TaskType.READ_OBESITY_INTAKE_FORM;
    success: boolean;
    error?: string;
    data?: ReadObesityIntakeFormResult;
} | {
    type: TaskType.VALIDATE_DATA;
    success: boolean;
    error?: string;
    data?: ValidateDataResult;
} | {
    type: TaskType.WRITE_MEDICATIONS;
    success: boolean;
    error?: string;
    data?: WriteMedicationsResult;
}

// Task definition
export interface Task {
    id: string;
    type: TaskType;
    description: string;
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
    description: string;
    tasks: Task[];
    status: TaskStatus;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown>;
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