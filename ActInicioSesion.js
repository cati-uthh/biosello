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
import { AuthContext } from './AuthContext';
import { COLORS, SIZES, FONTS } from './src/theme/theme';

export default function ActInicioSesion({ navigation }) {
    const { setSesionActiva, setUsuario } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [soportaBiometria, setSoportaBiometria] = useState(false);
    
    // Campo único para Correo electrónico o Número de teléfono
    const [credenciales, setCredenciales] = useState({ identificador: '', contrasena: '' });

    useEffect(() => {
        comprobarBiometria();
    }, []);

    const comprobarBiometria = async () => {
        try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const registrado = await LocalAuthentication.isEnrolledAsync();
            setSoportaBiometria(compatible && registrado);
        } catch (e) {
            setSoportaBiometria(false);
        }
    };

    const autenticarConBiometria = async () => {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Autenticación biométrica para bioSello',
                fallbackLabel: 'Usar contraseña',
            });

            if (result.success) {
                Alert.alert('Huella / Rostro reconocido', 'Inicia sesión con tus credenciales guardadas.');
                // Aquí puedes integrar la recuperación de credenciales desde SecureStore si lo implementan más adelante
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo validar la biometría.');
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

    const manejarLogin = async () => {
        if (!validarEntradas()) return;

        setLoading(true);

        try {
            const response = await fetch('https://biosello-backend.vercel.app/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identificador: credenciales.identificador.trim().toLowerCase(),
                    contrasena: credenciales.contrasena
                })
            });

            const result = await response.json();

            if (!response.ok || result.success === false) {
                Alert.alert('No se pudo iniciar sesión', result.error || 'Revisa tus datos e intenta nuevamente.');
                return;
            }

            setSesionActiva(true);
            setUsuario(result.usuario || result.user || result.data || null);
            navigation.reset({
                index: 0,
                routes: [{
                    name: 'MainTabs',
                    state: { routes: [{ name: 'Inicio' }] }
                }],
            });
        } catch (error) {
            Alert.alert('Error de conexión', 'No se pudo conectar con el servidor. Revisa tu conexión a internet e intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

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

                    {soportaBiometria && (
                        <TouchableOpacity style={styles.biometricButton} onPress={autenticarConBiometria}>
                            <Ionicons name="finger-print-outline" size={26} color={COLORS.blancoPuro} />
                            <Text style={styles.biometricText}>Ingresar con huella o biometría</Text>
                        </TouchableOpacity>
                    )}

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
    forgotContainer: { marginTop: 25, alignItems: 'center' },
    forgotText: { color: COLORS.blancoPuro, fontSize: 15, fontWeight: FONTS.bold, textAlign: 'center' },
    subForgotText: { color: '#cbd5e1', fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 4 },
    forgotLink: { fontStyle: 'italic', textDecorationLine: 'underline' }
});