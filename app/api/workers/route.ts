import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching workers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workers' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('1. Received request body:', body);

    const { name, description, skills, certifications, hourlyRate, currency } = body;
    console.log('2. Destructured values:', { name, description, skills, certifications, hourlyRate, currency });

    // Validate input with more detailed errors
    if (!name || !description || !hourlyRate || !currency) {
      const missingFields = [];
      if (!name) missingFields.push('name');
      if (!description) missingFields.push('description');
      if (!hourlyRate) missingFields.push('hourlyRate');
      if (!currency) missingFields.push('currency');
      
      console.error('3. Validation failed - Missing fields:', missingFields);
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Construct worker_data object
    const worker_data = {
      skills: skills ? skills.split(',').map((skill: string) => skill.trim()) : [],
      certifications: certifications ? certifications.split(',').map((cert: string) => cert.trim()) : [],
      hourly_rate: Number(hourlyRate),
      currency,
      availability: 'available'
    };
    console.log('4. Constructed worker_data:', worker_data);

    // Log Supabase connection details (safely)
    console.log('5. Supabase URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('5. Supabase key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Log the insert operation
    console.log('6. Attempting to insert:', {
      name,
      description,
      status: 'active',
      worker_data
    });

    const { data, error } = await supabase
      .from('workers')
      .insert([
        {
          name,
          description,
          status: 'active',
          worker_data
        },
      ])
      .select();

    if (error) {
      console.error('7. Supabase error:', error);
      throw error;
    }

    console.log('8. Successfully inserted data:', data);
    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error('9. Detailed error:', {
      message: (error as Error).message,
      details: (error as { details?: string })?.details,
      hint: (error as { hint?: string })?.hint,
      code: (error as { code?: string })?.code
    });
    return NextResponse.json(
      { error: `Error creating worker: ${(error as Error).message || String(error)}` },
      { status: 500 }
    );
  }
}