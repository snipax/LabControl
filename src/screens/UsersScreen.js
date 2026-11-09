import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Modal,
    ScrollView,
    Alert,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, globalStyles } from '../styles/theme';
import {
    getUsuarios,
    insertUsuario,
    updateUsuario,
    deleteUsuario,
} from '../database/database';
import {
    authenticateBiometrics,
    subscribeToShake,
    triggerHapticSuccess,
    triggerHapticError,
    triggerHapticSelection,
} from '../services/hardwareService';

export default function UsersScreen() {
    const [lista, setLista] = useState([]);
    const [busca, setBusca] = useState('');
    const [filtroPerfil, setFiltroPerfil] = useState('TODOS');
    const [shakeAviso, setShakeAviso] = useState(false);

    // Estados do Modal de Cadastro / Edição (CREATE / UPDATE)
    const [modalVisible, setModalVisible] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [nome, setNome] = useState('');
    const [raMatricula, setRaMatricula] = useState('');
    const [perfil, setPerfil] = useState('ALUNO');
    const [cursoSetor, setCursoSetor] = useState('');

    const carregarUsuarios = () => {
        const dados = getUsuarios(busca, filtroPerfil);
        setLista(dados);
    };

    useEffect(() => {
        carregarUsuarios();
    }, [busca, filtroPerfil]);

    // Sensor Acelerômetro: Limpa filtros ao agitar o celular
    useEffect(() => {
        const sub = subscribeToShake(() => {
            setBusca('');
            setFiltroPerfil('TODOS');
            setShakeAviso(true);
            setTimeout(() => setShakeAviso(false), 2500);
        });
        return () => sub && sub.remove();
    }, []);

    const abrirModalNovo = () => {
        setEditandoId(null);
        setNome('');
        setRaMatricula('');
        setPerfil('ALUNO');
        setCursoSetor('Engenharia de Computação');
        setModalVisible(true);
    };

    const abrirModalEdicao = (item) => {
        setEditandoId(item.id);
        setNome(item.nome);
        setRaMatricula(item.ra_matricula);
        setPerfil(item.perfil);
        setCursoSetor(item.curso_setor);
        setModalVisible(true);
    };

    const salvarUsuarioSQLite = () => {
        if (!nome.trim() || !raMatricula.trim()) {
            triggerHapticError();
            Alert.alert('Campos Obrigatórios', 'Informe o Nome completo e o RA / Matrícula.');
            return;
        }

        try {
            if (editandoId) {
                updateUsuario({
                    id: editandoId,
                    nome,
                    ra_matricula: raMatricula,
                    perfil,
                    curso_setor: cursoSetor,
                });
            } else {
                insertUsuario({
                    nome,
                    ra_matricula: raMatricula,
                    perfil,
                    curso_setor: cursoSetor,
                });
            }

            triggerHapticSuccess();
            setModalVisible(false);
            carregarUsuarios();
        } catch (error) {
            triggerHapticError();
            Alert.alert('RA / Matrícula Duplicado', 'Já existe um usuário cadastrado com este RA ou Matrícula.');
        }
    };

    const confirmarExclusaoSQLite = (item) => {
        Alert.alert(
            'Excluir Usuário',
            `Confirma a exclusão de "${item.nome}" (RA: ${item.ra_matricula})?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Autenticar e Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        const autorizado = await authenticateBiometrics('Autorizar exclusão de usuário');
                        if (autorizado) {
                            deleteUsuario(item.id);
                            carregarUsuarios();
                        }
                    },
                },
            ]
        );
    };

    const corPorPerfil = (pf) => {
        if (pf === 'TECNICO') return COLORS.success;
        if (pf === 'MONITOR') return COLORS.warning;
        return COLORS.primary;
    };

    const iconePorPerfil = (pf) => {
        if (pf === 'TECNICO') return 'construct-outline';
        if (pf === 'MONITOR') return 'Ribbon-outline';
        return 'school-outline';
    };

    return (
        <View style={globalStyles.screenPadding}>
            {shakeAviso && (
                <View style={styles.shakeBar}>
                    <Text style={styles.shakeText}>Acelerômetro: Filtros de usuários limpos!</Text>
                </View>
            )}

            {/* BARRA DE BUSCA + BOTÃO NOVO USUÁRIO */}
            <View style={styles.topRow}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={18} color={COLORS.textSub} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar por nome, RA ou curso/setor..."
                        placeholderTextColor={COLORS.textMuted}
                        value={busca}
                        onChangeText={setBusca}
                    />
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={abrirModalNovo}>
                    <Ionicons name="person-add" size={20} color={COLORS.bg} />
                </TouchableOpacity>
            </View>

            {/* FILTROS POR PERFIL */}
            <View style={styles.chipsRow}>
                {['TODOS', 'ALUNO', 'MONITOR', 'TECNICO'].map((pf) => (
                    <TouchableOpacity
                        key={pf}
                        style={[styles.chip, filtroPerfil === pf && styles.chipActive]}
                        onPress={() => {
                            triggerHapticSelection();
                            setFiltroPerfil(pf);
                        }}
                    >
                        <Text style={[styles.chipText, filtroPerfil === pf && styles.chipTextActive]}>
                            {pf}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* LISTA DE USUÁRIOS DO SQLITE */}
            <FlatList
                data={lista}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                    <View style={styles.userCard}>
                        <View
                            style={[
                                styles.avatarBox,
                                { borderColor: corPorPerfil(item.perfil) },
                            ]}
                        >
                            <Ionicons
                                name={iconePorPerfil(item.perfil)}
                                size={24}
                                color={corPorPerfil(item.perfil)}
                            />
                        </View>

                        <View style={{ flex: 1 }}>
                            <View style={styles.rowBetween}>
                                <Text style={styles.raText}>RA/Matrícula: {item.ra_matricula}</Text>
                                <Text style={[styles.perfilBadge, { color: corPorPerfil(item.perfil) }]}>
                                    {item.perfil}
                                </Text>
                            </View>

                            <Text style={styles.userName}>{item.nome}</Text>
                            <Text style={styles.userCourse}>{item.curso_setor}</Text>
                        </View>

                        <View style={styles.actionsCol}>
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
                )}
            />

            {/* MODAL DE CADASTRO E EDIÇÃO DE USUÁRIO */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>
                            {editandoId ? 'Editar Usuário (UPDATE)' : 'Novo Usuário (INSERT)'}
                        </Text>

                        <ScrollView>
                            <Text style={globalStyles.inputLabel}>Perfil de Acesso</Text>
                            <View style={styles.chipsRow}>
                                {['ALUNO', 'MONITOR', 'TECNICO'].map((pf) => (
                                    <TouchableOpacity
                                        key={pf}
                                        style={[styles.chip, perfil === pf && styles.chipActive]}
                                        onPress={() => setPerfil(pf)}
                                    >
                                        <Text style={[styles.chipText, perfil === pf && styles.chipTextActive]}>
                                            {pf}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={globalStyles.inputLabel}>Nome Completo</Text>
                            <TextInput
                                style={globalStyles.input}
                                value={nome}
                                onChangeText={setNome}
                                placeholder="Ex: Edilson Martins Alves"
                                placeholderTextColor={COLORS.textMuted}
                            />

                            <Text style={globalStyles.inputLabel}>RA ou Matrícula (Único)</Text>
                            <TextInput
                                style={globalStyles.input}
                                value={raMatricula}
                                onChangeText={setRaMatricula}
                                placeholder="Ex: 114093 ou TEC-02"
                                placeholderTextColor={COLORS.textMuted}
                            />

                            <Text style={globalStyles.inputLabel}>Curso ou Setor</Text>
                            <TextInput
                                style={globalStyles.input}
                                value={cursoSetor}
                                onChangeText={setCursoSetor}
                                placeholder="Ex: Engenharia de Computação"
                                placeholderTextColor={COLORS.textMuted}
                            />
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={{ color: COLORS.textSub, fontWeight: 'bold' }}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={salvarUsuarioSQLite}>
                                <Text style={{ color: COLORS.bg, fontWeight: 'bold' }}>Salvar no SQLite</Text>
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
    userCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    avatarBox: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.bg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
    },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    raText: { color: COLORS.primary, fontSize: 11, fontWeight: 'bold' },
    perfilBadge: { fontSize: 10, fontWeight: 'bold' },
    userName: { color: COLORS.textMain, fontWeight: 'bold', fontSize: 15, marginTop: 2 },
    userCourse: { color: COLORS.textSub, fontSize: 12, marginTop: 2 },
    actionsCol: { flexDirection: 'row', gap: 6, marginLeft: 6 },
    iconBtn: { padding: 8, backgroundColor: COLORS.bg, borderRadius: 8 },
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
        maxHeight: '85%',
    },
    modalTitle: { color: COLORS.textMain, fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
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