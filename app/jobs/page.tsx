'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Job } from '@/app/types/jobs'
import axios from 'axios';
import { useSearchParams } from 'next/navigation';

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const jobId = searchParams.get('id');

  useEffect(() => {
    async function fetchJobs() {
      try {
        const response = await axios.get('/api/jobs');
        setJobs(response.data);
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  // Find the selected job or default to the first job
  const selectedJob = jobId 
    ? jobs.find(job => job.id === jobId) 
    : jobs[0];

  if (loading) {
    return <div>Loading...</div>; // Add proper loading state UI
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <nav className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center space-x-2">
                <svg
                  className="w-8 h-8"
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
                <span className="text-xl font-semibold tracking-tight">AIHire</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Left Navigation Panel */}
        <div className="w-1/3 pr-8 border-r border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold mb-6">Available Jobs</h2>
          <div className="space-y-4">
            {jobs.map((job) => (
              <Link 
                href={`/jobs?id=${job.id}`} 
                key={job.id}
                className={`block p-4 rounded-lg border ${
                  job.id === selectedJob?.id
                    ? 'border-blue-500 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                } transition-colors`}
              >
                <h3 className="font-medium">{job.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {job.job_data.poster_display_name}
                </p>
                <div className="flex gap-2 mt-2">
                  {job.job_data.skills.slice(0, 2).map((skill) => (
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
            {selectedJob ? (
              <>
                <h2 className="text-2xl font-semibold mb-4">{selectedJob.title}</h2>
                <div className="mb-6">
                  <p className="text-lg mb-2">{selectedJob.job_data.poster_display_name}</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedJob.job_data.bounty.reward.type === 'fixed' 
                      ? `$${selectedJob.job_data.bounty.reward.total_amount}`
                      : 'Reward varies'}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Required Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.job_data.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {selectedJob.job_data.description}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p>No job selected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}