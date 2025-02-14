'use client';

import { useState } from 'react';
import BillingHistory from './tabs/BillingHistory';
import AccessManagement from './tabs/AccessManagement';
import PerformanceMonitoring from './tabs/PerformanceMonitoring';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

const TABS = [
  { id: 'performance', label: 'Performance' },
  { id: 'billing', label: 'Billing History' },
  { id: 'access', label: 'Access Management' },
] as const;

export default function DetailTabs({ workerId }: { workerId: string }) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['id']>('performance');

  return (
    <div>
      {/* Back Navigation */}
      <div className="mb-6">
        <Link 
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to My Workers
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'performance' && <PerformanceMonitoring workerId={workerId} />}
        {activeTab === 'billing' && <BillingHistory workerId={workerId} />}
        {activeTab === 'access' && <AccessManagement workerId={workerId} />}
      </div>
    </div>
  );
} 