'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '../components/Navigation'

export default function CreateWorker() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      skills: formData.get('skills'),
      certifications: formData.get('certifications'),
      hourlyRate: formData.get('hourlyRate'),
      currency: formData.get('currency'),
    }

    try {
      const response = await fetch('/api/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Server response:', errorData)
        throw new Error(`Failed to create worker: ${errorData.error || response.statusText}`)
      }

      router.push('/workers')
    } catch (err) {
      console.error('Submission error:', err)
      setError(`Failed to create worker. Please try again. ${err}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create a Worker Profile</h1>
        
        {error && (
          <div className="mb-6 p-4 text-red-600 bg-red-50 rounded-lg border border-red-100">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 
                       focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400
                       bg-transparent"
              placeholder="Worker name"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={6}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 
                       focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400
                       bg-transparent"
              placeholder="What does the worker do?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="hourlyRate" className="block text-sm font-medium mb-2">
                Hourly Rate
              </label>
              <input
                type="number"
                id="hourlyRate"
                name="hourlyRate"
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

          <div>
            <label htmlFor="skills" className="block text-sm font-medium mb-2">
              Skills (comma-separated)
            </label>
            <input
              type="text"
              id="skills"
              name="skills"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 
                       focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400
                       bg-transparent"
              placeholder="e.g., Data Analysis, Phone Calls, Lead Sourcing, etc."
            />
            <p className="mt-1 text-sm text-gray-500">Optional</p>
          </div>

          <div>
            <label htmlFor="certifications" className="block text-sm font-medium mb-2">
              Certifications (comma-separated)
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
            <p className="mt-1 text-sm text-gray-500">Optional</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-3 bg-black dark:bg-white text-white dark:text-black 
                     rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 
                     transition-colors font-medium mt-8 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Worker Profile'}
          </button>
        </form>
      </main>
    </div>
  )
}