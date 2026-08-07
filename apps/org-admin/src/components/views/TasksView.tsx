import React, { useState } from 'react';
import { Task, User, UserRole } from '@restaurant-saas/shared-schemas';
import { CheckSquare, Clock, User as UserIcon, CheckCircle2, Circle, AlertCircle, Plus, UserPlus, X, Shield, Key, Edit2, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { TasksViewProps } from './TasksView.types';

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  users,
  onToggleTaskStatus,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  currentUserRole = 'owner'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'tasks'>('employees');
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Deletion Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'employee' | 'task'; id: string; name: string } | null>(null);

  // Employee Form State
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empRole, setEmpRole] = useState<UserRole>('salesman');
  const [empPassword, setEmpPassword] = useState('password123');

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [assignedUserId, setAssignedUserId] = useState(users[0]?.id || '');

  const handleEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empEmail) return;

    const payload = {
      name: empName,
      email: empEmail,
      phone: empPhone,
      role: empRole,
      password: empPassword
    };

    if (editingEmployee) {
      onUpdateEmployee(editingEmployee.id, payload);
      setEditingEmployee(null);
    } else {
      onAddEmployee(payload);
    }

    setEmpName('');
    setEmpEmail('');
    setEmpPhone('');
    setIsEmployeeModalOpen(false);
  };

  const openEditEmployee = (emp: User) => {
    setEditingEmployee(emp);
    setEmpName(emp.name);
    setEmpEmail(emp.email);
    setEmpPhone(emp.phone || '');
    setEmpRole(emp.role);
    setIsEmployeeModalOpen(true);
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !assignedUserId) return;

    const assignedUser = users.find(u => u.id === assignedUserId);
    const payload = {
      title: taskTitle,
      description: taskDesc,
      assigned_to_id: assignedUserId,
      assigned_to_name: assignedUser ? assignedUser.name : 'Staff Member',
      due_at: editingTask ? editingTask.due_at : new Date(Date.now() + 4 * 3600000).toISOString()
    };

    if (editingTask) {
      onUpdateTask(editingTask.id, payload);
      setEditingTask(null);
    } else {
      onAddTask(payload);
    }

    setTaskTitle('');
    setTaskDesc('');
    setIsTaskModalOpen(false);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || '');
    setAssignedUserId(task.assigned_to_id);
    setIsTaskModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'employee') {
      onDeleteEmployee(deleteConfirm.id);
    } else {
      onDeleteTask(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

  return (
    <div className="p-6 space-y-6 flex-1 overflow-y-auto font-sans">
      {/* Top Header & Sub-tab navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Staff Employees & Operational Tasks</h2>
          <p className="text-xs text-graphite font-mono">Full CRUD management of staff accounts, roles, assignments, and duties</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1 bg-steel rounded-md border border-mist flex font-mono text-xs">
            <button
              onClick={() => setActiveSubTab('employees')}
              className={`px-3 py-1.5 rounded transition-all font-semibold ${
                activeSubTab === 'employees' ? 'bg-surface shadow text-primary font-bold' : 'text-graphite'
              }`}
            >
              Employees ({users.length})
            </button>
            <button
              onClick={() => setActiveSubTab('tasks')}
              className={`px-3 py-1.5 rounded transition-all font-semibold ${
                activeSubTab === 'tasks' ? 'bg-surface shadow text-primary font-bold' : 'text-graphite'
              }`}
            >
              Tasks ({tasks.length})
            </button>
          </div>

          {isOwnerOrAdmin && activeSubTab === 'employees' && (
            <button
              onClick={() => { setEditingEmployee(null); setEmpName(''); setEmpEmail(''); setEmpPhone(''); setIsEmployeeModalOpen(true); }}
              className="px-4 py-2 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all flex items-center gap-2 shadow-sm font-mono"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Employee Account</span>
            </button>
          )}

          {activeSubTab === 'tasks' && (
            <button
              onClick={() => { setEditingTask(null); setTaskTitle(''); setTaskDesc(''); setIsTaskModalOpen(true); }}
              className="px-4 py-2 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all flex items-center gap-2 shadow-sm font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Assign New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab 1: Registered Employees Grid */}
      {activeSubTab === 'employees' && (
        <div className="space-y-4">
          <div className="border border-mist rounded-md bg-surface shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-steel border-b border-mist text-graphite uppercase font-mono font-semibold">
                <tr>
                  <th className="p-3">Staff Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Role & Permissions</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-steel/40 transition-colors">
                    <td className="p-3 font-bold text-ink flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="p-3 font-mono text-graphite">{u.email}</td>
                    <td className="p-3 font-mono text-graphite">{u.phone || '—'}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold capitalize ${
                        u.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'admin' ? 'bg-indigo-100 text-indigo-800' :
                        u.role === 'chef' ? 'bg-amber-100 text-amber-800' :
                        u.role === 'salesman' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {u.role === 'salesman' ? 'Salesman / Cashier' : u.role}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Active
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEditEmployee(u)} className="p-1 text-graphite hover:text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteConfirm({ type: 'employee', id: u.id, name: u.name })} className="p-1 text-graphite hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Duty Tasks List */}
      {activeSubTab === 'tasks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map(task => (
            <div key={task.id} className="p-4 rounded-md border border-mist bg-surface shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  task.status === 'done' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {task.status}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditTask(task)} className="p-1 text-graphite hover:text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteConfirm({ type: 'task', id: task.id, name: task.title })} className="p-1 text-graphite hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-sm text-ink">{task.title}</h3>
                <p className="text-xs text-graphite mt-1">{task.description}</p>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-mist font-mono text-xs">
                <span className="text-graphite font-medium">Assigned: <strong className="text-ink">{task.assigned_to_name}</strong></span>
                <button
                  onClick={() => onToggleTaskStatus(task.id, task.status)}
                  className={`px-3 py-1 rounded text-xs font-bold font-sans transition-colors ${
                    task.status === 'done'
                      ? 'bg-steel text-graphite hover:bg-mist'
                      : 'bg-primary text-white hover:bg-primary-hover'
                  }`}
                >
                  {task.status === 'done' ? 'Reopen Task' : 'Mark Completed'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Create / Edit Employee */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleEmployeeSubmit} className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-mist pb-3">
              <h3 className="font-bold text-sm text-ink font-mono flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <span>{editingEmployee ? 'Edit Staff Employee Account' : 'Create Staff Employee Account'}</span>
              </h3>
              <button type="button" onClick={() => setIsEmployeeModalOpen(false)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-graphite block mb-1">Employee Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Cashier"
                  value={empName}
                  onChange={e => setEmpName(e.target.value)}
                  className="w-full p-2 rounded border border-mist bg-surface text-ink font-semibold"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Email Address (Login ID)</label>
                <input
                  type="email"
                  required
                  placeholder="john.cashier@saffrongrill.com"
                  value={empEmail}
                  onChange={e => setEmpEmail(e.target.value)}
                  className="w-full p-2 rounded border border-mist bg-surface"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={empPhone}
                  onChange={e => setEmpPhone(e.target.value)}
                  className="w-full p-2 rounded border border-mist bg-surface"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Role & Permission Tier</label>
                <select
                  value={empRole}
                  onChange={e => setEmpRole(e.target.value as any)}
                  className="w-full p-2 rounded border border-mist bg-surface font-bold text-primary"
                >
                  <option value="salesman">Salesman / Cashier (POS & Orders Only)</option>
                  <option value="chef">Head Chef (Kitchen KDS & Tasks Only)</option>
                  <option value="delivery_boy">Delivery Driver (Orders Rail Only)</option>
                  <option value="admin">Restaurant Admin (Full Control)</option>
                  <option value="owner">Restaurant Owner (Full Control)</option>
                </select>
              </div>

              {!editingEmployee && (
                <div>
                  <label className="text-graphite block mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={empPassword}
                    onChange={e => setEmpPassword(e.target.value)}
                    className="w-full p-2 rounded border border-mist bg-surface font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-mist">
              <button
                type="button"
                onClick={() => setIsEmployeeModalOpen(false)}
                className="flex-1 py-2 rounded border border-mist text-xs font-semibold text-graphite hover:bg-steel font-sans"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover font-mono shadow-sm"
              >
                {editingEmployee ? 'Save Changes' : 'Create Staff Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Create / Edit Task */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleTaskSubmit} className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-mist pb-3">
              <h3 className="font-bold text-sm text-ink font-mono flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                <span>{editingTask ? 'Edit Task' : 'Assign Operational Task'}</span>
              </h3>
              <button type="button" onClick={() => setIsTaskModalOpen(false)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-graphite block mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sanitize prep counter"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className="w-full p-2 rounded border border-mist bg-surface font-bold text-ink"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Description / Instructions</label>
                <input
                  type="text"
                  placeholder="Details for staff member"
                  value={taskDesc}
                  onChange={e => setTaskDesc(e.target.value)}
                  className="w-full p-2 rounded border border-mist bg-surface"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Assign to Staff Member</label>
                <select
                  value={assignedUserId}
                  onChange={e => setAssignedUserId(e.target.value)}
                  className="w-full p-2 rounded border border-mist bg-surface font-semibold"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-mist font-mono">
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="flex-1 py-2 rounded border border-mist text-xs font-semibold text-graphite hover:bg-steel font-sans"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm"
              >
                {editingTask ? 'Save Task' : 'Assign Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Standard Shadcn Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirm)}
        title={deleteConfirm?.type === 'employee' ? 'Delete Staff Employee Account' : 'Delete Task'}
        message={`Are you sure you want to permanently delete '${deleteConfirm?.name}'?`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};
