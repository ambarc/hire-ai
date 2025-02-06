import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import * as dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    console.log('Search query:', query);

    if (!query) {
      return NextResponse.json([]);
    }

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .or(`title.ilike.%${query}%, description.ilike.%${query}%, job_data->>'skills'.ilike.%${query}%`);

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    const jobs = data.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      posterName: job.job_data.poster_name,
      skills: job.job_data.skills || [],
      certifications: job.job_data.certifications || [],
      billingType: job.job_data.billing_type,
      rate: job.job_data.rate,
      currency: job.job_data.currency,
      term: job.job_data.term,
      estimatedDuration: job.job_data.estimated_duration
    }));

    return NextResponse.json(jobs);

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search jobs' },
      { status: 500 }
    );
  }
} 