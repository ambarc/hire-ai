'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PerformanceMetrics {
  uptime: number[];
  accuracy: number[];
  taskCompletion: number[];
  timestamps: string[];
}

export default function PerformanceMonitoring({ workerId }: { workerId: string }) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/workers/${workerId}/performance`);
        const data = await res.json();
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching performance metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [workerId]);

  if (isLoading) {
    return <div className="animate-pulse">Loading performance metrics...</div>;
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  const accuracyData = {
    labels: metrics?.timestamps,
    datasets: [
      {
        label: 'Accuracy %',
        data: metrics?.accuracy,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const uptimeData = {
    labels: metrics?.timestamps,
    datasets: [
      {
        label: 'Uptime %',
        data: metrics?.uptime,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const taskCompletionData = {
    labels: metrics?.timestamps,
    datasets: [
      {
        label: 'Tasks Completed',
        data: metrics?.taskCompletion,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.5)',
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500">Current Uptime</p>
            <p className="text-2xl font-semibold text-gray-900">
              {metrics?.uptime[metrics.uptime.length - 1].toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Current Accuracy</p>
            <p className="text-2xl font-semibold text-gray-900">
              {metrics?.accuracy[metrics.accuracy.length - 1].toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Tasks Completed (24h)</p>
            <p className="text-2xl font-semibold text-gray-900">
              {metrics?.taskCompletion[metrics.taskCompletion.length - 1]}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Accuracy Trend</h3>
          <div className="h-[300px]">
            <Line options={chartOptions} data={accuracyData} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Uptime History</h3>
          <div className="h-[300px]">
            <Line options={chartOptions} data={uptimeData} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Task Completion Rate</h3>
          <div className="h-[300px]">
            <Line options={chartOptions} data={taskCompletionData} />
          </div>
        </div>
      </div>
    </div>
  );
} 