'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Workflow, Task, TaskStatus, TaskType, isTaskOfType } from '../../../types/workflow';
import { Allergy, Medication, Insurance } from '../../../types/clinical';
// import mockData from '../../../mock-data/test-scrape.json';

interface Profile {
    name: string;
    dateOfBirth: string;
    gender: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
}

// Application memory for storing temporary data
// const applicationMemory: Record<string, string> = {};

// Function to get text from a browser location
const getBrowserText = async (): Promise<string> => {
    // TODO: Implement browser text extraction
    return '';
};

// Utility function to format task type constants into readable titles
const formatTaskType = (type: TaskType): string => {
  return type
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

// Utility function to format source types
const formatSourceType = (type: string): string => {
  return type
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

// Utility function to get status styling
const getStatusStyles = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.COMPLETED:
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: (
          <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      };
    case TaskStatus.IN_PROGRESS:
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: (
          <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )
      };
    case TaskStatus.FAILED:
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      };
    default:
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        border: 'border-gray-200',
        icon: (
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
      };
  }
};

export default function ExecuteWorkflowPage() {
    const params = useParams();
    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<'loading' | 'idle' | 'executing' | 'completed' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [ingestExtractedText, setIngestExtractedText] = useState<string>('');
    const [extractedMedications, setExtractedMedications] = useState<Medication[]>([]);
    const [extractedAllergies, setExtractedAllergies] = useState<Allergy[]>([]);
    const [extractedInsurance, setExtractedInsurance] = useState<Insurance | null>(null);
    const [extractedProfile, setExtractedProfile] = useState<Profile | null>(null);
    
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

    const toggleTaskDetails = (taskId: string) => {
        setExpandedTasks(prev => ({
            ...prev,
            [taskId]: !prev[taskId]
        }));
    };

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
    };

    useEffect(() => {
        const fetchWorkflow = async () => {
            try {
                console.log('fetching workflow');
                const response = await fetch(`/api/workflow/${params.id}`);
                if (!response.ok) throw new Error('Failed to fetch workflow');
                const workflow = await response.json();
                setWorkflow(workflow);
                setStatus('idle');
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load workflow');
                setStatus('error');
            }
        };

        // Initial fetch
        fetchWorkflow();

        // Set up polling every 5 seconds
        const pollInterval = setInterval(fetchWorkflow, 5000);

        // Cleanup on unmount or when ID changes
        return () => clearInterval(pollInterval);
    }, [params.id]);

    const updateTask = async (taskId: string, updates: Partial<Task>) => {
        try {
            const response = await fetch(`/api/workflow/${params.id}/task/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error('Failed to update task');
            
            const updatedWorkflow = await response.json();
            setWorkflow(updatedWorkflow);
        } catch (error) {
            addLog(`Failed to update task: ${error}`);
            throw error;
        }
    };

    const executeTask = async (task: Task) => {
        setActiveTaskId(task.id);
        
        try {
            // Update task status to in progress
            await updateTask(task.id, { status: TaskStatus.IN_PROGRESS });
            
            switch (task.type) {
                case TaskType.READ_OBESITY_INTAKE_FORM: {
                          // Define browser prompt
                    const browserPrompt = "go to localhost:8000/ingest and scroll through the whole page. Scan all the text on the page and return it. Return the text itself. Do not summarize.";
                          
                    // Send command to browser service
                          const commandResponse = await fetch('/api/browser-agent/session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              command: {
                                prompt: browserPrompt
                              }
                            }),
                          });
                          
                          if (!commandResponse.ok) {
                            throw new Error(`Failed to send browser command: ${commandResponse.statusText}`);
                          }
                          
                          const commandData = await commandResponse.json();
                    
                          const sessionId = commandData.session_id;
                          const commandId = commandData.command_id;
                          
                    if (!sessionId || !commandId) {
                        throw new Error('Invalid response from browser service: missing session_id or command_id');
                    }
                          
                          // Poll for command completion
                          const maxAttempts = 30; // Prevent infinite polling
                          let attempts = 0;
                    let commandResult = null;
                          
                          while (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
                            
                            const stateResponse = await fetch(`/api/browser-agent/${sessionId}/state`);
                            
                            if (!stateResponse.ok) {
                              throw new Error(`Failed to get session state: ${stateResponse.statusText}`);
                            }
                            
                            const stateData = await stateResponse.json();
                            
                        // Check if the command has completed
                        const commandHistory = stateData.command_history || [];
                        const completedCommand = commandHistory.find((cmd: { command_id: string, result: { status: string } }) => 
                            cmd.command_id === commandId && 
                            cmd.result && 
                            cmd.result.status === 'success'
                        );
                        
                        if (completedCommand) {
                            commandResult = completedCommand.result;
                              break;
                            }
                        
                        // Check if the command failed
                        const failedCommand = commandHistory.find((cmd: { command_id: string, result: { status: string } }) => 
                            cmd.command_id === commandId && 
                            cmd.result && 
                            cmd.result.status === 'error'
                        );
                        
                        if (failedCommand) {
                            throw new Error(`Browser command failed: ${failedCommand.result.message || 'Unknown error'}`);
                        }
                        
                        // If the session is in error state, throw an error
                        if (stateData.status === 'error') {
                            throw new Error(`Browser session in error state: ${stateData.error || 'Unknown error'}`);
                        }
                            
                            attempts++;
                          }
                          
                    if (!commandResult) {
                            throw new Error('Browser command timed out after multiple attempts');
                          }
                          
                    // Extract the text from the command result
                    const extractedText = commandResult.summary || '';
                    console.log('extractedText', extractedText);
                    
                    // Save the extracted text to state variable
                    setIngestExtractedText(extractedText);
                    
                    // Update task with the output
                          await updateTask(task.id, {
                            status: TaskStatus.COMPLETED,
                        output: {
                            type: TaskType.READ_OBESITY_INTAKE_FORM,
                            success: true,
                            data: {
                                rawText: extractedText
                            }
                        }
                    });
                    
                    break;
                }

                case TaskType.WRITE_MEDICATIONS:
                    try {
                        const rawText = ingestExtractedText || '';
                        
                        // Make generic extract API call to extract medications
                        const extractResponse: Response = await fetch('/api/extract', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              text: rawText,
                              extractionType: 'medications',
                              schema: {
                                type: 'object',
                                properties: {
                                  type: 'array',
                                  properties: {
                                    name: { type: 'string' },
                                    dosage: { type: 'string' },
                                    frequency: { type: 'string' },
                                  },
                                  required: ['name']
                                }
                              }
                            })
                        });
                        
                        if (!extractResponse.ok) {
                            throw new Error(`Extract API error: ${extractResponse.statusText}`);
                        }
                        
                        const medications = await extractResponse.json();
                        setExtractedMedications(medications.medications ? medications.medications : []);
                        // Update task with the extracted medications
                          await updateTask(task.id, {
                            status: TaskStatus.COMPLETED,
                            output: {
                                type: TaskType.WRITE_MEDICATIONS,
                                success: true,
                                data: {
                                    medications: medications.medications ? medications.medications : [],
                                }
                            },
                          });
                    } catch (error) {
                        throw error;
                        }
                        break;

                case TaskType.WRITE_ALLERGIES: {
                    // Make generic extract API call to extract allergies
                    const extractResponse: Response = await fetch('/api/extract', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          text: ingestExtractedText,
                          extractionType: 'allergies',
                          schema: {
                            type: 'object',
                            properties: {
                              type: 'array',
                              properties: {
                                name: { type: 'string' },
                                severity: { type: 'string' },
                                reaction: { type: 'string' },
                              },
                              required: ['name', 'severity', 'reaction']
                            }
                          }
                        })
                    });

                    if (!extractResponse.ok) {
                        throw new Error(`Extract API error: ${extractResponse.statusText}`);
                    }
                    const allergies = await extractResponse.json();
                    
                    // Store the extracted allergies in state
                    setExtractedAllergies(allergies.allergies ? allergies.allergies : []);
                    
                    // Update task with the extracted allergies
                await updateTask(task.id, {
                        status: TaskStatus.COMPLETED,
                        output: {
                            type: TaskType.WRITE_ALLERGIES,
                            success: true,
                            data: {
                                allergies: allergies.allergies ? allergies.allergies : [],
                            }
                        },
                    });
                    
                    break;
                }

                case TaskType.WRITE_INSURANCE: {
                    // Make generic extract API call to extract insurance
                    const extractResponse: Response = await fetch('/api/extract', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          text: ingestExtractedText,
                          extractionType: 'insurance',
                          schema: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              policyNumber: { type: 'string' },
                              groupNumber: { type: 'string' },
                              memberId: { type: 'string' },
                            },
                            required: ['name', 'policyNumber', 'groupNumber', 'memberId']
                          }
                        })
                    });

                    if (!extractResponse.ok) {
                        throw new Error(`Extract API error: ${extractResponse.statusText}`);
                    }
                    const insurance = await extractResponse.json();
                    
                    // Store the extracted insurance in state
                    setExtractedInsurance(insurance.insurance ? insurance.insurance : null);
                    
                    // Update task with the extracted insurance
                    await updateTask(task.id, {
                        status: TaskStatus.COMPLETED,
                        output: {
                            type: TaskType.WRITE_INSURANCE,
                            success: true,
                            data: {
                                insurance: insurance.insurance ? insurance.insurance : null,
                            }
                        },
                    });
                    
                    break;
                }

                case TaskType.EXTRACT_PATIENT_PROFILE:
                    if (!isTaskOfType(TaskType.EXTRACT_PATIENT_PROFILE, task)) {
                        throw new Error('Invalid task type');
                    }

                    let textToExtract = '';
                    if (task.input.data.source.type === 'APPLICATION_MEMORY') {
                        if (!task.input.data.source.applicationMemoryKey) {
                            throw new Error('Application memory key is required');
                        }
                        // textToExtract = mockData.rawText;
                        textToExtract = ingestExtractedText;
                    } else if (task.input.data.source.type === 'BROWSER') {
                        if (!task.input.data.source.browserLocation) {
                            throw new Error('Browser location is required');
                        }
                        textToExtract = await getBrowserText();
                    }

                    const profileExtractResponse = await fetch('/api/extract', {
                        method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            text: textToExtract,
                            extractionType: 'profile',
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    dateOfBirth: { type: 'string' },
                                    gender: { type: 'string' },
                                    phoneNumber: { type: 'string' },
                                    email: { type: 'string' },
                                    address: { type: 'string' }
                                },
                                required: ['name', 'dateOfBirth', 'gender']
                            }
                        })
                    });

                    if (!profileExtractResponse.ok) {
                        throw new Error(`Extract API error: ${profileExtractResponse.statusText}`);
                    }
                    const profileData = await profileExtractResponse.json();
                    
                    // Store the extracted profile in state
                    setExtractedProfile(profileData.profile);
                    
                    await updateTask(task.id, {
                        status: TaskStatus.COMPLETED,
                        output: {
                            type: TaskType.EXTRACT_PATIENT_PROFILE,
                            success: true,
                            data: {
                                profile: profileData.profile
                            }
                        },
                    });
                    break;

                case TaskType.WRITE_TO_ATHENA: {
                    // TODO(ambar): feature-ize how you'd manage internally generated state.
                    const mockMeds: Medication[] = [
                        {
                            "name": "Lisinopril",
                            "dosage": "10mg",
                            "frequency": "daily"
                        },
                        {
                            "name": "Metformin",
                            "dosage": "500mg",
                            "frequency": "daily"
                        }
                    ]

                    const mockAllergies: Allergy[] = [
                        {
                            "name": "Penicillin",
                            "severity": "Severe",
                            "reaction": "Anaphylaxis"
                        },
                        {
                            "name": "Sulfa Drugs",
                            "severity": "moderate",
                            "reaction": "itching"
                        },
                        {
                            "name": "Shellfish",
                            "severity": "mild",
                            "reaction": "itching"
                        },
                        {
                            "name": "Lactose Intolerance",
                            "severity": "mild",
                            "reaction": "GI symptoms"
                        }
                    ]

                    const mockInsurance: Insurance = {
                        "name": "Blue Cross Blue Shield",
                        "planType": "HMO",
                        "policyNumber": "1234567890",
                        "groupNumber": "1234567890",
                        "memberId": "1234567890",
                        "effectiveDate": "2024-01-01"
                    }

                    const useMeds = mockMeds; 
                    const useAllergies = mockAllergies;
                    const useInsurance = mockInsurance;

                    const writeToAthenaBrowserInput = task.input.type === TaskType.WRITE_TO_ATHENA ? task.input.data : null;
                    if (!writeToAthenaBrowserInput) {
                        throw new Error('Invalid input for WRITE_TO_ATHENA task');
                    }

                    // Construct the browser prompt based on the field
                    let browserPrompt = '';
                    let additionalData = '';

                    if (writeToAthenaBrowserInput.field === 'medications' && useMeds.length > 0) {
                        additionalData = JSON.stringify(useMeds);
                        browserPrompt = `go to localhost:8000, search for james smith, and go to his profile. once there, save the following medications to the medications form, one at a time: ${additionalData}`;
                    } else if (writeToAthenaBrowserInput.field === 'allergies' && useAllergies.length > 0) {
                        additionalData = JSON.stringify(useAllergies);
                        browserPrompt = `go to localhost:8000, search for james smith, and go to his profile. once there, save the following allergies to the allergies form, one at a time: ${additionalData}`;
                    } else if (writeToAthenaBrowserInput.field === 'insurance' && useInsurance) {
                        additionalData = JSON.stringify(useInsurance);
                        browserPrompt = `go to localhost:8000, search for james smith, and go to his profile. once there, save the following insurance to the insurance form: ${additionalData}. The end date field is optional to enter; skip it if you don't have it. If asked, the subscriber name is the name given to you. `;
                    } else {
                        throw new Error(`Unsupported field type: ${writeToAthenaBrowserInput.field}`);
                    }
                    
                    // Send command to browser service
                    const commandResponse = await fetch('/api/browser-agent/session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            command: {
                                prompt: browserPrompt
                            }
                        }),
                    });
                    
                    if (!commandResponse.ok) {
                        throw new Error(`Failed to send browser command: ${commandResponse.statusText}`);
                    }
                    
                    const commandData = await commandResponse.json();
                    
                    const sessionId = commandData.session_id;
                    const commandId = commandData.command_id;
                    
                    if (!sessionId || !commandId) {
                        throw new Error('Invalid response from browser service: missing session_id or command_id');
                    }
                    
                    // Poll for command completion
                    const maxAttempts = 30; // Prevent infinite polling
                    let attempts = 0;
                    let commandResult = null;
                    
                    while (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
                        
                        const stateResponse = await fetch(`/api/browser-agent/${sessionId}/state`);
                        
                        if (!stateResponse.ok) {
                            throw new Error(`Failed to get session state: ${stateResponse.statusText}`);
                        }
                        
                        const stateData = await stateResponse.json();
                        
                        // Check if the command has completed
                        const commandHistory = stateData.command_history || [];
                        const completedCommand = commandHistory.find((cmd: { command_id: string, result: { status: string } }) => 
                            cmd.command_id === commandId && 
                            cmd.result && 
                            cmd.result.status === 'success'
                        );
                        
                        if (completedCommand) {
                            commandResult = completedCommand.result;
                            break;
                        }
                        
                        // Check if the command failed
                        const failedCommand = commandHistory.find((cmd: { command_id: string, result: { status: string } }) => 
                            cmd.command_id === commandId && 
                            cmd.result && 
                            cmd.result.status === 'error'
                        );
                        
                        if (failedCommand) {
                            throw new Error(`Browser command failed: ${failedCommand.result.message || 'Unknown error'}`);
                        }
                        
                        // If the session is in error state, throw an error
                        if (stateData.status === 'error') {
                            throw new Error(`Browser session in error state: ${stateData.error || 'Unknown error'}`);
                        }
                        
                        attempts++;
                    }
                    
                    if (!commandResult) {
                        throw new Error('Browser command timed out after multiple attempts');
                    }
                    
                    // Update task with the output
                    await updateTask(task.id, {
                        status: TaskStatus.COMPLETED,
                        output: {
                            type: TaskType.WRITE_TO_ATHENA,
                        success: true,
                        data: {
                                success: true
                            }
                        }
                    });
                    
                    break;
                }

                case TaskType.IDENTIFY_CHART_IN_ATHENA: {
                    if (!isTaskOfType(TaskType.IDENTIFY_CHART_IN_ATHENA, task)) {
                        throw new Error('Invalid task type');
                    }

                    // Check if we have profile data
                    if (!extractedProfile) {
                        throw new Error('No profile data available. Please run EXTRACT_PATIENT_PROFILE task first.');
                    }

                    // Construct a clear and specific prompt for the browser service
                    const browserPrompt = `Go to localhost:8000 (not localhost:8000/ingest) and find the patient chart for ${extractedProfile.name}. Here's how:
1. Look for a search box or patient lookup field
2. Enter the patient's name: "${extractedProfile.name}"
3. In the search results, verify it's the correct patient by checking:
   - Date of birth: ${extractedProfile.dateOfBirth}.
4. Click on the matching patient's name to go to their profile
5. Once on the profile page, confirm you're on the correct patient's chart
Return the current URL of the patient's chart page.`;

                    // Send command to browser service
                    const commandResponse = await fetch('/api/browser-agent/session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            command: {
                                prompt: browserPrompt
                            }
                        }),
                    });
                    
                    if (!commandResponse.ok) {
                        throw new Error(`Failed to send browser command: ${commandResponse.statusText}`);
                    }
                    
                    const commandData = await commandResponse.json();
                    const sessionId = commandData.session_id;
                    const commandId = commandData.command_id;
                    
                    if (!sessionId || !commandId) {
                        throw new Error('Invalid response from browser service: missing session_id or command_id');
                    }
                    
                    // Poll for command completion
                    const maxAttempts = 30;
                    let attempts = 0;
                    let commandResult = null;
                    
                    while (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        
                        const stateResponse = await fetch(`/api/browser-agent/${sessionId}/state`);
                        if (!stateResponse.ok) {
                            throw new Error(`Failed to get session state: ${stateResponse.statusText}`);
                        }
                        
                        const stateData = await stateResponse.json();
                        
                        // Check if the command has completed
                        const commandHistory = stateData.command_history || [];
                        const completedCommand = commandHistory.find((cmd: { command_id: string, result: { status: string } }) => 
                            cmd.command_id === commandId && 
                            cmd.result && 
                            cmd.result.status === 'success'
                        );
                        
                        if (completedCommand) {
                            commandResult = completedCommand.result;
                    break;
                        }
                        
                        // Check for failures
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
                    
                    if (!commandResult) {
                        throw new Error('Browser command timed out after multiple attempts');
                    }

                    console.log("seeing command result", commandResult)

                    // Extract the URL from the command result
                    const chartUrl = commandResult.last_url;
                    if (!chartUrl) {
                        throw new Error('Failed to get patient chart URL from browser service');
                    }

                    // Update task with the output
                    await updateTask(task.id, { 
                    status: TaskStatus.COMPLETED,
                        output: {
                            type: TaskType.IDENTIFY_CHART_IN_ATHENA,
                            success: true,
                            data: {
                                url: chartUrl
                            }
                        }
                    });
                    break;
                }

                default:
                    throw new Error(`Unknown task type: ${task.type}`);
            }
            
        } catch (error) {
            await updateTask(task.id, {
                status: TaskStatus.FAILED,
                error: error instanceof Error ? error.message : String(error)
            });
        } finally {
            setActiveTaskId(null);
        }
    };

    // Function to render task input details
    const renderTaskInput = (task: Task) => {
        switch (task.type) {
            case TaskType.READ_OBESITY_INTAKE_FORM:
                return (
                    <div className="mt-2 text-sm">
                        <p className="font-medium text-gray-700">Browser Task</p>
                        {task.input && 'url' in task.input.data && (
                            <p className="text-gray-600">URL: {task.input.data.url || 'Not specified'}</p>
                        )}
                    </div>
                );
            case TaskType.WRITE_MEDICATIONS:
                if (task.input && 'source' in task.input.data) {
                    return (
                        <div className="mt-2 text-sm">
                            <p className="font-medium text-gray-700">Source: {formatSourceType(task.input.data.source.type)}</p>
                            {'path' in task.input.data.source && task.input.data.source.path && (
                                <p className="text-gray-600">Path: {task.input.data.source.path}</p>
                            )}
                        </div>
                    );
                }
                return <p className="mt-2 text-sm text-gray-600">No input details available</p>;
            case TaskType.WRITE_ALLERGIES:
                break;
            case TaskType.WRITE_INSURANCE:
                if (task.input && 'source' in task.input.data) {
                    return (
                        <div className="mt-2 text-sm">
                            <p className="font-medium text-gray-700">Source: {formatSourceType(task.input.data.source.type)}</p>
                        </div>
                    );
                }
                return <p className="mt-2 text-sm text-gray-600">No input details available</p>;
            case TaskType.WRITE_TO_ATHENA: {
                const writeToAthenaBrowserInput = task.input.type === TaskType.WRITE_TO_ATHENA ? task.input.data : null;
                if (!writeToAthenaBrowserInput) {
                    return <p className="mt-2 text-sm text-gray-600">No input details available</p>;
                }

    return (
                    <div className="mt-2 text-sm">
                        <p className="font-medium text-gray-700">{writeToAthenaBrowserInput.field}</p>
                        
                        {writeToAthenaBrowserInput.field === 'medications' && extractedMedications.length > 0 && (
                            <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-gray-600">Medications to write:</p>
                                <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
                                    {extractedMedications.map((med, index) => (
                                        <li key={index} className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50">
                                            <span className="font-medium text-gray-900">{med.name}</span>
                                            {med.dosage && (
                                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                                                    {med.dosage}
                                                </span>
                                            )}
                                            {med.frequency && (
                                                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                                                    {med.frequency}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                    </div>
                        )}
                        
                        {writeToAthenaBrowserInput.field === 'allergies' && extractedAllergies.length > 0 && (
                            <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-gray-600">Allergies to write:</p>
                                <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
                                    {extractedAllergies.map((allergy, index) => (
                                        <li key={index} className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50">
                                            <span className="font-medium text-gray-900">{allergy.name}</span>
                                            {allergy.severity && (
                                                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                                                    {allergy.severity}
                                                </span>
                                            )}
                                            {allergy.reaction && (
                                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                                                    {allergy.reaction}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {writeToAthenaBrowserInput.field === 'insurance' && extractedInsurance && (
                            <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-gray-600">Insurance to write:</p>
                                <p className="text-gray-600">{JSON.stringify(extractedInsurance)}</p>
                            </div>
                        )}
                    </div>
                );
            }
            case TaskType.IDENTIFY_CHART_IN_ATHENA:
                if (!isTaskOfType(TaskType.IDENTIFY_CHART_IN_ATHENA, task)) {
                    return <p className="mt-2 text-sm text-gray-600">Invalid task input</p>;
                }
                return (
                    <div className="mt-2 text-sm">
                        <p className="font-medium text-gray-700">Patient Profile Search</p>
                        {extractedProfile ? (
                            <div className="mt-1 space-y-1">
                                <p className="text-gray-600">Name: {extractedProfile.name}</p>
                                <p className="text-gray-600">DOB: {extractedProfile.dateOfBirth}</p>
                                <p className="text-gray-600">Gender: {extractedProfile.gender}</p>
                            </div>
                        ) : (
                            <p className="text-gray-600 italic">No profile data available</p>
                        )}
                    </div>
                );
            default:
                return <p className="mt-2 text-sm text-gray-600">No input details available</p>;
        }
    };

    // Function to render task output details
    const renderTaskOutput = (task: Task) => {
        if (!task.output) return <p className="text-sm text-gray-600">No output available</p>;

        switch (task.output.type) {
            case TaskType.READ_OBESITY_INTAKE_FORM:
                return (
                    <div className="mt-2">
                        <p className="font-medium text-sm text-gray-700">Status: {task.output.success ? 'Success' : 'Failed'}</p>
                        {task.output.data?.rawText && (
                            <div className="mt-1">
                                <p className="text-xs text-gray-600">Text length: {task.output.data.rawText.length} characters</p>
                            </div>
                        )}
                    </div>
                );
            case TaskType.WRITE_MEDICATIONS:
                return (
                    <div className="mt-2">
                        <p className="font-medium text-sm text-gray-700">Status: {task.output.success ? 'Success' : 'Failed'}</p>
                        {task.output.data?.medications && (
                            <div className="mt-1">
                                <p className="text-xs text-gray-600">Medications found: {task.output.data.medications.length}</p>
                                {task.output.data.medications.length > 0 && (
                                    <ul className="mt-1 list-disc list-inside text-xs text-gray-600">
                                        {task.output.data.medications.map((med: Medication, i: number) => (
                                            <li key={i}>{med.name} {med.dosage && `- ${med.dosage}`} {med.frequency && `(${med.frequency})`}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                );
            case TaskType.WRITE_ALLERGIES:
                return (
                    <div className="mt-2">
                        <p className="font-medium text-sm text-gray-700">Status: {task.output.success ? 'Success' : 'Failed'}</p>
                        {task.output.data?.allergies && (
                            <div className="mt-1">
                                <p className="text-xs text-gray-600">Allergies found: {task.output.data.allergies.length}</p>
                                {task.output.data.allergies.length > 0 && (
                                    <ul className="mt-1 list-disc list-inside text-xs text-gray-600">
                                        {task.output.data.allergies.map((allergy: Allergy, i: number) => (
                                            <li key={i}>{allergy.name} - {allergy.severity} ({allergy.reaction})</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                );
            case TaskType.WRITE_INSURANCE:
                return (
                    <div className="mt-2">
                        <p className="font-medium text-sm text-gray-700">Status: {task.output.success ? 'Success' : 'Failed'}</p>
                        {task.output.data?.insurance && (
                            <div className="mt-1 text-xs text-gray-600">
                                <p>Provider: {task.output.data.insurance.name}</p>
                                <p>Policy #: {task.output.data.insurance.policyNumber}</p>
                                <p>Group #: {task.output.data.insurance.groupNumber}</p>
                                <p>Member ID: {task.output.data.insurance.memberId}</p>
                            </div>
                        )}
                    </div>
                );
            case TaskType.WRITE_TO_ATHENA:
                return (
                    <div className="mt-2">
                        <p className="font-medium text-sm text-gray-700">Status: {task.output.success ? 'Success' : 'Failed'}</p>
                    </div>
                );
            case TaskType.EXTRACT_PATIENT_PROFILE:
                const profileData = task.output.data?.profile as Profile;
                return (
                    <div className="mt-2">
                        <p className="font-medium text-sm text-gray-700">Status: {task.output.success ? 'Success' : 'Failed'}</p>
                        {profileData && (
                            <div className="mt-1 text-xs text-gray-600">
                                <p>Name: {profileData.name}</p>
                                <p>Date of Birth: {profileData.dateOfBirth}</p>
                                <p>Gender: {profileData.gender}</p>
                                {profileData.phoneNumber && (
                                    <p>Phone: {profileData.phoneNumber}</p>
                                )}
                                {profileData.email && (
                                    <p>Email: {profileData.email}</p>
                                )}
                                {profileData.address && (
                                    <p>Address: {profileData.address}</p>
                                )}
                            </div>
                        )}
                    </div>
                );
            case TaskType.IDENTIFY_CHART_IN_ATHENA:
                return (
                    <div className="mt-2">
                        <p className="font-medium text-sm text-gray-700">Status: {task.output.success ? 'Success' : 'Failed'}</p>
                        {task.output.data?.url && (
                            <div className="mt-1 text-xs text-gray-600">
                                <p>Patient Chart URL: {task.output.data.url}</p>
                            </div>
                        )}
                    </div>
                );
            default:
                return <p className="text-sm text-gray-600">No output details available</p>;
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="mt-4 text-gray-600">Loading workflow...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700 shadow-sm">
                    <h2 className="text-lg font-semibold mb-2">Error</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {workflow && (
                    <div className="space-y-8">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <h1 className="text-xl font-semibold text-gray-900">{workflow.name}</h1>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyles(workflow.status).bg} ${getStatusStyles(workflow.status).text}`}>
                                        {workflow.status}
                                    </span>
                                </div>
                                {workflow.description && (
                                    <p className="mt-2 text-sm text-gray-600">{workflow.description}</p>
                                )}
                            </div>

                            <div className="p-6">
                                <h2 className="text-lg font-medium text-gray-900 mb-4">Tasks</h2>
                        <div className="space-y-4">
                                    {workflow.tasks.map((task) => {
                                        const statusStyles = getStatusStyles(task.status);
                                        const isActive = task.id === activeTaskId;
                                        const isExpanded = expandedTasks[task.id] || false;
                                        
                                        return (
                                <div 
                                    key={task.id}
                                                className={`border rounded-lg overflow-hidden transition-all duration-200 ${statusStyles.border} ${isActive ? 'shadow-md' : 'shadow-sm'}`}
                                            >
                                                <div className={`px-5 py-4 ${statusStyles.bg}`}>
                                            <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="flex-shrink-0">
                                                                {statusStyles.icon}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-medium text-gray-900">
                                                                    {formatTaskType(task.type)}
                                                                </h3>
                                                                <p className="text-sm text-gray-600 mt-0.5">
                                                                    {task.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => toggleTaskDetails(task.id)}
                                                                className="px-3 py-1 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                                                            >
                                                                {isExpanded ? 'Hide Details' : 'View Details'}
                                                            </button>
                                                            
                                                <button
                                                    onClick={() => executeTask(task)}
                                                                disabled={task.status === TaskStatus.COMPLETED || task.status === TaskStatus.IN_PROGRESS || isActive}
                                                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                                                    task.status === TaskStatus.COMPLETED 
                                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                                                        : task.status === TaskStatus.IN_PROGRESS || isActive
                                                                            ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                                                                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                                }`}
                                                            >
                                                                {task.status === TaskStatus.COMPLETED 
                                                                    ? 'Completed' 
                                                                    : task.status === TaskStatus.IN_PROGRESS || isActive
                                                                        ? 'Running...' 
                                                                        : 'Execute'}
                                                </button>
                                            </div>
                                            </div>
                                                    
                                                    {isExpanded && (
                                                        <div className="mt-4 pt-3 border-t border-gray-100">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Input</h4>
                                                                    {renderTaskInput(task)}
                                        </div>
                                                                <div>
                                                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Output</h4>
                                                                    {renderTaskOutput(task)}
                                    </div>
                                        </div>
                                        </div>
                                    )}
                                                    
                                    {task.error && (
                                                        <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-md p-3">
                                                            <div className="font-medium">Error:</div>
                                                            <div>{task.error}</div>
                                        </div>
                                    )}
                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                        </div>
                    </div>

                        {logs.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100">
                                    <h2 className="text-lg font-medium text-gray-900">Execution Logs</h2>
                                </div>
                                <div className="p-4 max-h-96 overflow-y-auto bg-gray-50 font-mono text-sm">
                                    {logs.map((log, index) => (
                                        <div key={index} className="py-1 border-b border-gray-100 last:border-0">
                                            {log}
                                        </div>
                                    ))}
                    </div>
                </div>
            )}
                    </div>
                )}
            </div>
        </div>
    );
} 