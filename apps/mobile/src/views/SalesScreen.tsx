import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Order } from '@restaurant-saas/shared-schemas';
import { LightColors, LineModeColors } from '../theme/colors';

interface SalesScreenProps {
  orders: Order[];
  isLineMode: boolean;
}

export const SalesScreen: React.FC<SalesScreenProps> = ({ orders, isLineMode }) => {
  const colors = isLineMode ? LineModeColors : LightColors;
  const [filterType, setFilterType] = useState<string>('all');

  // Safe Number parser for PostgreSQL numeric/decimal strings
  const toNum = (val: any): number => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Filter completed and active paid sales
  const salesOrders = orders.filter(o => o.status === 'completed' || o.status === 'ready' || o.status === 'preparing');

  const filteredSales = salesOrders.filter(o => {
    if (filterType === 'dine_in') return o.type === 'dine_in';
    if (filterType === 'takeaway') return o.type === 'takeaway';
    if (filterType === 'delivery') return o.type === 'delivery';
    return true;
  });

  const totalSalesRevenue = filteredSales.reduce((sum, o) => sum + toNum(o.total), 0);
  const totalTaxCollected = filteredSales.reduce((sum, o) => sum + toNum(o.tax), 0);
  const totalDiscounts = filteredSales.reduce((sum, o) => sum + toNum(o.discount), 0);
  const avgOrderValue = filteredSales.length > 0 ? totalSalesRevenue / filteredSales.length : 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.steel }]} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
        <Text style={[styles.sectionTitle, { color: colors.graphite }]}>SALES & REVENUE TRACKER</Text>
        <Text style={[styles.totalRevenueText, { color: colors.ink }]}>${toNum(totalSalesRevenue).toFixed(2)}</Text>
        <Text style={[styles.subText, { color: colors.graphite }]}>
          {filteredSales.length} Total Processed Sales Transactions
        </Text>

        {/* Quick KPI Bar */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: colors.steel, borderColor: colors.mist }]}>
            <Text style={[styles.kpiLabel, { color: colors.graphite }]}>AVG TICKET</Text>
            <Text style={[styles.kpiValue, { color: colors.primary }]}>${toNum(avgOrderValue).toFixed(2)}</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.steel, borderColor: colors.mist }]}>
            <Text style={[styles.kpiLabel, { color: colors.graphite }]}>TAX COLLECTED</Text>
            <Text style={[styles.kpiValue, { color: colors.ink }]}>${toNum(totalTaxCollected).toFixed(2)}</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.steel, borderColor: colors.mist }]}>
            <Text style={[styles.kpiLabel, { color: colors.graphite }]}>DISCOUNTS</Text>
            <Text style={[styles.kpiValue, { color: colors.danger }]}>${toNum(totalDiscounts).toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { id: 'all', label: 'All Sales' },
          { id: 'dine_in', label: 'Dine-In' },
          { id: 'takeaway', label: 'Takeaway' },
          { id: 'delivery', label: 'Delivery' }
        ].map(tab => {
          const isActive = filterType === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor: isActive ? colors.primary : colors.mist
                }
              ]}
              onPress={() => setFilterType(tab.id)}
            >
              <Text style={[styles.filterTabText, { color: isActive ? '#FFFFFF' : colors.ink }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sales Transactions Table List */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
        <Text style={[styles.sectionTitle, { color: colors.graphite }]}>RECENT SALES RECEIPTS</Text>

        {filteredSales.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.graphite }]}>No sales transactions recorded yet.</Text>
          </View>
        ) : (
          filteredSales.map(sale => (
            <View key={sale.id} style={[styles.saleRow, { borderColor: colors.mist }]}>
              <View style={styles.saleRowLeft}>
                <View style={styles.saleNumRow}>
                  <Text style={[styles.saleNum, { color: colors.ink }]}>{sale.order_number || sale.id}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: colors.steel }]}>
                    <Text style={[styles.typeBadgeText, { color: colors.graphite }]}>
                      {sale.type.toUpperCase().replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.saleClient, { color: colors.graphite }]}>
                  {sale.client_name || 'Walk-in Guest'} {sale.table_no ? `· Table ${sale.table_no}` : ''}
                </Text>
                <Text style={[styles.saleItemsSummary, { color: colors.graphite }]}>
                  {sale.items?.map(i => `${i.qty}x ${i.product_name}`).join(', ') || 'Item List'}
                </Text>
              </View>

              <View style={styles.saleRowRight}>
                <Text style={[styles.saleTotal, { color: colors.ink }]}>${toNum(sale.total).toFixed(2)}</Text>
                <Text style={[styles.saleDate, { color: colors.graphite }]}>
                  {new Date(sale.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 0.5, marginBottom: 10 },
  totalRevenueText: { fontSize: 32, fontWeight: 'bold' },
  subText: { fontSize: 11, fontFamily: 'monospace', marginTop: 2, marginBottom: 14 },
  kpiGrid: { flexDirection: 'row', gap: 8 },
  kpiCard: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  kpiLabel: { fontSize: 8, fontWeight: 'bold', fontFamily: 'monospace' },
  kpiValue: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 6 },
  filterTab: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  filterTabText: { fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace' },
  emptyState: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 12, fontFamily: 'monospace' },
  saleRow: { borderBottomWidth: 1, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saleRowLeft: { flex: 1, paddingRight: 10 },
  saleNumRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saleNum: { fontSize: 15, fontWeight: 'bold' },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeBadgeText: { fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' },
  saleClient: { fontSize: 11, marginTop: 2, fontFamily: 'monospace' },
  saleItemsSummary: { fontSize: 11, marginTop: 4 },
  saleRowRight: { alignItems: 'flex-end' },
  saleTotal: { fontSize: 16, fontWeight: 'bold' },
  saleDate: { fontSize: 10, fontFamily: 'monospace', marginTop: 2 }
});
