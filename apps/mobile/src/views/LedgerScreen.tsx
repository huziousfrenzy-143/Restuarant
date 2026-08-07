import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LightColors, LineModeColors } from '../theme/colors';
import { fetchLedgerAccountsApi, fetchLedgerEntriesApi } from '../services/api';
import { BookOpen } from 'lucide-react-native';

interface LedgerScreenProps {
  isLineMode: boolean;
  orgId: string | null;
}

export const LedgerScreen: React.FC<LedgerScreenProps> = ({ isLineMode, orgId }) => {
  const colors = isLineMode ? LineModeColors : LightColors;
  const [accounts, setAccounts] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    if (orgId) {
      loadLedger();
    }
  }, [orgId]);

  const loadLedger = async () => {
    try {
      const accs = await fetchLedgerAccountsApi(orgId!);
      const ents = await fetchLedgerEntriesApi(orgId!);
      setAccounts(accs);
      setEntries(ents);
    } catch (e: any) {
      console.warn('Failed to fetch ledger', e.message);
    }
  };

  const toNum = (v: any) => {
    const p = parseFloat(v);
    return isNaN(p) ? 0 : p;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.steel }]}>
      <View style={styles.header}>
        <BookOpen size={24} color={colors.ink} style={{ marginRight: 8 }} />
        <Text style={[styles.headerTitle, { color: colors.ink }]}>Accounting Ledger</Text>
      </View>

      <View style={{ padding: 16 }}>
        <Text style={[styles.sectionTitle, { color: colors.graphite }]}>ACCOUNTS</Text>
        {accounts.map(acc => (
          <View key={acc.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
            <Text style={[styles.accName, { color: colors.ink }]}>{acc.name} ({acc.type.toUpperCase()})</Text>
            <Text style={[styles.accBal, { color: colors.primary }]}>${toNum(acc.balance).toFixed(2)}</Text>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.graphite, marginTop: 16 }]}>RECENT ENTRIES</Text>
        {entries.slice(0, 50).map(ent => (
          <View key={ent.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.ink, fontWeight: 'bold' }}>{ent.description}</Text>
              <Text style={{ color: ent.type === 'credit' ? colors.success : colors.danger, fontWeight: 'bold' }}>
                {ent.type === 'credit' ? '+' : '-'}${toNum(ent.amount).toFixed(2)}
              </Text>
            </View>
            <Text style={{ color: colors.graphite, fontSize: 10, marginTop: 4 }}>
              Account: {accounts.find(a => a.id === ent.account_id)?.name || ent.account_id}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, fontFamily: 'monospace' },
  card: { padding: 16, borderRadius: 8, borderWidth: 1, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accName: { fontSize: 14, fontWeight: 'bold' },
  accBal: { fontSize: 16, fontWeight: 'bold' }
});
