import { QueueManager } from '../core/usecases/queue-manager';
import { WorkflowUseCases } from '../core/usecases/workflow-usecases';
import { Task, TaskStatus } from '../core/entities/task';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import OpenAI from 'openai';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { extractOriginalData, scrapeFrameSource } from './puppet-nex-form';
import mockData from './mockData.json';

// Load environment variables
dotenv.config();

// Constants for service URLs
const BROWSER_SERVICE_URL = process.env.BROWSER_SERVICE_URL || 'http://localhost:3001';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Task handler type definition
type TaskHandler = (task: Task) => Promise<any>;

type ExtractionType = 'medications' | 'allergies' | 'insurance' | 'profile' | 'vitals';

interface MedicationExtraction {
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
}

interface AllergyExtraction {
  allergies: Array<{
    name: string;
    severity: string;
    reaction: string;
  }>;
}

interface InsuranceExtraction {
  insurance: {
    name: string;
    policyNumber: string;
    groupNumber: string;
    memberId: string;
  };
}

interface ProfileExtraction {
  profile: {
    name: string;
    dateOfBirth: string;
    gender: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
  };
}

type ExtractionResult = MedicationExtraction | AllergyExtraction | InsuranceExtraction | ProfileExtraction;

export class CloudWorker {
  private taskHandlers: Map<string, TaskHandler> = new Map();
  private isRunning: boolean = false;
  private workerId: string;
  private logger: Logger;
  private openai: OpenAI | null = null;

  constructor(
    private queueManager: QueueManager,
    private workflowUseCases: WorkflowUseCases,
  ) {
    this.workerId = uuidv4();
    this.logger = new Logger(`CloudWorker-${this.workerId.substring(0, 8)}`);
    
    // Initialize OpenAI client
    if (!OPENAI_API_KEY) {
      this.logger.warn('OPENAI_API_KEY not found in environment variables. OpenAI features will be disabled.');
    } else {
      this.openai = new OpenAI({
        apiKey: OPENAI_API_KEY
      });
      this.logger.info('OpenAI client initialized');
    }
    
    this.logger.info(`Browser service URL: ${BROWSER_SERVICE_URL}`);
    this.registerTaskHandlers();
  }

  private registerTaskHandlers() {
    // Register all task handlers
    this.taskHandlers.set('IDENTIFY_CHART_ATHENA', this.handleIdentifyChartAthena.bind(this));
    this.taskHandlers.set('READ_OBESITY_INTAKE_FORM', this.handleReadObesityIntakeForm.bind(this));
    this.taskHandlers.set('READ_OBESITY_INTAKE_FORM_DIRECT', this.handleReadObesityIntakeFormDirect.bind(this));
    this.taskHandlers.set('EXTRACT_PATIENT_PROFILE', this.handleExtractPatientProfile.bind(this));
    this.taskHandlers.set('EXTRACT_MEDICATIONS', this.handleExtractMedications.bind(this));
    this.taskHandlers.set('EXTRACT_ALLERGIES', this.handleExtractAllergies.bind(this));
    this.taskHandlers.set('EXTRACT_INSURANCE', this.handleExtractInsurance.bind(this));
    this.taskHandlers.set('EXTRACT_VITALS', this.handleExtractVitals.bind(this));
    this.taskHandlers.set('WRITE_MEDICATIONS', this.handleWriteMedications.bind(this));
    this.taskHandlers.set('WRITE_ALLERGIES', this.handleWriteAllergies.bind(this));
    this.taskHandlers.set('WRITE_INSURANCE', this.handleWriteInsurance.bind(this));
    this.taskHandlers.set('WRITE_BMI', this.handleWriteBMI.bind(this));
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.info('Worker is already running');
      return;
    }

    // Verify connections to required services
    await this.verifyServiceConnections();

    this.isRunning = true;
    this.logger.info('Starting cloud worker');
    
    // Start processing loop
    this.processNextTask();
  }

  private async verifyServiceConnections(): Promise<void> {
    // Check browser service connection
    // try {
    //   const response = await axios.get(`${BROWSER_SERVICE_URL}/health`);
    //   if (response.status === 200) {
    //     this.logger.info('Successfully connected to browser service');
    //   } else {
    //     this.logger.warn(`Browser service responded with status: ${response.status}`);
    //   }
    // } catch (error) {
    //   this.logger.warn(`Could not connect to browser service: ${error.message}`);
    // }

    // // Check OpenAI connection if configured
    // if (this.openai) {
    //   try {
    //     // Simple model list call to verify API key works
    //     await this.openai.models.list();
    //     this.logger.info('Successfully connected to OpenAI API');
    //   } catch (error) {
    //     this.logger.error(`OpenAI API connection failed: ${error.message}`);
    //   }
    // }
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping cloud worker');
    this.isRunning = false;
  }

  public async executeTask(task: Task): Promise<any> {
    this.logger.info(`Executing task ${task.id} of type ${task.type} directly`);
    this.logger.info(`Task: ${JSON.stringify(task)}`);
    
    // Get the handler for this task type
    const handler = this.taskHandlers.get(task.type);
    if (!handler) {
      throw new Error(`No handler registered for task type: ${task.type}`);
    }

    // Update task status to IN_PROGRESS and set execution details
    const startTime = new Date();
    await this.workflowUseCases.updateTask(
      task.workflowId,
      task.id,
      {
        status: TaskStatus.IN_PROGRESS,
        executionDetails: {
          ...task.executionDetails,
          attempts: (task.executionDetails?.attempts || 0) + 1,
          startedAt: startTime,
          workerId: this.workerId
        }
      }
    );

    console.log('will execute task, task:', task);

    try {
      // Execute the task
      const result = await handler(task);

      console.log('task result', result);

      if (result.success === false) {
        throw new Error(result.error || 'Task failed with success: false');
      }

      // Update task with result, COMPLETED status, and execution details
      const completionTime = new Date();
      console.log('---handler done--------', task.workflowId, task.id, result, '-----------');
      await this.workflowUseCases.updateTask(
        task.workflowId,
        task.id,
        {
          status: TaskStatus.COMPLETED,
          output: result,
          executionDetails: {
            ...task.executionDetails,
            attempts: (task.executionDetails?.attempts || 0) + 1,
            startedAt: startTime,
            completedAt: completionTime,
            workerId: this.workerId
          }
        }
      );

      return result;
    } catch (err) {
      const error = err as Error;
      const errorMessage = error.message || 'Unknown error occurred';
      
      // Update task with error, FAILED status, and execution details
      const completionTime = new Date();
      await this.workflowUseCases.updateTask(
        task.workflowId,
        task.id,
        {
          status: TaskStatus.FAILED,
          error: errorMessage,
          executionDetails: {
            ...task.executionDetails,
            attempts: (task.executionDetails?.attempts || 0) + 1,
            startedAt: startTime,
            completedAt: completionTime,
            workerId: this.workerId,
            lastError: errorMessage
          }
        }
      );

      throw error;
    }
  }

  private async processNextTask(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const nextTask = await this.queueManager.getNextTask();
      
      if (nextTask) {
        this.logger.info(`Processing task: ${nextTask.id} (${nextTask.type})`);
        
        // Update task status to IN_PROGRESS
        await this.workflowUseCases.updateTaskStatus(
          nextTask.workflowId,
          nextTask.id,
          TaskStatus.IN_PROGRESS
        );

        try {
          // Get the appropriate handler for this task type
          const handler = this.taskHandlers.get(nextTask.type);
          
          if (!handler) {
            throw new Error(`No handler registered for task type: ${nextTask.type}`);
          }

          // Execute the task
          const result = await handler(nextTask); 

          const status = result.success === false ? TaskStatus.FAILED : TaskStatus.COMPLETED;

          console.log('---result--------', result, '-----------');
          
          // Update task with result
          await this.workflowUseCases.updateTaskOutput(
            nextTask.workflowId,
            nextTask.id,
            result
          );
          
          // Check result.success to determine task status
        
          await this.workflowUseCases.updateTaskStatus(
            nextTask.workflowId,
            nextTask.id,
            status
          );
          
          this.logger.info(`Task ${status.toLowerCase()}: ${nextTask.id}`);
          
          // Check if there are any tasks that can now be queued
          await this.queueManager.queueReadyTasks(nextTask.workflowId);
        } catch (error) {
          this.logger.error(`Error processing task ${nextTask.id}: ${error}`);
          
          // Mark as failed for execution errors
          await this.workflowUseCases.updateTaskStatus(
            nextTask.workflowId,
            nextTask.id,
            TaskStatus.FAILED,
          );
        }
      } else {
        // No tasks to process, wait before checking again
        this.logger.debug('No tasks in queue, waiting...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      this.logger.error(`Error in processing loop: ${error}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Continue processing if still running
    if (this.isRunning) {
      setImmediate(() => this.processNextTask());
    }
  }

  // Helper method to get workflow data directly from the store
  // private async getWorkflow(workflowId: string) {
  //   return this.workflowStore.getWorkflow(workflowId);
  // }

  // // Helper method to update workflow data directly in the store
  // private async updateWorkflow(workflowId: string, updates: any) {
  //   const workflow = await this.workflowStore.getWorkflow(workflowId);
  //   if (!workflow) {
  //     throw new Error(`Workflow not found: ${workflowId}`);
  //   }
    
  //   const updatedWorkflow = {
  //     ...workflow,
  //     ...updates
  //   };
    
  //   await this.workflowStore.updateWorkflow(workflowId, updatedWorkflow);
  //   return updatedWorkflow;
  // }

  // Helper method to interact with the browser service
  private async callBrowserService(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    try {
      const url = `${BROWSER_SERVICE_URL}${endpoint}`;
      this.logger.debug(`Calling browser service: ${method} ${url}`);
      
      let response;
      if (method === 'GET') {
        response = await axios.get(url);
      } else if (method === 'POST') {
        response = await axios.post(url, data);
      } else if (method === 'PUT') {
        response = await axios.put(url, data);
      } else if (method === 'DELETE') {
        response = await axios.delete(url);
      } else {
        throw new Error(`Unsupported HTTP method: ${method}`);
      }
      
      return response.data;
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Browser service call failed: ${error.message || 'Unknown error'}`);
      throw error;
    }
  }

  // Helper method to use OpenAI for text processing
  private async processWithOpenAI(prompt: string, options: any = {}): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client is not initialized');
    }
    
    try {
      const defaultOptions = {
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 500
      };
      
      const mergedOptions = { ...defaultOptions, ...options };
      
      const response = await this.openai.chat.completions.create({
        model: mergedOptions.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: mergedOptions.temperature,
        max_tokens: mergedOptions.max_tokens
      });
      
      const content = response.choices[0].message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }
      
      return content;
    } catch (err) {
      const error = err as Error;
      this.logger.error(`OpenAI API call failed: ${error.message || 'Unknown error'}`);
      throw error;
    }
  }

  // Task handlers
  private async handleIdentifyChartAthena(task: Task): Promise<any> {
    console.log('\n=== Starting handleIdentifyChartAthena ===');
    console.log('Input:', JSON.stringify(task.input, null, 2));
    this.logger.info(`Identifying Athena chart for profile: ${task.input.profileText}`);
    const extractedText = JSON.stringify(mockData)
    try {
      // Check OpenAI initialization
      console.log('\nStep 1: Checking OpenAI client...');
      if (!this.openai) {
        console.log('❌ OpenAI client not initialized');
        throw new Error('OpenAI client is not initialized');
      }
      console.log('✅ OpenAI client ready');

      // Extract profile information
      console.log('\nStep 2: Extracting profile information...');
      console.log('Profile text:', extractedText); // task.input.profileText);
      const extractedProfile = await this.extract(extractedText, 'profile');
      const profile = (extractedProfile as ProfileExtraction).profile;
      console.log('Extracted profile:', JSON.stringify(profile, null, 2));

      // Validate profile information
      console.log('\nStep 3: Validating profile information...');
      if (!profile.name || !profile.dateOfBirth) {
        console.log('❌ Missing required profile information');
        console.log('Name present:', !!profile.name);
        console.log('DOB present:', !!profile.dateOfBirth);
        throw new Error('Could not extract required profile information (name and DOB)');
      }
      console.log('✅ Profile validation passed');

      // Construct and execute browser command
      console.log('\nStep 4: Constructing browser command...');
      const browserPrompt = `
        Navigate to http://localhost:8000.
        Search for patient "${profile.name}".
        Look for a patient with date of birth "${profile.dateOfBirth}".
        If found, click to open their chart.
        Verify you're on the correct chart by confirming the name and date of birth match exactly.
      `;
      console.log('Browser prompt:', browserPrompt);

      console.log('\nStep 5: Executing browser command...');
      const commandResult = await this.executeBrowserCommand(browserPrompt);
      console.log('Browser command result:', JSON.stringify(commandResult, null, 2));

      // Validate browser command result
      console.log('\nStep 6: Validating browser command result...');
      if (!commandResult || !commandResult.last_url) {
        console.log('❌ Invalid browser command result');
        console.log('Command result:', commandResult);
        throw new Error('Failed to navigate to patient chart');
      }
      console.log('✅ Browser command validation passed');

      // Prepare success response
      console.log('\nStep 7: Preparing success response...');
      const response = {
        success: true,
        chartUrl: commandResult.last_url,
        profile: {
          name: profile.name,
          dateOfBirth: profile.dateOfBirth,
          gender: profile.gender
        }
      };
      console.log('Response:', JSON.stringify(response, null, 2));
      console.log('=== Completed handleIdentifyChartAthena successfully ===\n');
      return response;

    } catch (error) {
      console.log('\n❌ Error in handleIdentifyChartAthena:');
      console.log('Error:', error instanceof Error ? error.message : String(error));
      console.log('Stack:', error instanceof Error ? error.stack : 'No stack trace available');
      this.logger.error(`Error identifying Athena chart: ${error instanceof Error ? error.message : String(error)}`);
      
      const errorResponse = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
      console.log('Error response:', JSON.stringify(errorResponse, null, 2));
      console.log('=== Completed handleIdentifyChartAthena with error ===\n');
      return errorResponse;
    }
  }

  private async executeBrowserCommand(prompt: string): Promise<any> {
    // Create a new browser session
    const commandResponse = await fetch('http://localhost:3000/api/browser-agent/browser-agent/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        command: { prompt }
      }),
    });
    
    if (!commandResponse.ok) {
      throw new Error(`Failed to send browser command: ${commandResponse.statusText}`);
    }
    
    const commandData = await commandResponse.json();
    const { session_id: sessionId, command_id: commandId } = commandData;
    
    if (!sessionId || !commandId) {
      throw new Error('Invalid response from browser service: missing session_id or command_id');
    }
    
    // Poll for command completion
    const maxAttempts = 30;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      this.logger.info(`Polling for command completion: ${attempts} of ${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const stateResponse = await fetch(`http://localhost:3000/api/browser-agent/browser-agent/${sessionId}/state`);
      if (!stateResponse.ok) {
        throw new Error(`Failed to get session state: ${stateResponse.statusText}`);
      }
      
      const stateData = await stateResponse.json();
      const commandHistory = stateData.command_history || [];
      
      // Check for completion
      const completedCommand = commandHistory.find((cmd: { command_id: string, result: { status: string } }) => 
        cmd.command_id === commandId && 
        cmd.result && 
        cmd.result.status === 'success'
      );
      
      if (completedCommand) {
        return completedCommand.result;
      }
      
      // Check for failure
      const failedCommand = commandHistory.find((cmd: { command_id: string, result: { status: string } }) => 
        cmd.command_id === commandId && 
        cmd.result && 
        cmd.result.status === 'error'
      );
      
      if (failedCommand) {
        throw new Error(`Browser command failed: ${failedCommand.result.message || 'Unknown error'}`);
      }
      
      if (stateData.status === 'error') {
        throw new Error(`Browser session in error state: ${stateData.error || 'Unknown error'}`);
      }
      
      attempts++;
    }
    
    throw new Error('Browser command timed out after multiple attempts');
  }

  private async handleReadObesityIntakeForm(task: Task): Promise<any> {
    this.logger.info(`Reading obesity intake form`);
    
    const REVOLUTION_MEDICINE_FORM_STRING = `Revolution New Patient Intake Form`;
    try {
      const browserPrompt = `go to ${task.input.url} and open the most recent ${REVOLUTION_MEDICINE_FORM_STRING}. Once that form's open, scan all the text on the page and return it. Return the text itself. Do not summarize.`;
      
      const commandResult = await this.executeBrowserCommand(browserPrompt);
      const extractedText = commandResult.summary || '';
      
      this.logger.info(`Successfully extracted text of length: ${extractedText.length}`);
      
      return {
        success: true,
        extractedText,
      };
    } catch (error: unknown) {
      this.logger.error(`Error reading obesity intake form: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async handleReadObesityIntakeFormDirect(task: Task): Promise<any> {
    this.logger.info(`Reading obesity intake form directly`);

    let extractedData = JSON.stringify(mockData) // task.input.extractedText;
    const CONNOR_MOCK_URL = 'https://app.nexhealth.com/app/patients/342722791?tab=forms';
    
    // run a sub-routine to scrape the frame source
    try {
      
      const scraped = await scrapeFrameSource({
          websiteUrl: CONNOR_MOCK_URL,
          buttonSelector: '#radix-\\:rp\\:-content-forms > div > div > div > div > div > div > table > tbody > tr:nth-child(1) > td:nth-child(2) > div > div:nth-child(2) > button',
          iframeSelector: '#headlessui-dialog-panel-\:r4n\: > div.flex.w-full.items-start > div > div > iframe',
          headless: false,  // set to true for production
          timeout: 30000    // 30 seconds
      });

      const originalDataString = extractOriginalData(scraped);
      if (!originalDataString) {
          throw new Error('Failed to extract original data');
      }
      extractedData = JSON.parse(originalDataString);
      
      console.log('Raw frame source:', extractedData);
    } catch (error) {
        // console.error('Main execution error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
    }

    return {
      success: true,
      extractedData,
    }
  }

  private async handleExtractPatientProfile(task: Task): Promise<any> {
    this.logger.info(`Extracting patient profile from text`);
    

    try {
      // Get the extracted text from the task input
      const extractedText = JSON.stringify(mockData) // task.input.extractedText;
      
      if (!extractedText) {
        throw new Error('No extracted text provided in task input');
      }

      // Use the extract method to process the text and get profile information
      const profileData = await this.extract(extractedText, 'profile');
      
      this.logger.info(`Successfully extracted profile information`);
      
      return {
        success: true,
        ...profileData
      };
      
    } catch (error) {
      this.logger.error(`Error extracting patient profile: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async handleExtractVitals(task: Task): Promise<any> {
    this.logger.info(`Extracting vitals from text`);

    try {
      // Get the extracted text from the task input
      const extractedText = JSON.stringify(mockData) // task.input.extractedText;     

      if (!extractedText) {
        throw new Error('No extracted text provided in task input');
      }

      // Use the extract method to process the text and get vitals information
      const vitalsData = await this.extract(extractedText, 'vitals');

      this.logger.info(`Successfully extracted vitals information`);
      
      return {
        success: true,
        ...vitalsData
      };  
    } catch (error) {
      this.logger.error(`Error extracting vitals: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };  
    }
  }

  private async handleExtractMedications(task: Task): Promise<any> {
    this.logger.info(`Extracting medications from text`);

    try {
      // Get the extracted text from the task input
      const extractedText = JSON.stringify(mockData) // task.input.extractedText;
      
      if (!extractedText) {
        throw new Error('No extracted text provided in task input');
      }

      // Use the extract method to process the text and get medications information
      const medicationsData = await this.extract(extractedText, 'medications');
      
      this.logger.info(`Successfully extracted medications information`);
      
      return {
        success: true,
        ...medicationsData
      };
      
    } catch (error) {
      this.logger.error(`Error extracting medications: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async handleExtractAllergies(task: Task): Promise<any> {
    this.logger.info(`Extracting allergies from text`);

    try {
      // Get the extracted text from the task input
      const extractedText = JSON.stringify(mockData) // task.input.extractedText;
      
      if (!extractedText) {
        throw new Error('No extracted text provided in task input');
      }

      // Use the extract method to process the text and get allergies information
      const allergiesData = await this.extract(extractedText, 'allergies');
      
      this.logger.info(`Successfully extracted allergies information`);
      
      return {
        success: true,
        ...allergiesData
      };
      
    } catch (error) {
      this.logger.error(`Error extracting allergies: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async handleExtractInsurance(task: Task): Promise<any> {
    this.logger.info(`Extracting insurance from text`);

    try {
      // Get the extracted text from the task input
      const extractedText = JSON.stringify(mockData) // task.input.extractedText;
      
      if (!extractedText) {
        throw new Error('No extracted text provided in task input');
      }

      // Use the extract method to process the text and get insurance information
      const insuranceData = await this.extract(extractedText, 'insurance');
      
      this.logger.info(`Successfully extracted insurance information`);
      
      return {
        success: true,
        ...insuranceData
      };
      
    } catch (error) {
      this.logger.error(`Error extracting insurance: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async handleWriteMedications(task: Task): Promise<any> {
    this.logger.info(`Writing medications to: ${task.input.url}`);

    const mockMedications = 
    [
      {
        "name": "Lisinopril",
        "dosage": "10mg",
        "frequency": "once daily"
      },
      {
        "name": "Metformin",
        "dosage": "500mg",
        "frequency": "once daily"
      }
    ];

    /*
    the sample medication task is... 
    {
      "id": "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
      "type": "WRITE_MEDICATIONS",
      "workflowIdd": "workflow-1",
      "status": "NOT_STARTED",
      "input": {
        "medications": "string",
        "url": "string"
      }
    }
    */

    const mockUrl = 'http://localhost:8000/patients/3';
    
    try {
      // Parse medications from input
      const medications = mockMedications; // JSON.parse(task.input.medications);
      const url = mockUrl;
      // if (!Array.isArray(medications) || medications.length === 0) {
      //   throw new Error('No valid medications provided in task input');
      // }

      // Format medications for the browser prompt
      const formattedMeds = medications.map(med => 
        `${med.name} ${med.dosage} ${med.frequency}`
      ).join('\n');

      // Construct browser command
      const browserPrompt = `
        Navigate to ${mockUrl}.
        Look for the medications section or form.
        For each of the following medications, find the appropriate input fields and enter the information:
        ${formattedMeds}
        
        For each medication:
        1. Click "Add Medication" or similar button if present
        2. Enter the medication name
        3. Enter the dosage
        4. Enter the frequency
        5. Save or confirm the entry
        
        Verify all medications have been entered correctly.
      `;

      // Execute browser command
      const commandResult = await this.executeBrowserCommand(browserPrompt);
      
      if (!commandResult) {
        throw new Error('Failed to write medications to chart');
      }

      this.logger.info(`Successfully wrote ${medications.length} medications to chart`);
      
      return {
        success: true,
        medications,
        timestamp: new Date().toISOString(),
        url: task.input.url
      };

    } catch (error) {
      this.logger.error(`Error writing medications: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async handleWriteAllergies(task: Task): Promise<any> {
    this.logger.info(`Writing allergies to: ${task.input.url}`);

    const mockAllergies = 
    [
      {
        "name": "Penicillin",
        "severity": "Severe",
        "reaction": "anaphylaxis"
      },
      {
        "name": "Sulfa Drugs",
        "severity": "Moderate",
        "reaction": "rash"
      },
      {
        "name": "Shellfish",
        "severity": "Mild",
        "reaction": "itching"
      }
    ];

    /*
    the sample medication task is... 
    {
      "id": "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
      "type": "WRITE_MEDICATIONS",
      "workflowId": "workflow-1",
      "status": "NOT_STARTED",
      "input": {
        "medications": "string",
        "url": "string"
      }
    }
    */

    const mockUrl = 'http://localhost:8000/patients/3';
    const url = mockUrl;
    try {
      // Parse allergies from input
      const allergies = JSON.stringify(mockAllergies); // JSON.parse(task.input.allergies);

      // Construct browser command
      const browserPrompt = `
        Navigate to ${url}.
        Look for the allergies section or form.
        For each of the following allergies, find the appropriate input fields and enter the information:
        ${allergies}
        
        For each allergy:
        1. Click "Add Allergy" or similar button if present
        2. Enter the allergy name
        3. Enter the severity
        4. Enter the reaction
        5. Save or confirm the entry
        
        Verify all allergies have been entered correctly.
      `;

      // Execute browser command
      const commandResult = await this.executeBrowserCommand(browserPrompt);
      
      // if (!commandResult || !commandResult.success) {
      //   throw new Error('Failed to write allergies to chart');
      // }

      this.logger.info(`Successfully wrote ${allergies.length} allergies to chart`);
      
      return {
        success: true,
        allergies: mockAllergies,
        // allergiesWritten: allergies.length,
        timestamp: new Date().toISOString(),
        url: task.input.url
      };

    } catch (error) {
      this.logger.error(`Error writing allergies: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async handleWriteInsurance(task: Task): Promise<any> {
    this.logger.info(`Writing insurance to: ${task.input.url}`);

    const mockInsurance = {
      "name": "Blue Cross Blue Shield",
      "groupNumber": "GRP987654",
      "memberId": "BCBS789012345",
      "plantType": "PPO",
      "effectiveDate": "01/01/2024",
    };

    const mockUrl = 'http://localhost:8000/patients/3';
    const url = mockUrl;
    
    try {
      // Parse insurance from input
      const insurance = JSON.stringify(mockInsurance); // JSON.parse(task.input.insurance);

      // Construct browser command
      const browserPrompt = `
        Navigate to ${url}.
        Look for the insurance section or form.
        Enter the following insurance information:
        ${insurance}
        
        Steps:
        Make sure to fill in the relevant insurance fields based on the insurance information provided.

        Enter each field of the insurance you have, like ${Object.keys(mockInsurance).join(', ')} and hit submit.

        Save or confirm the entry is saved to the page.
        
        Verify all insurance information has been entered correctly.
      `;

      // Execute browser command
      const commandResult = await this.executeBrowserCommand(browserPrompt);
      
      // if (!commandResult || !commandResult.success) {
      //   throw new Error('Failed to write insurance to chart');
      // }

      this.logger.info('Successfully wrote insurance information to chart');
      
      return {
        success: true,
        insuranceWritten: mockInsurance,
        timestamp: new Date().toISOString(),
        url: task.input.url
      };

    } catch (error) {
      this.logger.error(`Error writing insurance: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async handleWriteBMI(task: Task): Promise<any> {
    this.logger.info(`Writing BMI to: ${task.input.url}`);

    const mockVitals = {
      height: {
        value: 66,
        unit: "inches"
      },
      weight: {
        value: 245,
        unit: "lbs"
      }
    };

    const heightInInches = mockVitals.height.value; // mockVitals.height.value * 0.393701;
    const weightInLbs = mockVitals.weight.value; // mockVitals.weight.value * 2.20462;

    const calculateBMI = (weightLbs: number, heightIn: number): number => {
      const bmi = (weightLbs / (heightIn ** 2)) * 703;
      return Number(bmi.toFixed(2));
    };

    const bmi = calculateBMI(weightInLbs, heightInInches);

    const mockUrl = 'http://localhost:8000/patients/3';
    const url = mockUrl;
    
    try {
      // Parse insurance from input
      const bmiInfo = JSON.stringify({
        bmi: bmi,
        heightInFeetAndInches: `5'6''`, // heightInInches,
        weightInLbs: weightInLbs,
      }); // JSON.parse(task.input.insurance);

      // Construct browser command
      const browserPrompt = `
        Navigate to ${url}.
        Navigate to the clinical notes section.
      
        Enter a well-formatted clinical note describing the patient's height, weight, and BMI, based on the following information:
        ${bmiInfo}

        Save or confirm the entry is saved to the page.
      
        Verify the BMI information has been entered correctly.
      `;

      // Execute browser command
      const commandResult = await this.executeBrowserCommand(browserPrompt);
      
      // if (!commandResult || !commandResult.success) {
      //   throw new Error('Failed to write insurance to chart');
      // }

      this.logger.info('Successfully wrote BMI information to chart');
      
      return {
        success: true,
        vitals: {
          ...mockVitals,
          bmi: bmi,
        },
        timestamp: new Date().toISOString(),
        // url: task.input.url
      };

    } catch (error) {
      this.logger.error(`Error writing insurance: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async extract(text: string, extractionType: ExtractionType): Promise<ExtractionResult> {
    if (!this.openai) {
      throw new Error('OpenAI client is not initialized');
    }

    let prompt: string;
    let schema: any;

    switch (extractionType) {
      case 'medications':
        prompt = `Extract all medications from the following text. Include name, dosage, and frequency when available.
        
Text: ${text}

Only include information that is explicitly mentioned in the text. Do not make assumptions or add information not present in the text. Return an empty array if no medications are found.`;
        schema = {
          type: "object",
          properties: {
            medications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  dosage: { type: "string" },
                  frequency: { type: "string" },
                },
                required: ["name", "dosage", "frequency"]
              }
            }
          }
        };
        break;

      case 'allergies':
        prompt = `Extract all allergies and intolerances from the following text. Include name, severity, and reaction when available.
        
Text: ${text}

Only include information that is explicitly mentioned in the text. Do not make assumptions or add information not present in the text. Return an empty array if no allergies are found.`;
        schema = {
          type: "object",
          properties: {
            allergies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  severity: { type: "string" },
                  reaction: { type: "string" },
                },
                required: ["name", "severity", "reaction"]
              }
            }
          }
        };
        break;

      case 'insurance':
        prompt = `Extract all insurance information from the following text. Include name, policy number, group number, and member ID when available.
        
Text: ${text}

Only include information that is explicitly mentioned in the text. Do not make assumptions or add information not present in the text. Return an empty array if no insurance information is found.`;
        schema = {
          type: "object",
          properties: {
            insurance: {
              type: "object",
              properties: {
                name: { type: "string" },
                policyNumber: { type: "string" },
                groupNumber: { type: "string" },
                memberId: { type: "string" },
              },
              required: ["name", "policyNumber", "groupNumber", "memberId"]
            }
          }
        };
        break;

      case 'profile':
        prompt = `Extract patient profile information from the following text. Include name, date of birth, gender, phone number, email, and address when available.
        
Text: ${text}

Only include information that is explicitly mentioned in the text. Do not make assumptions or add information not present in the text.`;
        schema = {
          type: "object",
          properties: {
            profile: {
              type: "object",
              properties: {
                name: { type: "string" },
                dateOfBirth: { type: "string" },
                gender: { type: "string" },
                phoneNumber: { type: "string" },
                email: { type: "string" },
                address: { type: "string" }
              },
              required: ["name", "dateOfBirth", "gender"]
            }
          }
        };
        break;

      case 'vitals':
        prompt = `Extract current vitals information from the following text. Include height, weight, and blood pressure when available.
        
Text: ${text}

For each vital, the value will be a number, and the unit will be an SI or imperial unit.
You can ignore historical vital signs, go only for the current vitals.

Only include information that is explicitly mentioned in the text. Do not make assumptions or add information not present in the text.`;
        schema = {
          type: "object",
          properties: {
            vitals: {
              type: "object",
              properties: {
                height: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    unit: { type: "string" }
                  },
                  required: ["value", "unit"]
                },
                weight: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    unit: { type: "string" }
                  },
                  required: ["value", "unit"]
                }
              },
              required: ["height", "weight"]
            }
          },
          required: ["vitals"]
        };
        break;
      default:
        throw new Error(`Unsupported extraction type: ${extractionType}`);
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: prompt, 
          },
          { role: "user", content: prompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "extracted",
            schema: schema,
          }
        }
      });

      const content = completion.choices[0].message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content);
      
      // Validate the response matches our schema
      // if (!this.validateResponse(parsed, extractionType)) {
      //   throw new Error('OpenAI response did not match expected schema');
      // }

      return parsed as ExtractionResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error in extract function: ${errorMessage}`);
      throw error;
    }
  }

  private validateResponse(response: any, type: ExtractionType): boolean {
    switch (type) {
      case 'medications':
        return Array.isArray(response?.medications) &&
          response.medications.every((med: any) => 
            typeof med.name === 'string' &&
            typeof med.dosage === 'string' &&
            typeof med.frequency === 'string'
          );

      case 'allergies':
        return Array.isArray(response?.allergies) &&
          response.allergies.every((allergy: any) =>
            typeof allergy.name === 'string' &&
            typeof allergy.severity === 'string' &&
            typeof allergy.reaction === 'string'
          );

      case 'insurance':
        return response?.insurance &&
          typeof response.insurance.name === 'string' &&
          typeof response.insurance.policyNumber === 'string' &&
          typeof response.insurance.groupNumber === 'string' &&
          typeof response.insurance.memberId === 'string';

      case 'profile':
        return response?.profile &&
          typeof response.profile.name === 'string' &&
          typeof response.profile.dateOfBirth === 'string' &&
          typeof response.profile.gender === 'string';

      default:
        return false;
    }
  }
}
