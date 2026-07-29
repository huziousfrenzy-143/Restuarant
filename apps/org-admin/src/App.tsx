import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { LoginView } from './components/views/LoginView';
import { API_BASE_URL } from './config/api';

import { OwnerOverview } from './components/views/OwnerOverview';
import { POSView } from './components/views/POSView';
import { KDSView } from './components/views/KDSView';
import { OrdersView } from './components/views/OrdersView';
import { InventoryView } from './components/views/InventoryView';
import { SalesView } from './components/views/SalesView';
import { LedgerView } from './components/views/LedgerView';
import { ProductsView } from './components/views/ProductsView';
import { ClientsView } from './components/views/ClientsView';
import { TasksView } from './components/views/TasksView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';

import { Order, OrderItem, OrderStatus, Product, InventoryItem, Sale, LedgerAccount, LedgerEntry, Task, Client, Organization, User, ProductCategory, PaymentMethod } from '@restaurant-saas/shared-schemas';

import { MobileBottomNav } from './components/layout/MobileBottomNav';

export function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('org_admin_token'));
  });

  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('org_admin_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLineMode, setIsLineMode] = useState<boolean>(false);

  // Dynamic Organization State from API
  const [org, setOrg] = useState<Organization>(() => {
    return currentUser?.org || {
      id: 'org-1',
      name: 'Restaurant SaaS',
      slug: 'restaurant-saas',
      schema_name: 'tenant_restaurant_saas',
      subscription_status: 'active',
      subscription_expires_at: new Date(Date.now() + 45 * 86400000).toISOString(),
      plan_type: 'pro',
      tax_rate: 10,
      address: 'Main Boulevard',
      phone: '+1 (555) 000-0000',
      created_at: new Date().toISOString(),
      is_active: true
    };
  });

  // Pure API-Driven State
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Multi-Tenant User Organizations List
  const [userOrgs, setUserOrgs] = useState<any[]>(() => {
    return currentUser?.userOrgs || [org];
  });

  const handleLogout = () => {
    localStorage.removeItem('org_admin_token');
    localStorage.removeItem('org_admin_refresh_token');
    localStorage.removeItem('org_admin_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('org_admin_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  // Switch Organization Context
  const handleSwitchOrg = async (targetOrgId: string) => {
    try {
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

          if (user.role === 'chef') {
            setActiveTab('kds');
            setIsLineMode(true);
          } else if (user.role === 'salesman') {
            setActiveTab('pos');
            setIsLineMode(false);
          } else if (user.role === 'delivery_boy') {
            setActiveTab('orders');
            setIsLineMode(false);
          } else {
            setActiveTab('dashboard');
            setIsLineMode(false);
          }
        }
        if (newOrgs) setUserOrgs(newOrgs);

        // Instantly reload all store data for newly targeted organization!
        await syncApiData(targetOrgId);
      }
    } catch (err: any) {
      console.error('Error switching organization:', err);
    }
  };

  // Sync API Data on authenticated load using /api/v1/:orgId/<feature> pattern
  const syncApiData = async (targetOrgId?: string) => {
    const activeOrgId = targetOrgId || org.id;
    if (!activeOrgId) return;

    try {
      const token = localStorage.getItem('org_admin_token');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      const baseUrl = `${API_BASE_URL}/${activeOrgId}`;

      const [usersRes, prodRes, catRes, invRes, cliRes, ordRes, salesRes, pmRes, accRes, entRes, tskRes] = await Promise.all([
        fetch(`${baseUrl}/users`, { headers }),
        fetch(`${baseUrl}/products`, { headers }),
        fetch(`${baseUrl}/categories`, { headers }),
        fetch(`${baseUrl}/inventory`, { headers }),
        fetch(`${baseUrl}/clients`, { headers }),
        fetch(`${baseUrl}/orders`, { headers }),
        fetch(`${baseUrl}/sales`, { headers }),
        fetch(`${baseUrl}/payment-methods`, { headers }),
        fetch(`${baseUrl}/ledger/accounts`, { headers }),
        fetch(`${baseUrl}/ledger/entries`, { headers }),
        fetch(`${baseUrl}/tasks`, { headers })
      ]);

      if (usersRes.status === 401 || ordRes.status === 401 || prodRes.status === 401) {
        console.warn('Session expired or unauthorized token. Logging out.');
        handleLogout();
        return;
      }

      if (usersRes.ok) {
        const json = await usersRes.json();
        if (json.data) setUsers(json.data);
      }
      if (prodRes.ok) {
        const json = await prodRes.json();
        if (json.data) setProducts(json.data);
      }
      if (catRes.ok) {
        const json = await catRes.json();
        if (json.data) setCategories(json.data);
      }
      if (invRes.ok) {
        const json = await invRes.json();
        if (json.data) setInventory(json.data);
      }
      if (cliRes.ok) {
        const json = await cliRes.json();
        if (json.data) setClients(json.data);
      }
      if (ordRes.ok) {
        const json = await ordRes.json();
        if (json.data) setOrders(json.data);
      }
      if (salesRes.ok) {
        const json = await salesRes.json();
        if (json.data) setSales(json.data);
      }
      if (pmRes.ok) {
        const json = await pmRes.json();
        if (json.data) setPaymentMethods(json.data);
      }
      if (accRes.ok) {
        const json = await accRes.json();
        if (json.data) setAccounts(json.data);
      }
      if (entRes.ok) {
        const json = await entRes.json();
        if (json.data) setEntries(json.data);
      }
      if (tskRes.ok) {
        const json = await tskRes.json();
        if (json.data) setTasks(json.data);
      }
    } catch (err) {
      console.error('Error syncing multi-tenant organization API data:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && org.id) {
      syncApiData(org.id);
    }
  }, [isAuthenticated, org.id]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'chef') {
      setActiveTab('kds');
      setIsLineMode(true);
    } else if (currentUser.role === 'salesman') {
      if (activeTab === 'kds' || activeTab === 'dashboard') setActiveTab('pos');
      setIsLineMode(false);
    } else if (currentUser.role === 'delivery_boy') {
      if (activeTab === 'kds' || activeTab === 'dashboard') setActiveTab('orders');
      setIsLineMode(false);
    } else {
      if (activeTab === 'kds') setActiveTab('dashboard');
      setIsLineMode(false);
    }
  }, [currentUser?.role, currentUser?.org?.id]);

  // Auth Handlers & Role Redirection
  const handleLoginSuccess = (user: any, token: string, refresh: string) => {
    localStorage.setItem('org_admin_token', token);
    localStorage.setItem('org_admin_refresh_token', refresh);
    localStorage.setItem('org_admin_user', JSON.stringify(user));
    setCurrentUser(user);
    if (user.org) {
      setOrg(user.org);
      syncApiData(user.org.id);
    }
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

  // --- CRUD HANDLERS ---

  // Products CRUD
  const handleAddProduct = async (newProdInput: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newProdInput)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error adding product:', err); }
  };

  const handleUpdateProduct = async (id: string, updates: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/products/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error updating product:', err); }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error deleting product:', err); }
  };

  // Categories CRUD
  const handleAddCategory = async (newCatInput: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/categories`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newCatInput)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error adding category:', err); }
  };

  const handleUpdateCategory = async (id: string, updates: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/categories/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error updating category:', err); }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/categories/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error deleting category:', err); }
  };

  // Inventory CRUD
  const handleAddInventoryItem = async (newItemInput: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/inventory`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newItemInput)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error adding inventory item:', err); }
  };

  const handleUpdateInventoryItem = async (id: string, updates: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/inventory/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error updating inventory item:', err); }
  };

  const handleDeleteInventoryItem = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/inventory/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error deleting inventory item:', err); }
  };

  // Clients CRUD
  const handleAddClient = async (newClientInput: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/clients`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newClientInput)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error adding client:', err); }
  };

  const handleUpdateClient = async (id: string, updates: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/clients/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error updating client:', err); }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/clients/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error deleting client:', err); }
  };

  const handlePayCreditBalance = async (clientId: string, amount: number, paymentMethod: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/clients/${clientId}/pay-credit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount, payment_method: paymentMethod })
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) {
      console.error('Error paying credit balance:', err);
    }
  };

  // Tasks & Staff Users CRUD
  const handleAddUser = async (newUserInput: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newUserInput)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error adding user:', err); }
  };

  const handleUpdateUser = async (id: string, updates: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/users/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error updating user:', err); }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error deleting user:', err); }
  };

  const handleAddTask = async (newTaskInput: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newTaskInput)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error adding task:', err); }
  };

  const handleUpdateTask = async (id: string, updates: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/tasks/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error updating task:', err); }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/tasks/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error deleting task:', err); }
  };

  // Payment Methods CRUD
  const handleAddPaymentMethod = async (pmInput: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/payment-methods`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(pmInput)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error adding payment method:', err); }
  };

  const handleUpdatePaymentMethod = async (id: string, updates: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/payment-methods/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error updating payment method:', err); }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/payment-methods/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error deleting payment method:', err); }
  };

  // General Ledger Accounts CRUD & Manual Entry
  const handleAddAccount = async (accInput: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/ledger/accounts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(accInput)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error adding ledger account:', err); }
  };

  const handleUpdateAccount = async (id: string, updates: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/ledger/accounts/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error updating ledger account:', err); }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/ledger/accounts/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error deleting ledger account:', err); }
  };

  const handleAddManualEntry = async (entryInput: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/ledger/entries`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(entryInput)
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error adding manual ledger entry:', err); }
  };

  // Password & Settings Handlers
  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    const res = await fetch(`${API_BASE_URL.replace('/v1', '')}/v1/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, message: json.error?.message || 'Password update failed' };
    }
    return { success: true, message: json.message };
  };

  const handleUpdateOrgDetails = async (updates: { name: string; phone: string; address: string; tax_rate: number }) => {
    setOrg(prev => ({ ...prev, ...updates }));
    try {
      await fetch(`${API_BASE_URL}/${org.id}/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
      await syncApiData(org.id);
    } catch (err) {
      console.error('Error updating org settings:', err);
    }
  };

  // Orders Operational Handlers
  const handleUpdateOrderItems = async (orderId: string, items: OrderItem[]) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/orders/${orderId}/items`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ items })
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error updating order items:', err); }
  };

  const handleCompletePosOrder = async (newOrderData: any, paymentMethod: string, amountPaid: number) => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/${org.id}/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newOrderData)
      });

      if (res.ok) {
        const json = await res.json();
        await fetch(`${API_BASE_URL}/${org.id}/sales`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            order_id: json.data.id,
            payment_method: paymentMethod,
            amount_paid: amountPaid,
            amount_due: 0
          })
        });

        if (paymentMethod === 'borrow_credit' && newOrderData.client_id) {
          const targetClient = clients.find(c => c.id === newOrderData.client_id);
          if (targetClient) {
            const updatedBalance = Number(targetClient.credit_balance || 0) + Number(amountPaid);
            await fetch(`${API_BASE_URL}/${org.id}/clients/${targetClient.id}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify({ credit_balance: updatedBalance })
            });
          }
        }

        await syncApiData(org.id);
      }
    } catch (err) { console.error('Error completing POS order:', err); }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error updating order status:', err); }
  };

  const handleRecordMovement = async (itemId: string, type: 'purchase' | 'wastage' | 'adjustment', qty: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/inventory/movement`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ inventory_item_id: itemId, type, qty })
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error recording movement:', err); }
  };

  const handleUpdateTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'done' ? 'pending' : 'done';
    try {
      const res = await fetch(`${API_BASE_URL}/${org.id}/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) await syncApiData(org.id);
    } catch (err) { console.error('Error updating task status:', err); }
  };

  // AUTH GUARD: Require Staff / Owner Login
  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Render view depending on activeTab with Role Guard
  const renderContent = () => {
    // Role Guard: Chef user ONLY has access to Kitchen KDS
    if (currentUser?.role === 'chef') {
      return (
        <KDSView
          orders={orders}
          onUpdateOrderStatus={handleUpdateOrderStatus}
        />
      );
    }

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
            isLineMode={isLineMode}
            taxRate={Number(org.tax_rate) || 10}
          />
        );
      case 'kds':
        return (
          <KDSView
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        );
      case 'orders':
        return (
          <OrdersView
            orders={orders}
            products={products}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateOrderItems={handleUpdateOrderItems}
          />
        );
      case 'inventory':
        return (
          <InventoryView
            inventory={inventory}
            movements={movements}
            products={products}
            onLogMovement={handleRecordMovement}
            onAddInventoryItem={handleAddInventoryItem}
            onUpdateInventoryItem={handleUpdateInventoryItem}
            onDeleteInventoryItem={handleDeleteInventoryItem}
          />
        );
      case 'sales':
        return (
          <SalesView
            orders={orders}
            sales={sales}
            paymentMethods={paymentMethods}
            onRefreshData={() => syncApiData(org.id)}
          />
        );
      case 'products':
        return (
          <ProductsView
            categories={categories}
            products={products}
            inventory={inventory}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        );
      case 'clients':
        return (
          <ClientsView
            clients={clients}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
            onPayCreditBalance={handlePayCreditBalance}
            onRefreshData={() => syncApiData(org.id)}
          />
        );
      case 'tasks':
        return (
          <TasksView
            tasks={tasks}
            users={users}
            onToggleTaskStatus={handleUpdateTaskStatus}
            onAddEmployee={handleAddUser}
            onUpdateEmployee={handleUpdateUser}
            onDeleteEmployee={handleDeleteUser}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            currentUserRole={currentUser?.role || 'owner'}
          />
        );
      case 'reports':
        return (
          <ReportsView
            orders={orders}
            inventory={inventory}
            sales={sales}
            onRefreshData={() => syncApiData(org.id)}
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
            onUpdateOrg={handleUpdateOrgDetails}
            onDeletePaymentMethod={handleDeletePaymentMethod}
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
    <div className="min-h-screen bg-steel flex font-sans selection:bg-primary/20 relative">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isLineMode={isLineMode}
        userRole={currentUser?.role || 'owner'}
      />

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
          onLogout={handleLogout}
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
