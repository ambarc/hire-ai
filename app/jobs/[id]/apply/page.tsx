import { Job } from '@/app/types/jobs';
import Navigation from '@/app/components/Navigation';
import ApplicationForm from './ApplicationForm';  // We'll create this for the client-side parts
import { headers } from 'next/headers';
import Link from 'next/link';

async function getJob(id: string): Promise<Job> {
  const headersList = await headers();
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const host = await headersList.get('host') || 'localhost:3000';
  
  const response = await fetch(`${protocol}://${host}/api/jobs/${id}`, {
    cache: 'no-store'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch job');
  }

  return response.json();
}

export default async function ApplyToJob({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params;
  const jobId = resolvedParams.id;
  const job = await getJob(jobId);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href={`/jobs?id=${job.id}`}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to job
          </Link>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Apply for Position</h1>
            <p className="mt-2 text-gray-600">{job.title}</p>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h2>
            <div className="space-y-2">
              <p className="text-gray-600">
                <span className="font-medium">Rate:</span>{' '}
                ${job.job_data.rate}/{job.job_data.billing_type === 'monthly' ? 'month' : job.job_data.billing_type === 'hourly' ? 'hour' : 'task'}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Term:</span>{' '}
                {job.job_data.term}
              </p>
              {job.job_data.estimated_duration && (
                <p className="text-gray-600">
                  <span className="font-medium">Estimated Duration:</span>{' '}
                  {job.job_data.estimated_duration}
                </p>
              )}
            </div>
          </div>

          <div className="prose max-w-none mb-8">
            <h2 className="text-xl font-semibold mb-3">Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.job_data.skills.map((skill: string) => (
                <span
                  key={skill}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <ApplicationForm job={job} />
        </div>
      </main>
    </div>
  );
} 