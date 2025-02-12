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
  
  export const exampleWorkflow: Workflow = {
    id: "workflow-002",
    name: "Medications Ingestion",
    type: "SYNCHRONIZE_DATA",
    transformations: [
      {
        id: "transformation-001",
        name: "Extract Medications Data for New Patient",
        runTime: "programmatic",
        source: {
          type: "browser",
          identifier: "http://localhost:8000/ingest",
          config: { 
            mode: 'browser-use',
            prompt: `
              1. First, extract all form data from the weight ingestion form as a structured JSON object. You're looking for the following fields. You might not find all of them. 
              Header Information
              Patient Name
              DOB
              Patient ID
              Submission Date/Time
              Vital Statistics
              Height
              Current Weight
              BMI
              Waist Circumference
              Weight History
              Highest Adult Weight
              Lowest Adult Weight
              Weight Gain Pattern
              Previous Weight Loss Attempts
              Medical History
              Current Medical Conditions
              Allergies & Intolerances
              Current Medications
              Family History
              Lifestyle Assessment
              Occupation
              Work Schedule
              Physical Activity:
              Daily steps
              Exercise routine
              Physical limitations
              Sleep Patterns:
              Average hours
              Sleep aids/devices
              Sleep quality
              Night-time habits
              Eating Patterns
              Meal Pattern:
              Breakfast habits
              Lunch habits
              Dinner habits
              Snacking habits
              Eating Behaviors:
              Eating triggers
              Eating location
              Eating pace
              Portion sizes
              Emotional eating patterns
              Food Preferences & Restrictions:
              Preferred foods
              Disliked foods
              Food allergies/intolerances
              Psychological Factors
              Mental Health History
              Weight Loss Motivation:
              Primary goals
              Secondary goals
              Motivation level
              Barriers to Weight Loss
              Support System
              Household Composition
              Social Support Network
              Treatment Preferences
              Interested Treatment Options
              Goals:
              Short-term goals
              Long-term goals
              Health improvement goals
              Behavioral goals

              2. Once you have these fields, Navigate to http://localhost:8000
              3. Use the search bar to search for James Smith.
              4. Click into the patient's profile.
              5. Fill out the medication section -- enter 2 medications: Lisinopril 10mg Once daily, and Metformin 500mg Once daily.
              6. Save changes in each section as you complete them
              Return a summary of what was extracted and updated.
            `,
            // 5. Go through each section of the patient's profile (Demographics, Insurance, Clinical Notes, Problems, Medications, Allergies, Surgical History, Substance History, Work History, Weight History, Exercise History, Sleep History, Food Preferences)
            // 6. For each section, fill in any relevant information from the extracted form data.
            selector: "form",
            simulatedDuration: 5000 // 5 seconds for browser startup simulation
          },
        },
        function: async (input: any) => {
          if (input.type === 'browser-use') {
            return {
              success: true,
              message: "Form data processed and patient updated successfully",
              data: input.data
            };
          }
          return { success: false, message: "Failed to process form data and update patient" };
        },
        destination: {
          type: "api",
          identifier: "http://localhost:8000/api/summary",
          config: {}
        },
      },
    ],
  };
  