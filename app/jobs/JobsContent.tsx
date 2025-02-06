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
  const highlightId = searchParams.get('highlight');

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
                  : job.id === highlightId
                    ? 'border-2 border-green-500 shadow-md'
                    : 'border border-gray-100 hover:border-gray-200 hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-gray-900">{job.title}</h3>
                <span className={`px-2 py-1 text-xs rounded-full 
                  ${job.term === 'ongoing' 
                    ? 'bg-green-50 text-green-700'
                    : 'bg-blue-50 text-blue-700'}`}
                >
                  {job.term === 'ongoing' ? 'Ongoing' : 'Project'}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {job.billingType === 'hourly' && (
                  <span>${job.rate}/hour</span>
                )}
                {job.billingType === 'monthly' && (
                  <span>${job.rate}/month</span>
                )}
                {job.billingType === 'task' && (
                  <span>${job.rate}/task</span>
                )}
                <span className="ml-1 text-gray-500">{job.currency}</span>
              </div>
              <div className="flex gap-2 mt-3">
                {job.skills?.slice(0, 2).map((skill) => (
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
                <div className="flex items-center gap-4">
                  <p className="text-gray-600">
                    {selectedJob.billingType === 'hourly' && (
                      <span>${selectedJob.rate}/hour</span>
                    )}
                    {selectedJob.billingType === 'monthly' && (
                      <span>${selectedJob.rate}/month</span>
                    )}
                    {selectedJob.billingType === 'task' && (
                      <span>${selectedJob.rate}/task</span>
                    )}
                    <span className="ml-1 text-gray-500">{selectedJob.currency}</span>
                  </p>
                  <span className={`px-3 py-1 text-sm rounded-full 
                    ${selectedJob.term === 'ongoing' 
                      ? 'bg-green-50 text-green-700'
                      : 'bg-blue-50 text-blue-700'}`}
                  >
                    {selectedJob.term === 'ongoing' ? 'Ongoing' : 'Project'}
                  </span>
                </div>
                {selectedJob.term === 'project' && selectedJob.estimatedDuration && (
                  <p className="text-gray-600 mt-2">
                    Estimated duration: {selectedJob.estimatedDuration}
                  </p>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills?.map((skill) => (
                      <span
                        key={skill}
                        className="px-4 py-2 rounded-full bg-gray-50 text-gray-600 text-sm font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedJob.certifications && selectedJob.certifications.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Certifications</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.certifications.map((cert) => (
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
  );
} 