'use client'

import { Suspense } from 'react';
import WorkersContent from './WorkersContent';
import Navigation from '../components/Navigation';

export default function WorkersPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-gray-600">Loading...</div>
        </div>
      }>
        <WorkersContent />
      </Suspense>
    </div>
  );
}