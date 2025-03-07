import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import * as dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env' });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const skills = searchParams.get('skills')?.split(',') || [];

    let jobsQuery = supabase
      .from('jobs')
      .select('*');

    if (query) {
      jobsQuery = jobsQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    if (skills.length > 0) {
      jobsQuery = jobsQuery.contains('job_data->>skills', skills);
    }

    const { data, error } = await jobsQuery;

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search jobs' },
      { status: 500 }
    );
  }
} 