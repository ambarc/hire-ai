import { NextResponse } from 'next/server';

export async function GET() {
  // Mock tools data
  return NextResponse.json([
    {
      id: '1',
      name: 'API Access',
      description: 'Access to external APIs',
      hasAccess: true,
      category: 'api'
    },
    {
      id: '2',
      name: 'Database Access',
      description: 'Access to databases',
      hasAccess: false,
      category: 'database'
    }
  ]);
} 