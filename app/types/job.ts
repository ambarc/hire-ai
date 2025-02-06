export type JobTerm = 'ongoing' | 'project';

export interface Job {
  // ... other job fields ...
  term: JobTerm;
  // Optional field to clarify project scope/duration if term is 'project'
  estimatedDuration?: string; 
} 