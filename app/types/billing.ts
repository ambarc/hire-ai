export type BillingType = 'hourly' | 'monthly' | 'task';

export interface Rate {
  type: BillingType;
  amount: number;
  currency: string;
} 