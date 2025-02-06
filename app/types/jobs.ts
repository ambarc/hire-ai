import { BillingType } from './billing';

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
}

// Full Job Type (including database fields)
export interface Job {
  id: string;
  title: string;
  description: string;
  posterName: string;
  skills: string[];
  certifications?: string[];
  billingType: BillingType;
  rate: number;
  currency: string;
  term: 'ongoing' | 'project';
  estimatedDuration?: string;
}

// interface FixedReward {
//   type: 'fixed';
//   total_amount: number;
//   currency: string;
// }

// interface PerTaskReward {
//   type: 'per_task';
//   amount_per_task: number;
//   currency: string;
//   estimated_tasks: number;
// } 