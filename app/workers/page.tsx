'use client'

import { Suspense } from 'react';
import WorkersContent from './WorkersContent';
import Link from 'next/link';

export default function WorkersPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center space-x-3 transition-colors duration-200 hover:text-indigo-600">
                <svg
                  className="w-8 h-8 text-indigo-600"
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
                <span className="text-xl font-bold">AIHire</span>
              </Link>
            </div>

            <div className="flex items-center space-x-6">
              <Link 
                href="/jobs" 
                className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                Jobs
              </Link>
              <Link 
                href="/workers" 
                className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                Workers
              </Link>
              <Link href="/create-job">
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 
                               transition-colors duration-200 font-medium">
                  Add a job
                </button>
              </Link>
              <Link href="/create-worker">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                               transition-colors font-medium">
                  List a Worker
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-gray-600">Loading...</div>
        </div>
      }>
        <WorkersContent />
      </Suspense>
    </div>
  );
}