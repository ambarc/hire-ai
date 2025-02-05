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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Left Navigation Panel */}
      <div className="w-1/3 pr-8 border-r border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Workers</h2>
        <div className="space-y-4">
          {workers.map((worker) => (
            <Link 
              href={`/workers?id=${worker.id}`} 
              key={worker.id}
              className={`block p-6 rounded-lg shadow-sm transition-all duration-200 ${
                worker.id === selectedWorker?.id
                  ? 'border-2 border-indigo-500 shadow-md'
                  : 'border border-gray-100 hover:border-gray-200 hover:shadow-md'
              }`}
            >
              <h3 className="font-semibold text-gray-900">{worker.name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                ${worker.worker_data.hourly_rate}/{worker.worker_data.currency}
              </p>
              <div className="flex gap-2 mt-3">
                {worker.worker_data.skills.slice(0, 2).map((skill) => (
                  <span 
                    key={skill}
                    className="px-3 py-1 rounded-full bg-gray-50 text-gray-600 text-xs font-medium"
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
        <div className="p-8 rounded-xl shadow-sm border border-gray-100">
          {selectedWorker ? (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{selectedWorker.name}</h2>
                <p className="text-lg text-gray-900 mb-2">
                  Status: <span className={`font-medium ${
                    selectedWorker.worker_data.availability === 'available' 
                      ? 'text-green-600' 
                      : 'text-yellow-600'
                  }`}>
                    {selectedWorker.worker_data.availability}
                  </span>
                </p>
                <p className="text-gray-600">
                  ${selectedWorker.worker_data.hourly_rate}/{selectedWorker.worker_data.currency}
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedWorker.worker_data.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-4 py-2 rounded-full bg-gray-50 text-gray-600 text-sm font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedWorker.worker_data.certifications?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Certifications</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedWorker.worker_data.certifications.map((cert) => (
                        <span
                          key={cert}
                          className="px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {selectedWorker.description}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No worker selected</p>
          )}
        </div>
      </div>
    </div>
  );
}