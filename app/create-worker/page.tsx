'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '../components/Navigation'
import { BillingType } from '../types/billing'

export default function CreateWorker() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [billingType, setBillingType] = useState<BillingType>('hourly')

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
      rate: formData.get('rate'),
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
        throw new Error('Failed to create worker')
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
            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full px-4 py-2 rounded-md border border-gray-200 
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       shadow-sm transition-colors duration-200"
              placeholder="Worker name"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={6}
              className="w-full px-4 py-2 rounded-md border border-gray-200 
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       shadow-sm transition-colors duration-200"
              placeholder="Describe your capabilities, experience, and specialties..."
            />
          </div>

          <div>
            <label htmlFor="skills" className="block text-sm font-medium text-gray-900 mb-2">
              Skills (comma-separated)
            </label>
            <input
              type="text"
              id="skills"
              name="skills"
              className="w-full px-4 py-2 rounded-md border border-gray-200 
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       shadow-sm transition-colors duration-200"
              placeholder="e.g., Data Analysis, Python, Report Writing"
            />
          </div>

          <div>
            <label htmlFor="certifications" className="block text-sm font-medium text-gray-900 mb-2">
              Certifications (comma-separated)
            </label>
            <input
              type="text"
              id="certifications"
              name="certifications"
              className="w-full px-4 py-2 rounded-md border border-gray-200 
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       shadow-sm transition-colors duration-200"
              placeholder="e.g., AWS Solutions Architect, PMP, CISSP"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Billing Type
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setBillingType('hourly')}
                className={`p-4 text-left border rounded-lg transition-all duration-200
                          ${billingType === 'hourly' 
                            ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
              >
                <div className="font-medium text-gray-900">Hourly rate</div>
                <div className="text-sm text-gray-500 mt-1">
                  Charge per hour worked
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBillingType('monthly')}
                className={`p-4 text-left border rounded-lg transition-all duration-200
                          ${billingType === 'monthly' 
                            ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
              >
                <div className="font-medium text-gray-900">Monthly rate</div>
                <div className="text-sm text-gray-500 mt-1">
                  Fixed monthly fee
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBillingType('task')}
                className={`p-4 text-left border rounded-lg transition-all duration-200
                          ${billingType === 'task' 
                            ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-2' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
              >
                <div className="font-medium text-gray-900">Per task</div>
                <div className="text-sm text-gray-500 mt-1">
                  Charge per completed task
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rate" className="block text-sm font-medium text-gray-900 mb-2">
                {billingType === 'hourly' ? 'Hourly Rate' : 
                 billingType === 'monthly' ? 'Monthly Rate' : 
                 'Rate per Task'}
              </label>
              <input
                type="number"
                id="rate"
                name="rate"
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-2 rounded-md border border-gray-200 
                         focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                         shadow-sm transition-colors duration-200"
              />
            </div>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-900 mb-2">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                required
                className="w-full px-4 py-2 rounded-md border border-gray-200 
                         focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                         shadow-sm transition-colors duration-200"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 
                     transition-colors duration-200 font-medium
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'List a worker'}
          </button>
        </form>
      </main>
    </div>
  )
}