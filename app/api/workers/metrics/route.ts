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

export async function GET() {
  try {
    // First get all available workers
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id')
      .eq('worker_data->>availability', 'available');

    if (workersError) throw workersError;

    // Generate mock metrics for each worker
    const mockMetrics = workers.map(worker => {
      // Generate random but realistic-looking metrics
      const uptime = 95 + Math.random() * 5; // Between 95-100%
      const accuracy = 90 + Math.random() * 8; // Between 90-98%
      const tasksCompleted = Math.floor(50 + Math.random() * 200); // Between 50-250 tasks
      const avgCostPerTask = 5 + Math.random() * 10; // Between $5-15 per task
      
      return {
        workerId: worker.id,
        uptime: Number(uptime.toFixed(1)),
        accuracy: Number(accuracy.toFixed(1)),
        tasksCompleted,
        costToDate: Number((tasksCompleted * avgCostPerTask).toFixed(2))
      };
    });

    return NextResponse.json(mockMetrics);
  } catch (error) {
    console.error('Error fetching worker metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worker metrics' },
      { status: 500 }
    );
  }
} 