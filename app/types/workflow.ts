// Workflows designed to be running. This is AI in execution, a worker doing a job.
export type DataSource = {
    type: "browser" | "document" | "api";
    identifier: string; // URL, file path, or API endpoint
    config?: {
      selector?: string;
      simulatedDuration?: number;
      mode?: 'video' | 'browser-use';
      prompt?: string; // Instructions for browser-use session
      hidePreview?: boolean;
    };
  };
  
  export type DataDestination = {
    type: "browser" | "document" | "api";
    identifier: string; // URL, file path, or API endpoint
    config?: Record<string, any>;
  };
  
  export type BrowserUseResult = {
    type: 'browser-use';
    data: any;
    screenshot?: string;
    url: string;
  };
  
  export type Transformation = {
    id: string;
    name: string;
    runTime: "programmatic" | "human-in-the-loop";
    source: DataSource;
    function: (input: any) => any;
    destination: DataDestination;
  };
  
  export type Workflow = {
    id: string;
    name: string;
    type: "SYNCHRONIZE_DATA";
    transformations: Transformation[];
  };
  
  export type BrowserSessionState = {
    status: 'initialized' | 'executing' | 'task_completed' | 'error';
    current_url: string;
    current_task: BrowserTask | null;
    task_history: Array<{
      task: BrowserTask;
      result: BrowserTaskResult;
      timestamp: string;
    }>;
    last_result?: BrowserTaskResult;
    last_error?: string;
  };
  
  export type FormField = {
    label: string;
    value: string | number | null;
    type?: string;
    section?: string;
  };
  
  export type FormExtractionResult = {
    fields: FormField[];
    sections: {
      [key: string]: FormField[];
    };
    metadata: {
      formTitle?: string;
      timestamp: string;
      url: string;
    };
  };
  
  // make it do single tasks at a time.
  // the more you can pull the data, the better it's going to be.
  

  export const exampleWorkflow: Workflow = {
    id: "workflow-002",
    name: "Medications Ingestion",
    type: "SYNCHRONIZE_DATA",
    transformations: [
      {
        id: "transformation-001",
        name: "Extract Form Structure",
        runTime: "programmatic",
        source: {
          type: "browser",
          identifier: "http://localhost:8000/ingest",
          config: { 
            mode: 'browser-use',
            tasks: [
              {
                type: 'browser-use',
                action: 'analyze_form',
                prompt: `Navigate to the form and analyze its structure. Extract all form fields and their current values.
                        Organize fields into logical sections.
                        Return a structured representation of the form including:
                        - All field labels and values
                        - Section groupings
                        - Form metadata`,
                expectedOutput: {
                  type: 'json',
                  schema: {
                    fields: 'array',
                    sections: 'object',
                    metadata: 'object'
                  }
                }
              }
            ]
          }
        },
        function: async (input: BrowserTaskResult) => {
          if (input.type === 'browser-use' && input.data) {
            const formData = input.data as FormExtractionResult;
            return {
              success: true,
              message: "Form structure extracted successfully",
              data: formData,
              nextTask: {
                type: 'browser-use',
                action: 'navigate_to_ehr',
                prompt: 'Navigate to http://localhost:8000',
                expectedOutput: {
                  type: 'json',
                  schema: {
                    success: 'boolean',
                    currentUrl: 'string'
                  }
                }
              }
            };
          }
          return { success: false, message: "Failed to extract form structure" };
        },
        destination: {
          type: "api",
          identifier: "http://localhost:8000/api/form-structure",
          config: {}
        },
      },
      {
        id: "transformation-002",
        name: "Navigate to EHR",
        runTime: "programmatic",
        source: {
          type: "browser",
          identifier: "http://localhost:8000",
          config: { 
            mode: 'browser-use',
            tasks: [
              {
                type: 'browser-use',
                action: 'navigate_to_ehr',
                prompt: 'Navigate to http://localhost:8000 and confirm successful navigation',
                expectedOutput: {
                  type: 'json',
                  schema: {
                    success: 'boolean',
                    currentUrl: 'string'
                  }
                }
              }
            ]
          }
        },
        function: async (input: BrowserTaskResult) => {
          if (input.type === 'browser-use' && input.data?.success) {
            return {
              success: true,
              message: "Successfully navigated to EHR",
              data: input.data,
              nextTask: {
                type: 'browser-use',
                action: 'search_patient',
                prompt: 'Search for patient James Smith',
                expectedOutput: {
                  type: 'json',
                  schema: {
                    patientFound: 'boolean',
                    searchResults: 'array'
                  }
                }
              }
            };
          }
          return { success: false, message: "Failed to navigate to EHR" };
        },
        destination: {
          type: "api",
          identifier: "http://localhost:8000/api/navigation-status",
          config: {}
        },
      }
    ],
  };
  