'use client';

import Image from 'next/image';
import Link from 'next/link';
import RealmLogo from '@/app/assets/realm_logo_black.svg';

export default function Navigation() {
  return (
    <header className="bg-white shadow-sm">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex w-full items-center justify-between py-6">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <Image 
                src={RealmLogo} 
                alt="Realm Logo"
                width={28}
                height={28}
                className="mr-3"
                priority
                quality={100}
              />
              <span className="text-2xl font-semibold text-gray-900">Realm</span>
            </Link>

            <div className="flex items-center space-x-6">
              {/* Jobs Dropdown */}
              <div className="relative group">
                <button className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors duration-200">
                  <span>Jobs</span>
                  <svg 
                    className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" 
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible 
                              group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link href="/jobs" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Browse jobs
                  </Link>
                  <Link href="/create-job" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Post a job
                  </Link>
                  <Link href="/jobs/how-it-works" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    How it works
                  </Link>
                </div>
              </div>

              {/* Workers Dropdown */}
              <div className="relative group">
                <button className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors duration-200">
                  <span>Workers</span>
                  <svg 
                    className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" 
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible 
                              group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link href="/workers" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Browse workers
                  </Link>
                  <Link href="/create-worker" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    List a worker
                  </Link>
                  <Link href="/workers/how-it-works" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    How it works
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="ml-10 space-x-4">
            <Link
              href="/dashboard"
              className="inline-block rounded-md border border-transparent bg-indigo-500 py-2 px-4 text-base font-medium text-white hover:bg-opacity-75"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
} 