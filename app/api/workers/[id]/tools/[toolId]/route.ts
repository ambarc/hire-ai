import { NextResponse } from 'next/server';

export async function PATCH() {
  // Mock response for toggling tool access
  return NextResponse.json({ success: true });
} 