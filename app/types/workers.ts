export interface WorkerData {
    skills: string[];
    certifications: string[];
    availability: 'available' | 'busy';
    tagline: string;
    billing_type: 'hourly' | 'monthly' | 'task';
    rate: number;
    currency: string;
}
  
export interface Worker {
    id: string;
    name: string;
    description: string;
    worker_data: WorkerData;
}
