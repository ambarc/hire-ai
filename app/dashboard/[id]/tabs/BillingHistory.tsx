'use client';

import { useEffect, useState } from 'react';

interface Invoice {
  id: string;
  month: string;
  tasksCompleted: number;
  ratePerTask: number;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  dueDate: string;
}

export default function BillingHistory({ workerId }: { workerId: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBillingHistory = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/workers/${workerId}/billing`);
        const data = await res.json();
        setInvoices(data);
      } catch (error) {
        console.error('Error fetching billing history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillingHistory();
  }, [workerId]);

  if (isLoading) {
    return <div className="animate-pulse">Loading billing history...</div>;
  }

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalTasks = invoices.reduce((sum, inv) => sum + inv.tasksCompleted, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Total Billed (YTD)</h3>
          <p className="text-2xl font-semibold text-gray-900">${totalBilled.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Total Tasks Completed</h3>
          <p className="text-2xl font-semibold text-gray-900">{totalTasks}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Average Cost per Task</h3>
          <p className="text-2xl font-semibold text-gray-900">
            ${(totalBilled / totalTasks).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tasks
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {invoice.month}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {invoice.tasksCompleted.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${invoice.ratePerTask.toFixed(2)}/task
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${invoice.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {invoice.dueDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`
                    px-2 py-1 text-xs font-medium rounded-full
                    ${invoice.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                    ${invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${invoice.status === 'failed' ? 'bg-red-100 text-red-800' : ''}
                  `}>
                    {invoice.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 