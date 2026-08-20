import React, { useContext, useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, SIZES, FONTS } from '../../theme/theme';
import { normalizarUsuarioSesion } from '../../utils/auth';

const CLAVE_USUARIO_GUARDADO = 'biosello_usuario_identificador';
const CLAVE_PASS_GUARDADA = 'biosello_usuario_pass';
const CLAVE_BIOMETRIA_ACTIVADA = 'biosello_biometria_activada';

export default function ActInicioSesion({ navigation }) {
    const { iniciarSesion } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [mostrarBotonBiometrico, setMostrarBotonBiometrico] = useState(false);
    const [idVinculado, setIdVinculado] = useState('');
    
    const [credenciales, setCredenciales] = useState({ identificador: '', contrasena: '' });

    useEffect(() => {
        verificarEstadoBiometrico();
    }, []);

    const verificarEstadoBiometrico = async () => {
        try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const registrado = await LocalAuthentication.isEnrolledAsync();
            const biometriaActivada = await SecureStore.getItemAsync(CLAVE_BIOMETRIA_ACTIVADA);
            const idGuardado = await SecureStore.getItemAsync(CLAVE_USUARIO_GUARDADO);

            if (idGuardado) {
                setIdVinculado(idGuardado);
                setCredenciales(prev => ({ ...prev, identificador: idGuardado }));
            }

            // Solo mostramos la opción si el hardware es compatible, hay usuario guardado y EL USUARIO ACTIVÓ LA OPCIÓN
            setMostrarBotonBiometrico(compatible && registrado && biometriaActivada === 'true' && Boolean(idGuardado));
        } catch (e) {
            setMostrarBotonBiometrico(false);
        }
    };

    const autenticarConBiometria = async () => {
        try {
            const passGuardada = await SecureStore.getItemAsync(CLAVE_PASS_GUARDADA);

            if (!passGuardada) {
                await SecureStore.setItemAsync(CLAVE_BIOMETRIA_ACTIVADA, 'false');
                setMostrarBotonBiometrico(false);
                Alert.alert('Acceso expirado', 'Por favor ingresa tu contraseña manualmente para renovar la biometría.');
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: `Acceso biométrico para ${idVinculado}`,
                fallbackLabel: 'Usar contraseña',
            });

            if (result.success) {
                ejecutarPeticionLogin(idVinculado, passGuardada, false);
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo procesar la autenticación biométrica.');
        }
    };

    const validarEntradas = () => {
        const idLimpio = credenciales.identificador.trim();
        if (!idLimpio || !credenciales.contrasena) {
            Alert.alert('Campos incompletos', 'Ingresa tu correo o teléfono y tu contraseña.');
            return false;
        }

        const esEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(idLimpio);
        const esTelefono = /^\d{10}$/.test(idLimpio);

        if (!esEmail && !esTelefono) {
            Alert.alert('Formato incorrecto', 'Ingresa un correo válido o un número de teléfono a 10 dígitos.');
            return false;
        }

        return true;
    };

    const preguntarActivaciónBiometria = (idLimpio, contrasenaVal, datosUsuario) => {
        LocalAuthentication.hasHardwareAsync().then(compatible => {
            LocalAuthentication.isEnrolledAsync().then(registrado => {
                if (compatible && registrado) {
                    Alert.alert(
                        'Acceso Rápido',
                        '¿Deseas activar el inicio de sesión con huella o biometría para tus próximos ingresos?',
                        [
                            {
                                text: 'No, gracias',
                                style: 'cancel',
                                onPress: async () => {
                                    await SecureStore.setItemAsync(CLAVE_BIOMETRIA_ACTIVADA, 'false');
                                    finalizarLogin(datosUsuario);
                                }
                            },
                            {
                                text: 'Sí, activar',
                                onPress: async () => {
                                    await SecureStore.setItemAsync(CLAVE_USUARIO_GUARDADO, idLimpio);
                                    await SecureStore.setItemAsync(CLAVE_PASS_GUARDADA, contrasenaVal);
                                    await SecureStore.setItemAsync(CLAVE_BIOMETRIA_ACTIVADA, 'true');
                                    finalizarLogin(datosUsuario);
                                }
                            }
                        ]
                    );
                } else {
                    finalizarLogin(datosUsuario);
                }
            });
        });
    };

    const finalizarLogin = (datosUsuario) => {
        const usuarioSesion = normalizarUsuarioSesion(datosUsuario);
        if (!usuarioSesion) {
            Alert.alert('No se pudo iniciar sesión', 'El servidor no devolvió los datos de usuario.');
            return;
        }

        iniciarSesion(usuarioSesion);
        navigation.reset({
            index: 0,
            routes: [{
                name: 'MainTabs',
                state: { routes: [{ name: 'Inicio' }] }
            }],
        });
    };

    const ejecutarPeticionLogin = async (identificadorVal, contrasenaVal, esPrimerIngreso = true) => {
        setLoading(true);

        try {
            const idLimpio = identificadorVal.trim().toLowerCase();

            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: idLimpio,
                    identificador: idLimpio,
                    contrasena: contrasenaVal
                })
            });

            const textResult = await response.text();
            let result = {};
            try {
                result = textResult ? JSON.parse(textResult) : {};
            } catch (error) {
                result = {};
            }

            if (!response.ok || result.success === false) {
                if (!esPrimerIngreso && (response.status === 401 || response.status === 403)) {
                    await Promise.all([
                        SecureStore.setItemAsync(CLAVE_BIOMETRIA_ACTIVADA, 'false'),
                        SecureStore.deleteItemAsync(CLAVE_USUARIO_GUARDADO),
                        SecureStore.deleteItemAsync(CLAVE_PASS_GUARDADA)
                    ]);
                    setMostrarBotonBiometrico(false);
                    setIdVinculado('');
                    setCredenciales({ identificador: '', contrasena: '' });
                    Alert.alert(
                        'Vinculación expirada',
                        'La credencial guardada ya no es válida. Inicia sesión con tu contraseña para volver a vincular la biometría.'
                    );
                    return;
                }
                Alert.alert('No se pudo iniciar sesión', result.error || 'Revisa tus datos e intenta nuevamente.');
                return;
            }

            const datosUsuario = normalizarUsuarioSesion(result);
            if (!datosUsuario) {
                Alert.alert('No se pudo iniciar sesión', 'El servidor no devolvió los datos de usuario.');
                return;
            }

            if (esPrimerIngreso) {
                // Verificamos si ya ha tomado una decisión de biometría previamente
                const estadoPrevio = await SecureStore.getItemAsync(CLAVE_BIOMETRIA_ACTIVADA);
                if (estadoPrevio === null) {
                    preguntarActivaciónBiometria(idLimpio, contrasenaVal, datosUsuario);
                } else {
                    if (estadoPrevio === 'true') {
                        await SecureStore.setItemAsync(CLAVE_USUARIO_GUARDADO, idLimpio);
                        await SecureStore.setItemAsync(CLAVE_PASS_GUARDADA, contrasenaVal);
                    }
                    finalizarLogin(datosUsuario);
                }
            } else {
                finalizarLogin(datosUsuario);
            }
        } catch (error) {
            Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const manejarLogin = () => {
        if (!validarEntradas()) return;
        ejecutarPeticionLogin(credenciales.identificador, credenciales.contrasena, true);
    };

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.logoContainer}>
                    <Image source={require('../../../assets/logo-oficial.png')} style={styles.logo} resizeMode="contain" />
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.label}>Correo electrónico o Teléfono</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={100}
                        placeholder="ejemplo@correo.com o 10 dígitos"
                        placeholderTextColor="#888"
                        value={credenciales.identificador}
                        onChangeText={(text) => setCredenciales((prev) => ({ ...prev, identificador: text }))}
                    />

                    <Text style={styles.label}>Contraseña</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.passwordInput}
                            secureTextEntry={!mostrarContrasena}
                            maxLength={128}
                            value={credenciales.contrasena}
                            onChangeText={(text) => setCredenciales((prev) => ({ ...prev, contrasena: text }))}
                        />
                        <TouchableOpacity style={styles.eyeIcon} onPress={() => setMostrarContrasena(!mostrarContrasena)}>
                            <Ionicons name={mostrarContrasena ? 'eye-off' : 'eye'} size={24} color="gray" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.mainButton} onPress={manejarLogin} disabled={loading}>
                        {loading ? <ActivityIndicator color={COLORS.blancoPuro} /> : <Text style={styles.mainButtonText}>Iniciar sesión</Text>}
                    </TouchableOpacity>

                    {/* MOSTRADO ÚNICAMENTE SI EL USUARIO ACTIVÓ LA OPCIÓN */}
                    {mostrarBotonBiometrico && (
                        <TouchableOpacity style={styles.biometricButton} onPress={autenticarConBiometria} disabled={loading}>
                            <Ionicons name="finger-print-outline" size={26} color={COLORS.blancoPuro} />
                            <Text style={styles.biometricText}>Ingresar con huella o biometría</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('actRegistroNegocio')} disabled={loading}>
                        <Text style={styles.linkButtonText}>Registrar negocio</Text>
                    </TouchableOpacity>

                    <View style={styles.forgotContainer}>
                        <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                        <Text style={styles.subForgotText}>
                            La opción de <Text style={styles.forgotLink}>Recuperar contraseña</Text> estará disponible próximamente.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: COLORS.azulMarino, justifyContent: 'center', paddingVertical: 20 },
    logoContainer: { alignItems: 'center', marginBottom: 25 },
    logo: { width: 280, height: 100, marginBottom: 15 },
    formContainer: { paddingHorizontal: 40 },
    label: { color: COLORS.blancoPuro, fontSize: SIZES.textoBase, marginBottom: 5, fontWeight: FONTS.bold },
    input: { backgroundColor: COLORS.blancoPuro, borderRadius: SIZES.radioInput, padding: 12, marginBottom: 20, color: COLORS.textoOscuro, fontSize: SIZES.textoBase, height: 48 },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.blancoPuro, borderRadius: SIZES.radioInput, marginBottom: 20, height: 48 },
    passwordInput: { flex: 1, padding: 12, color: COLORS.textoOscuro, fontSize: SIZES.textoBase, height: '100%' },
    eyeIcon: { padding: 10 },
    mainButton: { backgroundColor: COLORS.rojoIntenso, padding: 15, borderRadius: SIZES.radioBoton, alignItems: 'center', marginTop: 10 },
    mainButtonText: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, fontSize: SIZES.textoBase },
    biometricButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, padding: 10, borderWidth: 1, borderColor: COLORS.azulCeruleo, borderRadius: SIZES.radioBoton, gap: 10 },
    biometricText: { color: COLORS.blancoPuro, fontSize: SIZES.textoSecundario, fontWeight: FONTS.bold },
    linkButton: { alignItems: 'center', paddingVertical: 12 },
    linkButtonText: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, textDecorationLine: 'underline' },
    forgotContainer: { marginTop: 25, alignItems: 'center' },
    forgotText: { color: COLORS.blancoPuro, fontSize: 15, fontWeight: FONTS.bold, textAlign: 'center' },
    subForgotText: { color: '#cbd5e1', fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 4 },
    forgotLink: { fontStyle: 'italic', textDecorationLine: 'underline' }
});
