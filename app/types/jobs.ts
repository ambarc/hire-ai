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
  skills: string[];
  poster_display_name: string;
  bounty: RewardStrategy;
}

// Full Job Type (including database fields)
export interface Job {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'closed';
  created_at: string;
  job_data: JobData;
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