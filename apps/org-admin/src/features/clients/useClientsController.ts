import { 
  useClientsQuery, 
  useAddClientMutation, 
  useUpdateClientMutation, 
  useDeleteClientMutation,
  usePayCreditMutation
} from './useClientsQuery';
import { useAppStore } from '../../store/useAppStore';

export const useClientsController = () => {
  const orgId = useAppStore(s => s.org.id);
  const runAction = useAppStore(s => s.runAction);

  const { data: clients = [], refetch } = useClientsQuery(orgId);
  
  const addClientMut = useAddClientMutation(orgId);
  const updateClientMut = useUpdateClientMutation(orgId);
  const deleteClientMut = useDeleteClientMutation(orgId);
  const payCreditMut = usePayCreditMutation(orgId);

  return {
    clients,
    onAddClient: (input: any) => runAction('Saving Customer Profile...', () => addClientMut.mutateAsync(input)),
    onUpdateClient: (id: string, updates: any) => runAction('Updating Customer Profile...', () => updateClientMut.mutateAsync({ id, updates })),
    onDeleteClient: (id: string) => runAction('Deleting Customer Profile...', () => deleteClientMut.mutateAsync(id)),
    onPayCreditBalance: async (id: string, amount: number, paymentMethod: string) => {
      await runAction('Processing Credit Payment...', () => payCreditMut.mutateAsync({ clientId: id, amount, paymentMethod }));
    },
    onRefreshData: () => {
      runAction('Refreshing Data...', async () => {
        await refetch();
      });
    }
  };
};
