// Workflows designed to be running. This is AI in execution, a worker doing a job.
export type DataSource = {
    type: "browser" | "document" | "api";
    identifier: string; // URL, file path, or API endpoint
    config?: {
      selector?: string;
      simulatedDuration?: number;
      mode?: 'browser-use';
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
    source: DataSource;
  };
  
  export type BrowserSessionState = {
    status: 'initialized' | 'executing' | 'task_completed' | 'error';
    current_url: string;
    current_task: {
        type: 'browser-use';
        action: string;
        prompt: string;
    } | null;
    result?: any;
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
    source: {
        type: "browser",  
        identifier: "http://localhost:8000/ingest",
        config: { 
            mode: 'browser-use',
            prompt: `1. navigate to localhost:8000/ingest 2. scan the entire page by scrolling. extract it into a structured format. 3. now navigate to localhost:8000 4. search for james smith, and tap into their profile 5. go to the medications section in their profile. 6. add the medications that you extracted from their ingest.`
        }
    }
  };
  