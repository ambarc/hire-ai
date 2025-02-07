// Workflows designed to be running. This is AI in execution, a worker doing a job.
export type DataSource = {
    type: "browser" | "document" | "api";
    identifier: string; // URL, file path, or API endpoint
    config?: {
      selector?: string;
      simulatedDuration?: number;
      mode?: 'video' | 'browser-use';
      prompt?: string; // Instructions for browser-use session
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
  
  export const exampleWorkflow: Workflow = {
    id: "workflow-002",
    name: "Virtual Medical Assistant Form Ingestion",
    type: "SYNCHRONIZE_DATA",
    transformations: [
      {
        id: "transformation-001",
        name: "Extract Form Data",
        runTime: "programmatic",
        source: {
          type: "browser",
          identifier: "https://youtube.com",
          config: { 
            mode: 'browser-use',
            prompt: "Search for 30 second videos, play one of the first few. Exit when you're done playing.",
            selector: "#completed-forms"
          },
        },
        function: async (input: any) => {
          if (input.type === 'browser-use') {
            return {
              success: true,
              message: "Form data extracted successfully",
              data: input.data
            };
          }
          return { success: true, message: "Form data extracted successfully" };
        },
        destination: {
          type: "browser",
          identifier: "https://example.com/engineer-input-form",
          config: { selector: "#engineer-form" },
        },
      },
    ],
  };
  