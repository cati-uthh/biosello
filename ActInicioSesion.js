import React, { useContext, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from './AuthContext';

export default function ActInicioSesion({ navigation }) {
    const { setSesionActiva, setUsuario } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [credenciales, setCredenciales] = useState({ email: '', contrasena: '' });

    const manejarLogin = async () => {
        if (!credenciales.email.trim() || !credenciales.contrasena) {
            Alert.alert('Campos incompletos', 'Ingresa tu correo y contraseña para continuar.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('https://biosello-backend.vercel.app/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: credenciales.email.trim().toLowerCase(),
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
            Alert.alert('Error de conexión', 'No se pudo conectar con el servidor. Revisa tu internet e intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.logoContainer}>
                <Image source={require('./assets/logo-oficial.png')} style={styles.logo} resizeMode="contain" />
            </View>

            <View style={styles.formContainer}>
                <Text style={styles.label}>Correo electrónico</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={credenciales.email}
                    onChangeText={(text) => setCredenciales((prev) => ({ ...prev, email: text }))}
                />

                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.passwordContainer}>
                    <TextInput
                        style={styles.passwordInput}
                        secureTextEntry={!mostrarContrasena}
                        value={credenciales.contrasena}
                        onChangeText={(text) => setCredenciales((prev) => ({ ...prev, contrasena: text }))}
                    />
                    <TouchableOpacity style={styles.eyeIcon} onPress={() => setMostrarContrasena(!mostrarContrasena)}>
                        <Ionicons name={mostrarContrasena ? 'eye-off' : 'eye'} size={24} color="gray" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.mainButton} onPress={manejarLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.mainButtonText}>Entrar</Text>}
                </TouchableOpacity>

                <View style={styles.forgotContainer}>
                    <Text style={styles.forgotText}>¿Olvidaste la contraseña?</Text>
                    <Text style={styles.forgotText}>
                        Usa la opción <Text style={styles.forgotLink}>Restablecer contraseña</Text> cuando esté disponible.
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#041E3A', justifyContent: 'center' },
    logoContainer: { alignItems: 'center', marginBottom: 35 },
    logo: { width: 280, height: 100, marginBottom: 25 },
    formContainer: { paddingHorizontal: 40 },
    label: { color: '#FFFFFF', fontSize: 16, marginBottom: 5, fontWeight: 'bold' },
    input: { backgroundColor: '#FFFFFF', borderRadius: 4, padding: 12, marginBottom: 20, color: '#000000', fontSize: 16, height: 48 },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 4, marginBottom: 20, height: 48 },
    passwordInput: { flex: 1, padding: 12, color: '#000000', fontSize: 16, height: '100%' },
    eyeIcon: { padding: 10 },
    mainButton: { backgroundColor: '#D32F2F', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    mainButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    forgotContainer: { marginTop: 30, alignItems: 'center' },
    forgotText: { color: '#FFFFFF', fontSize: 15, lineHeight: 22, textAlign: 'center' },
    forgotLink: { fontWeight: 'bold', fontStyle: 'italic', textDecorationLine: 'underline' }
});
