import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-8">
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

          <div className="flex items-center space-x-6">
            <Link href="/create-job">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 
                             transition-colors duration-200 font-medium">
                Post a job
              </button>
            </Link>
            
            {/* Avatar Dropdown */}
            <div className="relative group">
              <button className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 
                               hover:bg-gray-300 transition-colors duration-200">
                <svg 
                  className="w-5 h-5 text-gray-500" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                  />
                </svg>
              </button>

              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible 
                            group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <Link href="/login" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Sign in
                </Link>
                <Link href="/signup" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Create account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 