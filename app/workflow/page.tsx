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
}

export default function WorkflowPage() {
  const [tasks, setTasks] = useState<TaskState[]>(() => 
    exampleWorkflow.transformations.map((t) => ({
      id: t.id,
      name: t.name,
      status: 'pending'
    }))
  );

  const executeTask = async (taskIndex: number) => {
    const task = tasks[taskIndex];
    const transformation = exampleWorkflow.transformations[taskIndex];

    if (task.status !== 'pending') return;

    setTasks(prev => prev.map((t, i) => 
      i === taskIndex ? { ...t, status: 'running' } : t
    ));

    try {
      // If it's a browser source, just create the session and wait for video completion
      if (transformation.source.type === 'browser') {
        const response = await fetch('/api/browser-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mode: transformation.source.config?.mode || 'video',
            url: transformation.source.identifier,
            prompt: transformation.source.config?.prompt
          })
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create browser session');
        }
        
        // Update session status to running
        await fetch(`/api/browser-agent/status?sessionId=${data.sessionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'running' })
        });

        setTasks(prev => prev.map((t, i) => 
          i === taskIndex ? { ...t, sessionId: data.sessionId } : t
        ));
        
        // Don't proceed with transformation - it will be handled by onComplete
        return;
      }

      // For non-browser sources, execute immediately
      const input = {
        ...transformation.source,
        config: transformation.source.config
      };
      const output = await transformation.function(input);

      setTasks(prev => prev.map((t, i) => 
        i === taskIndex ? { ...t, status: 'completed', output } : t
      ));
    } catch (err) {
      const error = err as Error;

      // If there's an active session, mark it as error
      if (task.sessionId) {
        await fetch(`/api/browser-agent/status?sessionId=${task.sessionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'error' })
        });
      }

      setTasks(prev => prev.map((t, i) => 
        i === taskIndex ? { ...t, status: 'error', error: error.message } : t
      ));
    }
  };

  const canExecuteTask = (taskIndex: number) => {
    if (taskIndex === 0) return tasks[0].status === 'pending';
    return tasks[taskIndex].status === 'pending' && tasks[taskIndex - 1].status === 'completed';
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
                <h4 className="text-sm font-medium mb-2">Progress</h4>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'running' ? 'bg-blue-500' :
                        task.status === 'error' ? 'bg-red-500' :
                        'bg-gray-300'
                      }`} />
                      <span className="text-sm text-gray-600">{task.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Task Execution */}
          <div className="w-2/3 pl-8">
            <h2 className="text-xl font-semibold mb-6">Task Execution</h2>
            <div className="space-y-4">
              {tasks.map((task, index) => (
                <div 
                  key={task.id}
                  className={`p-6 rounded-xl shadow-sm transition-all duration-200 ${
                    task.status === 'completed' ? 'border-2 border-green-500 bg-green-50' :
                    task.status === 'error' ? 'border-2 border-red-500 bg-red-50' :
                    task.status === 'running' ? 'border-2 border-blue-500 bg-blue-50' :
                    'border border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{task.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Status: <span className={
                          task.status === 'completed' ? 'text-green-600' :
                          task.status === 'error' ? 'text-red-600' :
                          task.status === 'running' ? 'text-blue-600' :
                          'text-gray-600'
                        }>{task.status}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => executeTask(index)}
                      disabled={!canExecuteTask(index)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        canExecuteTask(index)
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {task.status === 'completed' ? 'Completed' :
                       task.status === 'running' ? 'Running...' :
                       'Execute'}
                    </button>
                  </div>

                  {/* Show browser viewer for browser-type sources when running */}
                  {task.sessionId && task.status === 'running' && 
                   exampleWorkflow.transformations[index].source.type === 'browser' && (
                    <div className="mb-4">
                      <BrowserAgentViewer 
                        sessionId={task.sessionId}
                        onError={(error) => {
                          setTasks(prev => prev.map((t, i) => 
                            i === index ? { ...t, status: 'error', error: error.message } : t
                          ));
                        }}
                        onComplete={async () => {
                          // Execute the transformation after video completes
                          try {
                            const currentTask = tasks[index];
                            const currentTransformation = exampleWorkflow.transformations[index];
                            const input = {
                              ...currentTransformation.source,
                              config: currentTransformation.source.config
                            };
                            const output = await currentTransformation.function(input);

                            // Update session status to completed
                            await fetch(`/api/browser-agent/status?sessionId=${currentTask.sessionId}`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({ status: 'completed' })
                            });

                            // Small delay to show completed status before cleanup
                            await new Promise(resolve => setTimeout(resolve, 1000));

                            // Clean up the session
                            await fetch(`/api/browser-agent?sessionId=${currentTask.sessionId}`, {
                              method: 'DELETE'
                            });

                            setTasks(prev => prev.map((t, i) => 
                              i === index ? { ...t, status: 'completed', output } : t
                            ));
                          } catch (error) {
                            setTasks(prev => prev.map((t, i) => 
                              i === index ? { ...t, status: 'error', error: (error as Error).message } : t
                            ));
                          }
                        }}
                      />
                    </div>
                  )}

                  {task.error && (
                    <div className="mt-4 p-4 rounded-lg bg-red-50 text-red-600 text-sm">
                      {task.error}
                    </div>
                  )}

                  {task.output && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Output</h4>
                      <div className="p-4 rounded-lg bg-gray-50">
                        <pre className="text-sm text-gray-600 overflow-x-auto">
                          {JSON.stringify(task.output, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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