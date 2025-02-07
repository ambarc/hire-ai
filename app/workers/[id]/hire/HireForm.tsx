'use client';

import { useRouter } from 'next/navigation';
import { Worker } from '@/app/types/workers';
import { useState } from 'react';

export default function HireForm({ worker }: { worker: Worker }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [rateOption, setRateOption] = useState<'accept' | 'propose'>('accept');
  const [proposedRate, setProposedRate] = useState(worker.worker_data.rate);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const submitData = {
      workerId: worker.id,
      contactInfo: formData.get('contactInfo'),
      projectDetails: formData.get('projectDetails'),
      rate: rateOption === 'accept' ? worker.worker_data.rate : proposedRate,
      startDate: formData.get('startDate'),
      duration: formData.get('duration'),
    };
    
    try {
      const response = await fetch('/api/hire-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit hire request');
      }

      const data = await response.json();
      router.push(`/workers?id=${worker.id}&hired=true`);
    } catch (error) {
      console.error('Failed to submit hire request:', error);
      setError('Failed to submit hire request. Please try again.');
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
          placeholder="Your email or phone number"
        />
      </div>

      <div>
        <label htmlFor="projectDetails" className="block text-sm font-medium text-gray-900 mb-2">
          Project Details
        </label>
        <textarea
          id="projectDetails"
          name="projectDetails"
          required
          rows={6}
          className="w-full px-4 py-3 rounded-md border border-gray-200 
                   focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                   shadow-sm transition-colors duration-200"
          placeholder="Describe your project and requirements..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-900 mb-2">
            Desired Start Date
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            required
            className="w-full px-4 py-3 rounded-md border border-gray-200 
                     focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                     shadow-sm transition-colors duration-200"
          />
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-900 mb-2">
            Expected Duration
          </label>
          <input
            type="text"
            id="duration"
            name="duration"
            required
            className="w-full px-4 py-3 rounded-md border border-gray-200 
                     focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                     shadow-sm transition-colors duration-200"
            placeholder="e.g., 3 months, 6 weeks"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <div
          onClick={() => setRateOption('accept')}
          className={`cursor-pointer p-4 rounded-lg border transition-colors duration-200 
            ${rateOption === 'accept' ? 'bg-green-100 border-green-500' : 'border-gray-300'}`}
        >
          Accept Rate (${worker.worker_data.rate}/{worker.worker_data.billing_type})
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
            <span className="text-gray-500">$</span>
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
            <span className="text-gray-500">per {worker.worker_data.billing_type}</span>
          </div>
          <p className="text-sm text-orange-600 mt-1">
            Note: Proposing a different rate may affect the worker's decision.
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
        {submitting ? 'Submitting...' : 'Submit Hire Request'}
      </button>
    </form>
  );
} 