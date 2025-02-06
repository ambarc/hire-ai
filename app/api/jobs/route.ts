import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import * as dotenv from 'dotenv';
import { BillingType } from '@/app/types/billing';

// Load environment variables from .env.local
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const {
      title,
      description,
      posterName,
      skills,
      certifications,
      billingType,
      rate,
      currency,
      term,
      estimatedDuration,
    } = await request.json();

    // Convert comma-separated strings to arrays
    const skillsArray = skills ? skills.split(',').map((s: string) => s.trim()) : [];
    const certsArray = certifications ? certifications.split(',').map((c: string) => c.trim()) : [];

    const { data, error } = await supabase
      .from('jobs')
      .insert([
        {
          title,
          description,
          billing_type: billingType,
          rate,
          currency,
          term,
          estimated_duration: estimatedDuration,
          job_data: {
            poster_name: posterName,
            skills: skillsArray,
            certifications: certsArray,
          }
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Error creating job' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform the data to match our frontend types
    const jobs = data.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      posterName: job.job_data.poster_name,
      skills: job.job_data.skills || [],
      certifications: job.job_data.certifications || [],
      billingType: job.billing_type as BillingType,
      rate: job.rate,
      currency: job.currency,
      term: job.term,
      estimatedDuration: job.estimated_duration
    }));

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
} 