import React, { useContext, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from './AuthContext';
import { COLORS, SIZES, FONTS } from './src/theme/theme';
import { API_BASE_URL, normalizarUsuarioSesion } from './src/utils/auth';

const passwordRules = [
    { key: 'length', text: 'Minimo 8 caracteres', test: (value) => value.length >= 8 },
    { key: 'upper', text: 'Al menos una mayuscula', test: (value) => /[A-Z]/.test(value) },
    { key: 'lower', text: 'Al menos una minuscula', test: (value) => /[a-z]/.test(value) },
    { key: 'number', text: 'Al menos un numero', test: (value) => /\d/.test(value) }
];

export default function ActRegistroUsuario({ navigation }) {
    const { iniciarSesion } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [errores, setErrores] = useState({});
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        telefono: '',
        contrasena: '',
        confirmarContrasena: ''
    });

    const reglasContrasena = useMemo(() => passwordRules.map((rule) => ({
        ...rule,
        ok: rule.test(formData.contrasena)
    })), [formData.contrasena]);

    const actualizarCampo = (campo, valor) => {
        setFormData((prev) => ({ ...prev, [campo]: valor }));
    };

    const validarCampos = () => {
        const nuevosErrores = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (formData.nombre.trim().length < 3) nuevosErrores.nombre = 'Ingresa tu nombre completo.';
        if (!emailRegex.test(formData.email.trim())) nuevosErrores.email = 'Ingresa un correo valido.';
        if (!/^\d{10}$/.test(formData.telefono)) nuevosErrores.telefono = 'El telefono debe tener 10 digitos.';
        if (!reglasContrasena.every((rule) => rule.ok)) nuevosErrores.contrasena = 'La contrasena no cumple las reglas.';
        if (formData.contrasena !== formData.confirmarContrasena) nuevosErrores.confirmarContrasena = 'Las contrasenas no coinciden.';

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const manejarRegistro = async () => {
        if (!validarCampos()) {
            Alert.alert('Revisa el formulario', 'Hay datos pendientes o con formato incorrecto.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/registro-usuario`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: formData.nombre.trim(),
                    email: formData.email.trim().toLowerCase(),
                    telefono: formData.telefono,
                    contrasena: formData.contrasena,
                    perfil: 'usuario'
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
                Alert.alert('No se pudo crear la cuenta', result.error || 'El servidor no pudo procesar el registro.');
                return;
            }

            const usuarioSesion = normalizarUsuarioSesion(result);
            if (usuarioSesion) {
                iniciarSesion(usuarioSesion);
                navigation.reset({
                    index: 0,
                    routes: [{
                        name: 'MainTabs',
                        state: { routes: [{ name: 'Cuenta' }] }
                    }]
                });
                return;
            }

            Alert.alert(
                'Cuenta creada',
                'Ya puedes iniciar sesion con tu correo y contrasena.',
                [{ text: 'Iniciar sesion', onPress: () => navigation.navigate('actInicioSesion') }]
            );
        } catch (error) {
            Alert.alert('Error de conexion', 'No se pudo conectar con el servidor. Revisa tu internet e intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contenido}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <View style={styles.iconoHeader}>
                    <Ionicons name="person-add" size={26} color={COLORS.blancoPuro} />
                </View>
                <Text style={styles.title}>Crear cuenta personal</Text>
                <Text style={styles.subtitle}>Usa esta cuenta para consultar trazabilidad y administrar tu perfil.</Text>
            </View>

            <View style={styles.card}>
                <TextInput
                    style={[styles.input, errores.nombre && styles.inputError]}
                    placeholder="Nombre completo"
                    placeholderTextColor="#64748b"
                    value={formData.nombre}
                    onChangeText={(text) => actualizarCampo('nombre', text)}
                />
                {errores.nombre && <Text style={styles.errorText}>{errores.nombre}</Text>}

                <TextInput
                    style={[styles.input, errores.email && styles.inputError]}
                    placeholder="Correo electronico"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={formData.email}
                    onChangeText={(text) => actualizarCampo('email', text)}
                />
                {errores.email && <Text style={styles.errorText}>{errores.email}</Text>}

                <TextInput
                    style={[styles.input, errores.telefono && styles.inputError]}
                    placeholder="Telefono celular (10 digitos)"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    maxLength={10}
                    value={formData.telefono}
                    onChangeText={(text) => actualizarCampo('telefono', text.replace(/\D/g, ''))}
                />
                {errores.telefono && <Text style={styles.errorText}>{errores.telefono}</Text>}

                <TextInput
                    style={[styles.input, errores.contrasena && styles.inputError]}
                    placeholder="Contrasena"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    value={formData.contrasena}
                    onChangeText={(text) => actualizarCampo('contrasena', text)}
                />
                <View style={styles.passwordRules}>
                    {reglasContrasena.map((rule) => (
                        <Text key={rule.key} style={[styles.ruleText, rule.ok && styles.ruleOk]}>
                            {rule.ok ? 'OK' : '-'} {rule.text}
                        </Text>
                    ))}
                </View>
                {errores.contrasena && <Text style={styles.errorText}>{errores.contrasena}</Text>}

                <TextInput
                    style={[styles.input, errores.confirmarContrasena && styles.inputError]}
                    placeholder="Confirmar contrasena"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    value={formData.confirmarContrasena}
                    onChangeText={(text) => actualizarCampo('confirmarContrasena', text)}
                />
                {errores.confirmarContrasena && <Text style={styles.errorText}>{errores.confirmarContrasena}</Text>}
            </View>

            <TouchableOpacity style={[styles.mainButton, loading && styles.botonDeshabilitado]} onPress={manejarRegistro} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.blancoPuro} /> : <Text style={styles.mainButtonText}>Crear cuenta</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('actRegistroNegocio')}>
                <Ionicons name="business-outline" size={18} color={COLORS.azulMarino} />
                <Text style={styles.secondaryButtonText}>Registrar un negocio</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.blancoPuro },
    contenido: { padding: 20, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 18 },
    iconoHeader: { width: 56, height: 56, borderRadius: SIZES.radioTarjeta, backgroundColor: COLORS.azulMarino, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    title: { color: COLORS.azulMarino, fontSize: SIZES.tituloPantalla, fontWeight: FONTS.bold, textAlign: 'center' },
    subtitle: { color: '#64748b', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
    card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, padding: 14, backgroundColor: COLORS.blancoPuro, marginBottom: 16 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: SIZES.radioBoton, paddingHorizontal: 12, paddingVertical: 11, color: '#0f172a', fontSize: 15, marginBottom: 10 },
    inputError: { borderColor: COLORS.rojoIntenso, backgroundColor: '#fff1f2' },
    errorText: { color: COLORS.rojoIntenso, fontSize: SIZES.textoSecundario, marginTop: -4, marginBottom: 10 },
    passwordRules: { marginTop: -2, marginBottom: 10 },
    ruleText: { color: '#64748b', fontSize: SIZES.textoSecundario, lineHeight: 18 },
    ruleOk: { color: COLORS.exito, fontWeight: FONTS.bold },
    mainButton: { backgroundColor: COLORS.rojoIntenso, minHeight: 52, borderRadius: SIZES.radioBoton, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    botonDeshabilitado: { backgroundColor: '#94a3b8' },
    mainButtonText: { color: COLORS.blancoPuro, fontSize: SIZES.textoBase, fontWeight: FONTS.bold },
    secondaryButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: SIZES.radioBoton, minHeight: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    secondaryButtonText: { color: COLORS.azulMarino, fontSize: 15, fontWeight: FONTS.bold }
});
