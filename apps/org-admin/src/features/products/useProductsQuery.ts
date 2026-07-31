import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../../api/products.api';
import { categoriesApi } from '../../api/categories.api';

export const PRODUCTS_QUERY_KEY = (orgId: string) => ['products', orgId];
export const CATEGORIES_QUERY_KEY = (orgId: string) => ['categories', orgId];

export function useProductsQuery(orgId: string) {
  return useQuery({
    queryKey: PRODUCTS_QUERY_KEY(orgId),
    queryFn: () => productsApi.getAll(orgId),
    enabled: Boolean(orgId)
  });
}

export function useCategoriesQuery(orgId: string) {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY(orgId),
    queryFn: () => categoriesApi.getAll(orgId),
    enabled: Boolean(orgId)
  });
}

export function useAddProductMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => productsApi.create(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY(orgId) });
    }
  });
}

export function useUpdateProductMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => productsApi.update(orgId, id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY(orgId) });
    }
  });
}

export function useDeleteProductMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.delete(orgId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY(orgId) });
    }
  });
}

export function useAddCategoryMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => categoriesApi.create(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY(orgId) });
    }
  });
}

export function useUpdateCategoryMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => categoriesApi.update(orgId, id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY(orgId) });
    }
  });
}

export function useDeleteCategoryMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.delete(orgId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY(orgId) });
    }
  });
}
