'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateJob() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [rewardType, setRewardType] = useState<'fixed' | 'per_task'>('fixed');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      skills: formData.get('skills'),
      certifications: formData.get('certifications'),
      posterName: formData.get('posterName'),
      rewardType,
      rewardAmount: formData.get('rewardAmount'),
      currency: formData.get('currency'),
      estimatedTasks: formData.get('estimatedTasks'),
    };

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create job');
      }

      router.push('/');
    } catch (err) {
      setError(`Failed to create job. Please try again. ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Navigation */}
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

      <main className="max-w-2xl mx-auto pt-12 p-8">
        <h1 className="text-3xl font-bold mb-8">Create a Job</h1>
        
        {error && (
          <div className="mb-4 p-4 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Job Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 
                       focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400
                       bg-transparent"
              placeholder="e.g., Data Analysis Assistant"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Job Description
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={6}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 
                       focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400
                       bg-transparent"
              placeholder="Describe the job requirements, responsibilities, and desired outcomes..."
            />
          </div>

          <div>
            <label htmlFor="posterName" className="block text-sm font-medium mb-2">
              Your Display Name
            </label>
            <input
              type="text"
              id="posterName"
              name="posterName"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 
                       focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400
                       bg-transparent"
              placeholder="How you want to be known"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Reward Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="rewardType"
                  value="fixed"
                  checked={rewardType === 'fixed'}
                  onChange={() => setRewardType('fixed')}
                  className="mr-2"
                />
                Fixed Rate
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="rewardType"
                  value="per_task"
                  checked={rewardType === 'per_task'}
                  onChange={() => setRewardType('per_task')}
                  className="mr-2"
                />
                Per Task
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rewardAmount" className="block text-sm font-medium mb-2">
                {rewardType === 'fixed' ? 'Total Amount' : 'Amount Per Task'}
              </label>
              <input
                type="number"
                id="rewardAmount"
                name="rewardAmount"
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 
                         focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400
                         bg-transparent"
              />
            </div>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium mb-2">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 
                         focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400
                         bg-transparent"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {rewardType === 'per_task' && (
            <div>
              <label htmlFor="estimatedTasks" className="block text-sm font-medium mb-2">
                Estimated Number of Tasks
              </label>
              <input
                type="number"
                id="estimatedTasks"
                name="estimatedTasks"
                required
                min="1"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 
                         focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400
                         bg-transparent"
              />
            </div>
          )}

          <div>
            <label htmlFor="skills" className="block text-sm font-medium mb-2">
              Required Skills (comma-separated)
            </label>
            <input
              type="text"
              id="skills"
              name="skills"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 
                       focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400
                       bg-transparent"
              placeholder="e.g., Data Analysis, Python, Report Writing"
            />
            <p className="mt-1 text-sm text-gray-500">Optional: List skills separated by commas</p>
          </div>

          <div>
            <label htmlFor="certifications" className="block text-sm font-medium mb-2">
              Required Certifications (comma-separated)
            </label>
            <input
              type="text"
              id="certifications"
              name="certifications"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 
                       focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400
                       bg-transparent"
              placeholder="e.g., AWS Solutions Architect, PMP, CISSP"
            />
            <p className="mt-1 text-sm text-gray-500">Optional: List certifications separated by commas</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-3 bg-black dark:bg-white text-white dark:text-black 
                     rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 
                     transition-colors font-medium mt-8 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Job'}
          </button>
        </form>
      </main>
    </div>
  );
} 