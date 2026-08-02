import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { LoginView } from './components/views/LoginView';
import { useAppStore } from './store/useAppStore';

import { OwnerOverview } from './components/views/OwnerOverview';
import { POSView } from './components/views/POSView';
import { KDSView } from './components/views/KDSView';
import { OrdersView } from './components/views/OrdersView';
import { InventoryView } from './components/views/InventoryView';
import { SalesView } from './components/views/SalesView';
import { LedgerView } from './components/views/LedgerView';
import { ProductsView } from './components/views/ProductsView';
import { ClientsView } from './features/clients/ClientsView';
import { TasksView } from './components/views/TasksView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';

import { Loader2 } from 'lucide-react';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { API_BASE_URL } from './config/api';

import {
  useClientsQuery,
  useAddClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
  usePayCreditMutation
} from './features/clients/useClientsQuery';

import {
  useProductsQuery,
  useCategoriesQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation
} from './features/products/useProductsQuery';

import {
  useInventoryQuery,
  useAddInventoryMutation,
  useUpdateInventoryMutation,
  useDeleteInventoryMutation
} from './features/inventory/useInventoryQuery';

import {
  useOrdersQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
  useUpdateOrderItemsMutation
} from './features/orders/useOrdersQuery';

import {
  useSalesQuery,
  useCreateSaleMutation
} from './features/sales/useSalesQuery';

import {
  useTasksQuery,
  useUsersQuery,
  useAddTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useToggleTaskStatusMutation,
  useAddUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation
} from './features/tasks/useTasksQuery';

import {
  usePaymentMethodsQuery,
  useAddPaymentMethodMutation,
  useUpdatePaymentMethodMutation,
  useDeletePaymentMethodMutation,
  useUpdateSettingsMutation
} from './features/settings/useSettingsQuery';

import {
  useLedgerAccountsQuery,
  useLedgerEntriesQuery,
  useAddAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  useAddEntryMutation
} from './features/ledger/useLedgerQuery';

export function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Zustand Store Selectors for Local Session State
  const {
    isAuthenticated,
    currentUser,
    org,
    userOrgs,
    activeTab,
    isLineMode,
    isActionLoading,
    actionMessage,
    setIsAuthenticated,
    setCurrentUser,
    setOrg,
    setUserOrgs,
    setActiveTab,
    setIsLineMode,
    runAction,
    logout
  } = useAppStore();

  const orgId = org?.id || 'org-1';

  // TanStack Query Server States & Mutations per Feature
  const { data: clients = [], refetch: refetchClients } = useClientsQuery(orgId);
  const { data: products = [] } = useProductsQuery(orgId);
  const { data: categories = [] } = useCategoriesQuery(orgId);
  const { data: inventory = [] } = useInventoryQuery(orgId);
  const { data: orders = [] } = useOrdersQuery(orgId);
  const { data: sales = [], refetch: refetchSales } = useSalesQuery(orgId);
  const { data: users = [] } = useUsersQuery(orgId);
  const { data: tasks = [] } = useTasksQuery(orgId);
  const { data: paymentMethods = [] } = usePaymentMethodsQuery(orgId);
  const { data: accounts = [] } = useLedgerAccountsQuery(orgId);
  const { data: entries = [] } = useLedgerEntriesQuery(orgId);

  // TanStack Mutations
  const addClientMut = useAddClientMutation(orgId);
  const updateClientMut = useUpdateClientMutation(orgId);
  const deleteClientMut = useDeleteClientMutation(orgId);
  const payCreditMut = usePayCreditMutation(orgId);

  const addProductMut = useAddProductMutation(orgId);
  const updateProductMut = useUpdateProductMutation(orgId);
  const deleteProductMut = useDeleteProductMutation(orgId);
  const addCategoryMut = useAddCategoryMutation(orgId);
  const updateCategoryMut = useUpdateCategoryMutation(orgId);
  const deleteCategoryMut = useDeleteCategoryMutation(orgId);

  const addInventoryMut = useAddInventoryMutation(orgId);
  const updateInventoryMut = useUpdateInventoryMutation(orgId);
  const deleteInventoryMut = useDeleteInventoryMutation(orgId);

  const createOrderMut = useCreateOrderMutation(orgId);
  const updateOrderStatusMut = useUpdateOrderStatusMutation(orgId);
  const updateOrderItemsMut = useUpdateOrderItemsMutation(orgId);
  const createSaleMut = useCreateSaleMutation(orgId);

  const addTaskMut = useAddTaskMutation(orgId);
  const updateTaskMut = useUpdateTaskMutation(orgId);
  const deleteTaskMut = useDeleteTaskMutation(orgId);
  const toggleTaskMut = useToggleTaskStatusMutation(orgId);

  const addUserMut = useAddUserMutation(orgId);
  const updateUserMut = useUpdateUserMutation(orgId);
  const deleteUserMut = useDeleteUserMutation(orgId);

  const addPaymentMethodMut = useAddPaymentMethodMutation(orgId);
  const updatePaymentMethodMut = useUpdatePaymentMethodMutation(orgId);
  const deletePaymentMethodMut = useDeletePaymentMethodMutation(orgId);
  const updateSettingsMut = useUpdateSettingsMutation(orgId);

  const addAccountMut = useAddAccountMutation(orgId);
  const updateAccountMut = useUpdateAccountMutation(orgId);
  const deleteAccountMut = useDeleteAccountMutation(orgId);
  const addEntryMut = useAddEntryMutation(orgId);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    if (user.org) setOrg(user.org);
    if (user.userOrgs && Array.isArray(user.userOrgs)) {
      setUserOrgs(user.userOrgs);
    } else if (user.org) {
      setUserOrgs([user.org]);
    }

    if (user.role === 'salesman') {
      setActiveTab('pos');
      setIsLineMode(false);
    } else if (user.role === 'chef') {
      setActiveTab('kds');
      setIsLineMode(true);
    } else if (user.role === 'delivery_boy') {
      setActiveTab('orders');
      setIsLineMode(false);
    } else {
      setActiveTab('dashboard');
      setIsLineMode(false);
    }

    setIsAuthenticated(true);
  };

  const handleSwitchOrg = async (targetOrgId: string) => {
    await runAction('Switching Organization...', async () => {
      const token = localStorage.getItem('org_admin_token');
      const res = await fetch(`${API_BASE_URL}/auth/switch-org`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ targetOrgId })
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error?.message || 'Failed to switch organization context');
        return;
      }

      if (json.data) {
        const { accessToken, refreshToken, user, userOrgs: newOrgs } = json.data;
        if (accessToken) localStorage.setItem('org_admin_token', accessToken);
        if (refreshToken) localStorage.setItem('org_admin_refresh_token', refreshToken);
        if (user) {
          localStorage.setItem('org_admin_user', JSON.stringify(user));
          setCurrentUser(user);
          if (user.org) setOrg(user.org);
        }
        if (newOrgs) setUserOrgs(newOrgs);
      }
    });
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    const token = localStorage.getItem('org_admin_token');
    const res = await fetch(`${API_BASE_URL.replace('/v1', '')}/v1/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, message: json.error?.message || 'Password update failed' };
    }
    return { success: true, message: json.message };
  };

  const handleCompletePosOrder = async (newOrderData: any, paymentMethod: string, amountPaid: number) => {
    await runAction('Processing POS Order...', async () => {
      const newOrder = await createOrderMut.mutateAsync(newOrderData);
      if (newOrder) {
        await createSaleMut.mutateAsync({
          order_id: newOrder.id,
          payment_method: paymentMethod,
          amount_paid: amountPaid,
          amount_due: 0
        });

        if (paymentMethod === 'borrow_credit' && newOrderData.client_id) {
          const targetClient = clients.find(c => c.id === newOrderData.client_id);
          if (targetClient) {
            const updatedBalance = Number(targetClient.credit_balance || 0) + Number(amountPaid);
            await updateClientMut.mutateAsync({ id: targetClient.id, updates: { credit_balance: updatedBalance } });
          }
        }
      }
    });
  };

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <OwnerOverview
            orders={orders}
            inventory={inventory}
            onSelectTab={setActiveTab}
            isLineMode={isLineMode}
          />
        );
      case 'pos':
        return (
          <POSView
            products={products}
            categories={categories}
            clients={clients}
            paymentMethods={paymentMethods}
            onCompleteOrder={handleCompletePosOrder}
            taxRate={Number(org.tax_rate) || 10}
            isLineMode={isLineMode}
          />
        );
      case 'kds':
        return (
          <KDSView
            orders={orders}
            onUpdateOrderStatus={(id, status) => runAction(`Updating Order Status (${status})...`, () => updateOrderStatusMut.mutateAsync({ orderId: id, status }))}
          />
        );
      case 'orders':
        return (
          <OrdersView
            orders={orders}
            products={products}
            onUpdateOrderStatus={(id, status) => runAction(`Updating Order Status (${status})...`, () => updateOrderStatusMut.mutateAsync({ orderId: id, status }))}
            onUpdateOrderItems={(id, items) => runAction('Updating Order Items...', () => updateOrderItemsMut.mutateAsync({ orderId: id, items }))}
          />
        );
      case 'inventory':
        return (
          <InventoryView
            inventory={inventory}
            movements={[]}
            products={products}
            onLogMovement={async () => {}}
            onAddInventoryItem={(input) => runAction('Adding Inventory Item...', () => addInventoryMut.mutateAsync(input))}
            onUpdateInventoryItem={(id, updates) => runAction('Updating Inventory Item...', () => updateInventoryMut.mutateAsync({ id, updates }))}
            onDeleteInventoryItem={(id) => runAction('Deleting Inventory Item...', () => deleteInventoryMut.mutateAsync(id))}
          />
        );
      case 'sales':
        return (
          <SalesView
            orders={orders}
            sales={sales}
            paymentMethods={paymentMethods}
            onRefreshData={() => refetchSales()}
          />
        );
      case 'products':
        return (
          <ProductsView
            categories={categories}
            products={products}
            inventory={inventory}
            onAddProduct={(input) => runAction('Saving Product...', () => addProductMut.mutateAsync(input))}
            onUpdateProduct={(id, updates) => runAction('Updating Product...', () => updateProductMut.mutateAsync({ id, updates }))}
            onDeleteProduct={(id) => runAction('Deleting Product...', () => deleteProductMut.mutateAsync(id))}
            onAddCategory={(input) => runAction('Saving Category...', () => addCategoryMut.mutateAsync(input))}
            onUpdateCategory={(id, updates) => runAction('Updating Category...', () => updateCategoryMut.mutateAsync({ id, updates }))}
            onDeleteCategory={(id) => runAction('Deleting Category...', () => deleteCategoryMut.mutateAsync(id))}
          />
        );
      case 'clients':
        return (
          <ClientsView
            clients={clients}
            onAddClient={(input) => runAction('Saving Customer Profile...', () => addClientMut.mutateAsync(input))}
            onUpdateClient={(id, updates) => runAction('Updating Customer Profile...', () => updateClientMut.mutateAsync({ id, updates }))}
            onDeleteClient={(id) => runAction('Deleting Customer Profile...', () => deleteClientMut.mutateAsync(id))}
            onPayCreditBalance={(clientId, amount, paymentMethod) => runAction('Recording Credit Settlement...', () => payCreditMut.mutateAsync({ clientId, amount, paymentMethod }))}
            onRefreshData={() => refetchClients()}
          />
        );
      case 'ledger':
        return (
          <LedgerView
            accounts={accounts}
            entries={entries}
            sales={sales}
            paymentMethods={paymentMethods}
            onAddAccount={(input) => runAction('Adding Ledger Account...', () => addAccountMut.mutateAsync(input))}
            onUpdateAccount={(id, updates) => runAction('Updating Ledger Account...', () => updateAccountMut.mutateAsync({ id, updates }))}
            onDeleteAccount={(id) => runAction('Deleting Ledger Account...', () => deleteAccountMut.mutateAsync(id))}
            onAddManualEntry={(input) => runAction('Recording Ledger Entry...', () => addEntryMut.mutateAsync(input))}
            onAddPaymentMethod={(input) => runAction('Adding Payment Method...', () => addPaymentMethodMut.mutateAsync(input))}
            onUpdatePaymentMethod={(id, updates) => runAction('Updating Payment Method...', () => updatePaymentMethodMut.mutateAsync({ id, updates }))}
            onDeletePaymentMethod={(id) => runAction('Deleting Payment Method...', () => deletePaymentMethodMut.mutateAsync(id))}
          />
        );
      case 'tasks':
        return (
          <TasksView
            tasks={tasks}
            users={users}
            onToggleTaskStatus={(id, currentStatus) => runAction('Updating Task Status...', () => toggleTaskMut.mutateAsync({ id, currentStatus }))}
            onAddEmployee={(input) => runAction('Creating Staff Account...', () => addUserMut.mutateAsync(input))}
            onUpdateEmployee={(id, updates) => runAction('Updating Staff Account...', () => updateUserMut.mutateAsync({ id, updates }))}
            onDeleteEmployee={(id) => runAction('Deleting Staff Account...', () => deleteUserMut.mutateAsync(id))}
            onAddTask={(input) => runAction('Creating Task...', () => addTaskMut.mutateAsync(input))}
            onUpdateTask={(id, updates) => runAction('Updating Task...', () => updateTaskMut.mutateAsync({ id, updates }))}
            onDeleteTask={(id) => runAction('Deleting Task...', () => deleteTaskMut.mutateAsync(id))}
            currentUserRole={currentUser?.role || 'owner'}
          />
        );
      case 'reports':
        return (
          <ReportsView
            orders={orders}
            inventory={inventory}
            sales={sales}
            onRefreshData={() => { refetchSales(); }}
          />
        );
      case 'settings':
        return (
          <SettingsView
            org={org}
            userOrgs={userOrgs}
            currentUser={currentUser}
            onSwitchOrg={handleSwitchOrg}
            paymentMethods={paymentMethods}
            accounts={accounts}
            onChangePassword={handleChangePassword}
            onUpdateOrg={(updates) => runAction('Saving Restaurant Settings...', () => updateSettingsMut.mutateAsync(updates))}
            onDeletePaymentMethod={(id) => runAction('Deleting Payment Method...', () => deletePaymentMethodMut.mutateAsync(id))}
          />
        );
      default:
        return (
          <OwnerOverview
            orders={orders}
            inventory={inventory}
            onSelectTab={setActiveTab}
            isLineMode={isLineMode}
          />
        );
    }
  };

  return (
    <div className={`min-h-screen bg-steel flex font-sans selection:bg-primary/20 relative ${isLineMode ? 'line-mode' : ''}`}>
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isLineMode={isLineMode}
        userRole={currentUser?.role || 'owner'}
      />

      {/* Global High-Contrast Action Loading Indicator Toast */}
      {isActionLoading && (
        <div className="fixed top-5 right-5 z-[9999] bg-slate-900 text-white text-xs font-mono font-bold px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 border-2 border-emerald-500 animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400 shrink-0" />
          <span className="text-white tracking-wide">{actionMessage}</span>
        </div>
      )}

      {/* Mobile Slide-Over Sidebar Drawer Modal */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm flex">
          <div className="w-4/5 max-w-xs h-full bg-surface shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar
              activeTab={activeTab}
              onSelectTab={setActiveTab}
              isLineMode={isLineMode}
              userRole={currentUser?.role || 'owner'}
              isMobileDrawer={true}
              onCloseMobileDrawer={() => setIsMobileMenuOpen(false)}
            />
          </div>
          <div className="flex-1 h-full" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          orgName={org.name}
          subscriptionStatus={org.subscription_status}
          subscriptionExpiresAt={org.subscription_expires_at}
          isLineMode={isLineMode}
          onToggleLineMode={() => setIsLineMode(!isLineMode)}
          activeTab={activeTab}
          onSearchOpen={() => {}}
          currentUser={currentUser}
          userOrgs={userOrgs}
          activeOrgId={org.id}
          onSwitchOrg={handleSwitchOrg}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onLogout={logout}
        />

        <main className="flex-1 p-3 sm:p-6 overflow-y-auto pb-24 md:pb-6">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        userRole={currentUser?.role || 'owner'}
        isLineMode={isLineMode}
      />
    </div>
  );
}
