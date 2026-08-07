import { Task, User, UserRole } from '@restaurant-saas/shared-schemas';

export interface TasksViewProps {
  tasks: Task[];
  users: User[];
  onToggleTaskStatus: (taskId: string, currentStatus: string) => void;
  onAddEmployee: (newEmp: any) => void;
  onUpdateEmployee: (id: string, updates: any) => void;
  onDeleteEmployee: (id: string) => void;
  onAddTask: (newTask: any) => void;
  onUpdateTask: (id: string, updates: any) => void;
  onDeleteTask: (id: string) => void;
  currentUserRole?: UserRole;
}
