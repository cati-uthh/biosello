import React, { useMemo, useState } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

const passwordRules = [
    { key: 'length', text: 'Mínimo 8 caracteres', test: (value) => value.length >= 8 },
    { key: 'upper', text: 'Al menos una mayúscula', test: (value) => /[A-ZÁÉÍÓÚÑ]/.test(value) },
    { key: 'lower', text: 'Al menos una minúscula', test: (value) => /[a-záéíóúñ]/.test(value) },
    { key: 'number', text: 'Al menos un número', test: (value) => /\d/.test(value) }
];

export default function ActRegistroNegocio({ navigation }) {
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        telefono: '',
        contrasena: '',
        confirmarContrasena: '',
        nombre_negocio: '',
        municipio: 'Huejutla de Reyes',
        direccion: '',
        rfc: '',
        archivoBase64: null,
        nombreArchivo: ''
    });

    const [loading, setLoading] = useState(false);
    const [errores, setErrores] = useState({});

    const reglasContrasena = useMemo(() => passwordRules.map((rule) => ({
        ...rule,
        ok: rule.test(formData.contrasena)
    })), [formData.contrasena]);

    const actualizarCampo = (campo, valor) => {
        setFormData((prev) => ({ ...prev, [campo]: valor }));
    };

    const seleccionarDocumento = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/jpeg', 'image/png', 'application/pdf'],
                copyToCacheDirectory: false,
            });

            if (!result.canceled) {
                const file = result.assets[0];
                const tempUri = FileSystem.documentDirectory + 'temp_upload_' + Date.now();

                await FileSystem.copyAsync({ from: file.uri, to: tempUri });
                const base64 = await FileSystem.readAsStringAsync(tempUri, { encoding: 'base64' });
                await FileSystem.deleteAsync(tempUri, { idempotent: true });

                setFormData((prev) => ({ ...prev, archivoBase64: base64, nombreArchivo: file.name }));
                Alert.alert('Archivo adjunto', `"${file.name}" se adjuntó correctamente.`);
            }
        } catch (error) {
            Alert.alert('No se pudo adjuntar', 'El archivo no pudo procesarse. Intenta con otro PDF o imagen.');
        }
    };

    const validarCampos = () => {
        const nuevosErrores = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const rfcRegex = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/i;

        if (formData.nombre.trim().length < 3) nuevosErrores.nombre = 'Ingresa un nombre válido.';
        if (!emailRegex.test(formData.email.trim())) nuevosErrores.email = 'Ingresa un correo válido.';
        if (!/^\d{10}$/.test(formData.telefono)) nuevosErrores.telefono = 'El teléfono debe tener 10 dígitos.';
        if (!reglasContrasena.every((rule) => rule.ok)) nuevosErrores.contrasena = 'La contraseña no cumple las reglas.';
        if (formData.contrasena !== formData.confirmarContrasena) nuevosErrores.confirmarContrasena = 'Las contraseñas no coinciden.';
        if (!formData.nombre_negocio.trim()) nuevosErrores.nombre_negocio = 'El nombre comercial es obligatorio.';
        if (!formData.direccion.trim()) nuevosErrores.direccion = 'La dirección física es requerida.';
        if (!rfcRegex.test(formData.rfc.trim())) nuevosErrores.rfc = 'Ingresa un RFC válido con homoclave.';

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
            const response = await fetch('https://biosello-backend.vercel.app/api/registro-negocio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    email: formData.email.trim().toLowerCase(),
                    rfc: formData.rfc.trim().toUpperCase()
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
                Alert.alert('No se pudo registrar', result.error || 'El servidor no pudo procesar el registro. Intenta de nuevo.');
                return;
            }

            Alert.alert(
                'Registro exitoso',
                'Tu negocio está en revisión. Cuando sea aprobado podrás usar todas las herramientas.',
                [{ text: 'Entendido', onPress: () => navigation.navigate('actInicioSesion') }]
            );
        } catch (error) {
            Alert.alert('Error de conexión', 'No se pudo conectar con el servidor. Revisa tu internet e intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.root}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>Registro de Carnicería</Text>
                <Text style={styles.sectionTitle}>1. Datos del propietario</Text>

                <TextInput style={[styles.input, errores.nombre && styles.inputError]} placeholder="Nombre completo" placeholderTextColor="#888" value={formData.nombre} onChangeText={(text) => actualizarCampo('nombre', text)} />
                {errores.nombre && <Text style={styles.errorText}>{errores.nombre}</Text>}

                <TextInput style={[styles.input, errores.email && styles.inputError]} placeholder="Correo electrónico" placeholderTextColor="#888" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(text) => actualizarCampo('email', text)} />
                {errores.email && <Text style={styles.errorText}>{errores.email}</Text>}

                <TextInput style={[styles.input, errores.telefono && styles.inputError]} placeholder="Teléfono celular (10 dígitos)" placeholderTextColor="#888" keyboardType="numeric" maxLength={10} value={formData.telefono} onChangeText={(text) => actualizarCampo('telefono', text.replace(/\D/g, ''))} />
                {errores.telefono && <Text style={styles.errorText}>{errores.telefono}</Text>}

                <TextInput style={[styles.input, errores.contrasena && styles.inputError]} placeholder="Contraseña" placeholderTextColor="#888" secureTextEntry value={formData.contrasena} onChangeText={(text) => actualizarCampo('contrasena', text)} />
                <View style={styles.passwordRules}>
                    {reglasContrasena.map((rule) => (
                        <Text key={rule.key} style={[styles.ruleText, rule.ok && styles.ruleOk]}>
                            {rule.ok ? '✓' : '•'} {rule.text}
                        </Text>
                    ))}
                </View>
                {errores.contrasena && <Text style={styles.errorText}>{errores.contrasena}</Text>}

                <TextInput style={[styles.input, errores.confirmarContrasena && styles.inputError]} placeholder="Confirmar contraseña" placeholderTextColor="#888" secureTextEntry value={formData.confirmarContrasena} onChangeText={(text) => actualizarCampo('confirmarContrasena', text)} />
                {errores.confirmarContrasena && <Text style={styles.errorText}>{errores.confirmarContrasena}</Text>}

                <Text style={styles.sectionTitle}>2. Datos del establecimiento</Text>

                <TextInput style={[styles.input, errores.nombre_negocio && styles.inputError]} placeholder="Nombre comercial de la carnicería" placeholderTextColor="#888" value={formData.nombre_negocio} onChangeText={(text) => actualizarCampo('nombre_negocio', text)} />
                {errores.nombre_negocio && <Text style={styles.errorText}>{errores.nombre_negocio}</Text>}

                <TextInput style={[styles.input, errores.direccion && styles.inputError]} placeholder="Dirección física completa" placeholderTextColor="#888" value={formData.direccion} onChangeText={(text) => actualizarCampo('direccion', text)} />
                {errores.direccion && <Text style={styles.errorText}>{errores.direccion}</Text>}

                <TextInput style={[styles.input, errores.rfc && styles.inputError]} placeholder="RFC con homoclave" placeholderTextColor="#888" autoCapitalize="characters" maxLength={13} value={formData.rfc} onChangeText={(text) => actualizarCampo('rfc', text.toUpperCase())} />
                {errores.rfc && <Text style={styles.errorText}>{errores.rfc}</Text>}

                <TouchableOpacity style={[styles.uploadButton, formData.nombreArchivo ? styles.uploadButtonSuccess : null]} onPress={seleccionarDocumento}>
                    <Text style={styles.uploadButtonText}>
                        {formData.nombreArchivo ? `Adjunto: ${formData.nombreArchivo}` : 'Subir Aviso COFEPRIS o SAT (PDF/IMG)'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.mainButton, loading && styles.botonDeshabilitado]} onPress={manejarRegistro} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.mainButtonText}>Registrar mi Negocio</Text>}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#041E3A' },
    container: { flex: 1, backgroundColor: '#041E3A', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginVertical: 20 },
    sectionTitle: { fontSize: 16, color: '#FFFFFF', marginTop: 15, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#00518B', paddingBottom: 5 },
    input: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 12, marginBottom: 10, color: '#000000' },
    inputError: { borderWidth: 2, borderColor: '#FFC107' },
    errorText: { color: '#FFC107', fontSize: 12, marginBottom: 10, marginTop: -5, marginLeft: 5 },
    passwordRules: { marginTop: -2, marginBottom: 10 },
    ruleText: { color: '#cbd5e1', fontSize: 12, lineHeight: 18 },
    ruleOk: { color: '#86efac', fontWeight: 'bold' },
    uploadButton: { backgroundColor: '#00518B', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#FFFFFF' },
    uploadButtonText: { color: '#FFFFFF', fontWeight: '500' },
    mainButton: { backgroundColor: '#D32F2F', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, marginBottom: 50 },
    botonDeshabilitado: { backgroundColor: '#94a3b8' },
    mainButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    uploadButtonSuccess: { borderColor: '#10b981', backgroundColor: '#064e3b' }
});
