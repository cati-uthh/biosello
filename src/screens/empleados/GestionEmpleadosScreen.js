import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, FONTS, SIZES } from '../../theme/theme';
import { getAuthHeaders, getAuthToken } from '../../utils/auth';

const FORM_INICIAL = {
    nombre: '',
    email: '',
    telefono: '',
    puesto: '',
    contrasena: '',
    confirmarContrasena: ''
};

const REGLAS_CONTRASENA = [
    { key: 'length', texto: 'Mínimo 8 caracteres', validar: (valor) => valor.length >= 8 },
    { key: 'upper', texto: 'Al menos una mayúscula', validar: (valor) => /[A-ZÁÉÍÓÚÑ]/.test(valor) },
    { key: 'lower', texto: 'Al menos una minúscula', validar: (valor) => /[a-záéíóúñ]/.test(valor) },
    { key: 'number', texto: 'Al menos un número', validar: (valor) => /\d/.test(valor) }
];

const normalizarEmpleado = (empleado = {}) => ({
    ...empleado,
    id_usuario: empleado.id_usuario || empleado.id_empleado || empleado.id,
    nombre: String(empleado.nombre || ''),
    email: String(empleado.email || empleado.correo || ''),
    telefono: String(empleado.telefono || ''),
    puesto: String(empleado.puesto || empleado.cargo || 'Empleado'),
    activo: empleado.activo === undefined ? true : Boolean(Number(empleado.activo))
});

const leerRespuesta = async (response) => {
    const contenido = await response.text();
    if (!contenido) return {};

    try {
        return JSON.parse(contenido);
    } catch (error) {
        return {};
    }
};

const mensajeRespuesta = (resultado, respaldo) => {
    const detalles = Array.isArray(resultado?.details) ? resultado.details.filter(Boolean) : [];
    if (detalles.length > 0) {
        return `${resultado?.error || respaldo}\n\n${detalles.join('\n')}`;
    }
    return resultado?.error || resultado?.message || respaldo;
};

const validarFormulario = (datos, esEdicion = false) => {
    const errores = {};
    const nombre = datos.nombre.trim();
    const email = datos.email.trim();
    const puesto = datos.puesto.trim();
    const telefono = datos.telefono.trim();
    const debeValidarContrasena = !esEdicion || Boolean(datos.contrasena || datos.confirmarContrasena);

    if (nombre.length < 3 || nombre.length > 100) {
        errores.nombre = 'Ingresa un nombre de entre 3 y 100 caracteres.';
    }
    if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errores.email = 'Ingresa un correo electrónico válido.';
    }
    if (!/^\d{10}$/.test(telefono)) {
        errores.telefono = 'El teléfono debe tener exactamente 10 dígitos.';
    }
    if (puesto.length < 2 || puesto.length > 80) {
        errores.puesto = 'Ingresa un puesto de entre 2 y 80 caracteres.';
    }
    if (debeValidarContrasena && !REGLAS_CONTRASENA.every((regla) => regla.validar(datos.contrasena))) {
        errores.contrasena = 'La contraseña no cumple todos los requisitos.';
    }
    if (debeValidarContrasena && datos.contrasena !== datos.confirmarContrasena) {
        errores.confirmarContrasena = 'Las contraseñas no coinciden.';
    }

    return errores;
};

const Campo = ({
    label,
    valor,
    onChangeText,
    error,
    placeholder,
    keyboardType = 'default',
    secureTextEntry = false,
    maxLength,
    autoCapitalize = 'sentences',
    ayuda
}) => (
    <View style={styles.campo}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            style={[styles.input, error && styles.inputError]}
            value={valor}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            keyboardType={keyboardType}
            secureTextEntry={secureTextEntry}
            maxLength={maxLength}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            accessibilityLabel={label}
            accessibilityHint={error || ayuda}
            accessibilityState={{ disabled: false }}
        />
        {ayuda && !error && <Text style={styles.ayuda}>{ayuda}</Text>}
        {error && <Text style={styles.errorText} accessibilityLiveRegion="polite">{error}</Text>}
    </View>
);

const ReglasContrasena = ({ contrasena }) => (
    <View style={styles.reglasContrasena}>
        {REGLAS_CONTRASENA.map((regla) => {
            const cumple = regla.validar(contrasena);
            return (
                <View key={regla.key} style={styles.reglaFila}>
                    <Ionicons
                        name={cumple ? 'checkmark-circle' : 'ellipse-outline'}
                        size={14}
                        color={cumple ? COLORS.exito : '#94a3b8'}
                    />
                    <Text style={[styles.reglaTexto, cumple && styles.reglaTextoCumplida]}>{regla.texto}</Text>
                </View>
            );
        })}
    </View>
);

export default function GestionEmpleados({ onVolver, idNegocio: idNegocioProp, nombreNegocio }) {
    const { usuario } = useContext(AuthContext);
    const { width } = useWindowDimensions();
    const esPantallaAmplia = width >= 720;
    const idNegocio = idNegocioProp || usuario?.id_negocio || usuario?.negocio?.id_negocio;
    const tokenSesion = getAuthToken(usuario);

    const [empleados, setEmpleados] = useState([]);
    const [formData, setFormData] = useState(FORM_INICIAL);
    const [errores, setErrores] = useState({});
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState(null);
    const [refrescando, setRefrescando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [empleadoEditar, setEmpleadoEditar] = useState(null);
    const [erroresEdicion, setErroresEdicion] = useState({});
    const [eliminandoId, setEliminandoId] = useState(null);

    const nombreUbicacion = nombreNegocio || usuario?.nombre_negocio || 'negocio seleccionado';
    const cargarEmpleados = async ({ silencioso = false } = {}) => {
        if (!idNegocio || !tokenSesion) {
            setCargando(false);
            setRefrescando(false);
            return;
        }

        if (!silencioso) setCargando(true);
        setErrorCarga(null);
        try {
            const parametros = new URLSearchParams({
                id_negocio: String(idNegocio)
            });
            const response = await fetch(`${API_BASE_URL}/empleados?${parametros.toString()}`, {
                headers: getAuthHeaders(usuario)
            });
            const resultado = await leerRespuesta(response);

            if (!response.ok || resultado.success === false) {
                throw new Error(mensajeRespuesta(resultado, 'No se pudo cargar la lista de empleados.'));
            }

            if (!Array.isArray(resultado.data)) {
                throw new Error('El servidor devolvió una lista de empleados inválida.');
            }

            setEmpleados(resultado.data.map(normalizarEmpleado));
        } catch (error) {
            setEmpleados([]);
            setErrorCarga(error.message || 'Revisa tu conexión e intenta nuevamente.');
        } finally {
            setCargando(false);
            setRefrescando(false);
        }
    };

    useEffect(() => {
        cargarEmpleados();
    }, [idNegocio, tokenSesion]);

    const actualizarCampo = (campo, valor) => {
        setFormData((prev) => ({ ...prev, [campo]: valor }));
        setErrores((prev) => ({ ...prev, [campo]: null }));
    };

    const actualizarCampoEdicion = (campo, valor) => {
        setEmpleadoEditar((prev) => ({ ...prev, [campo]: valor }));
        setErroresEdicion((prev) => ({ ...prev, [campo]: null }));
    };

    const crearEmpleado = async () => {
        const nuevosErrores = validarFormulario(formData);
        setErrores(nuevosErrores);

        if (Object.keys(nuevosErrores).length > 0) {
            Alert.alert('Revisa el formulario', 'Corrige los campos marcados antes de guardar.');
            return;
        }
        if (!idNegocio || !tokenSesion) {
            Alert.alert('Sesión no disponible', 'Inicia sesión nuevamente antes de registrar empleados.');
            return;
        }

        setGuardando(true);
        try {
            const response = await fetch(`${API_BASE_URL}/empleados`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(usuario) },
                body: JSON.stringify({
                    id_negocio: Number(idNegocio),
                    nombre: formData.nombre.trim(),
                    email: formData.email.trim().toLowerCase(),
                    telefono: formData.telefono,
                    puesto: formData.puesto.trim(),
                    contrasena: formData.contrasena
                })
            });
            const resultado = await leerRespuesta(response);

            if (!response.ok || resultado.success === false) {
                Alert.alert('No se pudo agregar', mensajeRespuesta(resultado, 'El empleado no pudo registrarse.'));
                return;
            }

            setFormData(FORM_INICIAL);
            setErrores({});
            await cargarEmpleados({ silencioso: true });
            Alert.alert('Empleado agregado', 'La cuenta fue creada y ya puede iniciar sesión con sus credenciales.');
        } catch (error) {
            Alert.alert('Error de conexión', 'No se pudo conectar con el servidor. Intenta nuevamente.');
        } finally {
            setGuardando(false);
        }
    };

    const abrirEdicion = (empleado) => {
        setErroresEdicion({});
        setEmpleadoEditar({
            ...normalizarEmpleado(empleado),
            contrasena: '',
            confirmarContrasena: ''
        });
    };

    const cerrarEdicion = () => {
        if (guardando) return;
        setEmpleadoEditar(null);
        setErroresEdicion({});
    };

    const guardarEdicion = async () => {
        if (!empleadoEditar) return;

        const nuevosErrores = validarFormulario(empleadoEditar, true);
        setErroresEdicion(nuevosErrores);
        if (Object.keys(nuevosErrores).length > 0) {
            Alert.alert('Revisa el formulario', 'Corrige los campos marcados antes de guardar.');
            return;
        }

        setGuardando(true);
        try {
            const payload = {
                id_empleado: Number(empleadoEditar.id_usuario),
                id_negocio: Number(idNegocio),
                nombre: empleadoEditar.nombre.trim(),
                email: empleadoEditar.email.trim().toLowerCase(),
                telefono: empleadoEditar.telefono,
                puesto: empleadoEditar.puesto.trim()
            };
            if (empleadoEditar.contrasena) payload.contrasena = empleadoEditar.contrasena;

            const response = await fetch(`${API_BASE_URL}/empleados`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(usuario) },
                body: JSON.stringify(payload)
            });
            const resultado = await leerRespuesta(response);

            if (!response.ok || resultado.success === false) {
                Alert.alert('No se pudo actualizar', mensajeRespuesta(resultado, 'Los cambios no pudieron guardarse.'));
                return;
            }

            setEmpleadoEditar(null);
            setErroresEdicion({});
            await cargarEmpleados({ silencioso: true });
            Alert.alert('Empleado actualizado', 'Los datos de acceso se actualizaron correctamente.');
        } catch (error) {
            Alert.alert('Error de conexión', 'No se pudo conectar con el servidor. Intenta nuevamente.');
        } finally {
            setGuardando(false);
        }
    };

    const eliminarEmpleado = (empleado) => {
        Alert.alert(
            'Eliminar acceso',
            `Se desactivará la cuenta de ${empleado.nombre}. La trazabilidad de los lotes registrados por esta persona se conservará.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Desactivar',
                    style: 'destructive',
                    onPress: async () => {
                        setEliminandoId(empleado.id_usuario);
                        try {
                            const response = await fetch(`${API_BASE_URL}/empleados`, {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(usuario) },
                                body: JSON.stringify({
                                    id_empleado: Number(empleado.id_usuario),
                                    id_negocio: Number(idNegocio)
                                })
                            });
                            const resultado = await leerRespuesta(response);

                            if (!response.ok || resultado.success === false) {
                                Alert.alert('No se pudo eliminar', mensajeRespuesta(resultado, 'El acceso no pudo desactivarse.'));
                                return;
                            }

                            setEmpleados((prev) => prev.filter((item) => item.id_usuario !== empleado.id_usuario));
                            Alert.alert('Acceso eliminado', 'La cuenta del empleado fue desactivada correctamente.');
                        } catch (error) {
                            Alert.alert('Error de conexión', 'No se pudo conectar con el servidor. Intenta nuevamente.');
                        } finally {
                            setEliminandoId(null);
                        }
                    }
                }
            ]
        );
    };

    const renderCampos = (datos, erroresFormulario, cambiar, esEdicion = false) => (
        <>
            <Campo
                label="Nombre completo *"
                valor={datos.nombre}
                onChangeText={(texto) => cambiar('nombre', texto)}
                error={erroresFormulario.nombre}
                placeholder="Ej. María López Hernández"
                maxLength={100}
            />
            <Campo
                label="Correo electrónico *"
                valor={datos.email}
                onChangeText={(texto) => cambiar('email', texto)}
                error={erroresFormulario.email}
                placeholder="empleado@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={100}
            />
            <Campo
                label="Teléfono *"
                valor={datos.telefono}
                onChangeText={(texto) => cambiar('telefono', texto.replace(/\D/g, ''))}
                error={erroresFormulario.telefono}
                placeholder="10 dígitos"
                keyboardType="number-pad"
                maxLength={10}
            />
            <Campo
                label="Puesto *"
                valor={datos.puesto}
                onChangeText={(texto) => cambiar('puesto', texto)}
                error={erroresFormulario.puesto}
                placeholder="Ej. Encargado de inventario"
                maxLength={80}
            />
            <Campo
                label={esEdicion ? 'Nueva contraseña (Opcional)' : 'Contraseña temporal *'}
                valor={datos.contrasena}
                onChangeText={(texto) => cambiar('contrasena', texto)}
                error={erroresFormulario.contrasena}
                placeholder={esEdicion ? 'Déjala vacía para conservar la actual' : 'Crea una contraseña segura'}
                secureTextEntry
                autoCapitalize="none"
                maxLength={72}
            />
            {(!esEdicion || Boolean(datos.contrasena || datos.confirmarContrasena)) && (
                <ReglasContrasena contrasena={datos.contrasena} />
            )}
            <Campo
                label={esEdicion ? 'Confirmar nueva contraseña' : 'Confirmar contraseña *'}
                valor={datos.confirmarContrasena}
                onChangeText={(texto) => cambiar('confirmarContrasena', texto)}
                error={erroresFormulario.confirmarContrasena}
                placeholder="Repite la contraseña"
                secureTextEntry
                autoCapitalize="none"
                maxLength={72}
                ayuda={esEdicion ? 'Solo es necesaria si deseas cambiar la contraseña.' : undefined}
            />
        </>
    );

    return (
        <KeyboardAvoidingView style={styles.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.contenido}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refrescando}
                        onRefresh={() => {
                            setRefrescando(true);
                            cargarEmpleados({ silencioso: true });
                        }}
                        colors={[COLORS.rojoIntenso]}
                    />
                }
            >
                <View style={[styles.contenedorCentral, esPantallaAmplia && styles.contenedorCentralAmplio]}>
                    <TouchableOpacity
                        style={styles.botonRegresar}
                        onPress={onVolver}
                        accessibilityRole="button"
                        accessibilityLabel="Volver al panel principal"
                    >
                        <Ionicons name="arrow-back" size={20} color={COLORS.azulMarino} />
                        <Text style={styles.textoRegresar}>Volver al Panel Principal</Text>
                    </TouchableOpacity>

                    <Text style={styles.titulo}>Gestión de Empleados</Text>
                    <Text style={styles.subtitulo}>
                        Administra los accesos de {nombreUbicacion}. Cada empleado tendrá una cuenta individual.
                    </Text>

                    {!idNegocio || !tokenSesion ? (
                        <View style={styles.estadoAdvertencia}>
                            <Ionicons name="alert-circle" size={24} color="#b45309" />
                            <Text style={styles.textoAdvertencia}>
                                {!tokenSesion
                                    ? 'Tu sesión debe renovarse para gestionar accesos. Cierra sesión e ingresa nuevamente.'
                                    : 'No fue posible identificar el negocio administrador. Selecciona una sucursal válida.'}
                            </Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.tarjetaFormulario}>
                                <View style={styles.encabezadoSeccion}>
                                    <View style={styles.iconoSeccion}>
                                        <Ionicons name="person-add" size={20} color={COLORS.blancoPuro} />
                                    </View>
                                    <View style={styles.encabezadoTexto}>
                                        <Text style={styles.tituloSeccion}>Agregar empleado</Text>
                                        <Text style={styles.subtituloSeccion}>Todos los campos marcados con (*) son obligatorios.</Text>
                                    </View>
                                </View>

                                {renderCampos(formData, errores, actualizarCampo)}

                                <TouchableOpacity
                                    style={[styles.botonGuardar, guardando && styles.botonDeshabilitado]}
                                    onPress={crearEmpleado}
                                    disabled={guardando}
                                    accessibilityRole="button"
                                    accessibilityLabel="Guardar empleado"
                                    accessibilityState={{ disabled: guardando, busy: guardando }}
                                >
                                    {guardando
                                        ? <ActivityIndicator color={COLORS.blancoPuro} />
                                        : <><Ionicons name="person-add-outline" size={19} color={COLORS.blancoPuro} /><Text style={styles.textoBotonGuardar}>Agregar empleado</Text></>}
                                </TouchableOpacity>
                            </View>

                            <View style={styles.listaHeader}>
                                <View>
                                    <Text style={styles.tituloLista}>Empleados registrados</Text>
                                    <Text style={styles.contadorLista}>{empleados.length} acceso(s) activo(s)</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.botonRecargar}
                                    onPress={() => cargarEmpleados()}
                                    disabled={cargando}
                                    accessibilityRole="button"
                                    accessibilityLabel="Actualizar lista de empleados"
                                >
                                    <Ionicons name="refresh" size={19} color={COLORS.azulMarino} />
                                </TouchableOpacity>
                            </View>

                            {cargando ? (
                                <View style={styles.estadoLista}>
                                    <ActivityIndicator size="large" color={COLORS.azulCeruleo} />
                                    <Text style={styles.textoEstadoLista}>Cargando empleados...</Text>
                                </View>
                            ) : errorCarga ? (
                                <View style={styles.estadoLista}>
                                    <View style={styles.iconoErrorCarga}>
                                        <Ionicons name="cloud-offline-outline" size={31} color={COLORS.rojoIntenso} />
                                    </View>
                                    <Text style={styles.tituloErrorCarga}>No se pudo cargar la lista</Text>
                                    <Text style={styles.textoEstadoLista}>{errorCarga}</Text>
                                    <TouchableOpacity
                                        style={styles.botonReintentar}
                                        onPress={() => cargarEmpleados()}
                                        accessibilityRole="button"
                                        accessibilityLabel="Reintentar carga de empleados"
                                    >
                                        <Ionicons name="refresh" size={17} color={COLORS.blancoPuro} />
                                        <Text style={styles.textoReintentar}>Reintentar</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : empleados.length === 0 ? (
                                <View style={styles.estadoLista}>
                                    <View style={styles.iconoVacio}>
                                        <Ionicons name="people-outline" size={32} color="#64748b" />
                                    </View>
                                    <Text style={styles.tituloVacio}>Todavía no hay empleados</Text>
                                    <Text style={styles.textoEstadoLista}>Usa el formulario para crear el primer acceso de esta ubicación.</Text>
                                </View>
                            ) : (
                                empleados.map((empleado) => (
                                    <View key={String(empleado.id_usuario)} style={styles.tarjetaEmpleado}>
                                        <View style={styles.empleadoPrincipal}>
                                            <View style={styles.avatarEmpleado}>
                                                <Text style={styles.avatarTexto}>{empleado.nombre.trim().charAt(0).toUpperCase() || 'E'}</Text>
                                            </View>
                                            <View style={styles.datosEmpleado}>
                                                <Text style={styles.nombreEmpleado}>{empleado.nombre}</Text>
                                                <Text style={styles.puestoEmpleado}>{empleado.puesto}</Text>
                                                <View style={styles.datoContacto}>
                                                    <Ionicons name="mail-outline" size={14} color="#64748b" />
                                                    <Text style={styles.textoContacto} numberOfLines={1}>{empleado.email}</Text>
                                                </View>
                                                <View style={styles.datoContacto}>
                                                    <Ionicons name="call-outline" size={14} color="#64748b" />
                                                    <Text style={styles.textoContacto}>{empleado.telefono}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.accionesEmpleado}>
                                            <TouchableOpacity
                                                style={styles.botonEditar}
                                                onPress={() => abrirEdicion(empleado)}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Editar a ${empleado.nombre}`}
                                            >
                                                <Ionicons name="create-outline" size={17} color={COLORS.azulMarino} />
                                                <Text style={styles.textoEditar}>Editar</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.botonEliminar, eliminandoId === empleado.id_usuario && styles.botonDeshabilitadoClaro]}
                                                onPress={() => eliminarEmpleado(empleado)}
                                                disabled={eliminandoId === empleado.id_usuario}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Eliminar acceso de ${empleado.nombre}`}
                                            >
                                                {eliminandoId === empleado.id_usuario
                                                    ? <ActivityIndicator size="small" color={COLORS.rojoIntenso} />
                                                    : <Ionicons name="trash-outline" size={17} color={COLORS.rojoIntenso} />}
                                                <Text style={styles.textoEliminar}>Eliminar</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))
                            )}
                        </>
                    )}
                </View>
            </ScrollView>

            <Modal visible={Boolean(empleadoEditar)} transparent animationType="slide" onRequestClose={cerrarEdicion}>
                <KeyboardAvoidingView style={styles.modalFondo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.modalContenido} accessibilityViewIsModal>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitulo}>Editar empleado</Text>
                                <Text style={styles.modalSubtitulo}>Actualiza sus datos o contraseña.</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.botonCerrarModal}
                                onPress={cerrarEdicion}
                                accessibilityRole="button"
                                accessibilityLabel="Cerrar edición"
                            >
                                <Ionicons name="close" size={22} color="#334155" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            {empleadoEditar && renderCampos(empleadoEditar, erroresEdicion, actualizarCampoEdicion, true)}
                            <TouchableOpacity
                                style={[styles.botonGuardar, guardando && styles.botonDeshabilitado]}
                                onPress={guardarEdicion}
                                disabled={guardando}
                                accessibilityRole="button"
                                accessibilityLabel="Guardar cambios del empleado"
                            >
                                {guardando
                                    ? <ActivityIndicator color={COLORS.blancoPuro} />
                                    : <Text style={styles.textoBotonGuardar}>Guardar cambios</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.botonCancelar} onPress={cerrarEdicion} disabled={guardando}>
                                <Text style={styles.textoCancelar}>Cancelar</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: COLORS.blancoPuro },
    scroll: { flex: 1 },
    contenido: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 50 },
    contenedorCentral: { width: '100%', alignSelf: 'center' },
    contenedorCentralAmplio: { maxWidth: 840 },
    botonRegresar: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 6, marginBottom: 5 },
    textoRegresar: { color: COLORS.azulMarino, fontSize: 14, fontWeight: FONTS.bold },
    titulo: { color: COLORS.azulMarino, fontSize: SIZES.tituloPantalla, fontWeight: FONTS.bold },
    subtitulo: { color: '#64748b', fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 18 },
    estadoAdvertencia: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d', borderRadius: SIZES.radioTarjeta, padding: 14 },
    textoAdvertencia: { flex: 1, color: '#92400e', fontSize: 13, lineHeight: 19 },
    tarjetaFormulario: { backgroundColor: COLORS.blancoPuro, borderWidth: 1, borderColor: '#dbe3ec', borderRadius: SIZES.radioTarjeta, padding: 15, marginBottom: 24, elevation: 1 },
    encabezadoSeccion: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    iconoSeccion: { width: 42, height: 42, borderRadius: SIZES.radioBoton, backgroundColor: COLORS.azulMarino, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
    encabezadoTexto: { flex: 1 },
    tituloSeccion: { color: '#0f172a', fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold },
    subtituloSeccion: { color: '#64748b', fontSize: 12, marginTop: 2 },
    campo: { marginBottom: 12 },
    label: { color: '#334155', fontSize: 13, fontWeight: FONTS.bold, marginBottom: 6 },
    input: { minHeight: 47, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: SIZES.radioBoton, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontSize: 15 },
    inputError: { borderColor: COLORS.rojoIntenso, backgroundColor: '#fff1f2' },
    ayuda: { color: '#64748b', fontSize: 11, marginTop: 5, lineHeight: 16 },
    errorText: { color: COLORS.rojoIntenso, fontSize: 12, marginTop: 5 },
    reglasContrasena: { backgroundColor: '#f8fafc', borderRadius: SIZES.radioBoton, padding: 10, marginTop: -4, marginBottom: 12 },
    reglaFila: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 },
    reglaTexto: { color: '#64748b', fontSize: 11 },
    reglaTextoCumplida: { color: '#047857', fontWeight: '600' },
    botonGuardar: { minHeight: 52, borderRadius: SIZES.radioBoton, backgroundColor: COLORS.rojoIntenso, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
    botonDeshabilitado: { backgroundColor: '#94a3b8' },
    textoBotonGuardar: { color: COLORS.blancoPuro, fontSize: 15, fontWeight: FONTS.bold },
    listaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    tituloLista: { color: '#0f172a', fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold },
    contadorLista: { color: '#64748b', fontSize: 12, marginTop: 3 },
    botonRecargar: { width: 44, height: 44, borderRadius: SIZES.radioBoton, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
    estadoLista: { minHeight: 150, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, alignItems: 'center', justifyContent: 'center', padding: 20 },
    textoEstadoLista: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 9 },
    iconoVacio: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    tituloVacio: { color: '#334155', fontSize: 15, fontWeight: FONTS.bold },
    iconoErrorCarga: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    tituloErrorCarga: { color: '#991b1b', fontSize: 15, fontWeight: FONTS.bold },
    botonReintentar: { minHeight: 42, marginTop: 13, paddingHorizontal: 16, borderRadius: SIZES.radioBoton, backgroundColor: COLORS.azulMarino, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    textoReintentar: { color: COLORS.blancoPuro, fontSize: 13, fontWeight: FONTS.bold },
    tarjetaEmpleado: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, padding: 14, marginBottom: 11, backgroundColor: COLORS.blancoPuro },
    empleadoPrincipal: { flexDirection: 'row', alignItems: 'flex-start' },
    avatarEmpleado: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarTexto: { color: '#15803d', fontSize: 20, fontWeight: FONTS.bold },
    datosEmpleado: { flex: 1 },
    nombreEmpleado: { color: '#0f172a', fontSize: 15, fontWeight: FONTS.bold },
    puestoEmpleado: { alignSelf: 'flex-start', color: '#0369a1', fontSize: 11, fontWeight: FONTS.bold, backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 4, marginBottom: 7 },
    datoContacto: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    textoContacto: { flex: 1, color: '#64748b', fontSize: 12 },
    accionesEmpleado: { flexDirection: 'row', gap: 9, borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 13, paddingTop: 11 },
    botonEditar: { flex: 1, minHeight: 44, borderRadius: SIZES.radioBoton, backgroundColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    textoEditar: { color: COLORS.azulMarino, fontSize: 13, fontWeight: FONTS.bold },
    botonEliminar: { flex: 1, minHeight: 44, borderRadius: SIZES.radioBoton, backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    botonDeshabilitadoClaro: { opacity: 0.6 },
    textoEliminar: { color: COLORS.rojoIntenso, fontSize: 13, fontWeight: FONTS.bold },
    modalFondo: { flex: 1, backgroundColor: 'rgba(4, 30, 58, 0.58)', justifyContent: 'center', padding: 18 },
    modalContenido: { width: '100%', maxWidth: 600, maxHeight: '88%', alignSelf: 'center', backgroundColor: COLORS.blancoPuro, borderRadius: SIZES.radioTarjeta, padding: 18 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    modalTitulo: { color: COLORS.azulMarino, fontSize: 19, fontWeight: FONTS.bold },
    modalSubtitulo: { color: '#64748b', fontSize: 12, marginTop: 2 },
    botonCerrarModal: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: SIZES.radioBoton, backgroundColor: '#f1f5f9' },
    botonCancelar: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    textoCancelar: { color: '#475569', fontSize: 14, fontWeight: FONTS.bold }
});
