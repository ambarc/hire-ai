'use client';

import { useParams } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
import DetailTabs from './DetailTabs';

export default function WorkerDetailPage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <DetailTabs workerId={id as string} />
      </div>
    </div>
  );
} 