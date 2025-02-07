interface WorkerData {
  id: string;
  name: string;
  description: string;
  worker_data: {
    tagline?: string;
    skills: string[];
    certifications: string[];
    availability: string;
  };
  billingType: string;
  rate: number;
  currency: string;
}

export default function WorkerCard({ worker }: { worker: WorkerData }) {
  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">{worker.name}</h3>
      {worker.worker_data.tagline && (
        <p className="text-sm text-gray-600 mt-1">{worker.worker_data.tagline}</p>
      )}
      <p className="text-gray-700 mt-2">{worker.description}</p>
      <div className="mt-3">
        <div className="flex gap-2">
          {worker.worker_data.skills.map((skill) => (
            <span 
              key={skill}
              className="px-3 py-1 rounded-full bg-gray-50 text-gray-600 text-xs font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
} 