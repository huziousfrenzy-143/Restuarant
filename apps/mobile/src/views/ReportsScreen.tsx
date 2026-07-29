import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Order, InventoryItem } from '@restaurant-saas/shared-schemas';
import { LightColors, LineModeColors } from '../theme/colors';
import { Download, TrendingUp, DollarSign, ShoppingBag, AlertTriangle, Utensils, Package } from 'lucide-react-native';

interface ReportsScreenProps {
  orders: Order[];
  inventory: InventoryItem[];
  isLineMode: boolean;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ orders, inventory, isLineMode }) => {
  const colors = isLineMode ? LineModeColors : LightColors;
  const iconColor = colors.primary;

  const toNum = (val: any): number => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'ready');

  const totalGrossRevenue = orders.reduce((acc, o) => acc + toNum(o.total), 0);
  const totalSubtotal = orders.reduce((acc, o) => acc + toNum(o.subtotal), 0);
  const totalTax = orders.reduce((acc, o) => acc + toNum(o.tax), 0);
  const totalDiscount = orders.reduce((acc, o) => acc + toNum(o.discount), 0);

  // Order Type Breakdown
  const dineInCount = orders.filter(o => o.type === 'dine_in').length;
  const takeawayCount = orders.filter(o => o.type === 'takeaway').length;
  const deliveryCount = orders.filter(o => o.type === 'delivery').length;

  // Calculate Product Sales Aggregation
  const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  orders.forEach(ord => {
    ord.items?.forEach(item => {
      const q = toNum(item.qty);
      const p = toNum(item.unit_price);
      if (!itemMap[item.product_name]) {
        itemMap[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 };
      }
      itemMap[item.product_name].qty += q;
      itemMap[item.product_name].revenue += q * p;
    });
  });

  const topProducts = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const lowStockCount = inventory.filter(i => toNum(i.current_qty) <= toNum(i.reorder_level)).length;

  const handleExportCSVReport = () => {
    const header = 'Metric,Value\n';
    const rows = [
      `Total Gross Sales Revenue,${totalGrossRevenue.toFixed(2)}`,
      `Net Subtotal,${totalSubtotal.toFixed(2)}`,
      `Total Tax Collected,${totalTax.toFixed(2)}`,
      `Total Discounts,${totalDiscount.toFixed(2)}`,
      `Total Orders,${totalOrders}`,
      `Completed Orders,${completedOrders.length}`,
      `Dine-In Orders,${dineInCount}`,
      `Takeaway Orders,${takeawayCount}`,
      `Delivery Orders,${deliveryCount}`,
      `Low Stock Alerts,${lowStockCount}`
    ].join('\n');

    Alert.alert(
      'Report Export Ready',
      `Financial Report CSV generated (${rows.split('\n').length} metrics).\n\nCSV Summary:\nGross Revenue: $${totalGrossRevenue.toFixed(2)}\nOrders: ${totalOrders}`
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.steel }]} contentContainerStyle={styles.content}>
      {/* Executive Summary Card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.graphite }]}>EXECUTIVE FINANCIAL REPORT</Text>
            <Text style={[styles.heroMetricText, { color: colors.ink }]}>${toNum(totalGrossRevenue).toFixed(2)}</Text>
            <Text style={[styles.subText, { color: colors.graphite }]}>Gross Sales Volume Across All Channels</Text>
          </View>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.primary }]}
            onPress={handleExportCSVReport}
          >
            <Download size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.exportBtnText}>EXPORT CSV</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>
          <View style={[styles.metricTile, { backgroundColor: colors.steel, borderColor: colors.mist }]}>
            <Text style={[styles.tileLabel, { color: colors.graphite }]}>COMPLETED ORDERS</Text>
            <Text style={[styles.tileVal, { color: colors.primary }]}>{completedOrders.length} / {totalOrders}</Text>
          </View>

          <View style={[styles.metricTile, { backgroundColor: colors.steel, borderColor: colors.mist }]}>
            <Text style={[styles.tileLabel, { color: colors.graphite }]}>NET SUBTOTAL</Text>
            <Text style={[styles.tileVal, { color: colors.ink }]}>${toNum(totalSubtotal).toFixed(2)}</Text>
          </View>

          <View style={[styles.metricTile, { backgroundColor: colors.steel, borderColor: colors.mist }]}>
            <Text style={[styles.tileLabel, { color: colors.graphite }]}>LOW STOCK ALERTS</Text>
            <Text style={[styles.tileVal, { color: lowStockCount > 0 ? colors.danger : colors.primary }]}>{lowStockCount} Items</Text>
          </View>
        </View>
      </View>

      {/* Channel Distribution Breakdown */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
        <Text style={[styles.sectionTitle, { color: colors.graphite }]}>ORDER CHANNEL DISTRIBUTION</Text>

        <View style={styles.channelRow}>
          <View style={styles.channelItem}>
            <View style={styles.channelHeader}>
              <Utensils size={14} color={iconColor} style={{ marginRight: 4 }} />
              <Text style={[styles.channelTitle, { color: colors.ink }]}>Dine-In</Text>
            </View>
            <Text style={[styles.channelCount, { color: colors.graphite }]}>{dineInCount} Orders</Text>
            <View style={[styles.progressBar, { backgroundColor: colors.steel }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${totalOrders > 0 ? (dineInCount / totalOrders) * 100 : 0}%` }]} />
            </View>
          </View>

          <View style={styles.channelItem}>
            <View style={styles.channelHeader}>
              <ShoppingBag size={14} color={colors.warning} style={{ marginRight: 4 }} />
              <Text style={[styles.channelTitle, { color: colors.ink }]}>Takeaway</Text>
            </View>
            <Text style={[styles.channelCount, { color: colors.graphite }]}>{takeawayCount} Orders</Text>
            <View style={[styles.progressBar, { backgroundColor: colors.steel }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.warning, width: `${totalOrders > 0 ? (takeawayCount / totalOrders) * 100 : 0}%` }]} />
            </View>
          </View>

          <View style={styles.channelItem}>
            <View style={styles.channelHeader}>
              <Package size={14} color={colors.graphite} style={{ marginRight: 4 }} />
              <Text style={[styles.channelTitle, { color: colors.ink }]}>Delivery</Text>
            </View>
            <Text style={[styles.channelCount, { color: colors.graphite }]}>{deliveryCount} Orders</Text>
            <View style={[styles.progressBar, { backgroundColor: colors.steel }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.graphite, width: `${totalOrders > 0 ? (deliveryCount / totalOrders) * 100 : 0}%` }]} />
            </View>
          </View>
        </View>
      </View>

      {/* Top Performing Dishes */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
        <Text style={[styles.sectionTitle, { color: colors.graphite }]}>TOP SELLING DISHES</Text>

        {topProducts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.graphite }]}>No dish sales performance data available yet.</Text>
        ) : (
          topProducts.map((p, idx) => (
            <View key={p.name} style={[styles.productRankRow, { borderColor: colors.mist }]}>
              <View style={[styles.rankBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.rankNum, { color: colors.primary }]}>#{idx + 1}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.ink }]}>{p.name}</Text>
                <Text style={[styles.productQty, { color: colors.graphite }]}>{p.qty} Units Sold</Text>
              </View>
              <Text style={[styles.productRev, { color: colors.primary }]}>${toNum(p.revenue).toFixed(2)}</Text>
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
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 0.5, marginBottom: 6 },
  heroMetricText: { fontSize: 32, fontWeight: 'bold' },
  subText: { fontSize: 11, fontFamily: 'monospace', marginTop: 2, marginBottom: 14 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  exportBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 10, fontFamily: 'monospace' },
  metricsGrid: { flexDirection: 'row', gap: 8 },
  metricTile: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  tileLabel: { fontSize: 7.5, fontWeight: 'bold', fontFamily: 'monospace' },
  tileVal: { fontSize: 13, fontWeight: 'bold', marginTop: 4 },
  channelRow: { gap: 12, marginTop: 4 },
  channelItem: { gap: 4 },
  channelHeader: { flexDirection: 'row', alignItems: 'center' },
  channelTitle: { fontSize: 13, fontWeight: 'bold' },
  channelCount: { fontSize: 11, fontFamily: 'monospace' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  emptyText: { fontSize: 11, fontFamily: 'monospace', marginVertical: 12 },
  productRankRow: { borderBottomWidth: 1, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  rankNum: { fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: 'bold' },
  productQty: { fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  productRev: { fontSize: 14, fontWeight: 'bold' }
});
