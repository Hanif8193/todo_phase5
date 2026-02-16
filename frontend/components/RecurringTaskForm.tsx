'use client';

import { useState, useEffect } from 'react';
import { recurringApi, RecurringRule, RecurringRuleCreate } from '@/lib/api';

interface RecurringTaskFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editRule?: RecurringRule | null;
}

export default function RecurringTaskForm({ onClose, onSuccess, editRule }: RecurringTaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [interval, setInterval] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [nextDue, setNextDue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editRule) {
      const rec = editRule.recurrence_rule || {};
      const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      setTitle(editRule.title);
      setDescription(editRule.description || '');
      setFrequency(editRule.recurrence_type);
      setInterval(rec.interval || 1);
      if (rec.weekdays) {
        setWeekdays(rec.weekdays.map(d => dayNames.indexOf(d.toLowerCase())).filter(i => i >= 0));
      }
      setDayOfMonth(rec.month_day || 1);
      setNextDue(editRule.start_date || new Date().toISOString().split('T')[0]);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setNextDue(today);
    }
  }, [editRule]);

  const handleWeekdayToggle = (day: number) => {
    if (weekdays.includes(day)) {
      setWeekdays(weekdays.filter(d => d !== day));
    } else {
      setWeekdays([...weekdays, day].sort());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const recurrenceRule: RecurringRuleCreate['recurrence_rule'] = { interval };
      if (frequency === 'weekly' && weekdays.length > 0) {
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        recurrenceRule.weekdays = weekdays.map(d => dayNames[d]);
      }
      if (frequency === 'monthly') {
        recurrenceRule.month_day = dayOfMonth;
      }

      const data: RecurringRuleCreate = {
        title,
        description: description || undefined,
        recurrence_type: frequency,
        recurrence_rule: recurrenceRule,
        start_date: nextDue,
      };

      if (editRule) {
        await recurringApi.updateRule(editRule.id, {
          title: data.title,
          description: data.description,
          recurrence_type: data.recurrence_type,
          recurrence_rule: data.recurrence_rule,
        });
      } else {
        await recurringApi.createRule(data);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save recurring rule');
      console.error('Error saving recurring rule:', err);
    } finally {
      setLoading(false);
    }
  };

  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            {editRule ? 'Edit Recurring Rule' : 'Create Recurring Rule'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              placeholder="e.g., Water the plants"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              placeholder="Optional details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequency *
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repeat Every
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                min="1"
                max="365"
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
              <span className="text-gray-600">
                {frequency === 'daily' && (interval > 1 ? 'days' : 'day')}
                {frequency === 'weekly' && (interval > 1 ? 'weeks' : 'week')}
                {frequency === 'monthly' && (interval > 1 ? 'months' : 'month')}
              </span>
            </div>
          </div>

          {frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                On Days (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {weekdayNames.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleWeekdayToggle(index)}
                    className={`px-3 py-1 rounded-lg text-sm transition ${
                      weekdays.includes(index)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {frequency === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Day of Month
              </label>
              <input
                type="number"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                min="1"
                max="31"
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Next Due Date *
            </label>
            <input
              type="date"
              value={nextDue}
              onChange={(e) => setNextDue(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Saving...' : (editRule ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
