import React, { useState, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { AuthContext } from './AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function ActInicioSesion({ navigation }) {
    const { setSesionActiva } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [credenciales, setCredenciales] = useState({
        email: '',
        contrasena: ''
    });

    const manejarLogin = async () => {
        if (!credenciales.email || !credenciales.contrasena) {
            Alert.alert('Campos vacíos', 'Por favor ingresa tu usuario y contraseña.');
            return;
        }

        // 1. Iniciamos la animación de carga
        setLoading(true);

        try {
            // 2. Esperamos la respuesta del backend / ENDPOINT
            const response = await fetch('https://biosello-backend.vercel.app/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credenciales)
            });

            const result = await response.json();

            // 3. Validamos el resultado
            if (result.success) {
                Alert.alert('Bienvenido', 'Inicio de sesión exitoso', [
                    {
                        text: 'Entrar', 
                        onPress: () => {
                            // 4. AQUÍ ES DONDE ACTIVAMOS LA SESIÓN Y NAVEGAMOS:
                            setSesionActiva(true);
                            navigation.reset({
                                index: 0,
                                routes: [{ 
                                    name: 'MainTabs', 
                                    // Forzamos explícitamente a que abra la pestaña de Inicio
                                    state: { routes: [{ name: 'Inicio' }] } 
                                }],
                            });
                        }
                    }
                ]);
            } else {
                Alert.alert('Error de Acceso', result.error);
            }
        } catch (error) {
            Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
        } finally {
            // 5. Apagamos la animación de carga
            setLoading(false);
        }
    };
    
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.logoContainer}>
                <Image
                    source={require('./assets/logo-oficial.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />

            </View>

            <View style={styles.formContainer}>
                <Text style={styles.label}>Usuario</Text>
                <TextInput
                    style={styles.input}
                    placeholder=""
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={(text) => setCredenciales({ ...credenciales, email: text })}
                />

                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.passwordContainer}>
                    <TextInput
                        style={styles.passwordInput}
                        placeholder=""
                        // 4. Invertimos el estado: si es true, secureTextEntry es false
                        secureTextEntry={!mostrarContrasena} 
                        onChangeText={(text) => setCredenciales({ ...credenciales, contrasena: text })}
                    />
                    <TouchableOpacity 
                        style={styles.eyeIcon} 
                        onPress={() => setMostrarContrasena(!mostrarContrasena)}
                    >
                        <Ionicons 
                            name={mostrarContrasena ? "eye-off" : "eye"} 
                            size={24} 
                            color="gray" 
                        />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.mainButton}
                    onPress={manejarLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.mainButtonText}>Entrar</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.forgotContainer}>
                    <Text style={styles.forgotText}>¿Olvidó la contraseña?</Text>
                    <Text style={styles.forgotText}>
                        haz clic aquí:{' '}
                        <Text style={styles.forgotLink}>Restablecer contraseña.</Text>
                    </Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#041E3A', // Fondo azul marino institucional
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 35,
    },
    logo: {
        width: 280,
        height: 100,
        marginBottom: 25,
    },
    titulo: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    formContainer: {
        paddingHorizontal: 40, // Márgenes laterales más amplios según el mockup
    },
    label: {
        color: '#FFFFFF',
        fontSize: 16,
        marginBottom: 5,
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 4, // Bordes menos redondeados en el diseño
        padding: 12,
        marginBottom: 20,
        color: '#000000',
        fontSize: 16,
        height: 48,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        marginBottom: 20,
        height: 48,
    },
    passwordInput: {
        flex: 1,
        padding: 12,
        color: '#000000',
        fontSize: 16,
        height: '100%',
    },
    eyeIcon: {
        padding: 10,
    },
    mainButton: {
        backgroundColor: '#D32F2F', // Rojo BioSello
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    mainButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    forgotContainer: {
        marginTop: 30,
        alignItems: 'center',
    },
    forgotText: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 22,
    },
    forgotLink: {
        fontWeight: 'bold',
        fontStyle: 'italic',
        textDecorationLine: 'underline',
    }
});