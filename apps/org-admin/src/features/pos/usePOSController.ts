import { useState } from 'react';
import { Product, OrderItem } from '@restaurant-saas/shared-schemas';
import { useProductsQuery, useCategoriesQuery } from '../products/useProductsQuery';
import { useClientsQuery, useUpdateClientMutation } from '../clients/useClientsQuery';
import { useCreateOrderMutation } from '../orders/useOrdersQuery';
import { useCreateSaleMutation } from '../sales/useSalesQuery';
import { useAppStore } from '../../store/useAppStore';

export const usePOSController = () => {
  const orgId = useAppStore(s => s.org.id);
  const paymentMethods = useAppStore(s => s.paymentMethods);
  const taxRate = useAppStore(s => Number(s.org.tax_rate) || 10);
  const isLineMode = useAppStore(s => s.isLineMode);
  const runAction = useAppStore(s => s.runAction);

  const { data: products = [] } = useProductsQuery(orgId);
  const { data: categories = [] } = useCategoriesQuery(orgId);
  const { data: clients = [] } = useClientsQuery(orgId);

  const createOrderMut = useCreateOrderMutation(orgId);
  const createSaleMut = useCreateSaleMutation(orgId);
  const updateClientMut = useUpdateClientMutation(orgId);

  // Local POS State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [tableNo, setTableNo] = useState('T4');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);
  const [customTaxPercent, setCustomTaxPercent] = useState<number | null>(null);

  const activeTaxRate = customTaxPercent !== null ? customTaxPercent : taxRate;

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filter clients by search query
  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    c.phone.includes(clientSearchQuery)
  );

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: `oi-${Date.now()}-${product.id}`,
          product_id: product.id,
          product_name: product.name,
          qty: 1,
          unit_price: product.price
        }
      ];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product_id === productId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const getCategoryName = (categoryId: string): string => {
    const match = categories?.find(c => c.id === categoryId);
    return match ? match.name : 'Unknown Category';
  };

  const subtotal = cart.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableTotal = Math.max(0, subtotal - discountAmount);
  const tax = (taxableTotal * activeTaxRate) / 100;
  const totalPayable = taxableTotal + tax;

  const handleChargeSubmit = async () => {
    if (cart.length === 0) return;

    const newOrderData = {
      order_number: `#ORD-${Math.floor(100 + Math.random() * 900)}`,
      type: orderType,
      table_no: orderType === 'dine_in' ? tableNo : undefined,
      client_id: selectedClientId || undefined,
      client_name: selectedClient ? selectedClient.name : 'Walk-in Guest',
      client_phone: selectedClient ? selectedClient.phone : undefined,
      items: cart,
      subtotal,
      discount: discountAmount,
      tax,
      total: totalPayable,
      status: 'new'
    };

    await runAction('Processing POS Order...', async () => {
      const newOrder = await createOrderMut.mutateAsync(newOrderData);
      if (newOrder) {
        await createSaleMut.mutateAsync({
          order_id: newOrder.id,
          payment_method: paymentMethod,
          amount_paid: totalPayable,
          amount_due: 0
        });

        if (paymentMethod === 'borrow_credit' && newOrderData.client_id) {
          const targetClient = clients.find(c => c.id === newOrderData.client_id);
          if (targetClient) {
            const updatedBalance = Number(targetClient.credit_balance || 0) + Number(totalPayable);
            await updateClientMut.mutateAsync({ id: targetClient.id, updates: { credit_balance: updatedBalance } });
          }
        }
      }
    });

    // Save for print receipt popup
    setLastReceipt({ ...newOrderData, paymentMethod, created_at: new Date().toISOString() });

    // Reset state
    setCart([]);
    setDiscountPercent(0);
    setCustomTaxPercent(null);
    setSelectedClientId('');
    setIsChargeModalOpen(false);
    setIsMobileCartOpen(false);
  };

  return {
    products,
    categories,
    clients,
    paymentMethods,
    isLineMode,
    activeTaxRate,
    selectedCategory, setSelectedCategory,
    cart, setCart,
    searchQuery, setSearchQuery,
    clientSearchQuery, setClientSearchQuery,
    orderType, setOrderType,
    tableNo, setTableNo,
    selectedClientId, setSelectedClientId,
    discountPercent, setDiscountPercent,
    isChargeModalOpen, setIsChargeModalOpen,
    paymentMethod, setPaymentMethod,
    lastReceipt, setLastReceipt,
    isMobileCartOpen, setIsMobileCartOpen,
    customTaxPercent, setCustomTaxPercent,
    filteredProducts,
    filteredClients,
    selectedClient,
    addToCart,
    updateQty,
    removeFromCart,
    getCategoryName,
    subtotal,
    discountAmount,
    taxableTotal,
    tax,
    totalPayable,
    handleChargeSubmit
  };
};
