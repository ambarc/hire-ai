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

    // Simplify the search to just name and description first
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .or(`name.ilike.%${query}%, description.ilike.%${query}%`);

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Transform the data to match our frontend types
    const workers = data.map(worker => ({
      id: worker.id,
      name: worker.name,
      description: worker.description,
      billingType: worker.worker_data.billing_type,
      rate: worker.worker_data.hourly_rate,
      currency: worker.worker_data.currency,
      skills: worker.worker_data.skills,
      certifications: worker.worker_data.certifications,
      worker_data: {
        skills: worker.worker_data.skills,
        certifications: worker.worker_data.certifications,
        hourly_rate: worker.worker_data.hourly_rate,
        currency: worker.worker_data.currency,
        billing_type: worker.worker_data.billing_type,
        availability: worker.worker_data.availability
      }
    }));

    return NextResponse.json(workers);

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search workers' },
      { status: 500 }
    );
  }
} 