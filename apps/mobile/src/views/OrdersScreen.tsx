import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Order, OrderStatus } from '@restaurant-saas/shared-schemas';
import { formatCurrency } from '@restaurant-saas/ui';
import { LightColors, LineModeColors } from '../theme/colors';

interface OrdersScreenProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  isLineMode: boolean;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({ orders, onUpdateOrderStatus, isLineMode }) => {
  const colors = isLineMode ? LineModeColors : LightColors;
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  return (
    <View style={[styles.container, { backgroundColor: colors.steel }]}>
      {/* Filter Chips */}
      <View style={styles.filterBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollContainer}
          contentContainerStyle={styles.filterScrollContent}
        >
          {filterChips.map(chip => {
            const isSelected = statusFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.mist
                  }
                ]}
                onPress={() => setStatusFilter(chip.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, { color: isSelected ? '#FFFFFF' : colors.ink }]}>
                  {chip.label}
                </Text>
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
          <View style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
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
          </View>
        )}
      />
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
  totalAmount: { fontSize: 15, fontWeight: 'bold', fontFamily: 'monospace' }
});
