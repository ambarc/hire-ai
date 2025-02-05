'use client'

import { Suspense } from 'react';
import WorkersContent from './WorkersContent';

export default function WorkersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WorkersContent />
    </Suspense>
  );
}