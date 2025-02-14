'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DataSource, DataDestination, exampleWorkflow } from '@/app/types/workflow';
import BrowserAgentViewer from '@/app/components/BrowserAgentViewer';

type TaskStatus = 'pending' | 'running' | 'completed' | 'error';

interface TaskState {
  id: string;
  name: string;
  status: TaskStatus;
  output?: any;
  error?: string;
  sessionId?: string;
  agentResponse?: string;
  recordingGif?: string;
}

export default function WorkflowPage() {
  const [taskState, setTaskState] = useState<TaskState>({
    id: exampleWorkflow.id,
    name: exampleWorkflow.name,
    status: 'pending'
  });

  const executeWorkflow = async () => {
    if (taskState.status !== 'pending') return;

    setTaskState(prev => ({ ...prev, status: 'running' }));

    try {
      // Create browser session with workflow
      const response = await fetch('/api/browser-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task: {
            type: 'browser-use',
            action: 'execute_workflow',
            prompt: exampleWorkflow.source.config?.prompt,
            url: exampleWorkflow.source.identifier
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to execute workflow');
      }

      const data = await response.json();
      
      setTaskState(prev => ({
        ...prev,
        sessionId: data.sessionId,
        status: data.status.status || 'completed',
        output: data.status.result,
        agentResponse: data.status.agent_response,
        recordingGif: data.status.recording_gif
      }));

    } catch (err) {
      const error = err as Error;
      setTaskState(prev => ({
        ...prev,
        status: 'error',
        error: error.message
      }));
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center space-x-2">
                <svg
                  className="w-8 h-8 text-indigo-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <span className="text-xl font-bold">AIHire</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex">
          {/* Left Panel - Workflow Info */}
          <div className="w-1/3 pr-8 border-r border-gray-100">
            <h2 className="text-xl font-semibold mb-6">Workflow Details</h2>
            <div className="p-4 rounded-lg border border-gray-100">
              <h3 className="font-medium text-lg mb-2">{exampleWorkflow.name}</h3>
              <p className="text-sm text-gray-600">Type: {exampleWorkflow.type}</p>
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Status</h4>
                <div className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    taskState.status === 'completed' ? 'bg-green-500' :
                    taskState.status === 'running' ? 'bg-blue-500' :
                    taskState.status === 'error' ? 'bg-red-500' :
                    'bg-gray-300'
                  }`} />
                  <span className="text-sm text-gray-600">{taskState.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Task Execution */}
          <div className="w-2/3 pl-8">
            <h2 className="text-xl font-semibold mb-6">Task Execution</h2>
            <div className="space-y-4">
              <div className={`p-6 rounded-xl shadow-sm transition-all duration-200 ${
                taskState.status === 'completed' ? 'border-2 border-green-500 bg-green-50' :
                taskState.status === 'error' ? 'border-2 border-red-500 bg-red-50' :
                taskState.status === 'running' ? 'border-2 border-blue-500 bg-blue-50' :
                'border border-gray-100'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{exampleWorkflow.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Status: <span className={
                        taskState.status === 'completed' ? 'text-green-600' :
                        taskState.status === 'error' ? 'text-red-600' :
                        taskState.status === 'running' ? 'text-blue-600' :
                        'text-gray-600'
                      }>{taskState.status}</span>
                    </p>
                  </div>
                  <button
                    onClick={executeWorkflow}
                    disabled={taskState.status !== 'pending'}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      taskState.status === 'pending'
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {taskState.status === 'completed' ? 'Completed' :
                     taskState.status === 'running' ? 'Running...' :
                     'Execute'}
                  </button>
                </div>

                {/* Show browser viewer when running */}
                {taskState.sessionId && taskState.status === 'running' && (
                  <div className="mb-4">
                    <BrowserAgentViewer 
                      sessionId={taskState.sessionId}
                      onError={(error) => {
                        setTaskState(prev => ({
                          ...prev,
                          status: 'error',
                          error: error.message
                        }));
                      }}
                      onComplete={(result) => {
                        setTaskState(prev => ({
                          ...prev,
                          status: 'completed',
                          output: result
                        }));
                      }}
                    />
                  </div>
                )}

                {taskState.error && (
                  <div className="mt-4 p-4 rounded-lg bg-red-50 text-red-600 text-sm">
                    {taskState.error}
                  </div>
                )}

                {taskState.output && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Output</h4>
                    <div className="p-4 rounded-lg bg-gray-50">
                      <pre className="text-sm text-gray-600 overflow-x-auto">
                        {JSON.stringify(taskState.output, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {taskState.recordingGif && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Recording</h4>
                    <img 
                      src={taskState.recordingGif} 
                      alt="Task Recording" 
                      className="rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions to interact with data sources and destinations
async function fetchDataFromSource(source: DataSource) {
  switch (source.type) {
    case 'browser':
      // Implement browser data fetching
      return {};
    case 'api':
      // Implement API data fetching
      return {};
    case 'document':
      // Implement document data fetching
      return {};
    default:
      throw new Error(`Unsupported source type: ${source.type}`);
  }
}

async function sendDataToDestination(destination: DataDestination, data: any) {
  switch (destination.type) {
    case 'browser':
      // Implement browser data sending
      return;
    case 'api':
      // Implement API data sending
      return;
    case 'document':
      // Implement document data sending
      return;
    default:
      throw new Error(`Unsupported destination type: ${destination.type}`);
  }
} 