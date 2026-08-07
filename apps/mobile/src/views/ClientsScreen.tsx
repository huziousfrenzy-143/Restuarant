import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { Client } from '@restaurant-saas/shared-schemas';
import { LightColors, LineModeColors } from '../theme/colors';
import { Users, Search, Plus, Phone, MapPin, FileText, Download, CreditCard, X, Edit2, Trash2, DollarSign } from 'lucide-react-native';
import { exportToExcel } from '../utils/exportUtils';

interface ClientsScreenProps {
  clients: Client[];
  onAddClient: (newClient: Partial<Client>) => void;
  onUpdateClient: (clientId: string, updatedFields: Partial<Client>) => void;
  onPayClientCredit: (clientId: string, amount: number, paymentMethod?: string) => void;
  onDeleteClient: (clientId: string) => void;
  isLineMode: boolean;
}

export const ClientsScreen: React.FC<ClientsScreenProps> = ({
  clients,
  onAddClient,
  onUpdateClient,
  onPayClientCredit,
  onDeleteClient,
  isLineMode
}) => {
  const colors = isLineMode ? LineModeColors : LightColors;
  const iconColor = colors.primary;

  const toNum = (val: any): number => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // New Client Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Edit Client Form State
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCreditBalance, setEditCreditBalance] = useState('0');

  // Pay Debt Form State
  const [payingClient, setPayingClient] = useState<Client | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'online'>('cash');

  const filteredClients = clients.filter(c =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery)
  );

  const handleSaveClient = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Customer Name and Phone number are required.');
      return;
    }

    onAddClient({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      credit_balance: 0.00
    });

    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setIsAddModalOpen(false);
    Alert.alert('Customer Added', `${name} has been registered to customer CRM.`);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setEditName(client.name || '');
    setEditPhone(client.phone || '');
    setEditAddress(client.address || '');
    setEditNotes(client.notes || '');
    setEditCreditBalance(toNum(client.credit_balance).toString());
  };

  const handleUpdateClientSubmit = () => {
    if (!editingClient) return;
    if (!editName.trim() || !editPhone.trim()) {
      Alert.alert('Validation Error', 'Customer Name and Phone number are required.');
      return;
    }

    onUpdateClient(editingClient.id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim() || undefined,
      notes: editNotes.trim() || undefined,
      credit_balance: toNum(editCreditBalance)
    });

    setEditingClient(null);
    Alert.alert('Customer Updated', `${editName} profile updated successfully.`);
  };

  const openPayModal = (client: Client) => {
    const debt = toNum(client.credit_balance);
    setPayingClient(client);
    setPayAmount(debt > 0 ? debt.toString() : '0');
    setPayMethod('cash');
  };

  const handlePayCreditSubmit = () => {
    if (!payingClient) return;
    const amount = toNum(payAmount);
    if (amount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid payment amount greater than $0.');
      return;
    }

    onPayClientCredit(payingClient.id, amount, payMethod);
    setPayingClient(null);
    Alert.alert('Payment Recorded', `$${amount.toFixed(2)} debt payment recorded for ${payingClient.name}.`);
  };

  const handleDeletePrompt = (client: Client) => {
    Alert.alert(
      'Delete Customer Profile',
      `Are you sure you want to delete customer '${client.name}'? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeleteClient(client.id);
            Alert.alert('Customer Deleted', `'${client.name}' has been removed from customer CRM.`);
          }
        }
      ]
    );
  };

  const handleExportClientsCSV = () => {
    const data = clients.map(c => ({
      'Name': c.name,
      'Phone': c.phone,
      'Address': c.address || '',
      'Outstanding Debt ($)': toNum(c.credit_balance)
    }));
    exportToExcel(data, `Customers_Export_${Date.now()}`, 'Customers');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.steel }]}>
      {/* Header Search & Add Customer Bar */}
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.graphite }]}>CUSTOMER CRM DIRECTORY</Text>
            <Text style={[styles.clientCountText, { color: colors.ink }]}>{clients.length} Customers Registered</Text>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: colors.steel, borderColor: colors.mist }]}
              onPress={handleExportClientsCSV}
            >
              <Download size={14} color={colors.ink} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setIsAddModalOpen(true)}
            >
              <Plus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>ADD NEW</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.steel, borderColor: colors.mist }]}>
          <Search size={16} color={iconColor} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.ink }]}
            placeholder="Search by customer name or phone..."
            placeholderTextColor={colors.graphite}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Customer List */}
      <ScrollView style={styles.scrollList} contentContainerStyle={styles.listContent}>
        {filteredClients.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
            <Text style={[styles.emptyText, { color: colors.graphite }]}>
              {searchQuery ? 'No customers matching your search.' : 'No registered customers found.'}
            </Text>
          </View>
        ) : (
          filteredClients.map(c => {
            const cb = toNum(c.credit_balance);
            return (
              <View key={c.id} style={[styles.clientCard, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.avatarBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {c.name.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={[styles.clientName, { color: colors.ink }]}>{c.name}</Text>
                    <View style={styles.detailRow}>
                      <Phone size={11} color={colors.graphite} style={{ marginRight: 4 }} />
                      <Text style={[styles.clientPhone, { color: colors.graphite }]}>{c.phone}</Text>
                    </View>
                    {c.address && (
                      <View style={styles.detailRow}>
                        <MapPin size={11} color={colors.graphite} style={{ marginRight: 4 }} />
                        <Text style={[styles.clientSub, { color: colors.graphite }]}>{c.address}</Text>
                      </View>
                    )}
                    {c.notes && (
                      <View style={styles.detailRow}>
                        <FileText size={11} color={colors.graphite} style={{ marginRight: 4 }} />
                        <Text style={[styles.clientNotes, { color: colors.graphite }]}>{c.notes}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.creditCol}>
                    <Text style={[styles.creditLabel, { color: colors.graphite }]}>ACCOUNT DEBT</Text>
                    <Text style={[styles.creditVal, { color: cb > 0 ? colors.danger : colors.primary }]}>
                      ${cb.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Card Action Buttons: Pay Debt, Edit, Delete */}
                <View style={[styles.cardActionsRow, { borderTopColor: colors.mist }]}>
                  <TouchableOpacity
                    style={[styles.actionChip, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                    onPress={() => openPayModal(c)}
                  >
                    <DollarSign size={12} color={colors.primary} style={{ marginRight: 3 }} />
                    <Text style={[styles.actionChipText, { color: colors.primary }]}>
                      {cb > 0 ? 'PAY DEBT' : 'ADJUST BALANCE'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionChip, { backgroundColor: colors.steel, borderColor: colors.mist }]}
                    onPress={() => openEditModal(c)}
                  >
                    <Edit2 size={12} color={colors.ink} style={{ marginRight: 3 }} />
                    <Text style={[styles.actionChipText, { color: colors.ink }]}>EDIT</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionChip, { backgroundColor: '#FEF2F2', borderColor: '#F87171' }]}
                    onPress={() => handleDeletePrompt(c)}
                  >
                    <Trash2 size={12} color="#DC2626" style={{ marginRight: 3 }} />
                    <Text style={[styles.actionChipText, { color: '#DC2626' }]}>DELETE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add New Customer Modal Form */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>Add New Customer</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <X size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.graphite }]}>CUSTOMER FULL NAME *</Text>
              <TextInput
                style={[styles.formInput, { color: colors.ink, borderColor: colors.mist, backgroundColor: colors.steel }]}
                placeholder="e.g. Sarah Connor"
                placeholderTextColor={colors.graphite}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.graphite }]}>PHONE NUMBER *</Text>
              <TextInput
                style={[styles.formInput, { color: colors.ink, borderColor: colors.mist, backgroundColor: colors.steel }]}
                placeholder="e.g. +1 (555) 000-0000"
                placeholderTextColor={colors.graphite}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.graphite }]}>DELIVERY ADDRESS</Text>
              <TextInput
                style={[styles.formInput, { color: colors.ink, borderColor: colors.mist, backgroundColor: colors.steel }]}
                placeholder="Street address & Apt #"
                placeholderTextColor={colors.graphite}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.graphite }]}>CUSTOMER NOTES</Text>
              <TextInput
                style={[styles.formInput, { color: colors.ink, borderColor: colors.mist, backgroundColor: colors.steel }]}
                placeholder="Dietary preferences, VIP notes..."
                placeholderTextColor={colors.graphite}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveClient}
            >
              <Text style={styles.saveBtnText}>SAVE CUSTOMER RECORD</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Customer Profile Modal Form */}
      <Modal visible={!!editingClient} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>Edit Customer Profile</Text>
              <TouchableOpacity onPress={() => setEditingClient(null)}>
                <X size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.graphite }]}>CUSTOMER FULL NAME *</Text>
              <TextInput
                style={[styles.formInput, { color: colors.ink, borderColor: colors.mist, backgroundColor: colors.steel }]}
                value={editName}
                onChangeText={setEditName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.graphite }]}>PHONE NUMBER *</Text>
              <TextInput
                style={[styles.formInput, { color: colors.ink, borderColor: colors.mist, backgroundColor: colors.steel }]}
                keyboardType="phone-pad"
                value={editPhone}
                onChangeText={setEditPhone}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.graphite }]}>DELIVERY ADDRESS</Text>
              <TextInput
                style={[styles.formInput, { color: colors.ink, borderColor: colors.mist, backgroundColor: colors.steel }]}
                value={editAddress}
                onChangeText={setEditAddress}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.graphite }]}>CUSTOMER NOTES</Text>
              <TextInput
                style={[styles.formInput, { color: colors.ink, borderColor: colors.mist, backgroundColor: colors.steel }]}
                value={editNotes}
                onChangeText={setEditNotes}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.graphite }]}>ACCOUNT DEBT BALANCE ($)</Text>
              <TextInput
                style={[styles.formInput, { color: colors.ink, borderColor: colors.mist, backgroundColor: colors.steel }]}
                keyboardType="decimal-pad"
                value={editCreditBalance}
                onChangeText={setEditCreditBalance}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleUpdateClientSubmit}
            >
              <Text style={styles.saveBtnText}>UPDATE CUSTOMER PROFILE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pay Debt / Adjust Balance Modal */}
      <Modal visible={!!payingClient} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>
                Pay Debt / Adjust Balance
              </Text>
              <TouchableOpacity onPress={() => setPayingClient(null)}>
                <X size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>

            <View style={[styles.debtSummaryBox, { backgroundColor: colors.steel, borderColor: colors.mist }]}>
              <Text style={[styles.debtSummaryName, { color: colors.ink }]}>{payingClient?.name}</Text>
              <Text style={[styles.debtSummaryLabel, { color: colors.graphite }]}>
                Current Account Debt: <Text style={{ fontWeight: 'bold', color: colors.danger }}>${toNum(payingClient?.credit_balance).toFixed(2)}</Text>
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.graphite }]}>PAYMENT AMOUNT ($) *</Text>
              <TextInput
                style={[styles.formInput, { color: colors.ink, borderColor: colors.primary, backgroundColor: colors.steel, fontSize: 16, fontWeight: 'bold' }]}
                keyboardType="decimal-pad"
                value={payAmount}
                onChangeText={setPayAmount}
                placeholder="0.00"
                placeholderTextColor={colors.graphite}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.graphite }]}>PAYMENT METHOD</Text>
              <View style={styles.payMethodRow}>
                {(['cash', 'card', 'online'] as const).map(method => {
                  const isActive = payMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.payMethodBtn,
                        {
                          backgroundColor: isActive ? colors.primary : colors.steel,
                          borderColor: isActive ? colors.primary : colors.mist
                        }
                      ]}
                      onPress={() => setPayMethod(method)}
                    >
                      <Text style={[styles.payMethodText, { color: isActive ? '#FFFFFF' : colors.ink }]}>
                        {method.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handlePayCreditSubmit}
            >
              <Text style={styles.saveBtnText}>RECORD PAYMENT & DEDUCT DEBT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: { padding: 14, borderBottomWidth: 1, gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  sectionTitle: { fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 0.5 },
  clientCountText: { fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  exportBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 34, borderRadius: 8 },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 11, fontFamily: 'monospace' },
  searchBox: { height: 42, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 13 },
  scrollList: { flex: 1 },
  listContent: { padding: 14, gap: 10 },
  emptyCard: { padding: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  emptyText: { fontSize: 12, fontFamily: 'monospace' },
  clientCard: { borderRadius: 12, padding: 14, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: 'bold', fontSize: 14, fontFamily: 'monospace' },
  cardInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: 'bold' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  clientPhone: { fontSize: 12, fontFamily: 'monospace' },
  clientSub: { fontSize: 11 },
  clientNotes: { fontSize: 11, fontStyle: 'italic' },
  creditCol: { alignItems: 'flex-end' },
  creditLabel: { fontSize: 8, fontWeight: 'bold', fontFamily: 'monospace' },
  creditVal: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  cardActionsRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  actionChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  actionChipText: { fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace' },
  debtSummaryBox: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  debtSummaryName: { fontSize: 15, fontWeight: 'bold' },
  debtSummaryLabel: { fontSize: 12, marginTop: 2, fontFamily: 'monospace' },
  payMethodRow: { flexDirection: 'row', gap: 8 },
  payMethodBtn: { flex: 1, height: 38, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  payMethodText: { fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, gap: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 16, fontWeight: 'bold' },
  formGroup: { gap: 4 },
  formLabel: { fontSize: 9, fontWeight: 'bold', fontFamily: 'monospace' },
  formInput: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 13 },
  saveBtn: { height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12, fontFamily: 'monospace' }
});
