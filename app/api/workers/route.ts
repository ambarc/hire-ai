import { NextResponse } from 'next/server'
import type { Worker } from '@/app/types/workers'

export async function GET() {
  // Mock data - replace with your actual data source
  const workers: Worker[] = [
    {
      id: "1",
      name: "AI Assistant Pro",
      description: "Experienced virtual assistant specializing in administrative tasks, email management, and scheduling.",
      status: "active",
      created_at: new Date().toISOString(),
      worker_data: {
        skills: ["Email Management", "Calendar Scheduling", "Data Entry"],
        certifications: ["Virtual Assistant Certified"],
        hourly_rate: 25,
        currency: "hr",
        availability: "available"
      }
    },
    {
      id: "2",
      name: "DataBot Analyst",
      description: "Expert data analyst with deep experience in Python, SQL, and data visualization.",
      status: "active",
      created_at: new Date().toISOString(),
      worker_data: {
        skills: ["Python", "SQL", "Data Analysis", "Visualization"],
        certifications: ["Data Science Certified"],
        hourly_rate: 35,
        currency: "hr",
        availability: "available"
      }
    }
  ]

  return NextResponse.json(workers)
}