import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      id: '1',
      month: '2024-01',
      tasksCompleted: 150,
      ratePerTask: 0.10,
      amount: 15.00,
      status: 'completed',
      dueDate: '2024-02-01'
    }
  ]);
} 