import Link from 'next/link';
import { Job } from '@/app/types/jobs'

async function getJobs(): Promise<Job[]> {
  const response = await fetch('http://localhost:3000/api/jobs', {
    cache: 'no-store' // or 'force-cache' if you want to cache the results
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch jobs')
  }
  
  return response.json()
}

export default async function JobsPage() {
  const jobs = await getJobs();

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
                className="block p-4 rounded-lg border border-gray-200 dark:border-gray-800 
                         hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
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
            {jobs[0] && (
              <>
                <h2 className="text-2xl font-semibold mb-4">{jobs[0].title}</h2>
                <div className="mb-6">
                  <p className="text-lg mb-2">{jobs[0].job_data.poster_display_name}</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {jobs[0].job_data.bounty.reward.type === 'fixed' 
                      ? `Fixed Rate: ${jobs[0].job_data.bounty.reward.total_amount} ${jobs[0].job_data.bounty.reward.currency}`
                      : `${jobs[0].job_data.bounty.reward.amount_per_task} ${jobs[0].job_data.bounty.reward.currency} per task`
                    }
                  </p>
                </div>
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {jobs[0].description}
                  </p>
                </div>
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {jobs[0].job_data.skills.map((skill) => (
                      <span 
                        key={skill}
                        className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <button className="w-full px-4 py-2 bg-black text-white dark:bg-white dark:text-black 
                               rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors 
                               font-medium">
                  Apply Now
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 