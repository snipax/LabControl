import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, globalStyles } from '../styles/theme';
import {
  getEquipamentos,
  insertEquipamento,
  updateEquipamento,
  deleteEquipamento,
  registrarMovimentacaoDB,
} from '../database/database';
import {
  authenticateBiometrics,
  capturePhotoFromCamera,
  subscribeToShake,
  triggerHapticSuccess,
  triggerHapticError,
  triggerHapticSelection,
} from '../services/hardwareService';

export default function EquipmentScreen({
  gpsData,
  refreshGps,
  preSelectedEquip,
  clearPreSelected,
}) {
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [shakeAviso, setShakeAviso] = useState(false);

  // Estados do Modal de Cadastro / Edição (CREATE / UPDATE)
  const [crudModalVisible, setCrudModalVisible] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [codigoQr, setCodigoQr] = useState('');
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [bancada, setBancada] = useState('');
  const [fotoUri, setFotoUri] = useState(null);

  // Estados do Modal de Movimentação (Empréstimo / Devolução / Manutenção)
  const [movModalVisible, setMovModalVisible] = useState(false);
  const [equipamentoAlvo, setEquipamentoAlvo] = useState(null);
  const [tipoMov, setTipoMov] = useState('EMPRESTIMO');
  const [responsavel, setResponsavel] = useState('');
  const [observacao, setObservacao] = useState('');
  const [fotoVistoria, setFotoVistoria] = useState(null);

  const carregarEquipamentos = () => {
    const dados = getEquipamentos(busca, filtroStatus);
    setLista(dados);
  };

  useEffect(() => {
    carregarEquipamentos();
  }, [busca, filtroStatus]);

  // Abre modal automaticamente quando redirecionado pelo Scanner QR
  useEffect(() => {
    if (preSelectedEquip) {
      if (preSelectedEquip.isNewFromQr) {
        abrirModalNovo(preSelectedEquip.codigo_qr);
      } else {
        abrirModalMovimentacao(preSelectedEquip);
      }
      clearPreSelected();
    }
  }, [preSelectedEquip]);

  // Sensor Acelerômetro: Limpa filtros ao agitar o celular
  useEffect(() => {
    const sub = subscribeToShake(() => {
      setBusca('');
      setFiltroStatus('TODOS');
      setShakeAviso(true);
      setTimeout(() => setShakeAviso(false), 2500);
    });
    return () => sub && sub.remove();
  }, []);

  // ==========================================================================
  // OPERAÇÕES DO CRUD (INSERT, UPDATE, DELETE NO SQLITE)
  // ==========================================================================
  const abrirModalNovo = (qrPreenchido = '') => {
    setEditandoId(null);
    setCodigoQr(qrPreenchido || `PAT-${Math.floor(1000 + Math.random() * 9000)}`);
    setNome('');
    setCategoria('Microcontrolador / Hardware');
    setBancada('Lab Embarcados - Bancada 01');
    setFotoUri(null);
    setCrudModalVisible(true);
  };

  const abrirModalEdicao = (item) => {
    setEditandoId(item.id);
    setCodigoQr(item.codigo_qr);
    setNome(item.nome);
    setCategoria(item.categoria);
    setBancada(item.bancada_sala);
    setFotoUri(item.foto_uri);
    setCrudModalVisible(true);
  };

  const salvarEquipamentoSQLite = () => {
    if (!nome.trim() || !codigoQr.trim()) {
      triggerHapticError();
      Alert.alert('Erro de Validação', 'Informe o Código QR e o Nome do equipamento.');
      return;
    }

    try {
      if (editandoId) {
        updateEquipamento({
          id: editandoId,
          codigo_qr: codigoQr,
          nome,
          categoria,
          bancada_sala: bancada,
          foto_uri: fotoUri,
        });
      } else {
        insertEquipamento({
          codigo_qr: codigoQr,
          nome,
          categoria,
          bancada_sala: bancada,
          foto_uri: fotoUri,
        });
      }

      triggerHapticSuccess();
      setCrudModalVisible(false);
      carregarEquipamentos();
    } catch (error) {
      triggerHapticError();
      Alert.alert('Erro no Banco SQLite', 'Já existe um equipamento com este Código QR.');
    }
  };

  const confirmarExclusaoSQLite = (item) => {
    Alert.alert(
      'Excluir do Banco de Dados',
      `Confirma a exclusão permanente de "${item.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Autenticar e Excluir',
          style: 'destructive',
          onPress: async () => {
            const autorizado = await authenticateBiometrics('Autorizar DELETE no SQLite');
            if (autorizado) {
              deleteEquipamento(item.id);
              carregarEquipamentos();
            }
          },
        },
      ]
    );
  };

  // ==========================================================================
  // OPERAÇÕES DE MOVIMENTAÇÃO (EMPRÉSTIMO, DEVOLUÇÃO, MANUTENÇÃO)
  // ==========================================================================
  const abrirModalMovimentacao = (item) => {
    refreshGps();
    setEquipamentoAlvo(item);
    setTipoMov(item.status === 'DISPONIVEL' ? 'EMPRESTIMO' : 'DEVOLUCAO');
    setResponsavel(item.responsavel_atual || '');
    setObservacao('');
    setFotoVistoria(null);
    setMovModalVisible(true);
  };

  const salvarMovimentacaoSQLite = async () => {
    if (tipoMov === 'EMPRESTIMO' && !responsavel.trim()) {
      triggerHapticError();
      Alert.alert('Campo Obrigatório', 'Informe o Nome e RA de quem está retirando o item.');
      return;
    }

    const autorizado = await authenticateBiometrics('Confirmar assinatura biométrica da movimentação');
    if (!autorizado) return;

    registrarMovimentacaoDB({
      equipamento_id: equipamentoAlvo.id,
      tipo: tipoMov,
      responsavel,
      observacao,
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      foto_vistoria_uri: fotoVistoria,
    });

    setMovModalVisible(false);
    carregarEquipamentos();
    Alert.alert('Sucesso', 'Movimentação gravada no banco SQLite com coordenadas GPS!');
  };

  const corPorStatus = (st) => {
    if (st === 'DISPONIVEL') return COLORS.success;
    if (st === 'EMPRESTADO') return COLORS.warning;
    return COLORS.danger;
  };

  return (
    <View style={globalStyles.screenPadding}>
      {shakeAviso && (
        <View style={styles.shakeBar}>
          <Text style={styles.shakeText}>Acelerômetro: Filtros de busca limpos!</Text>
        </View>
      )}

      {/* BARRA DE BUSCA + BOTÃO CRIAR */}
      <View style={styles.topRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textSub} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar no SQLite (nome, QR, bancada)..."
            placeholderTextColor={COLORS.textMuted}
            value={busca}
            onChangeText={setBusca}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => abrirModalNovo('')}>
          <Ionicons name="add" size={26} color={COLORS.bg} />
        </TouchableOpacity>
      </View>

      {/* FILTROS POR STATUS */}
      <View style={styles.chipsRow}>
        {['TODOS', 'DISPONIVEL', 'EMPRESTADO', 'MANUTENCAO'].map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.chip, filtroStatus === st && styles.chipActive]}
            onPress={() => {
              triggerHapticSelection();
              setFiltroStatus(st);
            }}
          >
            <Text style={[styles.chipText, filtroStatus === st && styles.chipTextActive]}>
              {st}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* LISTA REAL DO SQLITE */}
      <FlatList
        data={lista}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Image source={{ uri: item.foto_uri }} style={styles.itemImg} />
            <View style={{ flex: 1 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.qrText}>{item.codigo_qr}</Text>
                <Text style={[styles.statusText, { color: corPorStatus(item.status) }]}>
                  {item.status}
                </Text>
              </View>
              <Text style={styles.itemTitle}>{item.nome}</Text>
              <Text style={styles.itemSub}>
                {item.categoria} • {item.bancada_sala}
              </Text>
              {item.responsavel_atual && (
                <Text style={styles.holderText}>Responsável: {item.responsavel_atual}</Text>
              )}

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.movBtn}
                  onPress={() => abrirModalMovimentacao(item)}
                >
                  <Ionicons name="swap-horizontal" size={15} color={COLORS.bg} />
                  <Text style={styles.movBtnText}>Movimentar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => abrirModalEdicao(item)}
                >
                  <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => confirmarExclusaoSQLite(item)}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* MODAL 1: CADASTRO E EDIÇÃO (CREATE / UPDATE) */}
      <Modal visible={crudModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {editandoId ? 'Editar Equipamento (UPDATE)' : 'Novo Equipamento (INSERT)'}
            </Text>
            <ScrollView>
              <Text style={globalStyles.inputLabel}>Código QR / Patrimônio</Text>
              <TextInput
                style={globalStyles.input}
                value={codigoQr}
                onChangeText={setCodigoQr}
              />

              <Text style={globalStyles.inputLabel}>Nome do Equipamento</Text>
              <TextInput style={globalStyles.input} value={nome} onChangeText={setNome} />

              <Text style={globalStyles.inputLabel}>Categoria</Text>
              <TextInput
                style={globalStyles.input}
                value={categoria}
                onChangeText={setCategoria}
              />

              <Text style={globalStyles.inputLabel}>Sala / Bancada Alocada</Text>
              <TextInput
                style={globalStyles.input}
                value={bancada}
                onChangeText={setBancada}
              />

              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={async () => {
                  const uri = await capturePhotoFromCamera();
                  if (uri) setFotoUri(uri);
                }}
              >
                <Ionicons name="camera" size={20} color={COLORS.primary} />
                <Text style={styles.cameraBtnText}>
                  {fotoUri ? 'Substituir Foto Capturada' : 'Tirar Foto com a Câmera'}
                </Text>
              </TouchableOpacity>

              {fotoUri && <Image source={{ uri: fotoUri }} style={styles.previewImg} />}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCrudModalVisible(false)}
              >
                <Text style={{ color: COLORS.textSub, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={salvarEquipamentoSQLite}>
                <Text style={{ color: COLORS.bg, fontWeight: 'bold' }}>Gravar no SQLite</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: MOVIMENTAÇÃO (EMPRÉSTIMO, DEVOLUÇÃO, MANUTENÇÃO) */}
      <Modal visible={movModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Registrar Movimentação</Text>
            {equipamentoAlvo && (
              <Text style={{ color: COLORS.primary, marginBottom: 10, fontWeight: 'bold' }}>
                {equipamentoAlvo.codigo_qr} - {equipamentoAlvo.nome}
              </Text>
            )}

            <ScrollView>
              <View style={styles.chipsRow}>
                {['EMPRESTIMO', 'DEVOLUCAO', 'MANUTENCAO'].map((tp) => (
                  <TouchableOpacity
                    key={tp}
                    style={[styles.chip, tipoMov === tp && styles.chipActive]}
                    onPress={() => setTipoMov(tp)}
                  >
                    <Text style={[styles.chipText, tipoMov === tp && styles.chipTextActive]}>
                      {tp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {tipoMov !== 'DEVOLUCAO' && (
                <>
                  <Text style={globalStyles.inputLabel}>Responsável (Nome / RA)</Text>
                  <TextInput
                    style={globalStyles.input}
                    value={responsavel}
                    onChangeText={setResponsavel}
                    placeholder="Ex: Edilson Alves - RA 114093"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </>
              )}

              <Text style={globalStyles.inputLabel}>
                {tipoMov === 'MANUTENCAO'
                  ? 'Descrição do Defeito / Ordem de Serviço'
                  : 'Observação de Vistoria de Bancada'}
              </Text>
              <TextInput
                style={[globalStyles.input, { height: 80, textAlignVertical: 'top' }]}
                multiline
                value={observacao}
                onChangeText={setObservacao}
                placeholder={
                  tipoMov === 'MANUTENCAO'
                    ? 'Descreva o defeito apresentado pelo equipamento...'
                    : 'Condição física do item no momento da movimentação...'
                }
                placeholderTextColor={COLORS.textMuted}
              />

              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={async () => {
                  const uri = await capturePhotoFromCamera();
                  if (uri) setFotoVistoria(uri);
                }}
              >
                <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
                <Text style={styles.cameraBtnText}>
                  {fotoVistoria ? 'Foto de Vistoria Anexada' : 'Capturar Foto de Vistoria'}
                </Text>
              </TouchableOpacity>

              {fotoVistoria && (
                <Image source={{ uri: fotoVistoria }} style={styles.previewImg} />
              )}

              <Text style={styles.gpsInfo}>
                GPS Capturado: Lat {gpsData.latitude.toFixed(5)}, Long{' '}
                {gpsData.longitude.toFixed(5)}
              </Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setMovModalVisible(false)}
              >
                <Text style={{ color: COLORS.textSub, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={salvarMovimentacaoSQLite}>
                <Text style={{ color: COLORS.bg, fontWeight: 'bold' }}>
                  Assinar com Biometria
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  shakeBar: {
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  shakeText: { color: COLORS.bg, fontWeight: 'bold', fontSize: 12 },
  topRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, color: COLORS.textMain, paddingVertical: 10, fontSize: 13 },
  addBtn: {
    backgroundColor: COLORS.primary,
    width: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsRow: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.card,
  },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { color: COLORS.textSub, fontSize: 11, fontWeight: 'bold' },
  chipTextActive: { color: COLORS.bg },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  itemImg: { width: 74, height: 74, borderRadius: 8, backgroundColor: COLORS.bg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  qrText: { color: COLORS.primary, fontSize: 11, fontWeight: 'bold' },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  itemTitle: { color: COLORS.textMain, fontWeight: 'bold', fontSize: 14, marginTop: 2 },
  itemSub: { color: COLORS.textSub, fontSize: 12, marginTop: 2 },
  holderText: { color: COLORS.warning, fontSize: 11, marginTop: 2 },
  actionsRow: { flexDirection: 'row', marginTop: 8, gap: 8, alignItems: 'center' },
  movBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  movBtnText: { color: COLORS.bg, fontWeight: 'bold', fontSize: 12 },
  iconBtn: { padding: 6, backgroundColor: COLORS.bg, borderRadius: 6 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '88%',
  },
  modalTitle: { color: COLORS.textMain, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  cameraBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cameraBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },
  previewImg: { width: '100%', height: 120, borderRadius: 8, marginTop: 10 },
  gpsInfo: { color: COLORS.success, fontSize: 12, marginTop: 12, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
});