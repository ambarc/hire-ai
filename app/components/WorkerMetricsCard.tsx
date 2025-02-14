import { Worker } from '@/app/types/workers';
import { useRouter } from 'next/navigation';

interface WorkerMetricsCardProps {
  worker: Worker;
  metrics?: {
    workerId: string;
    uptime: number;
    accuracy: number;
    tasksCompleted: number;
    costToDate: number;
  };
  view: 'grid' | 'list';
}

export default function WorkerMetricsCard({ worker, metrics, view }: WorkerMetricsCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/dashboard/${worker.id}`);
  };

  if (view === 'list') {
    return (
      <div 
        onClick={handleClick}
        className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between cursor-pointer hover:shadow-lg transition-shadow"
      >
        <div>
          <h3 className="text-xl font-semibold">{worker.name}</h3>
          <p className="text-gray-500">{worker.worker_data.tagline}</p>
        </div>
        
        <div className="flex items-center space-x-8">
          <div className="text-right">
            <p className="text-sm text-gray-500">Accuracy</p>
            <p className="font-semibold">{metrics?.accuracy.toFixed(1)}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Tasks</p>
            <p className="font-semibold">{metrics?.tasksCompleted}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Cost</p>
            <p className="font-semibold">${metrics?.costToDate.toFixed(2)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={handleClick}
      className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div>
        <h3 className="text-xl font-semibold">{worker.name}</h3>
        <p className="text-gray-500">{worker.worker_data.tagline}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <p className="text-sm text-gray-500">Uptime</p>
          <p className="text-lg font-semibold">{metrics?.uptime.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Accuracy</p>
          <p className="text-lg font-semibold">{metrics?.accuracy.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Tasks Completed</p>
          <p className="text-lg font-semibold">{metrics?.tasksCompleted}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Cost to Date</p>
          <p className="text-lg font-semibold">${metrics?.costToDate.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
} 