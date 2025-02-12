'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Job } from '@/app/types/jobs'
import axios from 'axios';
import { useSearchParams } from 'next/navigation';

export default function JobsContent() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const jobId = searchParams.get('id');

  useEffect(() => {
    async function fetchJobs() {
      try {
        const response = await axios.get('/api/jobs');
        
        // Sort jobs to put "Virtual Medical Assistant" first
        const sortedJobs = response.data.sort((a, b) => {
          const isAVMA = a.title.startsWith('Virtual Medical Assistant');
          const isBVMA = b.title.startsWith('Virtual Medical Assistant');
          if (isAVMA && !isBVMA) return -1;
          if (!isAVMA && isBVMA) return 1;
          return 0;
        });
        
        setJobs(sortedJobs);
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  const selectedJob = jobId 
    ? jobs.find(job => job.id === jobId) 
    : jobs[0];

  useEffect(() => {
    document.title = selectedJob 
      ? `Hire AI - ${selectedJob.title}`
      : 'Hire AI';
  }, [selectedJob]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center space-x-3 transition-colors duration-200 hover:text-indigo-600">
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

      <div className="flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Left Navigation Panel */}
        <div className="w-1/3 pr-8 border-r border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Jobs</h2>
          <div className="space-y-4">
            {jobs.map((job) => (
              <Link 
                href={`/jobs?id=${job.id}`} 
                key={job.id}
                className={`block p-6 rounded-lg shadow-sm transition-all duration-200 ${
                  job.id === selectedJob?.id
                    ? 'border-2 border-indigo-500 shadow-md'
                    : 'border border-gray-100 hover:border-gray-200 hover:shadow-md'
                }`}
              >
                <h3 className="font-semibold text-gray-900">{job.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {job.job_data.poster_display_name}
                </p>
                <div className="flex gap-2 mt-3">
                  {job.job_data.skills.slice(0, 2).map((skill) => (
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
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">{selectedJob.title}</h2>
                  <p className="text-lg text-gray-900 mb-2">{selectedJob.job_data.poster_display_name}</p>
                  <p className="text-gray-600">
                    {selectedJob.job_data.bounty?.reward?.type === 'fixed' 
                      ? `$${selectedJob.job_data.bounty?.reward?.total_amount}`
                      : selectedJob.job_data.bounty?.reward?.type === 'per_task'
                        ? `$${selectedJob.job_data.bounty?.reward?.amount_per_task} per task (Est. ${selectedJob.job_data.bounty?.reward?.estimated_tasks} tasks)`
                        : 'Reward varies'}
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.job_data.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-4 py-2 rounded-full bg-gray-50 text-gray-600 text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedJob.job_data.certifications?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Certifications</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.job_data.certifications.map((cert) => (
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