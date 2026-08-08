import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Modal, TextInput } from 'react-native';
import { Order, OrderStatus, Product, OrderItem } from '@restaurant-saas/shared-schemas';
import { formatCurrency } from '@restaurant-saas/ui';
import { LightColors, LineModeColors } from '../theme/colors';
import { X, Plus, Minus, Search, CheckCircle2 } from 'lucide-react-native';

interface OrdersScreenProps {
  orders: Order[];
  products?: Product[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onUpdateOrderItems?: (orderId: string, items: any[], newTotal: number, newSubtotal: number, newTax: number) => void;
  isLineMode: boolean;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({ orders, products = [], onUpdateOrderStatus, onUpdateOrderItems, isLineMode }) => {
  const colors = isLineMode ? LineModeColors : LightColors;
  const iconColor = colors.primary;

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Edit State
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [variantSelectionProduct, setVariantSelectionProduct] = useState<Product | null>(null);

  const filterChips = [
    { id: 'all', label: 'All Orders' },
    { id: 'new', label: 'New' },
    { id: 'preparing', label: 'Preparing' },
    { id: 'ready', label: 'Ready' },
    { id: 'completed', label: 'Completed' }
  ];

  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'all') return true;
    return o.status === statusFilter;
  });

  const searchedProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setEditItems([...order.items]);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setEditItems([]);
    setProductSearch('');
  };

  const toNum = (val: any): number => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleUpdateQty = (cartItemId: string, delta: number) => {
    setEditItems(prev => prev.map(item => {
      if (item.id === cartItemId) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean) as OrderItem[]);
  };

  const handleAddProduct = (product: Product, selectedVariant?: any) => {
    if (!selectedVariant && product.variants && product.variants.length > 0) {
      setVariantSelectionProduct(product);
      return;
    }

    const cartProductName = selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name;
    const cartProductPrice = selectedVariant ? selectedVariant.price : product.price;

    setEditItems(prev => {
      const existing = prev.find(item => item.product_id === product.id && item.variant_id === selectedVariant?.id);
      if (existing) {
        return prev.map(item =>
          (item.product_id === product.id && item.variant_id === selectedVariant?.id) 
            ? { ...item, qty: item.qty + 1 } : item
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
          unit_price: toNum(cartProductPrice)
        }
      ];
    });
    setVariantSelectionProduct(null);
  };

  const handleSaveChanges = () => {
    if (!selectedOrder || !onUpdateOrderItems) return;
    
    // Recalculate totals
    const newSubtotal = editItems.reduce((sum, i) => sum + (i.qty * toNum(i.unit_price)), 0);
    // Simplified tax/discount preservation based on original order ratios if needed, 
    // but for now, we just recalculate tax assuming a standard rate or original rate.
    const originalSubtotal = toNum(selectedOrder.subtotal);
    const originalTax = toNum(selectedOrder.tax);
    const taxRate = originalSubtotal > 0 ? (originalTax / originalSubtotal) : 0;
    
    const originalDiscount = toNum(selectedOrder.discount);
    // Flat discount assumed
    
    const taxableTotal = newSubtotal - originalDiscount;
    const newTax = Math.max(0, taxableTotal * taxRate);
    const newTotal = Math.max(0, taxableTotal + newTax);

    onUpdateOrderItems(selectedOrder.id, editItems, newTotal, newSubtotal, newTax);
    closeOrderDetails();
  };

  const handleChangeStatus = (status: string) => {
    if (selectedOrder) {
      onUpdateOrderStatus(selectedOrder.id, status as OrderStatus);
      setSelectedOrder({ ...selectedOrder, status: status as OrderStatus });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.steel }]}>
      {/* Filter Chips */}
      <View style={styles.filterBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollContainer} contentContainerStyle={styles.filterScrollContent}>
          {filterChips.map(chip => {
            const isSelected = statusFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[styles.filterChip, { backgroundColor: isSelected ? colors.primary : colors.surface, borderColor: isSelected ? colors.primary : colors.mist }]}
                onPress={() => setStatusFilter(chip.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, { color: isSelected ? '#FFFFFF' : colors.ink }]}>{chip.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item: Order) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }: { item: Order }) => (
          <TouchableOpacity 
            style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.mist }]}
            onPress={() => openOrderDetails(item)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.orderNum, { color: colors.ink }]}>{item.order_number}</Text>
                <Text style={[styles.tableInfo, { color: colors.graphite }]}>
                  {item.table_no ? `Table ${item.table_no}` : item.type.toUpperCase()} · {item.client_name}
                </Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.statusBadgeText, { color: colors.primary }]}>{item.status.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.itemList}>
              {item.items.map((it: any, idx: number) => (
                <Text key={idx} style={[styles.itemLine, { color: colors.ink }]}>
                  {it.qty}x {it.product_name}
                </Text>
              ))}
            </View>

            <View style={[styles.cardFooter, { borderTopColor: colors.mist }]}>
              <Text style={[styles.totalLabel, { color: colors.graphite }]}>Total Payable:</Text>
              <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatCurrency(item.total)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Order Details & Edit Modal */}
      <Modal visible={!!selectedOrder} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.ink }]}>Edit Order: {selectedOrder?.order_number}</Text>
              <TouchableOpacity onPress={closeOrderDetails}>
                <X size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: '85%' }}>
              {/* Status Updater */}
              <View style={[styles.sectionBox, { backgroundColor: colors.steel, borderColor: colors.mist }]}>
                <Text style={[styles.sectionLabel, { color: colors.graphite }]}>UPDATE STATUS</Text>
                <View style={styles.statusChipsRow}>
                  {['new', 'preparing', 'ready', 'completed'].map(s => {
                    const isActive = selectedOrder?.status === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[styles.statusUpdateChip, { backgroundColor: isActive ? colors.primary : colors.surface, borderColor: isActive ? colors.primary : colors.mist }]}
                        onPress={() => handleChangeStatus(s)}
                      >
                        <Text style={[styles.statusUpdateText, { color: isActive ? '#fff' : colors.ink }]}>{s.toUpperCase()}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Items List Editor */}
              <View style={[styles.sectionBox, { backgroundColor: colors.steel, borderColor: colors.mist }]}>
                <Text style={[styles.sectionLabel, { color: colors.graphite }]}>ORDER ITEMS</Text>
                {editItems.map(item => (
                  <View key={item.id} style={[styles.cartItemRow, { borderColor: colors.mist }]}>
                    <View style={styles.cartItemInfo}>
                      <Text style={[styles.cartItemName, { color: colors.ink }]}>{item.product_name}</Text>
                      <Text style={[styles.cartItemPrice, { color: colors.graphite }]}>${toNum(item.unit_price).toFixed(2)} each</Text>
                    </View>
                    <View style={styles.qtyControl}>
                      <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.surface, borderColor: colors.mist }]} onPress={() => handleUpdateQty(item.id!, -1)}>
                        <Minus size={14} color={colors.ink} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyNum, { color: colors.ink }]}>{item.qty}</Text>
                      <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.surface, borderColor: colors.mist }]} onPress={() => handleUpdateQty(item.id!, 1)}>
                        <Plus size={14} color={colors.ink} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* Add New Item Search */}
              <View style={[styles.sectionBox, { backgroundColor: colors.steel, borderColor: colors.mist }]}>
                <Text style={[styles.sectionLabel, { color: colors.graphite }]}>ADD MORE ITEMS</Text>
                <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
                  <Search size={18} color={colors.graphite} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.ink }]}
                    placeholder="Search products..."
                    placeholderTextColor={colors.graphite}
                    value={productSearch}
                    onChangeText={setProductSearch}
                  />
                </View>
                {productSearch.length > 0 && (
                  <View style={styles.searchResults}>
                    {searchedProducts.slice(0, 5).map(p => (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.searchResultItem, { borderBottomColor: colors.mist }]}
                        onPress={() => handleAddProduct(p)}
                      >
                        <View>
                          <Text style={{ color: colors.ink, fontWeight: 'bold' }}>{p.name}</Text>
                          <Text style={{ color: colors.graphite, fontSize: 12 }}>${toNum(p.price).toFixed(2)}</Text>
                        </View>
                        <Plus size={18} color={colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveChanges}>
                <Text style={styles.saveBtnText}>SAVE ORDER CHANGES</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Variant Selection Modal */}
      <Modal visible={!!variantSelectionProduct} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.ink }]}>Select Size: {variantSelectionProduct?.name}</Text>
              <TouchableOpacity onPress={() => setVariantSelectionProduct(null)}>
                <X size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {variantSelectionProduct?.variants?.map(variant => (
                <TouchableOpacity
                  key={variant.id}
                  style={[styles.searchResultItem, { borderColor: colors.mist, backgroundColor: colors.surface, paddingHorizontal: 12 }]}
                  onPress={() => handleAddProduct(variantSelectionProduct, variant)}
                >
                  <Text style={{ color: colors.ink, fontWeight: 'bold', fontSize: 16 }}>{variant.name}</Text>
                  <Text style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold' }}>
                    ${toNum(variant.price).toFixed(2)}
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
  filterBarWrapper: { height: 52, minHeight: 52, flexShrink: 0, flexGrow: 0, justifyContent: 'center' },
  filterScrollContainer: { height: 52, minHeight: 52, flexShrink: 0, flexGrow: 0 },
  filterScrollContent: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip: { height: 36, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, marginRight: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  filterChipText: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  listContent: { padding: 12 },
  orderCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderNum: { fontSize: 16, fontWeight: 'bold', fontFamily: 'monospace' },
  tableInfo: { fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace' },
  itemList: { marginBottom: 10 },
  itemLine: { fontSize: 12, marginVertical: 2 },
  cardFooter: { borderTopWidth: 1, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 11, fontFamily: 'monospace' },
  totalAmount: { fontSize: 15, fontWeight: 'bold', fontFamily: 'monospace' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: 'bold' },
  sectionBox: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  sectionLabel: { fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 8 },
  statusChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusUpdateChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  statusUpdateText: { fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' },
  cartItemRow: { borderBottomWidth: 1, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 13, fontWeight: 'bold' },
  cartItemPrice: { fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  qtyNum: { fontSize: 14, fontWeight: 'bold', fontFamily: 'monospace' },
  searchBox: { height: 40, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 13 },
  searchResults: { marginTop: 8 },
  searchResultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  saveBtn: { height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13, fontFamily: 'monospace' }
});
