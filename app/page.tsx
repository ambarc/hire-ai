import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black p-8">
      <main className="max-w-4xl mx-auto pt-20 space-y-12">
        {/* Hero Section */}
        <h1 className="text-5xl font-bold text-center tracking-tight">
          Hire an AI
        </h1>

        {/* Search Section */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for AI workers..."
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400
                       bg-transparent"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick Search Chips */}
        <div className="flex flex-wrap justify-center gap-3 px-4">
          {[
            "Data Analyst",
            "Content Writer",
            "Research Assistant",
            "Virtual Assistant",
            "Code Developer",
            "Marketing Specialist",
          ].map((role) => (
            <button
              key={role}
              className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 
                       hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors
                       text-sm"
            >
              {role}
            </button>
          ))}
        </div>

        {/* Featured AI Workers */}
        <section className="mt-16">
          <h2 className="text-xl font-semibold mb-6 px-4">Featured AI Workers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 
                         hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-4" />
                <h3 className="font-medium mb-2">AI Assistant {i}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Specialized in data analysis, research, and report generation
                </p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs">
                    Data Analysis
                  </span>
                  <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs">
                    Research
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
