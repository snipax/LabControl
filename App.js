import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, globalStyles } from './src/styles/theme';
import { initDB } from './src/database/database';
import { getCurrentLocation } from './src/services/hardwareService';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import EquipmentScreen from './src/screens/EquipmentScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import UsersScreen from './src/screens/UsersScreen';

export default function App() {
    const [autenticado, setAutenticado] = useState(false);
    const [abaAtiva, setAbaAtiva] = useState('DASHBOARD');
    const [equipamentoPreSelecionado, setEquipamentoPreSelecionado] = useState(null);
    const [gpsData, setGpsData] = useState({
        latitude: 0,
        longitude: 0,
        statusText: 'Inicializando GPS...',
    });

    useEffect(() => {
        initDB();
        atualizarGps();
    }, []);

    const atualizarGps = async () => {
        const loc = await getCurrentLocation();
        setGpsData(loc);
    };

    if (!autenticado) {
        return <LoginScreen onLoginSuccess={() => setAutenticado(true)} />;
    }

    return (
        <SafeAreaView style={globalStyles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>LabControl</Text>
                    <Text style={styles.headerSub}>{gpsData.statusText}</Text>
                </View>
                <TouchableOpacity style={styles.lockBtn} onPress={() => setAutenticado(false)}>
                    <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSub} />
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
                {abaAtiva === 'DASHBOARD' && (
                    <DashboardScreen gpsData={gpsData} onNavigate={setAbaAtiva} />
                )}

                {abaAtiva === 'EQUIPMENTS' && (
                    <EquipmentScreen
                        gpsData={gpsData}
                        refreshGps={atualizarGps}
                        preSelectedEquip={equipamentoPreSelecionado}
                        clearPreSelected={() => setEquipamentoPreSelecionado(null)}
                    />
                )}

                {abaAtiva === 'SCANNER' && (
                    <ScannerScreen
                        onQrResolved={(equipObj) => {
                            setEquipamentoPreSelecionado(equipObj);
                            setAbaAtiva('EQUIPMENTS');
                        }}
                    />
                )}

                {abaAtiva === 'USERS' && <UsersScreen />}

                {abaAtiva === 'HISTORY' && <HistoryScreen />}
            </View>

            <View style={styles.bottomBar}>
                {[
                    { id: 'DASHBOARD', label: 'Resumo', icon: 'grid' },
                    { id: 'EQUIPMENTS', label: 'Equipamentos', icon: 'hardware-chip' },
                    { id: 'SCANNER', label: 'Scanner QR', icon: 'qr-code' },
                    { id: 'USERS', label: 'Usuários', icon: 'people' },
                    { id: 'HISTORY', label: 'Histórico', icon: 'document-text' },
                ].map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        style={styles.tabBtn}
                        onPress={() => setAbaAtiva(tab.id)}
                    >
                        <Ionicons
                            name={abaAtiva === tab.id ? tab.icon : `${tab.icon}-outline`}
                            size={22}
                            color={abaAtiva === tab.id ? COLORS.primary : COLORS.textMuted}
                        />
                        <Text
                            style={[
                                styles.tabLabel,
                                abaAtiva === tab.id && { color: COLORS.primary, fontWeight: 'bold' },
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.card,
    },
    headerTitle: { color: COLORS.textMain, fontSize: 20, fontWeight: 'bold' },
    headerSub: { color: COLORS.primary, fontSize: 11, marginTop: 2 },
    lockBtn: { padding: 8, backgroundColor: COLORS.card, borderRadius: 8 },
    bottomBar: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingVertical: 10,
    },
    tabBtn: { flex: 1, alignItems: 'center' },
    tabLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 4 },
});