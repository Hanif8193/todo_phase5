'use client';

import { useEffect, useState } from 'react';
import { recurringApi, RecurringRule } from '@/lib/api';

interface RecurringTasksListProps {
  onCreateClick: () => void;
  onEditClick: (rule: RecurringRule) => void;
  refreshTrigger?: number;
}

export default function RecurringTasksList({
  onCreateClick,
  onEditClick,
  refreshTrigger = 0
}: RecurringTasksListProps) {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [generating, setGenerating] = useState<number | null>(null);

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await recurringApi.getRules(true);
      setRules(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch recurring rules');
      console.error('Error fetching recurring rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this recurring rule?')) return;

    try {
      setDeleting(ruleId);
      await recurringApi.deleteRule(ruleId);
      await fetchRules();
    } catch (err: any) {
      console.error('Failed to delete rule:', err);
      setError(err.response?.data?.detail || 'Failed to delete rule');
    } finally {
      setDeleting(null);
    }
  };

  const handleGenerate = async (ruleId: number) => {
    try {
      setGenerating(ruleId);
      await recurringApi.generateTask(ruleId);
      await fetchRules();
      alert('Task generated successfully!');
    } catch (err: any) {
      console.error('Failed to generate task:', err);
      setError(err.response?.data?.detail || 'Failed to generate task');
    } finally {
      setGenerating(null);
    }
  };

  const getFrequencyText = (rule: RecurringRule) => {
    const rec = rule.recurrence_rule || {};
    const n = rec.interval || 1;
    const interval = n > 1 ? `Every ${n} ` : '';

    if (rule.recurrence_type === 'daily') {
      return `${interval}${n > 1 ? 'days' : 'Daily'}`;
    } else if (rule.recurrence_type === 'weekly') {
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const weekdayMap: Record<string, string> = {
        monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
        friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
      };
      const days = rec.weekdays
        ? rec.weekdays.map(d => weekdayMap[d.toLowerCase()] || d).join(', ')
        : '';
      return `${interval}${n > 1 ? 'weeks' : 'Weekly'}${days ? ` (${days})` : ''}`;
    } else if (rule.recurrence_type === 'monthly') {
      const dayText = rec.month_day ? ` on day ${rec.month_day}` : '';
      return `${interval}${n > 1 ? 'months' : 'Monthly'}${dayText}`;
    }
    return rule.recurrence_type;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  useEffect(() => {
    fetchRules();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Recurring Tasks</h2>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Recurring Tasks</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchRules}
            className="mt-2 text-sm text-red-700 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Recurring Tasks</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchRules}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Refresh
          </button>
          <button
            onClick={onCreateClick}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition text-sm"
          >
            + Create Rule
          </button>
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="text-gray-500 italic">
          No recurring tasks yet. Click "Create Rule" to add one!
        </p>
      ) : (
        <ul className="space-y-3">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-start gap-3 p-4 bg-blue-50 rounded-md hover:bg-blue-100 transition group"
            >
              {/* Rule content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-800">{rule.title}</h3>
                {rule.description && (
                  <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                )}
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span className="capitalize">🔄 {getFrequencyText(rule)}</span>
                  {rule.start_date && (
                    <span>📅 Start: {new Date(rule.start_date).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => handleGenerate(rule.id)}
                  disabled={generating === rule.id}
                  className="px-3 py-1 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition disabled:opacity-50"
                  title="Generate task now"
                >
                  {generating === rule.id ? 'Generating...' : 'Generate'}
                </button>
                <button
                  onClick={() => onEditClick(rule)}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                  title="Edit rule"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  disabled={deleting === rule.id}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition disabled:opacity-50"
                  title="Delete rule"
                >
                  {deleting === rule.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
