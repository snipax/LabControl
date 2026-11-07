import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, globalStyles } from '../styles/theme';
import { getMovimentacoes, deleteMovimentacao } from '../database/database';
import { authenticateBiometrics } from '../services/hardwareService';

export default function HistoryScreen() {
  const [registros, setRegistros] = useState([]);

  const carregarHistorico = () => {
    const dados = getMovimentacoes();
    setRegistros(dados);
  };

  useEffect(() => {
    carregarHistorico();
  }, []);

  const excluirLog = (id) => {
    Alert.alert('Excluir Registro', 'Deseja apagar este log de auditoria do banco?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const ok = await authenticateBiometrics('Autorizar exclusão de histórico');
          if (ok) {
            deleteMovimentacao(id);
            carregarHistorico();
          }
        },
      },
    ]);
  };

  return (
    <View style={globalStyles.screenPadding}>
      <Text style={globalStyles.sectionTitle}>
        Histórico Relacional SQLite ({registros.length} registros)
      </Text>

      <FlatList
        data={registros}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={globalStyles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.equipTitle}>
                {item.equipamento_qr} • {item.equipamento_nome}
              </Text>
              <TouchableOpacity onPress={() => excluirLog(item.id)}>
                <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
              </TouchableOpacity>
            </View>

            <Text style={styles.badgeTipo}>{item.tipo}</Text>
            <Text style={styles.metaText}>Responsável: {item.responsavel}</Text>
            <Text style={styles.metaText}>Data/Hora: {item.data_hora}</Text>
            <Text style={[styles.metaText, { color: COLORS.success }]}>
              GPS Auditado: Lat {Number(item.latitude).toFixed(5)} / Long{' '}
              {Number(item.longitude).toFixed(5)}
            </Text>

            <View style={styles.obsBox}>
              <Text style={styles.obsText}>{item.observacao}</Text>
            </View>

            {item.foto_vistoria_uri && (
              <Image source={{ uri: item.foto_vistoria_uri }} style={styles.vistoriaImg} />
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  equipTitle: { color: COLORS.textMain, fontWeight: 'bold', fontSize: 14, flex: 1 },
  badgeTipo: { color: COLORS.primary, fontWeight: 'bold', fontSize: 11, marginVertical: 4 },
  metaText: { color: COLORS.textSub, fontSize: 12, marginTop: 2 },
  obsBox: { backgroundColor: COLORS.bg, padding: 10, borderRadius: 8, marginTop: 8 },
  obsText: { color: COLORS.textMain, fontSize: 12, lineHeight: 18 },
  vistoriaImg: { width: '100%', height: 140, borderRadius: 8, marginTop: 10 },
});