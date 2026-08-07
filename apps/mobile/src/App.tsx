import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Order, OrderStatus, Product, InventoryItem, Client } from '@restaurant-saas/shared-schemas';
import { LightColors, LineModeColors } from './theme/colors';

import { LoginScreen } from './views/LoginScreen';
import { OverviewScreen } from './views/OverviewScreen';
import { POSScreen } from './views/POSScreen';
import { KDSScreen } from './views/KDSScreen';
import { OrdersScreen } from './views/OrdersScreen';
import { SalesScreen } from './views/SalesScreen';
import { ReportsScreen } from './views/ReportsScreen';
import { ClientsScreen } from './views/ClientsScreen';
import { SettingsScreen } from './views/SettingsScreen';
import { TasksScreen } from './views/TasksScreen';
import { LedgerScreen } from './views/LedgerScreen';

import {
  switchOrgApi,
  fetchProductsApi,
  fetchOrdersApi,
  createOrderApi,
  updateOrderStatusApi,
  fetchInventoryApi,
  fetchClientsApi,
  createClientApi,
  updateClientApi,
  payClientCreditApi,
  deleteClientApi,
  setApiAuthToken
} from './services/api';

import {
  saveLocalOrders,
  getLocalOrders,
  saveLocalClients,
  getLocalClients,
  getPendingSyncQueue,
  addPendingSyncItem,
  clearPendingSyncQueue,
  getAuthSession,
  clearAuthSession,
  setPendingSyncQueue,
  PendingSyncItem
} from './services/storage';

import { useAppRealtime } from './hooks/useAppRealtime';

import {
  LayoutDashboard,
  ShoppingCart,
  Flame,
  ClipboardList,
  DollarSign,
  TrendingUp,
  Users,
  Settings,
  Cloud,
  Zap,
  Sun,
  Flame as FireIcon,
  CheckCircle2,
  BookOpen
} from 'lucide-react-native';

export default function App() {
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentOrg, setCurrentOrg] = useState<any>(null);
  const [userOrgs, setUserOrgs] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isLineMode, setIsLineMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Local Offline & Sync State
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pendingQueue, setPendingQueue] = useState<PendingSyncItem[]>([]);

  const colors = isLineMode ? LineModeColors : LightColors;
  const iconColor = colors.primary;

  // Load offline stored cache & hydrate persistent auth session on startup
  useEffect(() => {
    (async () => {
      try {
        const session = await getAuthSession();
        if (session.token && session.user) {
          setApiAuthToken(session.token);
          setCurrentUser(session.user);
          setCurrentOrg(session.user.org || session.userOrgs?.[0] || null);
          setUserOrgs(session.userOrgs || []);
          setIsAuthenticated(true);
          if (session.user.role === 'chef') {
            setActiveTab('kds');
            setIsLineMode(true);
          } else if (session.user.role === 'salesman') {
            setActiveTab('pos');
          } else {
            setActiveTab('overview');
          }
        }
      } catch (e) {}

      const storedOrders = await getLocalOrders();
      const storedClients = await getLocalClients();
      const queue = await getPendingSyncQueue();
      if (storedOrders.length > 0) setOrders(storedOrders);
      if (storedClients.length > 0) setClients(storedClients);
      setPendingQueue(queue);
      
      setIsAuthLoading(false);
    })();
  }, []);

  // Sync Store Data from API with local fallback
  const syncStoreData = useCallback(async (orgId: string) => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [prods, ords, inv, clis] = await Promise.all([
        fetchProductsApi(orgId).catch(() => null),
        fetchOrdersApi(orgId).catch(() => null),
        fetchInventoryApi(orgId).catch(() => null),
        fetchClientsApi(orgId).catch(() => null)
      ]);

      const freshQueue = await getPendingSyncQueue();

      if (prods) setProducts(prods);
      
      if (ords) {
        const localCreatedOrders = freshQueue
          .filter(q => q.type === 'CREATE_ORDER' || q.type === 'CHECKOUT_ORDER')
          .map(q => ({
            ...q.payload,
            id: q.payload.id || `ord-sync-${Date.now()}`
          })) as Order[];
        
        const mergedOrders = [...localCreatedOrders, ...ords];
        setOrders(mergedOrders);
        await saveLocalOrders(mergedOrders);
      }
      
      if (inv) setInventory(inv);
      
      if (clis) {
        const localCreatedClients = freshQueue
          .filter(q => q.type === 'CREATE_CLIENT')
          .map(q => ({
            ...q.payload,
            id: q.payload.id || `cli-sync-${Date.now()}`
          })) as Client[];
          
        const mergedClients = [...localCreatedClients, ...clis];
        setClients(mergedClients);
        await saveLocalClients(mergedClients);
      }

      setPendingQueue(freshQueue);
    } catch (err: any) {
      console.warn('[Mobile Sync Error]:', err?.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentOrg?.id) {
      syncStoreData(currentOrg.id);
    }
  }, [isAuthenticated, currentOrg?.id, syncStoreData]);

  // Handle Unified SSE Real-time Updates
  useAppRealtime(isAuthenticated ? currentOrg?.id : undefined, (type) => {
    if (currentOrg?.id) {
      syncStoreData(currentOrg.id);
    }
  });

  // MANUAL SYNC LOCAL STORED DATA TO BACKEND
  const handleManualSyncToBackend = async () => {
    if (!currentOrg?.id) return;
    const currentQueue = await getPendingSyncQueue();
    if (currentQueue.length === 0) {
      Alert.alert('Cloud Sync', 'All local data is already fully synchronized with backend PostgreSQL database.');
      await syncStoreData(currentOrg.id);
      return;
    }

    setIsSyncing(true);
    let successCount = 0;
    const failedItems: PendingSyncItem[] = [];
    
    try {
      for (const item of currentQueue) {
        try {
          if (item.type === 'CREATE_ORDER') {
            await createOrderApi(currentOrg.id, item.payload);
          } else if (item.type === 'CHECKOUT_ORDER') {
            // we will need to add checkoutApi to api.ts, but wait, the queue payload already contains everything.
            // I'll leave this as a stub and fix it in api.ts next.
            // await checkoutApi(currentOrg.id, item.payload);
            const { checkoutApi } = require('./services/api');
            await checkoutApi(currentOrg.id, item.payload);
          } else if (item.type === 'UPDATE_ORDER_STATUS') {
            await updateOrderStatusApi(currentOrg.id, item.payload.id, item.payload.status);
          } else if (item.type === 'CREATE_CLIENT') {
            await createClientApi(currentOrg.id, item.payload);
          } else if (item.type === 'UPDATE_CLIENT') {
            await updateClientApi(currentOrg.id, item.payload.id, item.payload);
          } else if (item.type === 'PAY_CLIENT_CREDIT') {
            await payClientCreditApi(currentOrg.id, item.payload.id, item.payload.amount, item.payload.payment_method);
          } else if (item.type === 'DELETE_CLIENT') {
            await deleteClientApi(currentOrg.id, item.payload.id);
          }
          successCount++;
        } catch (e) {
          failedItems.push(item);
        }
      }

      if (failedItems.length === 0) {
        await clearPendingSyncQueue();
        setPendingQueue([]);
      } else {
        await setPendingSyncQueue(failedItems);
        setPendingQueue(failedItems);
      }
      
      await syncStoreData(currentOrg.id);

      if (failedItems.length > 0) {
        Alert.alert(
          'Backend Sync Partial Success',
          `Successfully synchronized ${successCount} record(s). However, ${failedItems.length} record(s) failed and remain in the queue.`
        );
      } else {
        Alert.alert(
          'Backend Sync Success',
          `Successfully synchronized ${successCount} local stored record(s) to cloud PostgreSQL backend!`
        );
      }
    } catch (err: any) {
      Alert.alert('Sync Exception', err?.message || 'Failed to complete cloud sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoginSuccess = (user: any, org: any, orgs?: any[]) => {
    setCurrentUser(user);
    setCurrentOrg(org);
    if (orgs) setUserOrgs(orgs);
    setIsAuthenticated(true);

    if (user?.role === 'chef') {
      setActiveTab('kds');
      setIsLineMode(true);
    } else if (user?.role === 'salesman') {
      setActiveTab('pos');
      setIsLineMode(false);
    } else {
      setActiveTab('overview');
      setIsLineMode(false);
    }
  };

  const handleSwitchOrg = async (targetOrg: any) => {
    setIsLoading(true);
    try {
      const targetId = typeof targetOrg === 'string' ? targetOrg : targetOrg.id;
      const result = await switchOrgApi(targetId);
      if (result.user) setCurrentUser(result.user);
      if (result.org) setCurrentOrg(result.org);
      if (result.userOrgs) setUserOrgs(result.userOrgs);

      if (result.user?.role === 'chef') {
        setActiveTab('kds');
        setIsLineMode(true);
      } else {
        setActiveTab('overview');
        setIsLineMode(false);
      }

      await syncStoreData(targetId);
    } catch (err: any) {
      Alert.alert('Organization Error', err?.message || 'Failed to switch store organization');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearAuthSession();
    setApiAuthToken(null);
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentOrg(null);
    setUserOrgs([]);
  };

  // Local-First Order Creation
  const handleCreateOrder = async (newOrderPayload: any) => {
    const tempOrder: Order = {
      ...newOrderPayload,
      id: `ord-${Date.now()}`,
      created_at: new Date().toISOString(),
      created_by: currentUser?.id || 'usr-1',
      updated_at: new Date().toISOString(),
      prep_time_mins: 15,
      is_overdue: false
    };

    const updatedOrders = [tempOrder, ...orders];
    setOrders(updatedOrders);
    await saveLocalOrders(updatedOrders);

    const newQueue = await addPendingSyncItem({
      type: 'CHECKOUT_ORDER',
      payload: newOrderPayload
    });
    setPendingQueue(newQueue);
  };

  // Local-First Order Status Update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const updatedOrders = orders.map(o => (o.id === orderId ? { ...o, status: newStatus } : o));
    setOrders(updatedOrders);
    await saveLocalOrders(updatedOrders);

    const newQueue = await addPendingSyncItem({
      type: 'UPDATE_ORDER_STATUS',
      payload: { id: orderId, status: newStatus }
    });
    setPendingQueue(newQueue);
  };

  // Local-First Customer Creation
  const handleAddClient = async (newClientPayload: Partial<Client>) => {
    const tempClient: Client = {
      id: `cli-${Date.now()}`,
      name: newClientPayload.name || 'New Customer',
      phone: newClientPayload.phone || '',
      address: newClientPayload.address,
      notes: newClientPayload.notes,
      credit_balance: 0.00
    };

    const updatedClients = [tempClient, ...clients];
    setClients(updatedClients);
    await saveLocalClients(updatedClients);

    const newQueue = await addPendingSyncItem({
      type: 'CREATE_CLIENT',
      payload: newClientPayload
    });
    setPendingQueue(newQueue);
  };

  // Local-First Customer Updation
  const handleUpdateClient = async (clientId: string, updatedFields: Partial<Client>) => {
    const updatedClients = clients.map(c => (c.id === clientId ? { ...c, ...updatedFields } : c));
    setClients(updatedClients);
    await saveLocalClients(updatedClients);

    const newQueue = await addPendingSyncItem({
      type: 'UPDATE_CLIENT',
      payload: { id: clientId, ...updatedFields }
    });
    setPendingQueue(newQueue);
  };

  // Local-First Customer Credit Payment / Balance Updation
  const handlePayClientCredit = async (clientId: string, amount: number, paymentMethod: string = 'cash') => {
    const updatedClients = clients.map(c => {
      if (c.id === clientId) {
        const curBal = typeof c.credit_balance === 'number' ? c.credit_balance : parseFloat(String(c.credit_balance || 0));
        const newBal = Math.max(0, curBal - amount);
        return { ...c, credit_balance: newBal };
      }
      return c;
    });
    setClients(updatedClients);
    await saveLocalClients(updatedClients);

    const newQueue = await addPendingSyncItem({
      type: 'PAY_CLIENT_CREDIT',
      payload: { id: clientId, amount, payment_method: paymentMethod }
    });
    setPendingQueue(newQueue);
  };

  // Local-First Customer Deletion
  const handleDeleteClient = async (clientId: string) => {
    const updatedClients = clients.filter(c => c.id !== clientId);
    setClients(updatedClients);
    await saveLocalClients(updatedClients);

    const newQueue = await addPendingSyncItem({
      type: 'DELETE_CLIENT',
      payload: { id: clientId }
    });
    setPendingQueue(newQueue);
  };

  if (isAuthLoading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.steel, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle={isLineMode ? 'light-content' : 'dark-content'} />
        <View style={{ width: 80, height: 80, backgroundColor: colors.primary, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 32, fontFamily: 'monospace' }}>SG</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 20, color: colors.graphite, fontFamily: 'monospace', fontSize: 13 }}>Initializing Session...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.steel }]}>
        <StatusBar barStyle={isLineMode ? 'light-content' : 'dark-content'} />
        <LoginScreen onLoginSuccess={handleLoginSuccess} isLineMode={isLineMode} />
      </SafeAreaView>
    );
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewScreen
            orders={orders}
            inventory={inventory}
            onNavigateTab={setActiveTab}
            isLineMode={isLineMode}
            orgName={currentOrg?.name || 'Organization'}
          />
        );
      case 'pos':
        return (
          <POSScreen
            products={products}
            clients={clients}
            onCompleteOrder={handleCreateOrder}
            isLineMode={isLineMode}
          />
        );
      case 'kds':
        return (
          <KDSScreen
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        );
      case 'orders':
        return (
          <OrdersScreen
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            isLineMode={isLineMode}
          />
        );
      case 'sales':
        return <SalesScreen orders={orders} isLineMode={isLineMode} />;
      case 'reports':
        return <ReportsScreen orders={orders} inventory={inventory} isLineMode={isLineMode} />;
      case 'clients':
        return (
          <ClientsScreen
            clients={clients}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onPayClientCredit={handlePayClientCredit}
            onDeleteClient={handleDeleteClient}
            isLineMode={isLineMode}
          />
        );
      case 'tasks':
        return (
          <TasksScreen
            isLineMode={isLineMode}
            orgId={currentOrg?.id || null}
          />
        );
      case 'ledger':
        return (
          <LedgerScreen
            isLineMode={isLineMode}
            orgId={currentOrg?.id || null}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            currentUser={currentUser}
            currentOrg={currentOrg}
            userOrgs={userOrgs}
            isLineMode={isLineMode}
            onToggleLineMode={() => setIsLineMode(!isLineMode)}
            onSwitchOrg={handleSwitchOrg}
            onLogout={handleLogout}
          />
        );
      default:
        return (
          <OverviewScreen
            orders={orders}
            inventory={inventory}
            onNavigateTab={setActiveTab}
            isLineMode={isLineMode}
            orgName={currentOrg?.name || 'Organization'}
          />
        );
    }
  };

  const pendingCount = pendingQueue.length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.steel }]}>
      <StatusBar barStyle={isLineMode ? 'light-content' : 'dark-content'} />

      {/* Top Mobile Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerLogo, { backgroundColor: colors.primary }]}>
            <Text style={styles.headerLogoText}>
              {(currentOrg?.name || 'SA').split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.headerOrgName, { color: colors.ink }]}>{currentOrg?.name || 'Organization'}</Text>
              {isLoading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} />}
            </View>
            <Text style={[styles.headerRole, { color: colors.graphite }]}>
              {(currentUser?.role || 'STAFF').toUpperCase()} SESSION
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* SYNC DATA TO BACKEND BUTTON WITH BADGE */}
          <TouchableOpacity
            style={[
              styles.syncBtn,
              {
                backgroundColor: pendingCount > 0 ? colors.primary : colors.steel,
                borderColor: pendingCount > 0 ? colors.primary : colors.mist
              }
            ]}
            onPress={handleManualSyncToBackend}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View style={styles.syncBtnInner}>
                {pendingCount > 0 ? (
                  <Zap size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
                ) : (
                  <Cloud size={13} color={colors.ink} style={{ marginRight: 3 }} />
                )}
                <Text
                  style={[
                    styles.syncBtnText,
                    { color: pendingCount > 0 ? '#FFFFFF' : colors.ink }
                  ]}
                >
                  {pendingCount > 0 ? `SYNC (${pendingCount})` : 'SYNCED'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.lineToggleBtn, { backgroundColor: isLineMode ? colors.warning : colors.steel, borderColor: colors.mist }]}
            onPress={() => setIsLineMode(!isLineMode)}
          >
            <Text style={[styles.lineToggleText, { color: isLineMode ? '#000000' : colors.ink }]}>
              {isLineMode ? 'LINE' : 'LIGHT'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Screen View */}
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* Mobile Bottom Navigation Bar with Unified Lucide Icons */}
      <View style={[styles.bottomNav, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomNavScroll}>
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ['owner', 'admin'] },
            { id: 'pos', label: 'POS', icon: ShoppingCart, roles: ['owner', 'admin', 'salesman'] },
            { id: 'kds', label: 'KDS', icon: Flame, roles: ['owner', 'admin', 'chef'] },
            { id: 'orders', label: 'Orders', icon: ClipboardList, roles: ['owner', 'admin', 'salesman', 'delivery_boy'] },
            { id: 'sales', label: 'Sales', icon: DollarSign, roles: ['owner', 'admin'] },
            { id: 'reports', label: 'Reports', icon: TrendingUp, roles: ['owner', 'admin'] },
            { id: 'clients', label: 'Customers', icon: Users, roles: ['owner', 'admin', 'salesman'] },
            { id: 'tasks', label: 'Tasks', icon: CheckCircle2, roles: ['owner', 'admin', 'salesman', 'chef', 'delivery_boy'] },
            { id: 'ledger', label: 'Ledger', icon: BookOpen, roles: ['owner', 'admin'] },
            { id: 'settings', label: 'Settings', icon: Settings, roles: ['owner', 'admin', 'salesman', 'chef', 'delivery_boy'] }
          ]
            .filter(item => item.roles.includes(currentUser?.role || 'owner'))
            .map(item => {
              const isActive = activeTab === item.id;
              const IconComponent = item.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.navItem}
                  onPress={() => setActiveTab(item.id)}
                >
                  <IconComponent
                    size={20}
                    color={isActive ? colors.primary : colors.graphite}
                    style={{ marginBottom: 3 }}
                  />
                  <Text style={[styles.navLabel, { color: isActive ? colors.primary : colors.graphite }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerLogo: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  headerLogoText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 11, fontFamily: 'monospace' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  headerOrgName: { fontSize: 13, fontWeight: 'bold' },
  headerRole: { fontSize: 8.5, fontFamily: 'monospace', marginTop: 1 },
  syncBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  syncBtnInner: { flexDirection: 'row', alignItems: 'center' },
  syncBtnText: { fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' },
  lineToggleBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  lineToggleText: { fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' },
  screenContainer: { flex: 1 },
  bottomNav: {
    height: 60,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  bottomNavScroll: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, flexGrow: 1, justifyContent: 'space-around' },
  navItem: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, minWidth: 60 },
  navLabel: { fontSize: 9.5, fontWeight: 'bold', fontFamily: 'monospace' }
});
