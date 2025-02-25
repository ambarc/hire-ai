export interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    route: string;
} 

export interface Allergy {
    name: string;
    severity: string;
    reaction: string;
}

export interface Insurance {
    name: string;
    policyNumber: string;
    groupNumber: string;
    memberId: string;
}