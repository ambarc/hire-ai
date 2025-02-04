import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { JobData } from '@/app/types/jobs';
import * as dotenv from 'dotenv';

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
    const { title, description, skills, posterName, rewardType, rewardAmount, currency, estimatedTasks } = await request.json();

    // Validate input
    if (!title || !description || !posterName || !rewardType || !rewardAmount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Construct job_data object
    const job_data: JobData = {
      skills: skills ? skills.split(',').map((skill: string) => skill.trim()) : [],
      poster_display_name: posterName,
      bounty: {
        type: 'bounty',
        reward: rewardType === 'per_task' 
          ? {
              type: 'per_task',
              amount_per_task: Number(rewardAmount),
              currency,
              estimated_tasks: Number(estimatedTasks)
            }
          : {
              type: 'fixed',
              total_amount: Number(rewardAmount),
              currency
            }
      }
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('jobs')
      .insert([
        {
          title,
          description,
          job_data
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json({ data });
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
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
} 