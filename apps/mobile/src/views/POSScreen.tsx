import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Image,
  Alert
} from 'react-native';
import { Product, OrderItem, Client } from '@restaurant-saas/shared-schemas';
import { LightColors, LineModeColors } from '../theme/colors';
import {
  ShoppingCart,
  Search,
  UserCheck,
  CreditCard,
  DollarSign,
  Smartphone,
  BookOpen,
  Plus,
  Minus,
  X,
  CheckCircle2,
  Phone,
  ArrowRight
} from 'lucide-react-native';

interface POSScreenProps {
  products: Product[];
  clients?: Client[];
  onCompleteOrder: (newOrder: any) => void;
  isLineMode: boolean;
}

export const POSScreen: React.FC<POSScreenProps> = ({ products, clients = [], onCompleteOrder, isLineMode }) => {
  const colors = isLineMode ? LineModeColors : LightColors;
  const iconColor = colors.primary;

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [tableNo, setTableNo] = useState('T4');

  // Customer CRM Search & Payment Selection
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online' | 'borrow_credit'>('cash');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);

  const categories = Array.from(new Set(products.map(p => p.category_name)));

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category_name === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredClients = clients.filter(c =>
    (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone || '').includes(customerSearch)
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: `oi-${Date.now()}-${product.id}`,
          product_id: product.id,
          product_name: product.name,
          qty: 1,
          unit_price: toNum(product.price)
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

  const toNum = (val: any): number => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = cart.reduce((sum, i) => sum + i.qty * toNum(i.unit_price), 0);
  const tax = subtotal * 0.1;
  const grandTotal = subtotal + tax;

  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'borrow_credit' && !selectedClient) {
      Alert.alert('Customer Required', 'Please search and select a registered customer to post debt to their credit account.');
      setIsClientPickerOpen(true);
      return;
    }

    const newOrder = {
      order_number: `#ORD-${Math.floor(100 + Math.random() * 900)}`,
      type: orderType,
      table_no: orderType === 'dine_in' ? tableNo : undefined,
      client_id: selectedClient?.id,
      client_name: selectedClient?.name || 'Walk-in Guest',
      payment_method: paymentMethod,
      items: cart,
      subtotal,
      tax,
      total: grandTotal,
      status: 'new'
    };

    onCompleteOrder(newOrder);
    setCart([]);
    setSelectedClient(null);
    setIsCartModalOpen(false);
    Alert.alert(
      'Order Processed',
      `Order ${newOrder.order_number} for ${newOrder.client_name} placed via ${paymentMethod.toUpperCase().replace('_', ' ')}.`
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.steel }]}>
      {/* Category Pills & Search */}
      <View style={styles.topSection}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
          <Search size={18} color={iconColor} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.ink }]}
            placeholder="Search dish or SKU..."
            placeholderTextColor={colors.graphite}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catScrollContainer}
          contentContainerStyle={styles.catScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.catPill,
              { backgroundColor: selectedCategory === 'all' ? colors.primary : colors.surface, borderColor: selectedCategory === 'all' ? colors.primary : colors.mist }
            ]}
            onPress={() => setSelectedCategory('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.catPillText, { color: selectedCategory === 'all' ? '#FFFFFF' : colors.ink }]}>
              All Dishes
            </Text>
          </TouchableOpacity>

          {categories.map((cat, idx) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.catPill,
                  { backgroundColor: isSelected ? colors.primary : colors.surface, borderColor: isSelected ? colors.primary : colors.mist }
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.catPillText, { color: isSelected ? '#FFFFFF' : colors.ink }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Dishes Product Grid */}
      <FlatList
        data={filteredProducts}
        numColumns={2}
        keyExtractor={(item: Product) => item.id}
        contentContainerStyle={styles.gridContent}
        renderItem={({ item }: { item: Product }) => {
          const inCart = cart.find(i => i.product_id === item.id);

          return (
            <TouchableOpacity
              style={[
                styles.dishCard,
                { backgroundColor: colors.surface, borderColor: inCart ? colors.primary : colors.mist }
              ]}
              onPress={() => addToCart(item)}
            >
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.dishImage} />
              ) : (
                <View style={[styles.dishPlaceholder, { backgroundColor: colors.steel }]}>
                  <Text style={[styles.dishSku, { color: colors.graphite }]}>{item.sku}</Text>
                </View>
              )}

              <View style={styles.dishDetails}>
                <Text style={[styles.dishName, { color: colors.ink }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.dishPrice, { color: colors.primary }]}>
                    ${toNum(item.price).toFixed(2)}
                  </Text>
                  {inCart && (
                    <View style={[styles.badgeQty, { backgroundColor: colors.primary }]}>
                      <Text style={styles.badgeText}>{inCart.qty}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <View style={styles.floatingBarContainer}>
          <TouchableOpacity
            style={[styles.floatingBar, { backgroundColor: colors.primary }]}
            onPress={() => setIsCartModalOpen(true)}
          >
            <View style={styles.floatingLeft}>
              <View style={styles.countBadge}>
                <Text style={[styles.countBadgeText, { color: colors.primary }]}>{totalItems}</Text>
              </View>
              <Text style={styles.floatingTitle}>VIEW POS CART</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.floatingPrice}>${grandTotal.toFixed(2)}</Text>
              <ArrowRight size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Cart & Checkout Sheet Drawer Modal */}
      <Modal visible={isCartModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.titleIconRow}>
                <ShoppingCart size={20} color={iconColor} style={{ marginRight: 6 }} />
                <Text style={[styles.sheetTitle, { color: colors.ink }]}>POS Order Checkout</Text>
              </View>
              <TouchableOpacity onPress={() => setIsCartModalOpen(false)}>
                <X size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>

            {/* Customer Search & Debt Assignment Bar */}
            <View style={[styles.sectionBox, { backgroundColor: colors.steel, borderColor: colors.mist }]}>
              <Text style={[styles.sectionLabel, { color: colors.graphite }]}>CUSTOMER CRM ASSIGNMENT</Text>
              <TouchableOpacity
                style={[styles.clientSelectBtn, { backgroundColor: colors.surface, borderColor: colors.mist }]}
                onPress={() => setIsClientPickerOpen(true)}
              >
                <UserCheck size={16} color={iconColor} />
                <Text style={[styles.clientSelectText, { color: selectedClient ? colors.ink : colors.graphite }]}>
                  {selectedClient ? `${selectedClient.name} (${selectedClient.phone})` : 'Tap to search customer directory...'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Order Type Toggle */}
            <View style={styles.typeToggleRow}>
              {[
                { id: 'dine_in', label: 'Dine-In' },
                { id: 'takeaway', label: 'Takeaway' },
                { id: 'delivery', label: 'Delivery' }
              ].map(t => {
                const isActive = orderType === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.typePill,
                      {
                        backgroundColor: isActive ? colors.primary : colors.steel,
                        borderColor: isActive ? colors.primary : colors.mist
                      }
                    ]}
                    onPress={() => setOrderType(t.id as any)}
                  >
                    <Text style={[styles.typePillText, { color: isActive ? '#FFFFFF' : colors.ink }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Payment Method Selector */}
            <View style={[styles.sectionBox, { backgroundColor: colors.steel, borderColor: colors.mist }]}>
              <Text style={[styles.sectionLabel, { color: colors.graphite }]}>SELECT PAYMENT METHOD</Text>
              <View style={styles.payMethodGrid}>
                {[
                  { id: 'cash', label: 'Cash', icon: DollarSign },
                  { id: 'card', label: 'Card / POS', icon: CreditCard },
                  { id: 'online', label: 'Online UPI', icon: Smartphone },
                  { id: 'borrow_credit', label: 'Account Debt', icon: BookOpen }
                ].map(pm => {
                  const IconComp = pm.icon;
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <TouchableOpacity
                      key={pm.id}
                      style={[
                        styles.payMethodCard,
                        {
                          backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.mist
                        }
                      ]}
                      onPress={() => setPaymentMethod(pm.id as any)}
                    >
                      <IconComp size={16} color={isSelected ? colors.primary : colors.graphite} />
                      <Text style={[styles.payMethodLabel, { color: isSelected ? colors.primary : colors.ink }]}>
                        {pm.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Cart Items List */}
            <ScrollView style={styles.cartList}>
              {cart.map(item => (
                <View key={item.id} style={[styles.cartItemRow, { borderColor: colors.mist }]}>
                  <View style={styles.cartItemInfo}>
                    <Text style={[styles.cartItemName, { color: colors.ink }]}>{item.product_name}</Text>
                    <Text style={[styles.cartItemPrice, { color: colors.graphite }]}>
                      ${toNum(item.unit_price).toFixed(2)} each
                    </Text>
                  </View>

                  <View style={styles.qtyControl}>
                    <TouchableOpacity
                      style={[styles.qtyBtn, { backgroundColor: colors.steel, borderColor: colors.mist }]}
                      onPress={() => updateQty(item.product_id, -1)}
                    >
                      <Minus size={14} color={colors.ink} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyNum, { color: colors.ink }]}>{item.qty}</Text>
                    <TouchableOpacity
                      style={[styles.qtyBtn, { backgroundColor: colors.steel, borderColor: colors.mist }]}
                      onPress={() => updateQty(item.product_id, 1)}
                    >
                      <Plus size={14} color={colors.ink} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.itemSubtotal, { color: colors.ink }]}>
                    ${(item.qty * toNum(item.unit_price)).toFixed(2)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Price Calculations & Place Order */}
            <View style={[styles.summaryBox, { borderColor: colors.mist }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.graphite }]}>Subtotal</Text>
                <Text style={[styles.summaryVal, { color: colors.ink }]}>${subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.graphite }]}>Tax (10%)</Text>
                <Text style={[styles.summaryVal, { color: colors.ink }]}>${tax.toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={[styles.totalLabel, { color: colors.ink }]}>Total Due</Text>
                <Text style={[styles.totalVal, { color: colors.primary }]}>${grandTotal.toFixed(2)}</Text>
              </View>

              <TouchableOpacity
                style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
                onPress={handleCheckout}
              >
                <Text style={styles.checkoutBtnText}>PLACE POS ORDER (${grandTotal.toFixed(2)})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Picker Modal */}
      <Modal visible={isClientPickerOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, maxHeight: '80%' }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.ink }]}>Select Customer CRM Account</Text>
              <TouchableOpacity onPress={() => setIsClientPickerOpen(false)}>
                <X size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { backgroundColor: colors.steel, borderColor: colors.mist, marginBottom: 12 }]}>
              <Search size={18} color={iconColor} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.ink }]}
                placeholder="Search customer name or phone..."
                placeholderTextColor={colors.graphite}
                value={customerSearch}
                onChangeText={setCustomerSearch}
              />
            </View>

            <ScrollView style={styles.cartList}>
              {filteredClients.map(client => (
                <TouchableOpacity
                  key={client.id}
                  style={[
                    styles.clientPickerItem,
                    {
                      borderColor: selectedClient?.id === client.id ? colors.primary : colors.mist,
                      backgroundColor: selectedClient?.id === client.id ? colors.primaryLight : colors.surface
                    }
                  ]}
                  onPress={() => {
                    setSelectedClient(client);
                    setIsClientPickerOpen(false);
                  }}
                >
                  <View>
                    <Text style={[styles.clientPickerName, { color: colors.ink }]}>{client.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Phone size={11} color={colors.graphite} style={{ marginRight: 4 }} />
                      <Text style={[styles.clientPickerSub, { color: colors.graphite }]}>{client.phone}</Text>
                    </View>
                  </View>
                  <Text style={[styles.creditBal, { color: toNum(client.credit_balance) > 0 ? colors.danger : colors.primary }]}>
                    Debt: ${toNum(client.credit_balance).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: { padding: 12, gap: 10, flexShrink: 0 },
  searchBox: { height: 44, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 13 },
  catScrollContainer: { height: 52, minHeight: 52, flexGrow: 0, flexShrink: 0 },
  catScrollContent: { paddingHorizontal: 2, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' },
  catPill: { height: 36, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, marginRight: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  catPillText: { fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace', textAlign: 'center' },
  gridContent: { paddingHorizontal: 6, paddingBottom: 80 },
  dishCard: { flex: 0.5, margin: 6, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  dishImage: { width: '100%', height: 100 },
  dishPlaceholder: { width: '100%', height: 100, justifyContent: 'center', alignItems: 'center' },
  dishSku: { fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace' },
  dishDetails: { padding: 10 },
  dishName: { fontSize: 13, fontWeight: 'bold', height: 34 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  dishPrice: { fontSize: 14, fontWeight: 'bold' },
  badgeQty: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' },
  floatingBarContainer: { position: 'absolute', bottom: 12, left: 16, right: 16 },
  floatingBar: { height: 50, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  floatingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  countBadgeText: { fontWeight: 'bold', fontSize: 12, fontFamily: 'monospace' },
  floatingTitle: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13, fontFamily: 'monospace' },
  floatingPrice: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleIconRow: { flexDirection: 'row', alignItems: 'center' },
  sheetTitle: { fontSize: 16, fontWeight: 'bold' },
  sectionBox: { padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 10, gap: 6 },
  sectionLabel: { fontSize: 8.5, fontWeight: 'bold', fontFamily: 'monospace' },
  clientSelectBtn: { height: 38, borderRadius: 6, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8 },
  clientSelectText: { fontSize: 12, fontFamily: 'monospace', flex: 1 },
  typeToggleRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  typePill: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  typePillText: { fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' },
  payMethodGrid: { flexDirection: 'row', gap: 6 },
  payMethodCard: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 6, borderWidth: 1, alignItems: 'center', gap: 4 },
  payMethodLabel: { fontSize: 9.5, fontWeight: 'bold', fontFamily: 'monospace', textAlign: 'center' },
  cartList: { maxHeight: 180 },
  cartItemRow: { borderBottomWidth: 1, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 13, fontWeight: 'bold' },
  cartItemPrice: { fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 10 },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  qtyNum: { fontSize: 14, fontWeight: 'bold', fontFamily: 'monospace' },
  itemSubtotal: { fontSize: 13, fontWeight: 'bold' },
  summaryBox: { borderTopWidth: 1, paddingTop: 10, gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 12, fontFamily: 'monospace' },
  summaryVal: { fontSize: 12, fontWeight: 'bold' },
  totalRow: { marginTop: 4, paddingTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: 'bold' },
  totalVal: { fontSize: 18, fontWeight: 'bold' },
  checkoutBtn: { height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  checkoutBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13, fontFamily: 'monospace' },
  clientPickerItem: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientPickerName: { fontSize: 14, fontWeight: 'bold' },
  clientPickerSub: { fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  creditBal: { fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace' }
});
