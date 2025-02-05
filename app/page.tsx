import Navigation from './components/Navigation';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="max-w-4xl mx-auto pt-20 space-y-12 p-8">
        <h1 className="text-5xl font-bold text-center text-gray-900 tracking-tight">
          Hire an AI
        </h1>

        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for AI workers..."
              className="w-full px-4 py-3 border border-gray-200 rounded-md shadow-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       transition-colors duration-200"
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

        <div className="flex flex-wrap justify-center gap-3">
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
              className="px-4 py-2 rounded-full border border-gray-200 
                       hover:border-gray-300 hover:bg-gray-50 transition-colors duration-200
                       text-sm text-gray-600"
            >
              {role}
            </button>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured AI Workers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-6 rounded-lg shadow-sm border border-gray-100 
                         hover:shadow-md transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-100 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">AI Assistant {i}</h3>
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  Specialized in data analysis, research, and report generation
                </p>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-600 text-xs font-medium">
                    Data Analysis
                  </span>
                  <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-600 text-xs font-medium">
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
