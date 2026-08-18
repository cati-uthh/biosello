import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from './AuthContext';
import { COLORS, SIZES, FONTS } from './src/theme/theme';

const API_BASE_URL = 'https://biosello-backend.vercel.app/api';

export default function ActGestionSucursales({ onVolver }) {
    const { usuario } = useContext(AuthContext);
    const [sucursales, setSucursales] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    // FORMULARIO CREAR
    const [formSucursal, setFormSucursal] = useState({
        nombre_sucursal: '',
        direccion: '',
        municipio: 'Huejutla de Reyes',
        archivoBase64: null,
        nombreArchivo: ''
    });

    // EDITAR SUCURSAL
    const [sucursalEditar, setSucursalEditar] = useState(null);
    const [modalEditVisible, setModalEditVisible] = useState(false);

    // SECUENCIA DE 3 ADVERTENCIAS DE ELIMINACIÓN
    const [sucursalAEliminar, setSucursalAEliminar] = useState(null);
    const [pasoBorrado, setPasoBorrado] = useState(0); // 0: cerrado, 1: advertencia datos, 2: auth (password/huella), 3: confirmación final
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [borrando, setBorrando] = useState(false);

    const [errores, setErrores] = useState({});

    useEffect(() => {
        cargarListaSucursales();
    }, []);

    const cargarListaSucursales = async () => {
        const idNegocioBase = usuario?.id_negocio || usuario?.negocio?.id_negocio;
        if (!idNegocioBase) return;

        try {
            setCargando(true);
            const response = await fetch(`${API_BASE_URL}/sucursales?id_negocio=${idNegocioBase}`);
            const result = await response.json();

            if (response.ok && result.success) {
                setSucursales(result.data || []);
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudieron cargar las sucursales.');
        } finally {
            setCargando(false);
        }
    };

    const seleccionarDocumento = async (esEdicion = false) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/jpeg', 'image/png', 'application/pdf'],
                copyToCacheDirectory: false,
            });

            if (!result.canceled) {
                const file = result.assets[0];
                const tempUri = FileSystem.documentDirectory + 'temp_sucursal_' + Date.now();

                await FileSystem.copyAsync({ from: file.uri, to: tempUri });
                const base64 = await FileSystem.readAsStringAsync(tempUri, { encoding: 'base64' });
                await FileSystem.deleteAsync(tempUri, { idempotent: true });

                if (esEdicion) {
                    setSucursalEditar(prev => ({ ...prev, archivoBase64: base64, nombreArchivo: file.name }));
                } else {
                    setFormSucursal((prev) => ({ ...prev, archivoBase64: base64, nombreArchivo: file.name }));
                    setErrores((prev) => ({ ...prev, archivoBase64: null }));
                }
                Alert.alert('Documento Adjunto', `"${file.name}" se adjuntó correctamente.`);
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo procesar el documento.');
        }
    };

    const guardarSucursal = async () => {
        if (!formSucursal.nombre_sucursal.trim() || !formSucursal.direccion.trim() || !formSucursal.archivoBase64) {
            Alert.alert('Campos incompletos', 'Completa el nombre, dirección y adjunta el documento.');
            return;
        }

        const idNegocioMatriz = usuario?.id_negocio || usuario?.negocio?.id_negocio;

        setGuardando(true);
        try {
            const response = await fetch(`${API_BASE_URL}/sucursales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_negocio_matriz: idNegocioMatriz,
                    nombre_sucursal: formSucursal.nombre_sucursal.trim(),
                    direccion: formSucursal.direccion.trim(),
                    municipio: formSucursal.municipio.trim(),
                    archivoBase64: formSucursal.archivoBase64,
                    nombreArchivo: formSucursal.nombreArchivo
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                Alert.alert('Error', result.error || 'No se pudo guardar la sucursal.');
                return;
            }

            Alert.alert('Sucursal Registrada', 'Estado de verificación pendiente, el equipo de BioSello lo contactará muy pronto');
            setFormSucursal({ nombre_sucursal: '', direccion: '', municipio: 'Huejutla de Reyes', archivoBase64: null, nombreArchivo: '' });
            cargarListaSucursales();
        } catch (error) {
            Alert.alert('Error de conexión', 'No se pudo guardar la sucursal.');
        } finally {
            setGuardando(false);
        }
    };

    // GUARDAR EDICIÓN
    const guardarEdicionSucursal = async () => {
        if (!sucursalEditar.nombre_sucursal.trim() || !sucursalEditar.direccion.trim()) {
            Alert.alert('Campos incompletos', 'Ingresa el nombre y la dirección.');
            return;
        }

        setGuardando(true);
        try {
            const response = await fetch(`${API_BASE_URL}/sucursales`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_sucursal: sucursalEditar.id_negocio,
                    nombre_sucursal: sucursalEditar.nombre_sucursal.trim(),
                    direccion: sucursalEditar.direccion.trim(),
                    municipio: sucursalEditar.municipio || 'Huejutla de Reyes',
                    archivoBase64: sucursalEditar.archivoBase64 || null,
                    nombreArchivo: sucursalEditar.nombreArchivo || null
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                Alert.alert('Error', result.error || 'No se pudo actualizar la sucursal.');
                return;
            }

            Alert.alert('Sucursal Actualizada', 'Los datos se modificaron. La sucursal ha pasado a revisión de verificación.');
            setModalEditVisible(false);
            setSucursalEditar(null);
            cargarListaSucursales();
        } catch (error) {
            Alert.alert('Error', 'No se pudo conectar con el servidor.');
        } finally {
            setGuardando(false);
        }
    };

    // --- SECUENCIA DE 3 ADVERTENCIAS DE ELIMINACIÓN ---
    
    // Iniciar Borrado -> Advertencia 1 (Concisa sobre pérdida permanente de datos)
    const iniciarBorradoSucursal = (sucursal) => {
        if (!sucursal.id_negocio_padre) {
            Alert.alert('Acción no permitida', 'No puedes eliminar la sucursal Matriz principal.');
            return;
        }
        setSucursalAEliminar(sucursal);
        setPasoBorrado(1);
    };

    // Advertencia 2 -> Autenticación Biométrica o Contraseña
    const autenticarParaBorrado = async () => {
        try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const registrado = await LocalAuthentication.isEnrolledAsync();

            if (compatible && registrado) {
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: `Confirmar borrado de ${sucursalAEliminar?.nombre_sucursal}`,
                    fallbackLabel: 'Usar contraseña'
                });

                if (result.success) {
                    setPasoBorrado(3); // Salta directamente al paso 3 de confirmación
                    return;
                }
            }
        } catch (e) {}

        setPasoBorrado(2); // Solicita contraseña
    };

    // Ejecutar Eliminación Definitiva en Paso 3
    const ejecutarEliminacionDefinitiva = async () => {
        setBorrando(true);
        try {
            const response = await fetch(`${API_BASE_URL}/sucursales`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_sucursal: sucursalAEliminar.id_negocio,
                    id_usuario: usuario?.id_usuario || usuario?.id,
                    contrasena: passwordConfirm
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                Alert.alert('Error', result.error || 'No se pudo eliminar la sucursal.');
                return;
            }

            Alert.alert('Eliminación Exitosa', 'La sucursal y todos sus registros asociados han sido eliminados permanentemente.');
            cancelarBorrado();
            cargarListaSucursales();
        } catch (error) {
            Alert.alert('Error', 'No se pudo conectar con el servidor.');
        } finally {
            setBorrando(false);
        }
    };

    const cancelarBorrado = () => {
        setSucursalAEliminar(null);
        setPasoBorrado(0);
        setPasswordConfirm('');
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
                <TouchableOpacity
                    style={styles.botonRegresarLink}
                    onPress={onVolver}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Volver al Panel Principal"
                >
                    <Ionicons name="arrow-back" size={20} color={COLORS.azulMarino} />
                    <Text style={styles.textoRegresarLink}>Volver al Panel Principal</Text>
                </TouchableOpacity>

                <Text style={styles.titulo}>Gestión de Sucursales</Text>
                <Text style={styles.subtitulo}>
                    Registra y administra las sucursales de tu empresa. Cada sucursal verificada contará con la insignia de trazabilidad garantizada.
                </Text>

                {/* FORMULARIO DE NUEVA SUCURSAL */}
                <View style={styles.tarjetaSeccion}>
                    <Text style={styles.seccionTitulo}>Registrar Nueva Sucursal</Text>

                    <Text style={styles.label}>Nombre de la Sucursal *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej. Sucursal Mercado Central"
                        placeholderTextColor="#94a3b8"
                        maxLength={100}
                        value={formSucursal.nombre_sucursal}
                        onChangeText={(text) => setFormSucursal(prev => ({ ...prev, nombre_sucursal: text }))}
                    />

                    <Text style={styles.label}>Dirección Física Completa *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej. Calle Sonora #12, Col. Centro"
                        placeholderTextColor="#94a3b8"
                        maxLength={255}
                        value={formSucursal.direccion}
                        onChangeText={(text) => setFormSucursal(prev => ({ ...prev, direccion: text }))}
                    />

                    <Text style={styles.label}>Aviso COFEPRIS o Constancia SAT *</Text>
                    <TouchableOpacity 
                        style={[styles.uploadButton, formSucursal.nombreArchivo ? styles.uploadSuccess : null]} 
                        onPress={() => seleccionarDocumento(false)}
                    >
                        <Ionicons name="document-attach" size={20} color={COLORS.blancoPuro} />
                        <Text style={styles.uploadText}>
                            {formSucursal.nombreArchivo ? `Adjunto: ${formSucursal.nombreArchivo}` : 'Adjuntar Documento (PDF/IMG)'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.botonGuardar, guardando && styles.botonDeshabilitado]} 
                        onPress={guardarSucursal}
                        disabled={guardando}
                    >
                        {guardando ? (
                            <ActivityIndicator color={COLORS.blancoPuro} />
                        ) : (
                            <Text style={styles.textoBotonGuardar}>Guardar y Solicitar Verificación</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* LISTADO DE SUCURSALES REGISTRADAS */}
                <Text style={styles.seccionTituloLista}>Sucursales Registradas</Text>

                {cargando ? (
                    <ActivityIndicator color={COLORS.azulMarino} style={{ marginVertical: 20 }} />
                ) : (
                    sucursales.map((suc) => (
                        <View key={suc.id_negocio} style={styles.tarjetaSucursalContenedor}>
                            <View style={styles.tarjetaSucursalInfo}>
                                <View style={styles.iconoCirculo}>
                                    <Ionicons name="business" size={20} color={COLORS.azulMarino} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.nombreSucursalItem}>{suc.nombre_sucursal}</Text>
                                    <Text style={styles.direccionSucursalItem}>{suc.direccion}</Text>
                                    <View style={styles.badgeEstatus}>
                                        <Ionicons 
                                            name={suc.estatus_verificacion === 'aprobado' ? "checkmark-circle" : "time"} 
                                            size={14} 
                                            color={suc.estatus_verificacion === 'aprobado' ? "#10b981" : "#eab308"} 
                                        />
                                        <Text style={[
                                            styles.textoEstatus, 
                                            { color: suc.estatus_verificacion === 'aprobado' ? "#10b981" : "#ca8a04" }
                                        ]}>
                                            {suc.estatus_verificacion === 'aprobado' ? 'Verificado COFEPRIS / SAT' : 'Verificación Pendiente'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* BOTONERA EDITAR | ELIMINAR */}
                            <View style={styles.botoneraAcciones}>
                                <TouchableOpacity 
                                    style={styles.botonAccionEditar} 
                                    onPress={() => {
                                        setSucursalEditar({ ...suc });
                                        setModalEditVisible(true);
                                    }}
                                >
                                    <Ionicons name="create-outline" size={16} color={COLORS.azulMarino} />
                                    <Text style={styles.textoBotonAccionEditar}>Editar</Text>
                                </TouchableOpacity>

                                {Boolean(suc.id_negocio_padre) && (
                                    <TouchableOpacity 
                                        style={styles.botonAccionEliminar} 
                                        onPress={() => iniciarBorradoSucursal(suc)}
                                    >
                                        <Ionicons name="trash-outline" size={16} color={COLORS.rojoIntenso} />
                                        <Text style={styles.textoBotonAccionEliminar}>Eliminar</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* MODAL EDITAR SUCURSAL */}
            <Modal visible={modalEditVisible} transparent animationType="slide">
                <View style={styles.modalFondo}>
                    <View style={styles.modalContenido}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitulo}>Editar Sucursal</Text>
                            <TouchableOpacity onPress={() => setModalEditVisible(false)}>
                                <Ionicons name="close" size={22} color="#0f172a" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Nombre de la sucursal *</Text>
                        <TextInput
                            style={styles.input}
                            value={sucursalEditar?.nombre_sucursal}
                            onChangeText={(text) => setSucursalEditar(prev => ({ ...prev, nombre_sucursal: text }))}
                        />

                        <Text style={styles.label}>Dirección física *</Text>
                        <TextInput
                            style={styles.input}
                            value={sucursalEditar?.direccion}
                            onChangeText={(text) => setSucursalEditar(prev => ({ ...prev, direccion: text }))}
                        />

                        <Text style={styles.label}>Nuevo documento (Opcional)</Text>
                        <TouchableOpacity 
                            style={[styles.uploadButton, sucursalEditar?.nombreArchivo ? styles.uploadSuccess : null]} 
                            onPress={() => seleccionarDocumento(true)}
                        >
                            <Ionicons name="document-attach" size={20} color={COLORS.blancoPuro} />
                            <Text style={styles.uploadText}>
                                {sucursalEditar?.nombreArchivo ? `Adjunto: ${sucursalEditar.nombreArchivo}` : 'Actualizar documento (PDF/IMG)'}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.advertenciaEdicion}>
                            * Al modificar el nombre o la dirección, la sucursal volverá a estado pendiente de revisión.
                        </Text>

                        <TouchableOpacity 
                            style={[styles.botonGuardar, guardando && styles.botonDeshabilitado]} 
                            onPress={guardarEdicionSucursal}
                            disabled={guardando}
                        >
                            {guardando ? (
                                <ActivityIndicator color={COLORS.blancoPuro} />
                            ) : (
                                <Text style={styles.textoBotonGuardar}>Guardar Cambios</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* MODAL SECUENCIA DE 3 ADVERTENCIAS DE ELIMINACIÓN */}
            <Modal visible={pasoBorrado > 0} transparent animationType="fade">
                <View style={styles.modalFondo}>
                    <View style={styles.modalContenidoAlerta}>
                        <View style={styles.iconoAlertaHeader}>
                            <Ionicons name="warning" size={32} color={COLORS.rojoIntenso} />
                        </View>

                        {/* PASO 1: ADVERTENCIA PÉRDIDA PERMANENTE */}
                        {pasoBorrado === 1 && (
                            <View style={{ alignItems: 'center', width:'100%' }}>
                                <Text style={styles.tituloAlerta}>Advertencia: Pérdida Irreversible</Text>
                                <Text style={styles.textoAlertaConciso}>
                                    Al eliminar la sucursal <Text style={{ fontWeight: 'bold' }}>"{sucursalAEliminar?.nombre_sucursal}"</Text>, todos los lotes, códigos QR e historiales registrados en ella se eliminarán permanentemente y no se podrán recuperar.
                                </Text>
                                <TouchableOpacity style={styles.botonContinuarAdvertencia} onPress={autenticarParaBorrado}>
                                    <Text style={styles.textoBotonAdvertencia}>Entendido</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.botonCancelarModal} onPress={cancelarBorrado}>
                                    <Text style={styles.textoCancelarModal}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* PASO 2: AUTENTICACIÓN POR CONTRASEÑA */}
                        {pasoBorrado === 2 && (
                            <View style={{ width: '100%' }}>
                                <Text style={styles.tituloAlerta}>Advertencia: Confirmación de Identidad</Text>
                                <Text style={styles.subtextoAlerta}>
                                    Ingresa tu contraseña de administrador para autorizar la eliminación de la sucursal.
                                </Text>
                                <TextInput
                                    style={styles.inputPasswordConfirm}
                                    placeholder="Tu contraseña actual"
                                    placeholderTextColor="#888"
                                    secureTextEntry
                                    value={passwordConfirm}
                                    onChangeText={setPasswordConfirm}
                                />
                                <TouchableOpacity 
                                    style={[styles.botonContinuarAdvertencia, !passwordConfirm && styles.botonDeshabilitado]} 
                                    onPress={() => setPasoBorrado(3)}
                                    disabled={!passwordConfirm}
                                >
                                    <Text style={styles.textoBotonAdvertencia}>Validar contraseña</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.botonCancelarModal} onPress={cancelarBorrado}>
                                    <Text style={styles.textoCancelarModal}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* PASO 3: CONFIRMACIÓN FINAL */}
                        {pasoBorrado === 3 && (
                            <View style={{ alignItems: 'center', width: '100%' }}>
                                <Text style={styles.tituloAlerta}>Advertencia: ¿Borrar Sucursal?</Text>
                                <Text style={styles.textoAlertaConciso}>
                                    Esta es la confirmación final. ¿Estás completamente seguro de borrar la sucursal <Text style={{ fontWeight: 'bold' }}>"{sucursalAEliminar?.nombre_sucursal}"</Text>?
                                </Text>
                                <TouchableOpacity 
                                    style={[styles.botonBorrarDefinitivo, borrando && styles.botonDeshabilitado]} 
                                    onPress={ejecutarEliminacionDefinitiva}
                                    disabled={borrando}
                                >
                                    {borrando ? (
                                        <ActivityIndicator color={COLORS.blancoPuro} />
                                    ) : (
                                        <Text style={styles.textoBotonBorrarDefinitivo}>Sí, borrar sucursal definitivamente</Text>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.botonCancelarModal} onPress={cancelarBorrado} disabled={borrando}>
                                    <Text style={styles.textoCancelarModal}>Cancelar y conservar sucursal</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.blancoPuro, paddingHorizontal: 20, paddingTop: 15 },
    botonRegresarLink: { minHeight: 44, marginVertical: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
    textoRegresarLink: { color: COLORS.azulMarino, fontWeight: FONTS.bold, fontSize: 14, marginLeft: 6 },
    titulo: { fontSize: SIZES.tituloPantalla, fontWeight: FONTS.bold, color: COLORS.azulMarino, marginTop: 5 },
    subtitulo: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 18, lineHeight: 18 },
    
    tarjetaSeccion: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, padding: 16, marginBottom: 20 },
    seccionTitulo: { fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, color: '#0f172a', marginBottom: 12 },
    seccionTituloLista: { fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, color: '#0f172a', marginBottom: 12, marginTop: 10 },
    
    label: { color: '#334155', fontSize: 13, fontWeight: FONTS.bold, marginBottom: 6 },
    input: { backgroundColor: COLORS.blancoPuro, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: SIZES.radioBoton, paddingHorizontal: 12, paddingVertical: 11, color: '#0f172a', fontSize: 14, marginBottom: 10 },
    
    uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.azulCeruleo, padding: 12, borderRadius: SIZES.radioBoton, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.blancoPuro, gap: 8, marginBottom: 12 },
    uploadSuccess: { backgroundColor: '#064e3b', borderColor: '#10b981' },
    uploadText: { color: COLORS.blancoPuro, fontWeight: '600', fontSize: 13 },
    
    botonGuardar: { backgroundColor: COLORS.rojoIntenso, paddingVertical: 14, borderRadius: SIZES.radioBoton, alignItems: 'center', marginTop: 5 },
    botonDeshabilitado: { backgroundColor: '#94a3b8' },
    textoBotonGuardar: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, fontSize: SIZES.textoBase },
    
    tarjetaSucursalContenedor: { backgroundColor: COLORS.blancoPuro, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, marginBottom: 12, overflow: 'hidden' },
    tarjetaSucursalInfo: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    iconoCirculo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    nombreSucursalItem: { fontSize: 15, fontWeight: FONTS.bold, color: '#0f172a' },
    direccionSucursalItem: { fontSize: 12, color: '#64748b', marginTop: 2 },
    badgeEstatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    textoEstatus: { fontSize: 12, fontWeight: FONTS.bold },

    // BOTONERA EDITAR | ELIMINAR
    botoneraAcciones: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#f8fafc' },
    botonAccionEditar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6, borderRightWidth: 1, borderRightColor: '#e2e8f0' },
    textoBotonAccionEditar: { color: COLORS.azulMarino, fontWeight: FONTS.bold, fontSize: 13 },
    botonAccionEliminar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
    textoBotonAccionEliminar: { color: COLORS.rojoIntenso, fontWeight: FONTS.bold, fontSize: 13 },

    // MODALES
    modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 20 },
    modalContenido: { backgroundColor: COLORS.blancoPuro, borderRadius: SIZES.radioTarjeta, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitulo: { fontSize: 18, fontWeight: FONTS.bold, color: COLORS.azulMarino },
    advertenciaEdicion: { fontSize: 11, color: COLORS.azulCeruleo, fontStyle: 'italic', marginBottom: 15 },

    // ESTILOS ADVERTENCIAS DE ELIMINACIÓN
    modalContenidoAlerta: { 
        backgroundColor: COLORS.blancoPuro, 
        borderRadius: SIZES.radioTarjeta, 
        padding: 24, 
        alignItems: 'center',
        width: '100%'
    },
    iconoAlertaHeader: { 
        width: 56, 
        height: 56, 
        borderRadius: 28, 
        backgroundColor: '#fef2f2', 
        alignItems: 'center', 
        justify: 'center', 
        marginBottom: 12 
    },
    tituloAlerta: { 
        fontSize: 17, 
        fontWeight: FONTS.bold, 
        color: '#0f172a', 
        textAlign: 'center', 
        marginBottom: 10 
    },
    textoAlertaConciso: { 
        fontSize: 13, 
        color: '#475569', 
        textAlign: 'center', 
        lineHeight: 20, 
        marginBottom: 20 
    },
    subtextoAlerta: { 
        fontSize: 13, 
        color: '#64748b', 
        textAlign: 'center', 
        marginBottom: 12 
    },
    inputPasswordConfirm: { 
        width: '100%', 
        backgroundColor: '#f8fafc', 
        borderWidth: 1, 
        borderColor: '#cbd5e1', 
        borderRadius: SIZES.radioBoton, 
        padding: 12, 
        color: '#0f172a', 
        fontSize: 14, 
        marginBottom: 15 
    },
    botonContinuarAdvertencia: { 
        width: '100%', 
        backgroundColor: COLORS.azulMarino, 
        paddingVertical: 14, 
        paddingHorizontal: 20, 
        borderRadius: SIZES.radioBoton, 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: 10 
    },
    textoBotonAdvertencia: { 
        color: COLORS.blancoPuro, 
        fontWeight: FONTS.bold, 
        fontSize: 14, 
        textAlign: 'center' 
    },
    botonBorrarDefinitivo: { 
        width: '100%', 
        backgroundColor: COLORS.rojoIntenso, 
        paddingVertical: 14, 
        paddingHorizontal: 20, 
        borderRadius: SIZES.radioBoton, 
        alignItems: 'center', 
        justify: 'center',
        marginBottom: 10 
    },
    textoBotonBorrarDefinitivo: { 
        color: COLORS.blancoPuro, 
        fontWeight: FONTS.bold, 
        fontSize: 14, 
        textAlign: 'center' 
    },
    botonCancelarModal: { 
        paddingVertical: 10, 
        width: '100%', 
        alignItems: 'center' 
    },
    textoCancelarModal: { 
        color: '#64748b', 
        fontWeight: '600', 
        fontSize: 13, 
        textAlign: 'center' 
    }
});
