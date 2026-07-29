import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { LightColors, LineModeColors } from '../theme/colors';
import { ChevronRight, Flame, Sun, Check, LogOut, X } from 'lucide-react-native';

interface SettingsScreenProps {
  currentUser: any;
  currentOrg: any;
  userOrgs?: any[];
  isLineMode: boolean;
  onToggleLineMode: () => void;
  onSwitchOrg: (org: any) => void;
  onLogout: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currentUser,
  currentOrg,
  userOrgs = [],
  isLineMode,
  onToggleLineMode,
  onSwitchOrg,
  onLogout
}) => {
  const colors = isLineMode ? LineModeColors : LightColors;
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);

  const availableOrgs = userOrgs.length > 0 ? userOrgs : [currentOrg].filter(Boolean);

  const handleSelectOrg = (org: any) => {
    setIsOrgModalOpen(false);
    onSwitchOrg(org);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.steel }]} contentContainerStyle={styles.content}>
      {/* Header Profile Summary */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
        <Text style={[styles.sectionTitle, { color: colors.graphite }]}>STAFF PROFILE SESSION</Text>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {(currentUser?.name || 'U').substring(0, 2).toUpperCase()}
            </Text>
          </View>

          <View>
            <Text style={[styles.userName, { color: colors.ink }]}>{currentUser?.name || 'Mobile Staff User'}</Text>
            <Text style={[styles.userEmail, { color: colors.graphite }]}>{currentUser?.email || 'staff@restaurant.com'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.roleText, { color: colors.primary }]}>Role: {(currentUser?.role || 'owner').toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Multi-Tenant Organization Switcher Tile */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
        <Text style={[styles.sectionTitle, { color: colors.graphite }]}>ACTIVE STORE ORGANIZATION</Text>
        <TouchableOpacity
          style={[styles.orgSelector, { borderColor: colors.mist, backgroundColor: colors.steel }]}
          onPress={() => setIsOrgModalOpen(true)}
        >
          <View>
            <Text style={[styles.orgName, { color: colors.ink }]}>{currentOrg?.name || 'Store Organization'}</Text>
            <Text style={[styles.orgSub, { color: colors.graphite }]}>Multi-Tenant Store Context · Tap to Switch</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.switchBadge, { color: colors.primary }]}>CHANGE</Text>
            <ChevronRight size={14} color={colors.primary} style={{ marginLeft: 2 }} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Line Mode Theme Toggle */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
        <Text style={[styles.sectionTitle, { color: colors.graphite }]}>DISPLAY MODE</Text>
        <TouchableOpacity
          style={[styles.themeRow, { borderColor: colors.mist }]}
          onPress={onToggleLineMode}
        >
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isLineMode ? (
                <Flame size={14} color={colors.warning} style={{ marginRight: 6 }} />
              ) : (
                <Sun size={14} color={colors.primary} style={{ marginRight: 6 }} />
              )}
              <Text style={[styles.themeTitle, { color: colors.ink }]}>
                {isLineMode ? 'KDS Line Mode (Dark Active)' : 'Standard Light Mode Active'}
              </Text>
            </View>
            <Text style={[styles.themeSub, { color: colors.graphite }]}>
              Optimized for high-contrast kitchen environments
            </Text>
          </View>
          <View style={[styles.togglePill, { backgroundColor: isLineMode ? colors.warning : colors.mist }]}>
            <Text style={[styles.togglePillText, { color: isLineMode ? '#000000' : colors.ink }]}>
              {isLineMode ? 'ON' : 'OFF'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Logout Action */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: colors.danger }]}
        onPress={onLogout}
      >
        <LogOut size={14} color={colors.danger} style={{ marginRight: 6 }} />
        <Text style={[styles.logoutBtnText, { color: colors.danger }]}>LOG OUT OF MOBILE SESSION</Text>
      </TouchableOpacity>

      {/* Multi-Tenant Organization Switcher Modal */}
      <Modal visible={isOrgModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>Switch Store Organization</Text>
              <TouchableOpacity onPress={() => setIsOrgModalOpen(false)}>
                <X size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>

            <View style={styles.orgList}>
              {availableOrgs.map((o: any) => {
                const isCurrent = o.id === currentOrg?.id || o.name === currentOrg?.name;
                return (
                  <TouchableOpacity
                    key={o.id || o.name}
                    style={[
                      styles.orgCard,
                      {
                        borderColor: isCurrent ? colors.primary : colors.mist,
                        backgroundColor: isCurrent ? colors.primaryLight : colors.surface
                      }
                    ]}
                    onPress={() => handleSelectOrg(o)}
                  >
                    <View>
                      <Text style={[styles.orgCardName, { color: colors.ink }]}>{o.name}</Text>
                      {o.role && (
                        <Text style={[styles.orgCardRole, { color: colors.graphite }]}>
                          Role: {String(o.role).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    {isCurrent && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Check size={14} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.checkText, { color: colors.primary }]}>Active</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 0.5, marginBottom: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  userAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, fontFamily: 'monospace' },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userEmail: { fontSize: 12, marginTop: 2, fontFamily: 'monospace' },
  roleBadge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start' },
  roleText: { fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace' },
  orgSelector: { padding: 12, borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orgName: { fontSize: 14, fontWeight: 'bold' },
  orgSub: { fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  switchBadge: { fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' },
  themeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  themeTitle: { fontSize: 13, fontWeight: 'bold' },
  themeSub: { fontSize: 11, marginTop: 2, fontFamily: 'monospace' },
  togglePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  togglePillText: { fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace' },
  logoutBtn: { height: 48, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  logoutBtnText: { fontWeight: 'bold', fontSize: 12, fontFamily: 'monospace' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: 'bold' },
  closeText: { fontSize: 14, fontWeight: 'bold' },
  orgList: { gap: 10, marginBottom: 20 },
  orgCard: { padding: 14, borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orgCardName: { fontSize: 14, fontWeight: 'bold' },
  orgCardRole: { fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  checkText: { fontWeight: 'bold', fontSize: 12, fontFamily: 'monospace' }
});
