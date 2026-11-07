import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, globalStyles } from '../styles/theme';
import { getDashboardStats, getMovimentacoes } from '../database/database';

export default function DashboardScreen({ gpsData, onNavigate }) {
  const [stats, setStats] = useState({ total: 0, disponiveis: 0, emprestados: 0, manutencao: 0 });
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    const dbStats = getDashboardStats();
    const logs = getMovimentacoes();
    setStats(dbStats);
    setRecentLogs(logs.slice(0, 4));
  }, []);

  return (
    <ScrollView style={globalStyles.screenPadding}>
      <Text style={globalStyles.sectionTitle}>Indicadores do Inventário (SQLite)</Text>

      <View style={styles.grid}>
        <View style={[styles.statBox, { borderLeftColor: COLORS.primary }]}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Cadastrados</Text>
        </View>
        <View style={[styles.statBox, { borderLeftColor: COLORS.success }]}>
          <Text style={[styles.statNumber, { color: COLORS.success }]}>{stats.disponiveis}</Text>
          <Text style={styles.statLabel}>Disponíveis</Text>
        </View>
        <View style={[styles.statBox, { borderLeftColor: COLORS.warning }]}>
          <Text style={[styles.statNumber, { color: COLORS.warning }]}>{stats.emprestados}</Text>
          <Text style={styles.statLabel}>Emprestados</Text>
        </View>
        <View style={[styles.statBox, { borderLeftColor: COLORS.danger }]}>
          <Text style={[styles.statNumber, { color: COLORS.danger }]}>{stats.manutencao}</Text>
          <Text style={styles.statLabel}>Em Manutenção</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.scanBanner} onPress={() => onNavigate('SCANNER')}>
        <View style={styles.scanIcon}>
          <Ionicons name="qr-code" size={28} color={COLORS.bg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.scanTitle}>Escanear Etiqueta de Equipamento</Text>
          <Text style={styles.scanSub}>
            Ler QR Code ou Código de Barras para registrar empréstimo, devolução ou reparo
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
      </TouchableOpacity>

      <Text style={globalStyles.sectionTitle}>Status de Hardware & Telemetria</Text>
      <View style={globalStyles.card}>
        <View style={styles.sensorRow}>
          <Ionicons name="location" size={18} color={COLORS.success} />
          <Text style={styles.sensorText}>
            {gpsData.statusText}: ({gpsData.latitude.toFixed(5)}, {gpsData.longitude.toFixed(5)})
          </Text>
        </View>
        <View style={styles.sensorRow}>
          <Ionicons name="server" size={18} color={COLORS.primary} />
          <Text style={styles.sensorText}>
            Banco Relacional Local: SQLite (labcontrol.db) Ativo
          </Text>
        </View>
        <View style={styles.sensorRow}>
          <Ionicons name="speedometer" size={18} color={COLORS.warning} />
          <Text style={styles.sensorText}>
            Acelerômetro Ativo: Agite o aparelho para limpar filtros na listagem
          </Text>
        </View>
      </View>

      <Text style={globalStyles.sectionTitle}>Últimas Movimentações Registradas</Text>
      {recentLogs.map((log) => (
        <View key={log.id} style={globalStyles.card}>
          <View style={styles.logHeader}>
            <Text style={styles.logTitle}>{log.equipamento_nome}</Text>
            <Text style={styles.logType}>{log.tipo}</Text>
          </View>
          <Text style={styles.logSub}>
            Responsável: {log.responsavel} • {log.data_hora}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statBox: {
    width: '48%',
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textMain,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSub,
    marginTop: 4,
  },
  scanBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 12,
  },
  scanIcon: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
  },
  scanTitle: {
    color: COLORS.textMain,
    fontWeight: 'bold',
    fontSize: 15,
  },
  scanSub: {
    color: COLORS.textSub,
    fontSize: 12,
    marginTop: 2,
  },
  sensorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  sensorText: {
    color: COLORS.textMain,
    fontSize: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logTitle: {
    color: COLORS.textMain,
    fontWeight: 'bold',
    fontSize: 13,
  },
  logType: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  logSub: {
    color: COLORS.textSub,
    fontSize: 12,
    marginTop: 4,
  },
});