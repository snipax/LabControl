import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, globalStyles } from '../styles/theme';
import { authenticateBiometrics } from '../services/hardwareService';

export default function LoginScreen({ onLoginSuccess }) {
  const handleAuth = async () => {
    const ok = await authenticateBiometrics('LabControl: Autentique-se para liberar o terminal');
    if (ok) {
      onLoginSuccess();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="hardware-chip-outline" size={52} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>LabControl Mobile</Text>
        <Text style={styles.subtitle}>
          Gestão de Inventário, Controle de Empréstimos de Bancada e Manutenção Técnica com SQLite e Sensores Nativos
        </Text>

        <TouchableOpacity style={globalStyles.primaryBtn} onPress={handleAuth}>
          <Ionicons name="finger-print" size={22} color={COLORS.bg} />
          <Text style={globalStyles.primaryBtnText}>Autenticar Operador (Biometria)</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Engenharia de Computação • FHO • Edilson Martins Alves (RA 114093)
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textMain,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSub,
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 19,
  },
  footer: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 22,
    textAlign: 'center',
  },
});