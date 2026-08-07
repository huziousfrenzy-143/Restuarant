import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LightColors, LineModeColors } from '../theme/colors';
import { CheckCircle2, Clock, PlayCircle } from 'lucide-react-native';
import { fetchTasksApi, updateTaskStatusApi } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TasksScreenProps {
  isLineMode: boolean;
  orgId: string | null;
}

export const TasksScreen: React.FC<TasksScreenProps> = ({ isLineMode, orgId }) => {
  const colors = isLineMode ? LineModeColors : LightColors;
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (orgId) {
      loadTasks();
    }
  }, [orgId]);

  const loadTasks = async () => {
    try {
      const data = await fetchTasksApi(orgId!);
      setTasks(data);
    } catch (e: any) {
      console.warn('Failed to fetch tasks', e.message);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    if (!orgId) return;
    try {
      await updateTaskStatusApi(orgId, taskId, newStatus);
      await loadTasks();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const renderTaskCol = (title: string, status: string, colTasks: any[]) => (
    <View style={styles.col}>
      <Text style={[styles.colTitle, { color: colors.graphite }]}>{title} ({colTasks.length})</Text>
      <ScrollView>
        {colTasks.map(t => (
          <View key={t.id} style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
            <Text style={[styles.taskTitle, { color: colors.ink }]}>{t.title}</Text>
            {t.description ? <Text style={[styles.taskDesc, { color: colors.graphite }]}>{t.description}</Text> : null}
            <View style={styles.taskFooter}>
              <Text style={{ fontSize: 10, color: colors.graphite, fontFamily: 'monospace' }}>Assignee: {t.assignee_id}</Text>
            </View>
            <View style={styles.actionRow}>
              {status === 'pending' && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleUpdateStatus(t.id, 'in_progress')}>
                  <PlayCircle size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={{ color: colors.primary, fontSize: 11, fontWeight: 'bold' }}>START</Text>
                </TouchableOpacity>
              )}
              {status === 'in_progress' && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleUpdateStatus(t.id, 'completed')}>
                  <CheckCircle2 size={14} color={colors.success} style={{ marginRight: 4 }} />
                  <Text style={{ color: colors.success, fontSize: 11, fontWeight: 'bold' }}>COMPLETE</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.steel }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.ink }]}>Staff Tasks</Text>
      </View>
      <View style={styles.kanban}>
        {renderTaskCol('Pending', 'pending', tasks.filter(t => t.status === 'pending'))}
        {renderTaskCol('In Progress', 'in_progress', tasks.filter(t => t.status === 'in_progress'))}
        {renderTaskCol('Completed', 'completed', tasks.filter(t => t.status === 'completed'))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  kanban: { flex: 1, flexDirection: 'row', padding: 8, gap: 8 },
  col: { flex: 1 },
  colTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  taskCard: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  taskTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  taskDesc: { fontSize: 12, marginBottom: 8 },
  taskFooter: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 8, marginTop: 4 },
  actionRow: { flexDirection: 'row', marginTop: 8, justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }
});
