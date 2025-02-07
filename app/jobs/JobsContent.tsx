'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Job } from '@/app/types/jobs'
import { useSearchParams, useRouter } from 'next/navigation';
import SearchBar from '../components/SearchBar';

// First, let's create a helper function at the top of the file to format the rate display
function formatRate(job: Job) {
  const { billing_type, rate } = job.job_data;
  
  switch (billing_type) {
    case 'hourly':
      return `$${rate}/hour`;
    case 'monthly':
      return `$${rate}/month`;
    case 'task':
      return `$${rate}/task`;
    default:
      return `$${rate}`;
  }
}

export default function JobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  
  const jobId = searchParams.get('id');
  const searchQuery = searchParams.get('search');
  const highlightId = searchParams.get('highlight');

  useEffect(() => {
    async function fetchJobs() {
      try {
        setLoading(true);
        const endpoint = searchQuery 
          ? `/api/jobs/search?q=${encodeURIComponent(searchQuery)}`
          : '/api/jobs';
          
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const data = await response.json();
        setJobs(data);
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, [searchQuery]);

  const selectedJob = jobId 
    ? jobs.find(job => job.id === jobId) 
    : jobs[0];

  useEffect(() => {
    document.title = selectedJob 
      ? `Hire AI - ${selectedJob.title}`
      : 'Hire AI';
  }, [selectedJob]);

  const handleSearch = (query: string) => {
    const newUrl = query 
      ? `/jobs?search=${encodeURIComponent(query)}`
      : '/jobs';
    router.push(newUrl);
  };

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
          placeholder="Search for jobs..."
        />
      </div>

      <div className="flex">
        {/* Left Navigation Panel */}
        <div className="w-1/3 pr-8 border-r border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {searchQuery ? 'Search Results' : 'Available Jobs'}
          </h2>
          <div className="space-y-4">
            {jobs.map((job) => (
              <Link 
                href={`/jobs?${new URLSearchParams({
                  ...(searchQuery ? { search: searchQuery } : {}),
                  id: job.id
                })}`}
                key={job.id}
                className={`block p-6 rounded-lg shadow-sm transition-all duration-200 ${
                  job.id === selectedJob?.id
                    ? 'border-2 border-indigo-500 shadow-md'
                    : job.id === highlightId
                      ? 'border-2 border-green-500 shadow-md'
                      : 'border border-gray-100 hover:border-gray-200 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-900">{job.title}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full 
                    ${job.job_data.term === 'ongoing' 
                      ? 'bg-green-50 text-green-700'
                      : 'bg-blue-50 text-blue-700'}`}
                  >
                    {job.job_data.term === 'ongoing' ? 'Ongoing' : 'Project'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  <span>{formatRate(job)}</span>
                  <span className="ml-1 text-gray-500">{job.job_data.currency}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {job.job_data.skills?.slice(0, 2).map((skill: string) => (
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
            {selectedJob ? (
              <div className="space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">{selectedJob.title}</h2>
                    <div className="flex items-center gap-4">
                      <p className="text-gray-600">
                        <span>{formatRate(selectedJob)}</span>
                        <span className="ml-1 text-gray-500">{selectedJob.job_data.currency}</span>
                      </p>
                      <span className={`px-3 py-1 text-sm rounded-full 
                        ${selectedJob.job_data.term === 'ongoing' 
                          ? 'bg-green-50 text-green-700'
                          : 'bg-blue-50 text-blue-700'}`}
                      >
                        {selectedJob.job_data.term === 'ongoing' ? 'Ongoing' : 'Project'}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => router.push(`/jobs/${selectedJob.id}/apply`)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg 
                             hover:bg-indigo-700 transition-colors duration-200
                             font-medium flex items-center gap-2"
                  >
                    Apply
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
                </div>

                {selectedJob.job_data.term === 'project' && selectedJob.job_data.estimated_duration && (
                  <p className="text-gray-600 mt-2">
                    Estimated duration: {selectedJob.job_data.estimated_duration}
                  </p>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.job_data.skills?.map((skill: string) => (
                        <span
                          key={skill}
                          className="px-4 py-2 rounded-full bg-gray-50 text-gray-600 text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedJob.job_data.certifications && selectedJob.job_data.certifications.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Certifications</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.job_data.certifications.map((cert: string) => (
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {selectedJob.description}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">No job selected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 