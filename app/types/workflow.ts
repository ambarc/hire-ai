// Workflows designed to be running. This is AI in execution, a worker doing a job.
export type DataSource = {
    type: "browser" | "document" | "api";
    identifier: string; // URL, file path, or API endpoint
    config?: Record<string, any>; // Additional configs like headers, selectors, etc.
  };
  
  export type DataDestination = {
    type: "browser" | "document" | "api";
    identifier: string; // URL, file path, or API endpoint
    config?: Record<string, any>;
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
          identifier: "https://example.com/completed-forms",
          config: { 
            selector: "#completed-forms",
            simulatedDuration: 10000 // 10 seconds simulation
          },
        },
        function: async (input: any) => {
          // Simulate waiting for the video to complete
          await new Promise(resolve => setTimeout(resolve, input.config.simulatedDuration));
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
  