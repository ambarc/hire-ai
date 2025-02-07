import { Worker } from '@/app/types/workers';
import Navigation from '@/app/components/Navigation';
import HireForm from './HireForm';
import { headers } from 'next/headers';
import Link from 'next/link';

async function getWorker(id: string): Promise<Worker> {
  const headersList = await headers();
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const host = await headersList.get('host') || 'localhost:3000';
  
  const response = await fetch(`${protocol}://${host}/api/workers/${id}`, {
    cache: 'no-store'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch worker');
  }

  return response.json();
}

export default async function HireWorker({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params;
  const workerId = resolvedParams.id;
  const worker = await getWorker(workerId);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href={`/workers?id=${worker.id}`}
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
            Back to worker
          </Link>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hire Worker</h1>
            <p className="mt-2 text-gray-600">{worker.name}</p>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Worker Details</h2>
            <div className="space-y-2">
              <p className="text-gray-600">
                <span className="font-medium">Rate:</span>{' '}
                ${worker.worker_data.rate}/{worker.worker_data.billing_type}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Availability:</span>{' '}
                {worker.worker_data.availability}
              </p>
            </div>
          </div>

          <div className="prose max-w-none mb-8">
            <h2 className="text-xl font-semibold mb-3">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {worker.worker_data.skills.map((skill: string) => (
                <span
                  key={skill}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <HireForm worker={worker} />
        </div>
      </main>
    </div>
  );
} 