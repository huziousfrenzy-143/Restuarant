import { useState } from 'react';
import { Product, OrderItem } from '@restaurant-saas/shared-schemas';
import { useProductsQuery, useCategoriesQuery } from '../products/useProductsQuery';
import { useClientsQuery } from '../clients/useClientsQuery';
import { useCheckoutMutation } from '../orders/useOrdersQuery';
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

  const checkoutMut = useCheckoutMutation(orgId);

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
  const [variantSelectionProduct, setVariantSelectionProduct] = useState<Product | null>(null);

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

  const addToCart = (product: Product, selectedVariant?: any) => {
    if (!selectedVariant && product.variants && product.variants.length > 0) {
      setVariantSelectionProduct(product);
      return;
    }

    const cartProductName = selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name;
    const cartProductPrice = selectedVariant ? selectedVariant.price : product.price;

    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id && item.variant_id === selectedVariant?.id);
      if (existing) {
        return prev.map(item =>
          (item.product_id === product.id && item.variant_id === selectedVariant?.id)
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: `oi-${Date.now()}-${product.id}`,
          product_id: product.id,
          product_name: cartProductName,
          variant_id: selectedVariant?.id,
          variant_name: selectedVariant?.name,
          qty: 1,
          unit_price: Number(cartProductPrice)
        }
      ];
    });
    setVariantSelectionProduct(null);
  };

  const updateQty = (cartItemId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.id === cartItemId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
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

    await runAction('Processing POS Checkout...', async () => {
      await checkoutMut.mutateAsync({
        ...newOrderData,
        payment_method: paymentMethod
      });
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
    variantSelectionProduct, setVariantSelectionProduct,
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
