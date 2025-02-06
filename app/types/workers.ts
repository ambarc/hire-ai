import { BillingType } from './billing';

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
    skills: string[];
    certifications?: string[];
    billingType: BillingType;
    rate: number;
    currency: string;
    worker_data: {
      availability: 'available' | 'busy';
      skills: string[];
      certifications?: string[];
    };
  }