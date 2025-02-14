'use client';

import { useEffect, useState } from 'react';
import { Worker } from '@/app/types/workers';
import WorkerMetricsCard from '../components/WorkerMetricsCard';

interface WorkerMetrics {
  workerId: string;
  uptime: number;
  accuracy: number;
  tasksCompleted: number;
  costToDate: number;
}

export default function DashboardContent() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [metrics, setMetrics] = useState<WorkerMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'available' | 'busy'>('all');

  // Calculate summary metrics
  const totalCost = metrics.reduce((sum, m) => sum + m.costToDate, 0);
  const totalTasks = metrics.reduce((sum, m) => sum + m.tasksCompleted, 0);
  const averageAccuracy = metrics.reduce((sum, m) => sum + m.accuracy, 0) / metrics.length || 0;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [workersRes, metricsRes] = await Promise.all([
          fetch('/api/workers/active'),
          fetch('/api/workers/metrics')
        ]);

        const [workersData, metricsData] = await Promise.all([
          workersRes.json(),
          metricsRes.json()
        ]);

        setWorkers(workersData);
        setMetrics(metricsData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredWorkers = workers.filter(worker => {
    if (filter === 'all') return true;
    return worker.worker_data.availability === filter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-600">Loading metrics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Workers</h3>
          <p className="text-3xl font-bold text-gray-900">{workers.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Tasks Completed</h3>
          <p className="text-3xl font-bold text-gray-900">{totalTasks}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Average Accuracy</h3>
          <p className="text-3xl font-bold text-gray-900">{averageAccuracy.toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Cost</h3>
          <p className="text-3xl font-bold text-gray-900">${totalCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'available' | 'busy')}
            className="rounded-lg border border-gray-200 px-4 py-2"
          >
            <option value="all">All Workers</option>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
          </select>
          
          <div className="flex rounded-lg border border-gray-200">
            <button
              onClick={() => setView('grid')}
              className={`px-4 py-2 ${view === 'grid' ? 'bg-indigo-50 text-indigo-600' : ''}`}
            >
              Grid
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 ${view === 'list' ? 'bg-indigo-50 text-indigo-600' : ''}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Workers Grid/List */}
      <div className={view === 'grid' 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        : "space-y-4"
      }>
        {filteredWorkers.map((worker) => {
          const workerMetrics = metrics.find(m => m.workerId === worker.id);
          return (
            <WorkerMetricsCard 
              key={worker.id}
              worker={worker}
              metrics={workerMetrics}
              view={view}
            />
          );
        })}
      </div>

      {filteredWorkers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No workers found matching your criteria.</p>
        </div>
      )}
    </div>
  );
} 