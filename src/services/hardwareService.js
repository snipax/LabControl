import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';

// Configura o sistema operacional para exibir o alerta visual e tocar som mesmo com o app aberto
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// 1. Sensor Biométrico (Validação de Operador / Assinatura Digital)
export const authenticateBiometrics = async (mensagemPrompt = 'Confirme sua identidade') => {
    try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) {
            Alert.alert(
                'Biometria não configurada no aparelho',
                'O dispositivo não possui digital/FaceID cadastrado. Operação liberada pelo perfil local.'
            );
            return true;
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: mensagemPrompt,
            cancelLabel: 'Cancelar',
            fallbackLabel: 'Usar PIN do dispositivo',
        });

        if (result.success) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return true;
        } else {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return false;
        }
    } catch (error) {
        Alert.alert('Erro no Sensor Biométrico', error.message);
        return false;
    }
};

// 2. Sensor GPS (Geolocalização Real)
export const getCurrentLocation = async () => {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            return {
                latitude: 0,
                longitude: 0,
                statusText: 'Permissão de GPS negada pelo usuário',
            };
        }

        const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            statusText: 'GPS Ativo (Coordenadas Reais)',
        };
    } catch (error) {
        return {
            latitude: 0,
            longitude: 0,
            statusText: 'Aguardando sinal de satélite GPS...',
        };
    }
};

// 3. Sensor Câmera (Captura Fotográfica Nativa + Cópia para Armazenamento Permanente)
export const capturePhotoFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
        Alert.alert('Permissão Negada', 'É necessário liberar o acesso à câmera nas configurações.');
        return null;
    }

    const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const tempUri = result.assets[0].uri;

        try {
            // Define a pasta permanente dentro do armazenamento interno privado do app
            const dirUri = `${FileSystem.documentDirectory}fotos_lab/`;
            const dirInfo = await FileSystem.getInfoAsync(dirUri);

            // Se a pasta 'fotos_lab' ainda não existir no celular, cria agora
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
            }

            // Gera um nome único com timestamp e copia do Cache para o DocumentDirectory
            const nomeArquivo = `foto_${Date.now()}.jpg`;
            const permanentUri = `${dirUri}${nomeArquivo}`;

            await FileSystem.copyAsync({
                from: tempUri,
                to: permanentUri,
            });

            return permanentUri;
        } catch (e) {
            // Fallback: se o ambiente bloquear escrita em disco, usa a URI original
            return tempUri;
        }
    }

    return null;
};

// 4. Sensor Acelerômetro (Detecção de Agitação Física / Shake)
export const subscribeToShake = (onShakeCallback) => {
    Accelerometer.setUpdateInterval(300);
    let lastShake = 0;

    return Accelerometer.addListener(({ x, y, z }) => {
        const gForce = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();
        if (gForce > 2.1 && now - lastShake > 2000) {
            lastShake = now;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onShakeCallback();
        }
    });
};

// 5. Feedback Tátil (Haptics)
export const triggerHapticSuccess = () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

export const triggerHapticError = () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

export const triggerHapticSelection = () => Haptics.selectionAsync();

// 6. Notificações Locais de Prazo de Devolução
export const scheduleLoanReminder = async (equipamentoNome, responsavel, segundosParaAlerta) => {
    try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
            return null;
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '⚠️ Prazo de Empréstimo Vencido!',
                body: `O equipamento "${equipamentoNome}" retirado por ${responsavel} atingiu o horário limite de devolução.`,
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes
                    ? Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL
                    : 'timeInterval',
                seconds: segundosParaAlerta,
                repeats: false,
            },
        });

        return notificationId;
    } catch (error) {
        console.log('Aviso ao agendar notificação:', error.message);
        return null;
    }
};

export const cancelLoanReminder = async (notificationId) => {
    try {
        if (notificationId) {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
        }
    } catch (error) {
        console.log('Aviso ao cancelar notificação:', error.message);
    }
};