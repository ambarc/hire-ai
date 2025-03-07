import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import * as dotenv from 'dotenv';

// Load environment variables from .env
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env' });
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
          job_data: {
            poster_name: posterName,
            skills: skillsArray,
            certifications: certsArray,
            billing_type: billingType,
            rate,
            currency,
            term,
            estimated_duration: estimatedDuration
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

    // No need to transform the data since it already matches our type
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
} 