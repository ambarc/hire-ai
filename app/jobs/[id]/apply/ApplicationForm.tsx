'use client';

import { useRouter } from 'next/navigation';
import { Job } from '@/app/types/jobs';
import { useState } from 'react';

export default function ApplicationForm({ job }: { job: Job }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [rateOption, setRateOption] = useState<'accept' | 'propose'>('accept');
  const [proposedRate, setProposedRate] = useState(job.rate); // Default to job rate

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const submitData = {
      jobId: job.id,
      contactInfo: formData.get('contactInfo'),
      message: formData.get('message'),
      rate: rateOption === 'accept' ? job.rate : proposedRate,
    };
    
    console.log('Submitting application:', submitData); // Debug log
    
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData); // Debug log
        throw new Error(errorData.error || 'Failed to submit application');
      }

      const data = await response.json();
      console.log('Application submitted successfully:', data); // Debug log

      router.push(`/jobs?id=${job.id}&applied=true`);
    } catch (error) {
      console.error('Failed to submit application:', error);
      setError('Failed to submit application. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-900 mb-2">
          Contact Information
        </label>
        <input
          type="text"
          id="contactInfo"
          name="contactInfo"
          required
          className="w-full px-4 py-3 rounded-md border border-gray-200 
                   focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                   shadow-sm transition-colors duration-200"
          placeholder="Email, phone number, or preferred contact method"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-2">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          className="w-full px-4 py-3 rounded-md border border-gray-200 
                   focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                   shadow-sm transition-colors duration-200"
          placeholder="Introduce yourself and explain why you're interested in this position..."
        />
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <div
          onClick={() => setRateOption('accept')}
          className={`cursor-pointer p-4 rounded-lg border transition-colors duration-200 
            ${rateOption === 'accept' ? 'bg-green-100 border-green-500' : 'border-gray-300'}`}
        >
          Accept Rate (${job.rate}/{job.billingType === 'monthly' ? 'month' : job.billingType === 'hourly' ? 'hour' : 'task'})
        </div>
        <div
          onClick={() => setRateOption('propose')}
          className={`cursor-pointer p-4 rounded-lg border transition-colors duration-200 
            ${rateOption === 'propose' ? 'bg-orange-100 border-orange-500' : 'border-gray-300'}`}
        >
          Propose Rate
        </div>
      </div>

      {rateOption === 'propose' && (
        <div>
          <label htmlFor="proposedRate" className="block text-sm font-medium text-gray-900 mb-2">
            Proposed Rate
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">{job.currency}</span>
            <input
              type="number"
              id="proposedRate"
              name="proposedRate"
              required
              value={proposedRate}
              onChange={(e) => setProposedRate(Number(e.target.value))}
              className="w-32 px-4 py-3 rounded-md border border-gray-200 
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       shadow-sm transition-colors duration-200"
            />
            <span className="text-gray-500">per {job.billingType === 'monthly' ? 'month' : 'hour'}</span>
          </div>
          <p className="text-sm text-orange-600 mt-1">
            Note: Proposing a new rate may reduce your chances of getting the job.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg 
                 hover:bg-indigo-700 transition-colors duration-200
                 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  );
} 