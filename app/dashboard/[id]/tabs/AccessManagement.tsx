'use client';

import { useEffect, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

interface Tool {
  id: string;
  name: string;
  description: string;
  hasAccess: boolean;
  category: 'api' | 'database' | 'storage' | 'analytics';
}

export default function AccessManagement({ workerId }: { workerId: string }) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddTool, setShowAddTool] = useState(false);
  const [newToolUrl, setNewToolUrl] = useState('');

  useEffect(() => {
    const fetchTools = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/workers/${workerId}/tools`);
        const data = await res.json();
        setTools(data);
      } catch (error) {
        console.error('Error fetching tools:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTools();
  }, [workerId]);

  const toggleAccess = async (toolId: string) => {
    try {
      await fetch(`/api/workers/${workerId}/tools/${toolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          hasAccess: !tools.find(t => t.id === toolId)?.hasAccess 
        }),
      });

      setTools(tools.map(tool => 
        tool.id === toolId 
          ? { ...tool, hasAccess: !tool.hasAccess }
          : tool
      ));
    } catch (error) {
      console.error('Error updating tool access:', error);
    }
  };

  const handleAddTool = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual tool addition
    setShowAddTool(false);
    setNewToolUrl('');
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading tools...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Existing Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool) => (
          <div key={tool.id} className="flex items-center justify-between p-6 bg-white rounded-lg shadow-sm">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{tool.name}</h3>
              <p className="text-sm text-gray-500">{tool.description}</p>
              <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {tool.category}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={tool.hasAccess}
                onChange={() => toggleAccess(tool.id)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        ))}
      </div>

      {/* Add New Tool */}
      <div className="mt-8">
        {!showAddTool ? (
          <button
            onClick={() => setShowAddTool(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add New Tool
          </button>
        ) : (
          <form onSubmit={handleAddTool} className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Tool</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="toolUrl" className="block text-sm font-medium text-gray-700">
                  Tool URL or Identifier
                </label>
                <input
                  type="text"
                  id="toolUrl"
                  value={newToolUrl}
                  onChange={(e) => setNewToolUrl(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="https://api.example.com or tool:identifier"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddTool(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Add Tool
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 