export interface Profile {
    name: string;
    birthDate?: string;
    gender?: string;
    phoneNumber?: string;
}

export interface Medication {
    name: string;
    dosage: string;
    frequency: string;
} 

export interface Allergy {
    name: string;
    severity: string;
    reaction: string;
}

export interface Insurance {
    name: string;
    planType: 'HMO' | 'PPO' | 'EPO' | 'POS' | 'HDHP';
    policyNumber: string;
    effectiveDate: string;
    groupNumber: string;
    memberId: string;
}