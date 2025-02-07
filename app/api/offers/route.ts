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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { worker_id, contact_info, message, proposed_rate } = body;

    const { data, error } = await supabase
      .from('offers')
      .insert([
        {
          worker_id,
          contact_info,
          message,
          proposed_rate,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json(
      { error: 'Failed to submit offer' },
      { status: 500 }
    );
  }
} 