'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Worker } from '@/app/types/workers'
import { useSearchParams, useRouter } from 'next/navigation';
import SearchBar from '../components/SearchBar';

function formatRate(worker: Worker) {
  if (!worker.worker_data?.rate || !worker.worker_data?.billing_type) {
    return 'Rate not available';
  }

  const { billing_type, rate, currency } = worker.worker_data;
  const currencySymbol = currency === 'USD' ? '$' : currency;
  
  switch (billing_type) {
    case 'hourly':
      return `${currencySymbol}${rate}/hour`;
    case 'monthly':
      return `${currencySymbol}${rate}/month`;
    case 'task':
      return `${currencySymbol}${rate}/task`;
    default:
      return `${currencySymbol}${rate}`;
  }
}

export default function WorkersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  
  const workerId = searchParams.get('id');
  const searchQuery = searchParams.get('search');

  useEffect(() => {
    async function fetchWorkers() {
      try {
        setLoading(true);
        const endpoint = searchQuery 
          ? `/api/workers/search?q=${encodeURIComponent(searchQuery)}`
          : '/api/workers';
          
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Worker data received:', data);
        setWorkers(data);
      } catch (error) {
        console.error('Failed to fetch workers:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkers();
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    const newUrl = query 
      ? `/workers?search=${encodeURIComponent(query)}`
      : '/workers';
    router.push(newUrl);
  };

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <SearchBar 
          initialQuery={searchQuery || ''} 
          onSearch={handleSearch}
          placeholder="Search for workers..."
        />
      </div>

      <div className="flex">
        {/* Left Navigation Panel - List View */}
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
                {worker.worker_data.tagline && (
                  <p className="text-sm text-gray-600 mt-1">{worker.worker_data.tagline}</p>
                )}
                <div className="text-sm text-gray-600 mt-2">
                  <span>{formatRate(worker)}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {worker.worker_data.skills?.slice(0, 2).map((skill) => (
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
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">{selectedWorker.name}</h2>
                      {selectedWorker.worker_data.tagline && (
                        <p className="text-lg text-gray-600 mt-2">{selectedWorker.worker_data.tagline}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <button
                        onClick={() => router.push(`/workers/${selectedWorker.id}/hire`)}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg 
                                  hover:bg-indigo-700 transition-colors duration-200
                                  font-medium flex items-center gap-2 ml-auto"
                      >
                        Hire
                        <svg 
                          className="w-4 h-4" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </button>
                      <p className="text-gray-600 mt-2 text-sm font-medium text-center">
                        {formatRate(selectedWorker)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {selectedWorker.description}
                    </p>
                  </div>

                  {selectedWorker.worker_data.certifications && selectedWorker.worker_data.certifications.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Certifications</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedWorker.worker_data.certifications?.map((cert) => (
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
                </div>
              </div>
            ) : (
              <p className="text-gray-600">No worker selected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}