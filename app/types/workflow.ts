import { Medication, Allergy, Insurance, Profile } from './clinical';

// TODO(ambar): adding a new task, viewing it, and executing it should be O(1) build time.
// TODO(ambar): what's a good way to take task inputs from prior outputs?
// TODO(ambar): there's a more generic browser task template that we should extract.
// TODO(ambar): figure out normalization / denormalization for extract vs write tasks.

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
    // TODO(ambar): figure out normalization / denormalization for extract vs write tasks.
    WRITE_MEDICATIONS = 'WRITE_MEDICATIONS',
    WRITE_ALLERGIES = 'WRITE_ALLERGIES',
    WRITE_INSURANCE = 'WRITE_INSURANCE',
    WRITE_TO_ATHENA = 'WRITE_TO_ATHENA',

    EXTRACT_PATIENT_PROFILE = 'EXTRACT_PATIENT_PROFILE',

    // given ingest information, identify and navigate to the chart in athena. default over the browser, else through the API.
    // train a browser AI to take the profile data, confirm that it's seeing the right chart. 
    IDENTIFY_CHART_IN_ATHENA = 'IDENTIFY_CHART_IN_ATHENA',
}

// EXTRACT_PATIENT_PROFILE types
interface ExtractPatientProfileData {
    source: {
        type: 'APPLICATION_MEMORY' | 'BROWSER';
        applicationMemoryKey?: string;
        browserLocation?: string;
    }
}

interface ExtractPatientProfileResult {
    profile: Profile; 
}

// scrapes ingest data to extract these. 
interface IdentifyChartInAthenaData {
    profile?: Profile; 
}

interface IdentifyChartInAthenaResult {
    // TODO(ambar): isolate member ID when needed.
    url: string; // chart url in athena.
}

// READ_OBESITY_INTAKE_FORM types
interface ReadObesityIntakeFormData {
    url: string;
}

interface ReadObesityIntakeFormResult {
    rawText?: string;
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

interface ExtractAllergiesInput {
    source: {
        type: 'APPLICATION_MEMORY' | 'BROWSER'; // TODO(ambar): add 'API'
        applicationMemoryKey?: string;
        browserLocation?: string;
        allergies?: string[];
    }, 
    destination: {
        type: 'ATHENA'
    }
}

interface ExtractAllergiesResult {
    allergies: Allergy[];
}

interface WriteInsuranceInput {
    source: {
        type: 'APPLICATION_MEMORY' | 'BROWSER'; // TODO(ambar): add 'API'
        applicationMemoryKey?: string;
        browserLocation?: string;
    },
    destination: {
        type: 'ATHENA'
    }
}

interface WriteInsuranceResult {
    insurance: Insurance;
}

interface WriteToAthenaBrowserInput {
    field: string;
    prompt: string;
}

interface WriteToAthenaBrowserResult {
    success: boolean;
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
} | {
    type: TaskType.WRITE_ALLERGIES;
    data: ExtractAllergiesInput;
} | {
    type: TaskType.WRITE_INSURANCE;
    data: WriteInsuranceInput;
} | {
    type: TaskType.WRITE_TO_ATHENA;
    data: WriteToAthenaBrowserInput;
} | {
    type: TaskType.IDENTIFY_CHART_IN_ATHENA;
    data: IdentifyChartInAthenaData;
} | {
    type: TaskType.EXTRACT_PATIENT_PROFILE;
    data: ExtractPatientProfileData;
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
} | {
    type: TaskType.WRITE_ALLERGIES;
    success: boolean;
    error?: string;
    data?: ExtractAllergiesResult;
} | {
    type: TaskType.WRITE_INSURANCE;
    success: boolean;
    error?: string;
    data?: WriteInsuranceResult;
} | {
    type: TaskType.WRITE_TO_ATHENA;
    success: boolean;
    error?: string;
    data?: WriteToAthenaBrowserResult;
} | {
    type: TaskType.IDENTIFY_CHART_IN_ATHENA;
    success: boolean;
    error?: string;
    data?: IdentifyChartInAthenaResult;
} | {
    type: TaskType.EXTRACT_PATIENT_PROFILE;
    success: boolean;
    error?: string;
    data?: ExtractPatientProfileResult;
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