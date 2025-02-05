'use client'

import { Suspense } from 'react';
import WorkersContent from './WorkersContent';
import Link from 'next/link';

export default function WorkersPage() {
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

            <div className="flex items-center space-x-4">
              <Link 
                href="/jobs" 
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-900"
              >
                Jobs
              </Link>
              <Link 
                href="/workers" 
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-900"
              >
                Workers
              </Link>
              <Link href="/create-job">
                <button className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 
                               transition-colors font-medium">
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

      <Suspense fallback={<div>Loading...</div>}>
        <WorkersContent />
      </Suspense>
    </div>
  );
}