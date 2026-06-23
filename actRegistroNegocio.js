import React, { useState } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, 
    ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, 
    Platform
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

export default function ActRegistroNegocio({ navigation }) {
    // 1. ESTADOS DEL FORMULARIO 
    const [formData, setFormData] = useState({
        nombre: '', email: '', telefono: '', contrasena: '', confirmarContrasena: '',
        nombre_negocio: '', municipio: 'Huejutla de Reyes', direccion: '', rfc: '',
        archivoBase64: null, nombreArchivo: ''
    });

    const [loading, setLoading] = useState(false);
    const [errores, setErrores] = useState({});

    // 2. FUNCIÓN PARA PDF/IMG 

    {/*// NOTA:
    // Esta función esta compuesta de esta manera debido a que:
    El motor web (Fetch/FileReader): Falla porque Android no permite usar herramientas de navegador web (ArrayBuffer) para leer archivos locales pesados por seguridad.
    La caché (copyToCacheDirectory: true): Falla porque las nuevas políticas de "Scoped Storage" de Android bloquean a las aplicaciones de leer sus propias carpetas temporales si el archivo viene de afuera.
    El archivo original (copyToCacheDirectory: false): Falla porque devuelve un enlace content:// (un túnel seguro de Android), y la función readAsStringAsync es tan estricta que solo sabe leer enlaces que empiezan con file://.
    //  Se implementa la función de Expo llamada copyAsync. Esta función sí tiene los permisos de Android para entrar al túnel content://, tomar el archivo, y hacer una copia limpia dentro de la carpeta segura y privada de la propia aplicación (documentDirectory). Una vez que el archivo es "nuestro", lo leemos en Base64 sin que Android nos bloquee y luego lo borramos para no gastar memoria*/}
    const seleccionarDocumento = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/jpeg', 'image/png', 'application/pdf'],
                copyToCacheDirectory: false, // 1. Pedimos el túnel original "content://"
            });

            if (!result.canceled) {
                const file = result.assets[0];

                // 2. Creamos una ruta temporal privada exclusiva  
                const tempUri = FileSystem.documentDirectory + 'temp_upload_' + Date.now();

                // 3. Cruzamos el puente: copyAsync sabe cómo extraer archivos de "content://" a "file://"
                await FileSystem.copyAsync({
                    from: file.uri,
                    to: tempUri
                });

                // 4. Leemos nuestra copia privada (Android ya no bloqueará)
                const base64 = await FileSystem.readAsStringAsync(tempUri, {
                    encoding: 'base64',
                });

                // 5. Borramos la copia temporal para no llenar el celular de basura
                await FileSystem.deleteAsync(tempUri, { idempotent: true });

                setFormData({
                    ...formData,
                    archivoBase64: base64,
                    nombreArchivo: file.name
                });

                Alert.alert('Éxito', `Archivo "${file.name}" adjuntado correctamente.`);
            }
        } catch (error) {
            console.error("Error detallado del archivo: ", error); 
            Alert.alert('Error técnico', `No se pudo procesar el archivo: ${error.message}`);
        }
    };

    // 3. MATRIZ DE VALIDACIÓN
    const validarCampos = () => {
        let nuevosErrores = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const rfcRegex = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/i;

        if (!formData.nombre || formData.nombre.length < 3) nuevosErrores.nombre = 'Ingresa un nombre válido.';
        if (!emailRegex.test(formData.email)) nuevosErrores.email = 'Formato de correo incorrecto.';
        if (formData.telefono.length !== 10) nuevosErrores.telefono = 'El teléfono debe tener 10 dígitos.';
        if (formData.contrasena.length < 8) nuevosErrores.contrasena = 'Mínimo 8 caracteres.';
        if (formData.contrasena !== formData.confirmarContrasena) nuevosErrores.confirmarContrasena = 'Las contraseñas no coinciden.';
        if (!formData.nombre_negocio) nuevosErrores.nombre_negocio = 'El nombre comercial es obligatorio.';
        if (!formData.direccion) nuevosErrores.direccion = 'La dirección física es requerida.';
        if (!rfcRegex.test(formData.rfc)) nuevosErrores.rfc = 'Formato de RFC inválido.';

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    // 4. ENVÍO AL BACKEND (Vercel)
    const manejarRegistro = async () => {
        if (!validarCampos()) return;

        setLoading(true);
        try {
            console.log("Enviando datos al servidor...");
            
            const response = await fetch('https://biosello-backend.vercel.app/api/registro-negocio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            // 1. Leemos la respuesta como TEXTO primero, para atrapar cualquier HTML de error de Vercel
            const textResult = await response.text();
            console.log("Respuesta del servidor:", textResult);

            // 2. Si Vercel devuelve un error HTTP (Ej. 404, 500, 413)
            if (!response.ok) {
                Alert.alert(
                    `Error del Servidor (${response.status})`, 
                    `Detalle: ${textResult.substring(0, 150)}...` // Mostramos los primeros 150 caracteres
                );
                setLoading(false);
                return;
            }

            // 3. Si todo salió bien, lo convertimos a JSON
            const result = JSON.parse(textResult);

            if (result.success) {
                Alert.alert(
                    'Registro Exitoso',
                    'Tu negocio está en revisión. Te notificaremos cuando el administrador lo apruebe.',
                    'Puedes iniciar sesión y explorar las diferentes herramientas',
                    'que tenemos para ti',
                    [{ text: 'Entendido', onPress: () => navigation.navigate('actInicioSesion') }]
                );
            } else {
                Alert.alert('Error', result.error);
            }
        } catch (error) {
            console.error("Error en el catch:", error);
            Alert.alert('Error técnico', `Detalle: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: '#041E3A' }}
        >
            <ScrollView 
                style={styles.container}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} 
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>Registro de Carnicería</Text>

                {/* --- PASO 1: Datos del Dueño --- */}
                <Text style={styles.sectionTitle}>1. Datos del Propietario</Text>

                <TextInput
                    style={[styles.input, errores.nombre && styles.inputError]}
                    placeholder="Nombre Completo"
                    placeholderTextColor="#888"
                    onChangeText={(text) => setFormData({ ...formData, nombre: text })}
                />
                {errores.nombre && <Text style={styles.errorText}>{errores.nombre}</Text>}

                <TextInput
                    style={[styles.input, errores.email && styles.inputError]}
                    placeholder="Correo Electrónico"
                    placeholderTextColor="#888"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                />
                {errores.email && <Text style={styles.errorText}>{errores.email}</Text>}

                <TextInput
                    style={[styles.input, errores.telefono && styles.inputError]}
                    placeholder="Teléfono Celular (10 dígitos)"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                    maxLength={10}
                    onChangeText={(text) => setFormData({ ...formData, telefono: text })}
                />
                {errores.telefono && <Text style={styles.errorText}>{errores.telefono}</Text>}

                <TextInput
                    style={[styles.input, errores.contrasena && styles.inputError]}
                    placeholder="Contraseña (Mín. 8 caracteres)"
                    placeholderTextColor="#888"
                    secureTextEntry
                    onChangeText={(text) => setFormData({ ...formData, contrasena: text })}
                />
                {errores.contrasena && <Text style={styles.errorText}>{errores.contrasena}</Text>}

                <TextInput
                    style={[styles.input, errores.confirmarContrasena && styles.inputError]}
                    placeholder="Confirmar Contraseña"
                    placeholderTextColor="#888"
                    secureTextEntry
                    onChangeText={(text) => setFormData({ ...formData, confirmarContrasena: text })}
                />
                {errores.confirmarContrasena && <Text style={styles.errorText}>{errores.confirmarContrasena}</Text>}

                {/* --- PASO 2: Datos del Establecimiento --- */}
                <Text style={styles.sectionTitle}>2. Datos del Establecimiento</Text>

                <TextInput
                    style={[styles.input, errores.nombre_negocio && styles.inputError]}
                    placeholder="Nombre Comercial de la Carnicería"
                    placeholderTextColor="#888"
                    onChangeText={(text) => setFormData({ ...formData, nombre_negocio: text })}
                />
                {errores.nombre_negocio && <Text style={styles.errorText}>{errores.nombre_negocio}</Text>}

                <TextInput
                    style={[styles.input, errores.direccion && styles.inputError]}
                    placeholder="Dirección Física Completa"
                    placeholderTextColor="#888"
                    onChangeText={(text) => setFormData({ ...formData, direccion: text })}
                />
                {errores.direccion && <Text style={styles.errorText}>{errores.direccion}</Text>}

                <TextInput
                    style={[styles.input, errores.rfc && styles.inputError]}
                    placeholder="RFC con Homoclave"
                    placeholderTextColor="#888"
                    autoCapitalize="characters"
                    maxLength={13}
                    onChangeText={(text) => setFormData({ ...formData, rfc: text.toUpperCase() })}
                />
                {errores.rfc && <Text style={styles.errorText}>{errores.rfc}</Text>}

                <TouchableOpacity
                    style={[styles.uploadButton, formData.nombreArchivo ? styles.uploadButtonSuccess : null]}
                    onPress={seleccionarDocumento}
                >
                    <Text style={styles.uploadButtonText}>
                        {formData.nombreArchivo
                            ? ` Adjunto: ${formData.nombreArchivo}`
                            : ' Subir Aviso COFEPRIS o SAT (PDF/IMG)'}
                    </Text>
                </TouchableOpacity>

                {/* --- BOTÓN DE REGISTRO --- */}
                <TouchableOpacity
                    style={styles.mainButton}
                    onPress={manejarRegistro}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.mainButtonText}>Registrar mi Negocio</Text>}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#041E3A',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginVertical: 20,
    },
    sectionTitle: {
        fontSize: 16,
        color: '#FFFFFF',
        marginTop: 15,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#00518B',
        paddingBottom: 5,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        color: '#000000',
    },
    inputError: {
        borderWidth: 2,
        borderColor: '#FFC107',
    },
    errorText: {
        color: '#FFC107',
        fontSize: 12,
        marginBottom: 10,
        marginTop: -5,
        marginLeft: 5,
    },
    uploadButton: {
        backgroundColor: '#00518B',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#FFFFFF',
    },
    uploadButtonText: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
    mainButton: {
        backgroundColor: '#D32F2F',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 50,
    },
    mainButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    uploadButtonSuccess: {
        borderColor: '#10b981',
        backgroundColor: '#064e3b',
    }
});