import React, { useContext, useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { AuthContext } from './AuthContext';
import { COLORS, SIZES, FONTS } from './src/theme/theme';
import {
    API_BASE_URL,
    normalizarUsuarioSesion,
    guardarBiometriaCuenta,
    obtenerBiometriaCuenta,
    eliminarBiometriaCuenta
} from './src/utils/auth';

export default function ActInicioSesion({ navigation }) {
    const { iniciarSesion } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    
    // Estado de biometría vinculada
    const [cuentaVinculada, setCuentaVinculada] = useState(null);
    const [hardwareDisponible, setHardwareDisponible] = useState(false);
    const [modoContrasena, setModoContrasena] = useState(true);
    
    const [credenciales, setCredenciales] = useState({ identificador: '', contrasena: '' });

    // Cargar estado biométrico al entrar a la pantalla
    useFocusEffect(
        useCallback(() => {
            verificarEstadoBiometrico();
        }, [])
    );

    // Función para verificar si hay una cuenta guardada con huella activa y vigente (< 30 días)
    const verificarEstadoBiometrico = async () => {
        try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const registrado = await LocalAuthentication.isEnrolledAsync();
            const esBiometriaValida = compatible && registrado;
            setHardwareDisponible(esBiometriaValida);

            const cuentaGuardada = await obtenerBiometriaCuenta();

            if (cuentaGuardada && esBiometriaValida) {
                setCuentaVinculada(cuentaGuardada);
                setCredenciales({
                    identificador: cuentaGuardada.identificador,
                    contrasena: ''
                });
                // Si la cuenta tiene huella activa, se inicia en modo huella
                setModoContrasena(false);
            } else {
                setCuentaVinculada(null);
                setModoContrasena(true);
            }
        } catch (e) {
            setCuentaVinculada(null);
            setModoContrasena(true);
        }
    };

    // Función para autenticar con huella dactilar para la cuenta guardada
    const autenticarConBiometria = async () => {
        if (!cuentaVinculada) return;

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: `Acceso biométrico para ${cuentaVinculada.identificador}`,
                fallbackLabel: 'Ingresar con contraseña',
                cancelLabel: 'Cancelar'
            });

            if (result.success) {
                ejecutarPeticionLogin(cuentaVinculada.identificador, cuentaVinculada.contrasena, false);
            } else if (result.error === 'user_fallback') {
                setModoContrasena(true);
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

    // Pregunta si desea activar huella digital para la cuenta tras inicio exitoso
    const preguntarActivacionBiometria = (idLimpio, contrasenaVal, datosUsuario) => {
        if (hardwareDisponible) {
            Alert.alert(
                'Inicio con huella digital',
                '¿Deseas activar el inicio de sesión con huella digital para esta cuenta en tus próximos accesos?',
                [
                    {
                        text: 'No, gracias',
                        style: 'cancel',
                        onPress: async () => {
                            await eliminarBiometriaCuenta();
                            finalizarLogin(datosUsuario);
                        }
                    },
                    {
                        text: 'Sí, activar',
                        onPress: async () => {
                            await guardarBiometriaCuenta(idLimpio, contrasenaVal);
                            finalizarLogin(datosUsuario);
                        }
                    }
                ]
            );
        } else {
            finalizarLogin(datosUsuario);
        }
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
                    await eliminarBiometriaCuenta();
                    setCuentaVinculada(null);
                    setModoContrasena(true);
                    setCredenciales({ identificador: '', contrasena: '' });
                    Alert.alert(
                        'Vinculación expirada',
                        'Las credenciales guardadas cambiaron o no son válidas. Inicia sesión con tu contraseña.'
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
                // Verificar si la cuenta que ingresó ya coincide con la que tiene huella
                const cuentaGuardada = await obtenerBiometriaCuenta();
                if (!cuentaGuardada || cuentaGuardada.identificador !== idLimpio) {
                    preguntarActivacionBiometria(idLimpio, contrasenaVal, datosUsuario);
                } else {
                    // Actualizar contraseña en caso de cambio
                    await guardarBiometriaCuenta(idLimpio, contrasenaVal);
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

    const manejarLoginManual = () => {
        if (!validarEntradas()) return;
        ejecutarPeticionLogin(credenciales.identificador, credenciales.contrasena, true);
    };

    // Comprueba si el texto actual coincide exactamente con la cuenta guardada
    const identificadorCoincideConGuardado = cuentaVinculada &&
        credenciales.identificador.trim().toLowerCase() === cuentaVinculada.identificador.toLowerCase();

    // Determina si se debe mostrar el botón de huella
    const mostrarOpcionHuella = hardwareDisponible && identificadorCoincideConGuardado && !modoContrasena;

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.logoContainer}>
                    <Image source={require('./assets/logo-oficial.png')} style={styles.logo} resizeMode="contain" />
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
                        onChangeText={(text) => {
                            setCredenciales((prev) => ({ ...prev, identificador: text }));
                            // Si el usuario escribe una cuenta diferente a la vinculada, forzar modo contraseña
                            if (!cuentaVinculada || text.trim().toLowerCase() !== cuentaVinculada.identificador.toLowerCase()) {
                                setModoContrasena(true);
                            }
                        }}
                    />

                    {/* VISTA 1: INICIO DE SESIÓN CON HUELLA BIOMÉTRICA */}
                    {mostrarOpcionHuella ? (
                        <View style={styles.seccionBiometria}>
                            <TouchableOpacity
                                style={styles.botonPrincipalBiometria}
                                onPress={autenticarConBiometria}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color={COLORS.blancoPuro} />
                                ) : (
                                    <>
                                        <Ionicons name="finger-print-outline" size={38} color={COLORS.blancoPuro} />
                                        <Text style={styles.textoBotonBiometria}>Ingresar con huella digital</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.botonAlternarModo}
                                onPress={() => setModoContrasena(true)}
                                disabled={loading}
                            >
                                <Text style={styles.textoAlternarModo}>Ingresar con contraseña</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* VISTA 2: INGRESO MANUAL CON CONTRASEÑA */
                        <View>
                            <Text style={styles.label}>Contraseña</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    secureTextEntry={!mostrarContrasena}
                                    maxLength={128}
                                    placeholder="Ingresa tu contraseña"
                                    placeholderTextColor="#888"
                                    value={credenciales.contrasena}
                                    onChangeText={(text) => setCredenciales((prev) => ({ ...prev, contrasena: text }))}
                                />
                                <TouchableOpacity style={styles.eyeIcon} onPress={() => setMostrarContrasena(!mostrarContrasena)}>
                                    <Ionicons name={mostrarContrasena ? 'eye-off' : 'eye'} size={24} color="gray" />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.mainButton} onPress={manejarLoginManual} disabled={loading}>
                                {loading ? <ActivityIndicator color={COLORS.blancoPuro} /> : <Text style={styles.mainButtonText}>Iniciar sesión</Text>}
                            </TouchableOpacity>

                            {/* Enlace para volver a huella si la cuenta coincide */}
                            {hardwareDisponible && identificadorCoincideConGuardado && (
                                <TouchableOpacity
                                    style={styles.botonAlternarModo}
                                    onPress={() => setModoContrasena(false)}
                                    disabled={loading}
                                >
                                    <Text style={styles.textoAlternarModo}>Usar huella digital</Text>
                                </TouchableOpacity>
                            )}
                        </View>
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
    
    // Estilos de Biometría
    seccionBiometria: { alignItems: 'center', marginVertical: 10 },
    botonPrincipalBiometria: { backgroundColor: COLORS.azulCeruleo, width: '100%', paddingVertical: 16, paddingHorizontal: 20, borderRadius: SIZES.radioBoton, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, elevation: 2 },
    textoBotonBiometria: { color: COLORS.blancoPuro, fontSize: 16, fontWeight: FONTS.bold },
    botonAlternarModo: { marginTop: 16, paddingVertical: 8, alignItems: 'center' },
    textoAlternarModo: { color: '#e0f2fe', fontSize: 14, fontWeight: FONTS.bold, textDecorationLine: 'underline' },

    linkButton: { alignItems: 'center', paddingVertical: 14, marginTop: 5 },
    linkButtonText: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, textDecorationLine: 'underline' },
    forgotContainer: { marginTop: 20, alignItems: 'center' },
    forgotText: { color: COLORS.blancoPuro, fontSize: 15, fontWeight: FONTS.bold, textAlign: 'center' },
    subForgotText: { color: '#cbd5e1', fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 4 },
    forgotLink: { fontStyle: 'italic', textDecorationLine: 'underline' }
});
