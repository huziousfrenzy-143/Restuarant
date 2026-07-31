import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/tasks.api';
import { usersApi } from '../../api/users.api';

export const TASKS_QUERY_KEY = (orgId: string) => ['tasks', orgId];
export const USERS_QUERY_KEY = (orgId: string) => ['users', orgId];

export function useTasksQuery(orgId: string) {
  return useQuery({
    queryKey: TASKS_QUERY_KEY(orgId),
    queryFn: () => tasksApi.getAll(orgId),
    enabled: Boolean(orgId)
  });
}

export function useUsersQuery(orgId: string) {
  return useQuery({
    queryKey: USERS_QUERY_KEY(orgId),
    queryFn: () => usersApi.getAll(orgId),
    enabled: Boolean(orgId)
  });
}

export function useAddTaskMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => tasksApi.create(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY(orgId) });
    }
  });
}

export function useUpdateTaskMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => tasksApi.update(orgId, id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY(orgId) });
    }
  });
}

export function useDeleteTaskMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(orgId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY(orgId) });
    }
  });
}

export function useToggleTaskStatusMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) =>
      tasksApi.updateStatus(orgId, id, currentStatus === 'done' ? 'todo' : 'done'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY(orgId) });
    }
  });
}

export function useAddUserMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => usersApi.create(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY(orgId) });
    }
  });
}

export function useUpdateUserMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => usersApi.update(orgId, id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY(orgId) });
    }
  });
}

export function useDeleteUserMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.delete(orgId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY(orgId) });
    }
  });
}
