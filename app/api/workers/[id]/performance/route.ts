import { NextResponse } from 'next/server';

export async function GET() {
  // Mock performance data for now
  return NextResponse.json({
    uptime: [99.8, 99.9, 99.7, 99.8, 99.9],
    accuracy: [98.5, 98.7, 98.4, 98.6, 98.8],
    taskCompletion: [145, 156, 142, 158, 162],
    timestamps: ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05']
  });
} 