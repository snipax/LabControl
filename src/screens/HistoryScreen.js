import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    Alert,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { COLORS, globalStyles } from '../styles/theme';
import { getMovimentacoes, deleteMovimentacao } from '../database/database';
import {
    authenticateBiometrics,
    triggerHapticSuccess,
    triggerHapticError,
} from '../services/hardwareService';

export default function HistoryScreen() {
    const [registros, setRegistros] = useState([]);
    const [exportandoPdf, setExportandoPdf] = useState(false);

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

    const exportarRelatorioPDF = async () => {
        if (registros.length === 0) {
            triggerHapticError();
            Alert.alert('Histórico Vazio', 'Não há registros de auditoria para exportar.');
            return;
        }

        try {
            setExportandoPdf(true);

            const linhasTabela = registros
                .map(
                    (item) => `
          <tr>
            <td><strong>${item.equipamento_qr}</strong><br/>${item.equipamento_nome}</td>
            <td><span class="badge ${item.tipo}">${item.tipo}</span></td>
            <td>
              ${item.responsavel}
              ${item.usuario_perfil ? `<br/><small>[${item.usuario_perfil}]</small>` : ''}
            </td>
            <td>
              ${item.data_hora}
              ${item.prazo_devolucao ? `<br/><small>Prazo: ${item.prazo_devolucao}</small>` : ''}
            </td>
            <td>Lat: ${Number(item.latitude).toFixed(5)}<br/>Long: ${Number(item.longitude).toFixed(5)}</td>
            <td>${item.observacao || '-'}</td>
          </tr>
        `
                )
                .join('');

            const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #0F172A; }
            .header { border-bottom: 2px solid #0284C7; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: bold; color: #0F172A; margin: 0; }
            .subtitle { font-size: 12px; color: #475569; margin-top: 4px; }
            .summary { background: #F1F5F9; padding: 10px 14px; border-radius: 6px; font-size: 12px; margin-bottom: 18px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background-color: #0F172A; color: #FFFFFF; text-align: left; padding: 8px; }
            td { border-bottom: 1px solid #CBD5E1; padding: 8px; vertical-align: top; }
            tr:nth-child(even) { background-color: #F8FAFC; }
            .badge { font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
            .EMPRESTIMO { background: #FEF3C7; color: #B45309; }
            .DEVOLUCAO { background: #D1FAE5; color: #047857; }
            .MANUTENCAO { background: #FEE2E2; color: #B91C1C; }
            .footer { margin-top: 24px; font-size: 10px; color: #64748B; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">LabControl Mobile — Relatório de Auditoria e Cautelas</h1>
            <p class="subtitle">Engenharia de Computação (FHO) • Emitido em: ${new Date().toLocaleString('pt-BR')}</p>
          </div>
          <div class="summary">
            <strong>Total de Movimentações Auditadas no SQLite:</strong> ${registros.length} registros
          </div>
          <table>
            <thead>
              <tr>
                <th>Ativo / QR Code</th>
                <th>Operação</th>
                <th>Responsável</th>
                <th>Data / Prazo</th>
                <th>Geolocalização GPS</th>
                <th>Observação / Laudo</th>
              </tr>
            </thead>
            <tbody>
              ${linhasTabela}
            </tbody>
          </table>
          <div class="footer">
            Documento gerado eletronicamente pelo sistema LabControl Mobile com validação biométrica e auditoria GPS.
          </div>
        </body>
        </html>
      `;

            // 3. Abre a visualização nativa do sistema para visualizar e Salvar como PDF
            await Print.printAsync({ html: htmlContent });
            triggerHapticSuccess();
        } catch (error) {
            triggerHapticError();
            Alert.alert('Erro ao Exportar PDF', error.message);
        } finally {
            setExportandoPdf(false);
        }
    };

    return (
        <View style={globalStyles.screenPadding}>
            <View style={styles.topHeaderRow}>
                <Text style={[globalStyles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>
                    Auditoria SQLite ({registros.length})
                </Text>

                <TouchableOpacity
                    style={styles.pdfBtn}
                    onPress={exportarRelatorioPDF}
                    disabled={exportandoPdf}
                >
                    {exportandoPdf ? (
                        <ActivityIndicator size="small" color={COLORS.bg} />
                    ) : (
                        <>
                            <Ionicons name="document-text" size={16} color={COLORS.bg} />
                            <Text style={styles.pdfBtnText}>Exportar PDF</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

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
                        <Text style={styles.metaText}>
                            Responsável: {item.responsavel}
                            {item.usuario_perfil ? ` [${item.usuario_perfil}]` : ''}
                        </Text>
                        <Text style={styles.metaText}>Data/Hora: {item.data_hora}</Text>

                        {item.prazo_devolucao && (
                            <Text style={[styles.metaText, { color: COLORS.warning, fontWeight: 'bold' }]}>
                                Prazo Limite: {item.prazo_devolucao}
                            </Text>
                        )}

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
    topHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 14,
        marginBottom: 12,
    },
    pdfBtn: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        gap: 6,
    },
    pdfBtnText: {
        color: COLORS.bg,
        fontWeight: 'bold',
        fontSize: 12,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    equipTitle: { color: COLORS.textMain, fontWeight: 'bold', fontSize: 14, flex: 1 },
    badgeTipo: { color: COLORS.primary, fontWeight: 'bold', fontSize: 11, marginVertical: 4 },
    metaText: { color: COLORS.textSub, fontSize: 12, marginTop: 2 },
    obsBox: { backgroundColor: COLORS.bg, padding: 10, borderRadius: 8, marginTop: 8 },
    obsText: { color: COLORS.textMain, fontSize: 12, lineHeight: 18 },
    vistoriaImg: { width: '100%', height: 140, borderRadius: 8, marginTop: 10 },
});