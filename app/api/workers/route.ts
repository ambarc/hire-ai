import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { WorkerData } from '@/app/types/workers';

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
    const { name, description, skills, certifications, hourlyRate, currency } = await request.json();

    // Validate input
    if (!name || !description || !hourlyRate || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Construct worker_data object
    const worker_data: WorkerData = {
      skills: skills ? skills.split(',').map((skill: string) => skill.trim()) : [],
      certifications: certifications ? certifications.split(',').map((cert: string) => cert.trim()) : [],
      hourly_rate: Number(hourlyRate),
      currency,
      availability: 'available'
    };

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

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error creating worker:', error);
    return NextResponse.json(
      { error: 'Error creating worker' },
      { status: 500 }
    );
  }
}