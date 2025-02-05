'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Worker } from '@/app/types/workers'
import axios from 'axios';
import { useSearchParams } from 'next/navigation';

export default function WorkersContent() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const workerId = searchParams.get('id');

  useEffect(() => {
    async function fetchWorkers() {
      try {
        const response = await axios.get('/api/workers');
        setWorkers(response.data);
      } catch (error) {
        console.error('Failed to fetch workers:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkers();
  }, []);

  const selectedWorker = workerId 
    ? workers.find(worker => worker.id === workerId) 
    : workers[0];

  useEffect(() => {
    document.title = selectedWorker 
      ? `Hire AI - ${selectedWorker.name}`
      : 'Hire AI';
  }, [selectedWorker]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Left Navigation Panel */}
        <div className="w-1/3 pr-8 border-r border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold mb-6">Available Workers</h2>
          <div className="space-y-4">
            {workers.map((worker) => (
              <Link 
                href={`/workers?id=${worker.id}`} 
                key={worker.id}
                className={`block p-4 rounded-lg border ${
                  worker.id === selectedWorker?.id
                    ? 'border-blue-500 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                } transition-colors`}
              >
                <h3 className="font-medium">{worker.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ${worker.worker_data.hourly_rate}/{worker.worker_data.currency}
                </p>
                <div className="flex gap-2 mt-2">
                  {worker.worker_data.skills.slice(0, 2).map((skill) => (
                    <span 
                      key={skill}
                      className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Detail View */}
        <div className="w-2/3 pl-8">
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800">
            {selectedWorker ? (
              <>
                <h2 className="text-2xl font-semibold mb-4">{selectedWorker.name}</h2>
                <div className="mb-6">
                  <p className="text-lg mb-2">
                    Status: <span className={selectedWorker.worker_data.availability === 'available' ? 'text-green-500' : 'text-yellow-500'}>
                      {selectedWorker.worker_data.availability}
                    </span>
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    ${selectedWorker.worker_data.hourly_rate}/{selectedWorker.worker_data.currency}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedWorker.worker_data.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  {selectedWorker.worker_data.certifications?.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Certifications</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedWorker.worker_data.certifications.map((cert) => (
                          <span
                            key={cert}
                            className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm"
                          >
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium mb-2">About</h3>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {selectedWorker.description}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p>No worker selected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}