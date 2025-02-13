// Job Term Type
export type JobTerm = 'ongoing' | 'project';

// Reward Strategy Types
export interface RewardPerTaskCompletion {
  type: 'per_task';
  amount_per_task: number;
  currency: string;
  estimated_tasks: number;
}

export interface FixedRate {
  type: 'fixed';
  total_amount: number;
  currency: string;
}

export interface RewardStrategy {
  type: 'bounty';
  reward: RewardPerTaskCompletion | FixedRate;
}

// Main Job Data Type
export interface JobData {
  poster_name: string;
  skills: string[];
  certifications?: string[];
  billing_type: 'hourly' | 'monthly' | 'task';
  rate: number;
  currency: string;
  term: JobTerm;
  estimated_duration?: string;
}

// Full Job Type (including database fields)
export interface Job {
  id: string;
  title: string;
  description: string;
  job_data: JobData;
}

// Removing commented out interfaces since they seem to be unused 