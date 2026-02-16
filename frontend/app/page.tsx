'use client';

import { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import TodoList from '@/components/TodoList';
import RecurringTasksList from '@/components/RecurringTasksList';
import RecurringTaskForm from '@/components/RecurringTaskForm';
import AuthForm from '@/components/AuthForm';
import { useAuth } from '@/contexts/AuthContext';
import { RecurringRule } from '@/lib/api';

type Tab = 'tasks' | 'recurring' | 'chat';

export default function Home() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [refreshKey, setRefreshKey] = useState(0);
  const [recurringRefreshKey, setRecurringRefreshKey] = useState(0);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);

  const handleTaskCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleRecurringCreated = () => {
    setRecurringRefreshKey(prev => prev + 1);
    setShowRecurringForm(false);
    setEditingRule(null);
  };

  const handleEditRule = (rule: RecurringRule) => {
    setEditingRule(rule);
    setShowRecurringForm(true);
  };

  const handleCloseForm = () => {
    setShowRecurringForm(false);
    setEditingRule(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Todo App</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          {(['tasks', 'recurring', 'chat'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab === 'tasks' && 'Tasks'}
              {tab === 'recurring' && 'Recurring'}
              {tab === 'chat' && 'AI Chat'}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'tasks' && (
          <TodoList key={refreshKey} />
        )}

        {activeTab === 'recurring' && (
          <RecurringTasksList
            onCreateClick={() => setShowRecurringForm(true)}
            onEditClick={handleEditRule}
            refreshTrigger={recurringRefreshKey}
          />
        )}

        {activeTab === 'chat' && (
          <ChatInterface onTaskCreated={handleTaskCreated} />
        )}
      </div>

      {/* Recurring Task Form Modal */}
      {showRecurringForm && (
        <RecurringTaskForm
          onClose={handleCloseForm}
          onSuccess={handleRecurringCreated}
          editRule={editingRule}
        />
      )}
    </main>
  );
}
