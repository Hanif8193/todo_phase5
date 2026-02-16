'use client';

import { useEffect, useState } from 'react';
import { taskApi, Task } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Add-task form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const { user } = useAuth();

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = {};
      if (filter !== 'all') {
        filters.status = filter;
      }
      if (priorityFilter !== 'all') {
        filters.priority = priorityFilter;
      }

      const data = await taskApi.getTasks(filters);
      setTasks(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!user) return;

    try {
      setDeleting(taskId);
      await taskApi.deleteTask(user.id, taskId);
      await fetchTasks();
    } catch (err: any) {
      console.error('Failed to delete task:', err);
      setError(err.response?.data?.detail || 'Failed to delete task');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    if (!user) return;

    try {
      if (task.completed) {
        // Uncomplete the task
        await taskApi.updateTask(user.id, task.id, { completed: false });
      } else {
        // Complete the task
        await taskApi.completeTask(user.id, task.id);
      }
      await fetchTasks();
    } catch (err: any) {
      console.error('Failed to toggle task:', err);
      setError(err.response?.data?.detail || 'Failed to update task');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      await taskApi.createTask({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        priority: newPriority,
        due_date: newDueDate || undefined,
      });
      setNewTitle('');
      setNewDesc('');
      setNewPriority('medium');
      setNewDueDate('');
      setShowAddForm(false);
      await fetchTasks();
    } catch (err: any) {
      setAddError(err.response?.data?.detail || 'Failed to add task');
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filter, priorityFilter]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Your Tasks</h2>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Your Tasks</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchTasks}
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
        <h2 className="text-2xl font-bold text-gray-800">Your Tasks</h2>
        <div className="flex gap-3 items-center">
          <button
            onClick={fetchTasks}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Refresh
          </button>
          <button
            onClick={() => { setShowAddForm(v => !v); setAddError(null); }}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            {showAddForm ? 'Cancel' : '+ Add Task'}
          </button>
        </div>
      </div>

      {/* Inline Add Task Form */}
      {showAddForm && (
        <form onSubmit={handleAddTask} className="mb-5 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
          <h3 className="font-semibold text-gray-800">New Task</h3>
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Task title *"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Priority</label>
              <select
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Due Date (optional)</label>
              <input
                type="date"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800"
              />
            </div>
          </div>
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {adding ? 'Adding...' : 'Add Task'}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <div>
          <label className="text-sm text-gray-600 mr-2">Status:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-800"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-600 mr-2">Priority:</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-800"
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="text-gray-500 italic">
          No tasks yet. Add one using the chat below!
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`flex items-start gap-3 p-3 rounded-md transition group ${
                task.completed ? 'bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggleComplete(task)}
                className="mt-1 w-5 h-5 cursor-pointer"
              />

              {/* Priority indicator */}
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getPriorityColor(task.priority)}`} />

              {/* Task content */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className={`text-sm mt-1 ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                    {task.description}
                  </p>
                )}
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  <span className="capitalize">Priority: {task.priority}</span>
                  {task.due_date && (
                    <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(task.id)}
                disabled={deleting === task.id}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                title="Delete task"
              >
                {deleting === task.id ? 'Deleting...' : 'Delete'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
