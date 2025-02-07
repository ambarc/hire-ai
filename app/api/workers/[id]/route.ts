import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url);
    const workerId = pathname.split('/').pop();
    
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .single();

    if (error) throw error;

    // Transform the data to match our frontend types
    const worker = {
      id: data.id,
      name: data.name,
      description: data.description,
      worker_data: {
        availability: data.worker_data.availability,
        skills: data.worker_data.skills,
        certifications: data.worker_data.certifications,
        tagline: data.worker_data.tagline,
        billing_type: data.worker_data.billing_type,
        rate: data.worker_data.rate,
        currency: data.worker_data.currency
      }
    };
    
    return NextResponse.json(worker);
  } catch (error) {
    console.error('Error fetching worker:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worker' },
      { status: 500 }
    );
  }
} 