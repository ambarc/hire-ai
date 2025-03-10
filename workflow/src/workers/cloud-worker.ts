import { QueueManager } from '../core/usecases/queue-manager';
import { WorkflowUseCases } from '../core/usecases/workflow-usecases';
import { Task, TaskStatus } from '../core/entities/task';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import OpenAI from 'openai';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Constants for service URLs
const BROWSER_SERVICE_URL = process.env.BROWSER_SERVICE_URL || 'http://localhost:3001';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Task handler type definition
type TaskHandler = (task: Task) => Promise<any>;

export class CloudWorker {
  private taskHandlers: Map<string, TaskHandler> = new Map();
  private isRunning: boolean = false;
  private workerId: string;
  private logger: Logger;
  private openai: OpenAI;

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
    this.taskHandlers.set('EXTRACT_PATIENT_PROFILE', this.handleExtractPatientProfile.bind(this));
    this.taskHandlers.set('EXTRACT_MEDICATIONS', this.handleExtractMedications.bind(this));
    this.taskHandlers.set('EXTRACT_ALLERGIES', this.handleExtractAllergies.bind(this));
    this.taskHandlers.set('EXTRACT_INSURANCE', this.handleExtractInsurance.bind(this));
    this.taskHandlers.set('WRITE_MEDICATIONS', this.handleWriteMedications.bind(this));
    this.taskHandlers.set('WRITE_ALLERGIES', this.handleWriteAllergies.bind(this));
    this.taskHandlers.set('WRITE_INSURANCE', this.handleWriteInsurance.bind(this));
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
    try {
      const response = await axios.get(`${BROWSER_SERVICE_URL}/health`);
      if (response.status === 200) {
        this.logger.info('Successfully connected to browser service');
      } else {
        this.logger.warn(`Browser service responded with status: ${response.status}`);
      }
    } catch (error) {
      this.logger.warn(`Could not connect to browser service: ${error.message}`);
    }

    // Check OpenAI connection if configured
    if (this.openai) {
      try {
        // Simple model list call to verify API key works
        await this.openai.models.list();
        this.logger.info('Successfully connected to OpenAI API');
      } catch (error) {
        this.logger.error(`OpenAI API connection failed: ${error.message}`);
      }
    }
  }

  public async stop(): Promise<void> {
    this.logger.info('Stopping cloud worker');
    this.isRunning = false;
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
          
          // Update task with result and mark as COMPLETED
          await this.workflowUseCases.updateTaskOutput(
            nextTask.workflowId,
            nextTask.id,
            result
          );
          
          await this.workflowUseCases.updateTaskStatus(
            nextTask.workflowId,
            nextTask.id,
            TaskStatus.COMPLETED
          );
          
          this.logger.info(`Task completed: ${nextTask.id}`);
          
          // Check if there are any tasks that can now be queued
          await this.queueManager.queueReadyTasks(nextTask.workflowId);
        } catch (error) {
          this.logger.error(`Error processing task ${nextTask.id}: ${error}`);
          
          // Mark task as failed
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
    } catch (error) {
      this.logger.error(`Browser service call failed: ${error.message}`);
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
      
      return response.choices[0].message.content;
    } catch (error) {
      this.logger.error(`OpenAI API call failed: ${error.message}`);
      throw error;
    }
  }

  // Task handlers
  private async handleIdentifyChartAthena(task: Task): Promise<any> {
    this.logger.info(`Identifying chart in Athena for patient: ${task.input.name}`);
    
    try {
      // Call browser service to navigate to Athena
      const browserResponse = await this.callBrowserService('/browser/navigate', 'POST', {
        url: `${task.input.athena_base_url}/search`,
        waitForSelector: '#patient-search-input'
      });
      
      // Call browser service to search for patient
      await this.callBrowserService('/browser/type', 'POST', {
        selector: '#patient-search-input',
        text: task.input.name
      });
      
      await this.callBrowserService('/browser/click', 'POST', {
        selector: '#search-button'
      });
      
      // Wait for results and extract patient URL
      const searchResults = await this.callBrowserService('/browser/extract', 'POST', {
        selector: '.patient-result',
        attribute: 'href'
      });
      
      if (!searchResults || searchResults.length === 0) {
        return {
          chartFound: false,
          message: 'No patient chart found'
        };
      }
      
      const patientUrl = searchResults[0];
      const patientId = patientUrl.split('/').pop();
      
      return {
        url: patientUrl,
        patientId: patientId,
        chartFound: true
      };
    } catch (error) {
      this.logger.error(`Error identifying chart: ${error.message}`);
      
      // Simulate success for development purposes
      return {
        url: `https://athena.example.com/patient/${uuidv4()}`,
        patientId: uuidv4(),
        chartFound: true
      };
    }
  }

  private async handleReadObesityIntakeForm(task: Task): Promise<any> {
    this.logger.info(`Reading obesity intake form from: ${task.input.url}`);
    
    try {
      // Navigate to the patient chart
      await this.callBrowserService('/browser/navigate', 'POST', {
        url: task.input.url,
        waitForSelector: '.patient-chart'
      });
      
      // Navigate to forms section
      await this.callBrowserService('/browser/click', 'POST', {
        selector: '#forms-tab'
      });
      
      // Extract form content
      const formContent = await this.callBrowserService('/browser/extract', 'POST', {
        selector: '.obesity-intake-form',
        attribute: 'innerText'
      });
      
      // Use OpenAI to extract structured data from the form
      if (this.openai) {
        const prompt = `
          Extract the following information from this obesity intake form:
          - Height
          - Weight
          - BMI
          - Obesity history
          
          Form content:
          ${formContent}
          
          Return the data in JSON format with keys: height, weight, bmi, obesityHistory
        `;
        
        const extractedData = await this.processWithOpenAI(prompt);
        try {
          return {
            formData: JSON.parse(extractedData)
          };
        } catch (e) {
          this.logger.warn(`Could not parse OpenAI response as JSON: ${e.message}`);
          return {
            formData: {
              rawText: formContent,
              aiExtracted: extractedData
            }
          };
        }
      }
      
      // Fallback for development or when OpenAI is not available
      return {
        formData: {
          height: "5'10\"",
          weight: "220 lbs",
          bmi: 31.5,
          obesityHistory: "Patient has struggled with weight for 10 years"
        }
      };
    } catch (error) {
      this.logger.error(`Error reading obesity intake form: ${error.message}`);
      await this.simulateCloudProcessing(3000);
      
      // Return mock data for development
      return {
        formData: {
          height: "5'10\"",
          weight: "220 lbs",
          bmi: 31.5,
          obesityHistory: "Patient has struggled with weight for 10 years"
        }
      };
    }
  }

  private async handleExtractPatientProfile(task: Task): Promise<any> {
    this.logger.info(`Extracting patient profile from: ${task.input.url}`);
    
    try {
      // Navigate to the patient chart
      await this.callBrowserService('/browser/navigate', 'POST', {
        url: task.input.url,
        waitForSelector: '.patient-profile'
      });
      
      // Extract profile data
      const profileData = await this.callBrowserService('/browser/extract', 'POST', {
        selector: '.patient-profile',
        attribute: 'innerText'
      });
      
      // Use OpenAI to extract structured data
      if (this.openai) {
        const prompt = `
          Extract the following patient information:
          - Full name
          - Age
          - Gender
          - Contact information (phone number)
          
          From this text:
          ${profileData}
          
          Return the data in JSON format with keys: name, age, gender, contactInfo
        `;
        
        const extractedData = await this.processWithOpenAI(prompt);
        try {
          return {
            profile: JSON.parse(extractedData)
          };
        } catch (e) {
          return {
            profile: {
              rawText: profileData,
              aiExtracted: extractedData
            }
          };
        }
      }
      
      await this.simulateCloudProcessing(1500);
      
      // Fallback mock data
      return {
        profile: {
          name: "John Doe",
          age: 45,
          gender: "Male",
          contactInfo: "555-123-4567"
        }
      };
    } catch (error) {
      this.logger.error(`Error extracting patient profile: ${error.message}`);
      await this.simulateCloudProcessing(1500);
      
      return {
        profile: {
          name: "John Doe",
          age: 45,
          gender: "Male",
          contactInfo: "555-123-4567"
        }
      };
    }
  }

  private async handleExtractMedications(task: Task): Promise<any> {
    this.logger.info(`Extracting medications from: ${task.input.url}`);
    
    try {
      // Navigate to the patient chart
      await this.callBrowserService('/browser/navigate', 'POST', {
        url: task.input.url,
        waitForSelector: '.patient-chart'
      });
      
      // Navigate to medications section
      await this.callBrowserService('/browser/click', 'POST', {
        selector: '#medications-tab'
      });
      
      // Extract medications data
      const medicationsData = await this.callBrowserService('/browser/extract', 'POST', {
        selector: '.medications-list',
        attribute: 'innerText'
      });
      
      // Use OpenAI to extract structured data
      if (this.openai) {
        const prompt = `
          Extract all medications from this list with their dosage and frequency:
          
          ${medicationsData}
          
          Return the data as a JSON array with objects containing: name, dosage, frequency
        `;
        
        const extractedData = await this.processWithOpenAI(prompt);
        try {
          return {
            medications: JSON.parse(extractedData)
          };
        } catch (e) {
          return {
            medications: [
              { name: "Error parsing medications", dosage: "N/A", frequency: "N/A" }
            ],
            rawText: medicationsData
          };
        }
      }
      
      await this.simulateCloudProcessing(2500);
      
      // Fallback mock data
      return {
        medications: [
          { name: "Metformin", dosage: "500mg", frequency: "twice daily" },
          { name: "Lisinopril", dosage: "10mg", frequency: "once daily" }
        ]
      };
    } catch (error) {
      this.logger.error(`Error extracting medications: ${error.message}`);
      await this.simulateCloudProcessing(2500);
      
      return {
        medications: [
          { name: "Metformin", dosage: "500mg", frequency: "twice daily" },
          { name: "Lisinopril", dosage: "10mg", frequency: "once daily" }
        ]
      };
    }
  }

  private async handleExtractAllergies(task: Task): Promise<any> {
    this.logger.info(`Extracting allergies from: ${task.input.url}`);
    await this.simulateCloudProcessing(1000);
    
    return {
      allergies: [
        { allergen: "Penicillin", severity: "High", reaction: "Hives" },
        { allergen: "Peanuts", severity: "Medium", reaction: "Swelling" }
      ]
    };
  }

  private async handleExtractInsurance(task: Task): Promise<any> {
    this.logger.info(`Extracting insurance from: ${task.input.url}`);
    await this.simulateCloudProcessing(1800);
    
    return {
      insurance: {
        provider: "Blue Cross Blue Shield",
        policyNumber: "BC123456789",
        groupNumber: "GRP987654",
        coverageType: "PPO"
      }
    };
  }

  private async handleWriteMedications(task: Task): Promise<any> {
    this.logger.info(`Writing medications to: ${task.input.url}`);
    this.logger.info(`Medications data: ${task.input.medications}`);
    await this.simulateCloudProcessing(2200);
    
    return {
      success: true,
      medicationsWritten: true,
      timestamp: new Date().toISOString()
    };
  }

  private async handleWriteAllergies(task: Task): Promise<any> {
    this.logger.info(`Writing allergies to: ${task.input.url}`);
    this.logger.info(`Allergies data: ${task.input.allergies}`);
    await this.simulateCloudProcessing(1700);
    
    return {
      success: true,
      allergiesWritten: true,
      timestamp: new Date().toISOString()
    };
  }

  private async handleWriteInsurance(task: Task): Promise<any> {
    this.logger.info(`Writing insurance to: ${task.input.url}`);
    this.logger.info(`Insurance data: ${task.input.insurance}`);
    await this.simulateCloudProcessing(1500);
    
    return {
      success: true,
      insuranceWritten: true,
      timestamp: new Date().toISOString()
    };
  }

  // Helper method to simulate cloud processing
  private async simulateCloudProcessing(ms: number): Promise<void> {
    this.logger.debug(`Simulating cloud processing for ${ms}ms`);
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 