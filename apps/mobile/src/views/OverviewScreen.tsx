import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Order, InventoryItem } from '@restaurant-saas/shared-schemas';
import { formatCurrency } from '@restaurant-saas/ui';
import { LightColors, LineModeColors } from '../theme/colors';
import { ShoppingCart, Flame, TrendingUp } from 'lucide-react-native';

interface OverviewScreenProps {
  orders: Order[];
  inventory: InventoryItem[];
  onNavigateTab: (tab: string) => void;
  isLineMode: boolean;
  orgName: string;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  orders,
  inventory,
  onNavigateTab,
  isLineMode,
  orgName
}) => {
  const colors = isLineMode ? LineModeColors : LightColors;
  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const todayTotalSales = orders.reduce((sum, o) => sum + (Number(o?.total) || 0), 0);
  const lowStockItems = inventory.filter(i => i.status === 'low_stock' || i.status === 'out_of_stock');

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.steel }]} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.ink }]}>Owner Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.graphite }]}>
            Real-time Summary · {orgName}
          </Text>
        </View>
      </View>

      {/* Quick Launch Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => onNavigateTab('pos')}
        >
          <ShoppingCart size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnText}>POS TERMINAL</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.warning }]}
          onPress={() => onNavigateTab('kds')}
        >
          <Flame size={14} color="#000000" style={{ marginRight: 6 }} />
          <Text style={[styles.actionBtnText, { color: '#000000' }]}>KDS RAIL</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        {/* Card 1: Today's Revenue */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
          <Text style={[styles.cardLabel, { color: colors.graphite }]}>TODAY'S REVENUE</Text>
          <Text style={[styles.cardValue, { color: colors.ink }]}>{formatCurrency(todayTotalSales)}</Text>
          <View style={styles.badgeRow}>
            <TrendingUp size={12} color={colors.success} style={{ marginRight: 4 }} />
            <Text style={[styles.cardBadge, { color: colors.success }]}>+14.2% vs yesterday</Text>
          </View>
        </View>

        {/* Card 2: Active Orders */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
          <Text style={[styles.cardLabel, { color: colors.graphite }]}>ACTIVE ORDERS</Text>
          <Text style={[styles.cardValue, { color: colors.ink }]}>{activeOrders.length}</Text>
          <Text style={[styles.cardSub, { color: colors.graphite }]}>
            {orders.filter(o => o.status === 'new').length} New · {orders.filter(o => o.status === 'preparing').length} Prep
          </Text>
        </View>

        {/* Card 3: Stock Alerts */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
          <Text style={[styles.cardLabel, { color: colors.graphite }]}>LOW STOCK ALERTS</Text>
          <Text style={[styles.cardValue, { color: colors.danger }]}>{lowStockItems.length}</Text>
          <Text style={[styles.cardSub, { color: colors.graphite }]}>
            Ingredients below reorder threshold
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 16
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold'
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'monospace'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    justify: 'center',
    alignItems: 'center'
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
    fontFamily: 'monospace'
  },
  kpiContainer: {
    gap: 12
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'monospace'
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  cardBadge: {
    fontSize: 11,
    fontWeight: '600'
  },
  cardSub: {
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'monospace'
  }
});
