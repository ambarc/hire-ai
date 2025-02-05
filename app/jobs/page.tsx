'use client'

import { Suspense } from 'react';
import JobsContent from './JobsContent';

export default function JobsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </div>
    }>
      <JobsContent />
    </Suspense>
  );
}