
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, globalStyles } from '../styles/theme';
import { getEquipamentoByQr } from '../database/database';
import { triggerHapticSuccess } from '../services/hardwareService';

export default function ScannerScreen({ onQrResolved }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [lanternaAtiva, setLanternaAtiva] = useState(false);
  const [bloqueioLeitura, setBloqueioLeitura] = useState(false);

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerBox}>
        <Ionicons name="camera-outline" size={54} color={COLORS.primary} />

        <Text style={styles.permTitle}>
          Permissão da Câmera Necessária
        </Text>

        <Text style={styles.permSub}>
          Autorize o uso da câmera para ler etiquetas patrimoniais QR Code e códigos de barras.
        </Text>

        <TouchableOpacity
          style={globalStyles.primaryBtn}
          onPress={requestPermission}
        >
          <Text style={globalStyles.primaryBtnText}>
            Autorizar Câmera
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const processarCodigoLido = ({ data }) => {
    if (bloqueioLeitura) return;

    setBloqueioLeitura(true);
    triggerHapticSuccess();

    const equipamentoEncontrado = getEquipamentoByQr(String(data));

    if (equipamentoEncontrado) {
      setLanternaAtiva(false);
      onQrResolved(equipamentoEncontrado);
    } else {
      Alert.alert(
        `Código Lido: ${data}`,
        'Este código não consta na tabela de equipamentos do SQLite. Deseja cadastrá-lo agora?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => setBloqueioLeitura(false),
          },
          {
            text: 'Cadastrar Equipamento',
            onPress: () => {
              setLanternaAtiva(false);
              onQrResolved({
                isNewFromQr: true,
                codigo_qr: String(data),
              });
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.scannerScreen}>

      {/* Área limitada da câmera */}
      <View style={styles.cameraFrame}>
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={lanternaAtiva}
          onBarcodeScanned={
            bloqueioLeitura ? undefined : processarCodigoLido
          }
        />
      </View>

      {/* Instrução de leitura */}
      <Text style={styles.hint}>
        Aponte a câmera para qualquer QR Code ou Código de Barras de equipamento
      </Text>

      {/* Controle da lanterna */}
      <TouchableOpacity
        style={[
          styles.torchBtn,
          lanternaAtiva && { backgroundColor: COLORS.warning },
        ]}
        onPress={() => setLanternaAtiva(!lanternaAtiva)}
      >
        <Ionicons
          name={lanternaAtiva ? 'flash' : 'flash-off'}
          size={20}
          color={COLORS.bg}
        />

        <Text style={styles.torchText}>
          {lanternaAtiva ? 'Desligar Lanterna' : 'Acionar Lanterna (Flash)'}
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  permTitle: {
    color: COLORS.textMain,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },

  permSub: {
    color: COLORS.textSub,
    textAlign: 'center',
    marginVertical: 14,
  },

  // Tela principal do scanner
  scannerScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  // Moldura que limita o tamanho da câmera
  cameraFrame: {
    width: 230,
    height: 230,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 18,
    overflow: 'hidden',
  },

  // A câmera ocupa somente o espaço da moldura
  camera: {
    flex: 1,
  },

  hint: {
    color: COLORS.textMain,
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 18,
    textAlign: 'center',
    fontSize: 13,
  },

  torchBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 24,
    alignItems: 'center',
    gap: 8,
  },

  torchText: {
    color: COLORS.bg,
    fontWeight: 'bold',
  },
});
