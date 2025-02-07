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

    // Transform the data to match our frontend types
    const workers = data.map(worker => ({
      id: worker.id,
      name: worker.name,
      description: worker.description,
      worker_data: {
        availability: worker.worker_data.availability,
        skills: worker.worker_data.skills,
        certifications: worker.worker_data.certifications,
        tagline: worker.worker_data.tagline,
        billing_type: worker.worker_data.billing_type,
        rate: worker.worker_data.rate,
        currency: worker.worker_data.currency
      }
    }));

    return NextResponse.json(workers)
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
    const {
      name,
      description,
      skills,
      certifications,
      hourlyRate,
      currency,
      billingType,
      tagline,
    } = await request.json();

    // Validate tagline length
    if (tagline && tagline.length > 100) {
      return NextResponse.json(
        { error: 'Tagline must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Convert comma-separated strings to arrays
    const skillsArray = skills ? skills.split(',').map((s: string) => s.trim()) : [];
    const certsArray = certifications ? certifications.split(',').map((c: string) => c.trim()) : [];

    const { data, error } = await supabase
      .from('workers')
      .insert([
        {
          name,
          description,
          worker_data: {
            skills: skillsArray,
            certifications: certsArray,
            hourly_rate: Number(hourlyRate),
            currency,
            billing_type: billingType || 'hourly',
            availability: 'available',
            tagline: tagline || null,
          }
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error creating worker:', error);
    return NextResponse.json(
      { error: 'Error creating worker' },
      { status: 500 }
    );
  }
}