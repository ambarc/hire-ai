'use client';

import { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import { Worker } from './types/workers';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SearchBar from './components/SearchBar';

export default function Home() {
  const router = useRouter();
  const [featuredWorkers, setFeaturedWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkers() {
      try {
        const response = await fetch('/api/workers');
        const allWorkers = await response.json();
        
        // Randomly select 3 workers
        const shuffled = [...allWorkers].sort(() => 0.5 - Math.random());
        setFeaturedWorkers(shuffled.slice(0, 3));
      } catch (error) {
        console.error('Failed to fetch workers:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkers();
  }, []);

  const handleSearch = (query: string) => {
    if (!query) return;
    router.push(`/workers?search=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="max-w-4xl mx-auto pt-20 space-y-12 p-8">
        <h1 className="text-5xl font-bold text-center text-gray-900 tracking-tight">
          Hire an AI worker
        </h1>

        <div className="max-w-2xl mx-auto">
          <SearchBar 
            onSearch={handleSearch}
            placeholder="Search for AI workers..."
          />
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
            {loading ? (
              // Loading skeletons
              [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="p-6 rounded-lg shadow-sm border border-gray-100 animate-pulse"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-4" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 rounded-full w-20" />
                    <div className="h-6 bg-gray-200 rounded-full w-20" />
                  </div>
                </div>
              ))
            ) : (
              featuredWorkers.map((worker) => (
                <Link
                  key={worker.id}
                  href={`/workers?id=${worker.id}`}
                  className="p-6 rounded-lg shadow-sm border border-gray-100 
                           hover:shadow-md transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-100 mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">{worker.name}</h3>
                  {worker.worker_data.tagline && (
                    <p className="text-sm text-gray-600 mb-2">{worker.worker_data.tagline}</p>
                  )}
                  <div className="relative">
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-3">
                      {worker.description}
                    </p>
                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {worker.worker_data.skills?.slice(0, 2)?.map((skill: string) => (
                      <span
                        key={skill}
                        className="px-3 py-1 rounded-full bg-gray-50 text-gray-600 text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
