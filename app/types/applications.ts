export interface Application {
  id: string;
  job_id: string;
  contact_info: string;
  message: string;
  proposed_rate: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
} 