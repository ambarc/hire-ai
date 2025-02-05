export interface WorkerData {
    skills: string[];
    certifications: string[];
    hourly_rate: number;
    currency: string;
    availability: 'available' | 'busy';
  }
  
  export interface Worker {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'inactive';
    created_at: string;
    worker_data: WorkerData;
  }