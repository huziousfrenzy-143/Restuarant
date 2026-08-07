import { 
  useProductsQuery, 
  useCategoriesQuery, 
  useAddProductMutation, 
  useUpdateProductMutation, 
  useDeleteProductMutation, 
  useAddCategoryMutation, 
  useUpdateCategoryMutation, 
  useDeleteCategoryMutation 
} from './useProductsQuery';
import { useInventoryQuery } from '../inventory/useInventoryQuery';
import { useAppStore } from '../../store/useAppStore';

export const useProductsController = () => {
  const orgId = useAppStore(s => s.org.id);
  const runAction = useAppStore(s => s.runAction);

  const { data: products = [] } = useProductsQuery(orgId);
  const { data: categories = [] } = useCategoriesQuery(orgId);
  const { data: inventory = [] } = useInventoryQuery(orgId);
  
  const addProductMut = useAddProductMutation(orgId);
  const updateProductMut = useUpdateProductMutation(orgId);
  const deleteProductMut = useDeleteProductMutation(orgId);
  const addCategoryMut = useAddCategoryMutation(orgId);
  const updateCategoryMut = useUpdateCategoryMutation(orgId);
  const deleteCategoryMut = useDeleteCategoryMutation(orgId);

  return {
    products,
    categories,
    inventory,
    onAddProduct: (input: any) => runAction('Saving Product...', () => addProductMut.mutateAsync(input)),
    onUpdateProduct: (id: string, updates: any) => runAction('Updating Product...', () => updateProductMut.mutateAsync({ id, updates })),
    onDeleteProduct: (id: string) => runAction('Deleting Product...', () => deleteProductMut.mutateAsync(id)),
    onAddCategory: (input: any) => runAction('Saving Category...', () => addCategoryMut.mutateAsync(input)),
    onUpdateCategory: (id: string, updates: any) => runAction('Updating Category...', () => updateCategoryMut.mutateAsync({ id, updates })),
    onDeleteCategory: (id: string) => runAction('Deleting Category...', () => deleteCategoryMut.mutateAsync(id))
  };
};
