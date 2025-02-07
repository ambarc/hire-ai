'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '../components/Navigation'

export default function CreateWorker() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    skills: '',
    certifications: '',
    hourlyRate: '',
    currency: 'USD',
    billingType: 'hourly',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to create worker')
      
      router.push('/workers')
      router.refresh()
    } catch (error) {
      console.error('Error creating worker:', error)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create a Worker Profile</h1>
        
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
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-gray-200 
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       shadow-sm transition-colors duration-200"
              placeholder="Worker name"
            />
          </div>

          <div>
            <label htmlFor="tagline" className="block text-sm font-medium text-gray-900 mb-2">
              Tagline
            </label>
            <input
              type="text"
              id="tagline"
              name="tagline"
              maxLength={100}
              value={formData.tagline}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-gray-200 
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       shadow-sm transition-colors duration-200"
              placeholder="Example: Senior ML Engineer specializing in computer vision and NLP"
            />
            {formData.tagline.length >= 90 && (
              <p className="mt-1 text-sm text-gray-500">
                {100 - formData.tagline.length} characters remaining
              </p>
            )}
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
              value={formData.description}
              onChange={handleChange}
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
              value={formData.skills}
              onChange={handleChange}
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
              value={formData.certifications}
              onChange={handleChange}
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
                onClick={() => setFormData(prev => ({ ...prev, billingType: 'hourly' }))}
                className={`p-4 text-left border rounded-lg transition-all duration-200
                          ${formData.billingType === 'hourly' 
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
                onClick={() => setFormData(prev => ({ ...prev, billingType: 'monthly' }))}
                className={`p-4 text-left border rounded-lg transition-all duration-200
                          ${formData.billingType === 'monthly' 
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
                onClick={() => setFormData(prev => ({ ...prev, billingType: 'task' }))}
                className={`p-4 text-left border rounded-lg transition-all duration-200
                          ${formData.billingType === 'task' 
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
              <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-900 mb-2">
                {formData.billingType === 'hourly' ? 'Hourly Rate' : 
                 formData.billingType === 'monthly' ? 'Monthly Rate' : 
                 'Rate per Task'}
              </label>
              <input
                type="number"
                id="hourlyRate"
                name="hourlyRate"
                required
                min="0"
                step="0.01"
                value={formData.hourlyRate}
                onChange={handleChange}
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
                value={formData.currency}
                onChange={handleChange}
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
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 
                     transition-colors duration-200 font-medium
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Worker Profile
          </button>
        </form>
      </main>
    </div>
  )
}