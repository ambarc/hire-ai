'use client'

import { Suspense } from 'react';
import DashboardContent from '@/app/dashboard/DashboardContent';
import Navigation from '../components/Navigation';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-gray-600">Loading...</div>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </div>
  );
} 