import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Order, OrderStatus } from '@restaurant-saas/shared-schemas';
import { LineModeColors } from '../theme/colors';

interface KDSScreenProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
}

export const KDSScreen: React.FC<KDSScreenProps> = ({ orders, onUpdateOrderStatus }) => {
  const activeOrders = orders.filter(o => o.status === 'new' || o.status === 'preparing' || o.status === 'ready');

  return (
    <View style={[styles.container, { backgroundColor: LineModeColors.steel }]}>
      {/* KDS Line Mode Top Header */}
      <View style={[styles.header, { backgroundColor: LineModeColors.surface, borderColor: LineModeColors.mist }]}>
        <View>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: LineModeColors.ink }]}>Kitchen Display (KDS)</Text>
            <View style={styles.lineBadge}>
              <Text style={styles.lineBadgeText}>LINE MODE</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: LineModeColors.graphite }]}>
            Glanceable Cook Rail · Touch Ticket Bump
          </Text>
        </View>

        <View style={styles.statusPills}>
          <Text style={[styles.statusPillText, { color: '#94A3B8' }]}>New: {orders.filter(o => o.status === 'new').length}</Text>
          <Text style={[styles.statusPillText, { color: '#FBBF24' }]}>Prep: {orders.filter(o => o.status === 'preparing').length}</Text>
          <Text style={[styles.statusPillText, { color: '#34D399' }]}>Ready: {orders.filter(o => o.status === 'ready').length}</Text>
        </View>
      </View>

      {/* Ticket Rail List */}
      <ScrollView contentContainerStyle={styles.railList}>
        {activeOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Kitchen Rail Clear</Text>
            <Text style={styles.emptySub}>No active pending cook tickets right now.</Text>
          </View>
        ) : (
          activeOrders.map(order => {
            const isPrep = order.status === 'preparing';
            const isReady = order.status === 'ready';

            return (
              <View
                key={order.id}
                style={[
                  styles.ticketCard,
                  {
                    backgroundColor: LineModeColors.surface,
                    borderColor: isReady ? LineModeColors.success : isPrep ? LineModeColors.warning : '#475569'
                  }
                ]}
              >
                <View style={styles.ticketTop}>
                  <Text style={styles.orderNum}>{order.order_number}</Text>
                  <Text style={styles.tableText}>{order.table_no ? `TABLE ${order.table_no}` : order.type.toUpperCase()}</Text>
                </View>

                <View style={styles.itemsList}>
                  {order.items.map((item, idx) => (
                    <Text key={idx} style={styles.itemRow}>
                      <Text style={styles.itemQty}>{item.qty}x</Text> {item.product_name}
                    </Text>
                  ))}
                </View>

                <View style={styles.ticketFooter}>
                  {order.status === 'new' && (
                    <TouchableOpacity
                      style={[styles.bumpBtn, { backgroundColor: LineModeColors.warning }]}
                      onPress={() => onUpdateOrderStatus(order.id, 'preparing')}
                    >
                      <Text style={[styles.bumpBtnText, { color: '#000000' }]}>START COOKING</Text>
                    </TouchableOpacity>
                  )}

                  {order.status === 'preparing' && (
                    <TouchableOpacity
                      style={[styles.bumpBtn, { backgroundColor: LineModeColors.success }]}
                      onPress={() => onUpdateOrderStatus(order.id, 'ready')}
                    >
                      <Text style={styles.bumpBtnText}>MARK AS READY</Text>
                    </TouchableOpacity>
                  )}

                  {order.status === 'ready' && (
                    <TouchableOpacity
                      style={[styles.bumpBtn, { backgroundColor: '#475569' }]}
                      onPress={() => onUpdateOrderStatus(order.id, 'completed')}
                    >
                      <Text style={styles.bumpBtnText}>COMPLETE TICKET</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: 'bold' },
  lineBadge: { backgroundColor: '#2C3036', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  lineBadgeText: { color: '#EBB036', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' },
  subtitle: { fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  statusPills: { flexDirection: 'row', gap: 12, marginTop: 10 },
  statusPillText: { fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' },
  railList: { padding: 14, gap: 12 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', height: 260 },
  emptyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  emptySub: { color: '#94A3B8', fontSize: 12, marginTop: 4, fontFamily: 'monospace' },
  ticketCard: { borderRadius: 12, borderWidth: 1.5, padding: 14, marginBottom: 12 },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#2C3036', paddingBottom: 8 },
  orderNum: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', fontFamily: 'monospace' },
  tableText: { color: '#EBB036', fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace' },
  itemsList: { marginBottom: 14 },
  itemRow: { color: '#ECEEF0', fontSize: 13, marginVertical: 3 },
  itemQty: { color: '#EBB036', fontWeight: 'bold', fontFamily: 'monospace' },
  ticketFooter: { marginTop: 4 },
  bumpBtn: { height: 42, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  bumpBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12, fontFamily: 'monospace' }
});
