import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CalendarioModal from '../../components/common/CalendarioModal';
import { API_BASE_URL } from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, SIZES, FONTS } from '../../theme/theme';
import { getAuthHeaders } from '../../utils/auth';

// --- AYUDANTES DE FORMATEO DE FECHA ---
const formatearParaUI = (fecha) => {
    if (!fecha) return '';
    if (fecha.includes('/')) return fecha; 
    const partes = fecha.split('-');
    if (partes.length === 3 && partes[0].length === 4) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fecha;
};

const formatearParaBD = (fechaLocal) => {
    if (!fechaLocal) return '';
    if (fechaLocal.includes('-')) return fechaLocal; 
    const partes = fechaLocal.split('/');
    if (partes.length === 3) {
        const dia = partes[0];
        const mes = partes[1];
        let anio = partes[2];
        if (anio.length === 2) {
            anio = `20${anio}`;
        }
        return `${anio}-${mes}-${dia}`;
    }
    return fechaLocal;
};

const FILTROS_RAPIDOS = [
    { label: 'Todos los lotes', value: 'todos' },
    { label: 'Res', value: 'res', especie: 'BOVINO' },
    { label: 'Cerdo', value: 'cerdo', especie: 'PORCINO' },
    { label: 'Disponible', value: 'activo', estado: 'activo' },
    { label: 'Vendido', value: 'vendido', estado: 'vendido' },
    { label: 'Caducado', value: 'caducado', estado: 'caducado' },
    { label: 'Fecha de producción', value: 'fecha', tipo: 'fecha' }
];

const ESTADOS_LOTE_UI = [
    { label: 'Disponible', value: 'activo' },
    { label: 'Vendido', value: 'vendido' },
    { label: 'Caducado', value: 'caducado' }
];

const SEXOS = ['MACHO', 'HEMBRA'];
const CLASIFICACIONES_BOVINO = ['VAQUILLA', 'VACA', 'TORETE', 'TORO', 'BECERRO', 'BECERRA', 'BUEY'];
const CLASIFICACIONES_PORCINO = ['LECHON', 'CERDO_ENGORDA', 'MARRANA', 'SEMENTAL'];
const clasificacionesPorEspecie = (especie) => (especie === 'PORCINO' ? CLASIFICACIONES_PORCINO : CLASIFICACIONES_BOVINO);

const etiquetaEstado = (estado) => ESTADOS_LOTE_UI.find((item) => item.value === estado)?.label || estado || 'Sin estado';
const nombreEspecie = (especie) => {
    if (especie === 'PORCINO') return 'Cerdo';
    if (especie === 'BOVINO') return 'Res';
    return especie || 'Sin especie';
};

const colorEstado = (estado) => {
    if (estado === 'vendido') return { fondo: '#ecfdf5', texto: '#047857' };
    if (estado === 'caducado') return { fondo: '#fef2f2', texto: '#b91c1c' };
    return { fondo: '#eff6ff', texto: '#1d4ed8' };
};

const diasParaVencer = (fecha) => {
    if (!fecha) return null;
    const hoy = new Date();
    const vencimiento = new Date(`${fecha}T00:00:00`);
    hoy.setHours(0, 0, 0, 0);
    return Math.ceil((vencimiento - hoy) / 86400000);
};

const recomendacionesLote = (lote) => {
    const dias = diasParaVencer(lote?.fecha_vencimiento);

    if (lote?.estado === 'caducado' || (dias !== null && dias < 0)) {
        return [
            'LOTE BLOQUEADO. No se recomienda consumo ni venta.',
            'Separar el lote del resto del inventario, revisar olor/color/textura y aplicar el protocolo de desecho sanitario del negocio.'
        ];
    }

    if (lote?.estado === 'vendido') {
        return [
            'Conservar evidencia de entrega y trazabilidad.',
            'Mantener la cadena de frío hasta la recepción del cliente.'
        ];
    }

    if (dias !== null && dias <= 2) {
        return [
            'Priorizar venta o consumo preferente de inmediato.',
            'Mantener refrigerado entre 0 °C y 4 °C y evitar exposición prolongada al ambiente.'
        ];
    }

    return [
        'Mantener refrigerado entre 0 °C y 4 °C.',
        'Si no se venderá pronto, considerar congelación controlada y rotación PEPS (Primeras Entradas, Primeras Salidas).'
    ];
};

const crearFormularioEdicion = (lote) => ({
    lote: {
        codigo_lote: String(lote?.codigo_lote || ''),
        tipo_corte: String(lote?.tipo_corte || ''),
        peso_kg: String(lote?.peso_kg || ''),
        fecha_ingreso: formatearParaUI(String(lote?.fecha_ingreso || '')),
        fecha_vencimiento: formatearParaUI(String(lote?.fecha_vencimiento || '')),
        estado: lote?.estado || 'activo'
    },
    animal: {
        num_arete: String(lote?.num_arete || ''),
        sexo: lote?.sexo || 'HEMBRA',
        clasificacion: lote?.clasificacion || (lote?.especie === 'PORCINO' ? 'CERDO_ENGORDA' : 'VAQUILLA'),
        meses_edad: String(lote?.meses_edad ?? ''),
        arete_faltante: Boolean(lote?.arete_faltante)
    }
});

export default function MisLotes({ onVolver, idNegocio, nombreNegocio }) {
    const { usuario } = useContext(AuthContext);
    const [lotes, setLotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filtroActivo, setFiltroActivo] = useState(FILTROS_RAPIDOS[0]);
    const [dropdownAbierto, setDropdownAbierto] = useState(false);
    const [fechaIngreso, setFechaIngreso] = useState('');
    const [loteSeleccionado, setLoteSeleccionado] = useState(null);
    const [editando, setEditando] = useState(false);
    const [formEdicion, setFormEdicion] = useState(() => crearFormularioEdicion(null));
    const [guardando, setGuardando] = useState(false);
    const [eliminandoId, setEliminandoId] = useState(null);
    const [calendarioActivo, setCalendarioActivo] = useState(null);

    const idsSesion = useMemo(() => ({
        idNegocio: idNegocio || usuario?.id_negocio || usuario?.negocio?.id_negocio,
        idEmpleado: usuario?.id_usuario || usuario?.id
    }), [idNegocio, usuario]);

    const cargarLotes = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (idsSesion.idNegocio) params.append('id_negocio', String(idsSesion.idNegocio));
            if (idsSesion.idEmpleado) params.append('id_empleado', String(idsSesion.idEmpleado));
            if (filtroActivo.especie) params.append('especie', filtroActivo.especie);
            if (filtroActivo.estado) params.append('estado', filtroActivo.estado);
            
            if (filtroActivo.tipo === 'fecha' && fechaIngreso.trim()) {
                params.append('fecha_ingreso', formatearParaBD(fechaIngreso.trim()));
            }

            const query = params.toString();
            const response = await fetch(`${API_BASE_URL}/lotes${query ? `?${query}` : ''}`, {
                headers: getAuthHeaders(usuario)
            });
            const result = await response.json();

            if (!response.ok || result.success === false) {
                Alert.alert('Error', result.error || 'No se pudieron cargar los lotes.');
                return;
            }

            setLotes(result.data || []);
            setLoteSeleccionado((actual) => {
                if (!actual) return null;
                return (result.data || []).find((lote) => lote.id_lote === actual.id_lote) || null;
            });
        } catch (error) {
            Alert.alert('Error de conexión', 'No se pudo conectar con el servidor para cargar lotes.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [idsSesion, filtroActivo, fechaIngreso, usuario]);

    useEffect(() => {
        cargarLotes();
    }, [cargarLotes]);

    const refrescar = () => {
        setRefreshing(true);
        cargarLotes();
    };

    const seleccionarFiltro = (opcion) => {
        setFiltroActivo(opcion);
        setDropdownAbierto(false);
        if (opcion.tipo !== 'fecha') setFechaIngreso('');
    };

    const limpiarFiltros = () => {
        setFiltroActivo(FILTROS_RAPIDOS[0]);
        setFechaIngreso('');
        setDropdownAbierto(false);
    };

    const actualizarForm = (grupo, campo, valor) => {
        setFormEdicion((prev) => ({
            ...prev,
            [grupo]: { ...prev[grupo], [campo]: valor }
        }));
    };

    const abrirEdicion = (lote) => {
        setFormEdicion(crearFormularioEdicion(lote));
        setEditando(true);
    };

    const abrirCalendarioFiltro = () => {
        setCalendarioActivo({ modo: 'filtro', titulo: 'Fecha de producción' });
    };

    const abrirCalendarioEdicion = (campo, titulo) => {
        setCalendarioActivo({ modo: 'edicion', campo, titulo });
    };

    const seleccionarFecha = (fecha) => {
        const fechaUI = formatearParaUI(fecha);
        if (calendarioActivo?.modo === 'filtro') setFechaIngreso(fechaUI);
        if (calendarioActivo?.modo === 'edicion') actualizarForm('lote', calendarioActivo.campo, fechaUI);
        setCalendarioActivo(null);
    };

    // --- LÓGICA DE ALERTA PARA CAMBIO DE ESTADO RÁPIDO ---
    const confirmarCambioEstado = (lote, estado) => {
        if (lote.estado === estado) return;

        if (estado === 'caducado') {
            Alert.alert(
                'Acción Irreversible',
                '¿Estás seguro de marcar este lote como CADUCADO?\n\nPor protocolo de seguridad sanitaria, esta acción no se puede deshacer y el lote quedará bloqueado permanentemente.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Sí, marcar como caducado', style: 'destructive', onPress: () => ejecutarCambioEstado(lote, estado) }
                ]
            );
        } else {
            ejecutarCambioEstado(lote, estado);
        }
    };

    const ejecutarCambioEstado = async (lote, estado) => {
        setGuardando(true);
        try {
            const response = await fetch(`${API_BASE_URL}/lotes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(usuario) },
                body: JSON.stringify({
                    id_lote: lote.id_lote,
                    estado,
                    id_negocio: idsSesion.idNegocio || null,
                    id_usuario: idsSesion.idEmpleado || null
                })
            });
            const result = await response.json();

            if (!response.ok || result.success === false) {
                Alert.alert('Bloqueo de Seguridad', result.error || 'No se pudo actualizar el estado.');
                return;
            }

            const actualizado = { ...lote, estado };
            setLotes((prev) => prev.map((item) => (item.id_lote === lote.id_lote ? actualizado : item)));
            setLoteSeleccionado(actualizado);
        } catch (error) {
            Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
        } finally {
            setGuardando(false);
        }
    };

    // --- LÓGICA DE ALERTA PARA GUARDAR EDICIÓN COMPLETA ---
    const confirmarGuardarEdicion = () => {
        if (!loteSeleccionado) return;

        if (formEdicion.lote.estado === 'caducado' && loteSeleccionado.estado !== 'caducado') {
            Alert.alert(
                'Acción Irreversible',
                'Estás a punto de marcar este lote como CADUCADO.\n\nPor protocolo de seguridad sanitaria, el lote quedará bloqueado permanentemente tras guardar los cambios. ¿Deseas continuar?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Sí, caducar y guardar', style: 'destructive', onPress: ejecutarGuardarEdicion }
                ]
            );
        } else {
            ejecutarGuardarEdicion();
        }
    };

    const ejecutarGuardarEdicion = async () => {
        setGuardando(true);
        try {
            const response = await fetch(`${API_BASE_URL}/lotes`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(usuario) },
                body: JSON.stringify({
                    id_lote: loteSeleccionado.id_lote,
                    id_negocio: idsSesion.idNegocio || null,
                    id_usuario: idsSesion.idEmpleado || null,
                    lote: {
                        ...formEdicion.lote,
                        fecha_ingreso: formatearParaBD(formEdicion.lote.fecha_ingreso),
                        fecha_vencimiento: formatearParaBD(formEdicion.lote.fecha_vencimiento)
                    },
                    animal: formEdicion.animal
                })
            });
            const result = await response.json();

            if (!response.ok || result.success === false) {
                Alert.alert('Error', result.error || 'No se pudo actualizar el lote.');
                return;
            }

            const actualizado = result.data;
            setLotes((prev) => prev.map((lote) => (lote.id_lote === actualizado.id_lote ? actualizado : lote)));
            setLoteSeleccionado(actualizado);
            setEditando(false);
            Alert.alert('Lote actualizado', 'Los cambios se guardaron correctamente.');
        } catch (error) {
            Alert.alert('Error de conexión', 'No se pudo conectar con el servidor para actualizar el lote.');
        } finally {
            setGuardando(false);
        }
    };

    const confirmarEliminar = (lote) => {
        Alert.alert('Eliminar lote', `Se eliminará el lote ${lote.codigo_lote}. Esta acción no se puede deshacer.`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => eliminarLote(lote) }
        ]);
    };

    const eliminarLote = async (lote) => {
        setEliminandoId(lote.id_lote);
        try {
            const params = new URLSearchParams({ id_lote: String(lote.id_lote) });
            if (idsSesion.idNegocio) params.append('id_negocio', String(idsSesion.idNegocio));
            if (idsSesion.idEmpleado) params.append('id_usuario', String(idsSesion.idEmpleado));
            const response = await fetch(`${API_BASE_URL}/lotes?${params.toString()}`, {
                method: 'DELETE',
                headers: getAuthHeaders(usuario)
            });
            const result = await response.json();

            if (!response.ok || result.success === false) {
                Alert.alert('Error', result.error || 'No se pudo eliminar el lote.');
                return;
            }

            setLotes((prev) => prev.filter((item) => item.id_lote !== lote.id_lote));
            setLoteSeleccionado(null);
            Alert.alert('Lote eliminado', 'El lote fue eliminado correctamente.');
        } catch (error) {
            Alert.alert('Error de conexión', 'No se pudo conectar con el servidor para eliminar el lote.');
        } finally {
            setEliminandoId(null);
        }
    };

    const renderCampoEdicion = ({ grupo, campo, label, keyboardType = 'default' }) => (
        <View style={styles.campo} key={`${grupo}.${campo}`}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={styles.input}
                value={formEdicion[grupo][campo]}
                onChangeText={(valor) => actualizarForm(grupo, campo, valor)}
                keyboardType={keyboardType}
                placeholderTextColor="#94a3b8"
            />
        </View>
    );

    const renderFechaEdicion = ({ campo, label }) => (
        <View style={styles.campo} key={campo}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity style={[styles.input, styles.inputFechaBoton]} onPress={() => abrirCalendarioEdicion(campo, label)}>
                <Text style={styles.fechaBotonTexto}>{formEdicion.lote[campo] || 'DD/MM/AAAA'}</Text>
                <Ionicons name="calendar" size={18} color="#002855" />
            </TouchableOpacity>
        </View>
    );

    const renderOpciones = ({ grupo, campo, label, opciones }) => (
        <View style={styles.campo} key={`${grupo}.${campo}`}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.opcionesFila}>
                {opciones.map((opcion) => {
                    const valor = typeof opcion === 'string' ? opcion : opcion.value;
                    const texto = typeof opcion === 'string' ? opcion : opcion.label;
                    const activo = formEdicion[grupo][campo] === valor;
                    return (
                        <TouchableOpacity key={valor} style={[styles.chipOpcion, activo && styles.chipOpcionActivo]} onPress={() => actualizarForm(grupo, campo, valor)}>
                            <Text style={[styles.chipOpcionTexto, activo && styles.chipOpcionTextoActivo]}>{texto}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    const valorCalendario = calendarioActivo?.modo === 'filtro'
        ? fechaIngreso
        : calendarioActivo?.campo
            ? formEdicion.lote[calendarioActivo.campo]
            : '';

    return (
        <ScrollView
            style={styles.contenedor}
            contentContainerStyle={styles.contenido}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refrescar} tintColor={COLORS.azulMarino} />}
        >
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

            <View style={styles.encabezadoFila}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.titulo}>Lotes Registrados</Text>
                    <Text style={styles.subtitulo}>
                        Consulta lotes, estados y recomendaciones de conservación{nombreNegocio ? ` · ${nombreNegocio}` : ''}.
                    </Text>
                </View>
                <TouchableOpacity style={styles.botonIcono} onPress={refrescar}>
                    <Ionicons name="refresh" size={20} color="#002855" />
                </TouchableOpacity>
            </View>

            <View style={styles.panelFiltros}>
                <Text style={styles.filtroTitulo}>Filtro de Inventario</Text>
                <TouchableOpacity style={styles.dropdownBoton} onPress={() => setDropdownAbierto(!dropdownAbierto)}>
                    <Text style={styles.dropdownTexto}>{filtroActivo.label}</Text>
                    <Ionicons name={dropdownAbierto ? 'chevron-up' : 'chevron-down'} size={18} color="#002855" />
                </TouchableOpacity>

                {dropdownAbierto && (
                    <View style={styles.dropdownLista}>
                        {FILTROS_RAPIDOS.map((opcion) => (
                            <TouchableOpacity key={opcion.value} style={styles.dropdownItem} onPress={() => seleccionarFiltro(opcion)}>
                                <Text style={[styles.dropdownItemTexto, filtroActivo.value === opcion.value && styles.dropdownItemTextoActivo]}>{opcion.label}</Text>
                                {filtroActivo.value === opcion.value && <Ionicons name="checkmark" size={17} color="#002855" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {filtroActivo.tipo === 'fecha' && (
                    <TouchableOpacity style={[styles.inputFecha, styles.inputFechaBoton]} onPress={abrirCalendarioFiltro}>
                        <Text style={[styles.fechaBotonTexto, !fechaIngreso && styles.fechaPlaceholder]}>{fechaIngreso || 'DD/MM/AAAA'}</Text>
                        <Ionicons name="calendar" size={18} color="#002855" />
                    </TouchableOpacity>
                )}

                {(filtroActivo.value !== 'todos' || fechaIngreso) && (
                    <TouchableOpacity style={styles.botonLimpiar} onPress={limpiarFiltros}>
                        <Text style={styles.textoLimpiar}>Limpiar filtro</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.estadoCentrado}>
                    <ActivityIndicator color="#002855" size="large" />
                    <Text style={styles.estadoTexto}>Cargando lotes...</Text>
                </View>
            ) : lotes.length === 0 ? (
                <View style={styles.estadoVacio}>
                    <Ionicons name="cube-outline" size={42} color="#cbd5e1" />
                    <Text style={styles.estadoTitulo}>Sin lotes en esta categoría</Text>
                    <Text style={styles.estadoTexto}>Ajusta el filtro o registra un lote nuevo.</Text>
                </View>
            ) : (
                <View style={styles.tabla}>
                    <View style={[styles.tablaFila, styles.tablaHeader]}>
                        <Text style={[styles.th, styles.colId]}>Lote Int.</Text>
                        <Text style={[styles.th, styles.colFecha]}>Prod.</Text>
                        <Text style={[styles.th, styles.colFecha]}>Caduc.</Text>
                        <Text style={[styles.th, styles.colEstado]}>Estado</Text>
                    </View>
                    {lotes.map((lote) => {
                        const estadoColor = colorEstado(lote.estado);
                        return (
                            <TouchableOpacity key={String(lote.id_lote)} style={styles.tablaFila} onPress={() => setLoteSeleccionado(lote)}>
                                <Text style={[styles.td, styles.colId]} numberOfLines={1}>{lote.codigo_lote}</Text>
                                <Text style={[styles.td, styles.colFecha]}>{formatearParaUI(lote.fecha_ingreso).substring(0, 5)}</Text>
                                <Text style={[styles.td, styles.colFecha]}>{formatearParaUI(lote.fecha_vencimiento).substring(0, 5)}</Text>
                                <View style={[styles.badgeEstado, styles.colEstado, { backgroundColor: estadoColor.fondo }]}>
                                    <Text style={[styles.badgeTexto, { color: estadoColor.texto }]}>{etiquetaEstado(lote.estado)}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            <Modal visible={Boolean(loteSeleccionado)} animationType="slide" onRequestClose={() => setLoteSeleccionado(null)}>
                {loteSeleccionado && (
                    <ScrollView style={styles.modalPantalla} contentContainerStyle={styles.modalContenido}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitulo}>{loteSeleccionado.codigo_lote}</Text>
                                <Text style={styles.modalSubtitulo}>Lote interno #{loteSeleccionado.id_lote}</Text>
                            </View>
                            <TouchableOpacity style={styles.botonIcono} onPress={() => setLoteSeleccionado(null)}>
                                <Ionicons name="close" size={22} color="#002855" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.detalleCard}>
                            <View style={styles.detalleHeader}>
                                <Text style={styles.detalleTitulo}>Información completa</Text>
                                <View style={[styles.badgeEstado, { backgroundColor: colorEstado(loteSeleccionado.estado).fondo }]}>
                                    <Text style={[styles.badgeTexto, { color: colorEstado(loteSeleccionado.estado).texto }]}>
                                        {etiquetaEstado(loteSeleccionado.estado)}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.detalle}><Text style={styles.bold}>Especie:</Text> {loteSeleccionado.especie_nombre || nombreEspecie(loteSeleccionado.especie)}</Text>
                            <Text style={styles.detalle}><Text style={styles.bold}>Tipo de corte:</Text> {loteSeleccionado.tipo_corte}</Text>
                            <Text style={styles.detalle}><Text style={styles.bold}>Peso Inicial:</Text> {loteSeleccionado.peso_kg} kg</Text>
                            <Text style={styles.detalle}><Text style={styles.bold}>Peso Actual:</Text> {loteSeleccionado.peso_actual} kg</Text>
                            <Text style={styles.detalle}><Text style={styles.bold}>Fecha de producción:</Text> {formatearParaUI(loteSeleccionado.fecha_ingreso)}</Text>
                            <Text style={styles.detalle}><Text style={styles.bold}>Consumo preferente:</Text> {formatearParaUI(loteSeleccionado.fecha_vencimiento)}</Text>
                            <Text style={styles.detalle}><Text style={styles.bold}>Arete:</Text> {loteSeleccionado.num_arete || 'N/D'}</Text>
                            <Text style={styles.detalle}><Text style={styles.bold}>Clasificación:</Text> {loteSeleccionado.clasificacion || 'N/D'}</Text>
                            <Text style={styles.detalle}><Text style={styles.bold}>Guía de tránsito:</Text> {loteSeleccionado.folio_guia || 'N/D'}</Text>
                        </View>

                        <View style={styles.detalleCard}>
                            <Text style={styles.detalleTitulo}>Gestión de Estado</Text>
                            
                            {loteSeleccionado.estado === 'caducado' ? (
                                <View style={styles.cajaBloqueoSeguridad}>
                                    <Ionicons name="lock-closed" size={18} color="#991b1b" style={{ marginRight: 8, marginTop: 2 }} />
                                    <Text style={styles.textoBloqueoSeguridad}>
                                        Por protocolo de seguridad sanitaria, este lote ha sido bloqueado y no puede reactivarse ni cambiar de estado.
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.opcionesFila}>
                                    {ESTADOS_LOTE_UI.map((estado) => {
                                        const activo = loteSeleccionado.estado === estado.value;
                                        return (
                                            <TouchableOpacity key={estado.value} style={[styles.chipOpcion, activo && styles.chipOpcionActivo]} disabled={guardando} onPress={() => confirmarCambioEstado(loteSeleccionado, estado.value)}>
                                                <Text style={[styles.chipOpcionTexto, activo && styles.chipOpcionTextoActivo]}>{estado.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>

                        <View style={[styles.recomendacionCard, loteSeleccionado.estado === 'caducado' && styles.recomendacionCardPeligro]}>
                            <Text style={[styles.detalleTitulo, loteSeleccionado.estado === 'caducado' && { color: '#991b1b' }]}>
                                {loteSeleccionado.estado === 'caducado' ? 'Protocolo de Desecho' : 'Recomendaciones'}
                            </Text>
                            {recomendacionesLote(loteSeleccionado).map((texto, index) => (
                                <Text key={String(index)} style={[styles.recomendacion, loteSeleccionado.estado === 'caducado' && { color: '#7f1d1d' }]}>
                                    • {texto}
                                </Text>
                            ))}
                        </View>

                        {loteSeleccionado.estado !== 'caducado' && (
                            <TouchableOpacity style={styles.botonPrimario} onPress={() => abrirEdicion(loteSeleccionado)}>
                                <Ionicons name="create" size={18} color={COLORS.blancoPuro} />
                                <Text style={styles.textoBotonPrimario}>Editar lote</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.botonEliminar} onPress={() => confirmarEliminar(loteSeleccionado)}>
                            <Ionicons name="trash" size={18} color={COLORS.rojoIntenso} />
                            <Text style={styles.textoBotonEliminar}>Eliminar lote</Text>
                        </TouchableOpacity>
                    </ScrollView>
                )}
            </Modal>

            <Modal visible={editando} animationType="slide" onRequestClose={() => setEditando(false)}>
                <ScrollView style={styles.modalPantalla} contentContainerStyle={styles.modalContenido}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitulo}>Editar lote</Text>
                            <Text style={styles.modalSubtitulo}>Campos principales del lote y animal</Text>
                        </View>
                        <TouchableOpacity style={styles.botonIcono} onPress={() => setEditando(false)}>
                            <Ionicons name="close" size={22} color="#002855" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.detalleCard}>
                        <Text style={styles.detalleTitulo}>Lote</Text>
                        {renderCampoEdicion({ grupo: 'lote', campo: 'codigo_lote', label: 'ID lote' })}
                        {renderCampoEdicion({ grupo: 'lote', campo: 'tipo_corte', label: 'Tipo de corte' })}
                        {renderCampoEdicion({ grupo: 'lote', campo: 'peso_kg', label: 'Peso kg', keyboardType: 'decimal-pad' })}
                        {renderFechaEdicion({ campo: 'fecha_ingreso', label: 'Fecha de producción' })}
                        {renderFechaEdicion({ campo: 'fecha_vencimiento', label: 'Fecha preferente de consumo' })}
                        {renderOpciones({ grupo: 'lote', campo: 'estado', label: 'Estado', opciones: ESTADOS_LOTE_UI })}
                    </View>

                    <View style={styles.detalleCard}>
                        <Text style={styles.detalleTitulo}>Animal</Text>
                        <View style={styles.campo}>
                            <Text style={styles.label}>Especie</Text>
                            <View style={styles.especieBloqueada}>
                                <Ionicons name="lock-closed" size={16} color="#475569" />
                                <Text style={styles.especieTexto}>{nombreEspecie(loteSeleccionado?.especie)} ({loteSeleccionado?.especie})</Text>
                            </View>
                        </View>
                        {renderCampoEdicion({ grupo: 'animal', campo: 'num_arete', label: 'Número de arete' })}
                        {renderOpciones({ grupo: 'animal', campo: 'sexo', label: 'Sexo', opciones: SEXOS })}
                        {renderOpciones({ grupo: 'animal', campo: 'clasificacion', label: 'Clasificación', opciones: clasificacionesPorEspecie(loteSeleccionado?.especie) })}
                        {renderCampoEdicion({ grupo: 'animal', campo: 'meses_edad', label: 'Edad en meses', keyboardType: 'numeric' })}
                        <TouchableOpacity style={styles.toggleFila} onPress={() => actualizarForm('animal', 'arete_faltante', !formEdicion.animal.arete_faltante)}>
                            <View style={[styles.checkbox, formEdicion.animal.arete_faltante && styles.checkboxActivo]}>
                                {formEdicion.animal.arete_faltante && <Ionicons name="checkmark" size={16} color={COLORS.blancoPuro} />}
                            </View>
                            <Text style={styles.toggleTexto}>Arete faltante</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={[styles.botonPrimario, guardando && styles.botonDeshabilitado]} onPress={confirmarGuardarEdicion} disabled={guardando}>
                        {guardando ? <ActivityIndicator color={COLORS.blancoPuro} /> : (
                            <>
                                <Ionicons name="save" size={18} color={COLORS.blancoPuro} />
                                <Text style={styles.textoBotonPrimario}>Guardar cambios</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </Modal>

            <CalendarioModal
                visible={Boolean(calendarioActivo)}
                value={valorCalendario}
                title={calendarioActivo?.titulo || 'Seleccionar fecha'}
                onSelect={seleccionarFecha}
                onClose={() => setCalendarioActivo(null)}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: 15 },
    contenido: { paddingBottom: 40 },
    botonRegresarLink: { minHeight: 44, marginVertical: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
    textoRegresarLink: { color: COLORS.azulMarino, fontWeight: FONTS.bold, fontSize: 14, marginLeft: 6 },
    encabezadoFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    titulo: { fontSize: SIZES.tituloPantalla, fontWeight: FONTS.bold, color: COLORS.azulMarino },
    subtitulo: { fontSize: 13, color: '#64748b', marginTop: 4 },
    botonIcono: { width: 40, height: 40, borderRadius: SIZES.radioBoton, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.blancoPuro },
    panelFiltros: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, padding: 16, marginBottom: 20, backgroundColor: COLORS.blancoPuro, elevation: 1 },
    filtroTitulo: { fontSize: 15, fontWeight: FONTS.bold, color: '#0f172a', marginBottom: 10 },
    dropdownBoton: { minHeight: 48, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: SIZES.radioBoton, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc' },
    dropdownTexto: { color: '#0f172a', fontSize: 14, fontWeight: FONTS.bold },
    dropdownLista: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioBoton, marginTop: 8, overflow: 'hidden', backgroundColor: COLORS.blancoPuro, elevation: 2 },
    dropdownItem: { minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    dropdownItemTexto: { color: '#475569', fontSize: 14, fontWeight: '600' },
    dropdownItemTextoActivo: { color: COLORS.azulCeruleo, fontWeight: FONTS.bold },
    inputFecha: { marginTop: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: SIZES.radioBoton, paddingHorizontal: 14, paddingVertical: 12, color: '#0f172a' },
    inputFechaBoton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fechaBotonTexto: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
    fechaPlaceholder: { color: '#94a3b8' },
    botonLimpiar: { marginTop: 14, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#f1f5f9', borderRadius: 6 },
    textoLimpiar: { color: COLORS.azulMarino, fontWeight: FONTS.bold, fontSize: 12 },
    estadoCentrado: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
    estadoVacio: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, backgroundColor: '#f8fafc', borderStyle: 'dashed' },
    estadoTitulo: { fontSize: 16, fontWeight: FONTS.bold, color: '#334155', marginTop: 12 },
    estadoTexto: { fontSize: 14, color: '#64748b', marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
    tabla: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.blancoPuro, elevation: 1 },
    tablaFila: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingHorizontal: 12 },
    tablaHeader: { backgroundColor: '#f8fafc' },
    th: { color: '#475569', fontSize: 12, fontWeight: FONTS.bold },
    td: { color: '#0f172a', fontSize: 13, fontWeight: '600' },
    colId: { flex: 1.4, marginRight: 6 },
    colFecha: { flex: 0.9, marginRight: 6 },
    colEstado: { flex: 1.2, alignItems: 'flex-start' },
    modalPantalla: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 20, paddingTop: 18 },
    modalContenido: { paddingBottom: 36 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitulo: { color: COLORS.azulMarino, fontSize: SIZES.tituloPantalla, fontWeight: FONTS.bold },
    modalSubtitulo: { color: '#64748b', fontSize: 14, marginTop: 4 },
    detalleCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, padding: 18, marginBottom: 16, backgroundColor: COLORS.blancoPuro, elevation: 1 },
    recomendacionCard: { borderWidth: 1, borderColor: '#bfdbfe', borderRadius: SIZES.radioTarjeta, padding: 18, marginBottom: 16, backgroundColor: '#eff6ff' },
    recomendacionCardPeligro: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
    detalleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10 },
    detalleTitulo: { color: '#0f172a', fontSize: 16, fontWeight: FONTS.bold, marginBottom: 8 },
    badgeEstado: { borderRadius: SIZES.radioBoton, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
    badgeTexto: { fontSize: 12, fontWeight: FONTS.bold },
    detalle: { fontSize: 14, color: '#475569', lineHeight: 24, marginBottom: 4 },
    recomendacion: { fontSize: 14, color: '#1e3a8a', lineHeight: 22, marginBottom: 4 },
    bold: { fontWeight: '800', color: '#1e293b' },
    botonPrimario: { backgroundColor: COLORS.azulCeruleo, borderRadius: 10, minHeight: 54, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 12, elevation: 2 },
    textoBotonPrimario: { color: COLORS.blancoPuro, fontSize: 16, fontWeight: FONTS.bold },
    botonEliminar: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', borderRadius: 10, minHeight: 54, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    textoBotonEliminar: { color: COLORS.textoOscuro, fontSize: 15, fontWeight: FONTS.bold },
    botonDeshabilitado: { backgroundColor: '#94a3b8', elevation: 0 },
    campo: { marginBottom: 14 },
    label: { color: '#64748b', fontSize: 13, fontWeight: FONTS.bold, marginBottom: 6 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: SIZES.radioBoton, paddingHorizontal: 14, paddingVertical: 12, color: '#0f172a', fontSize: 15 },
    opcionesFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chipOpcion: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: SIZES.radioBoton, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.blancoPuro },
    chipOpcionActivo: { borderColor: COLORS.azulMarino, backgroundColor: COLORS.azulCeruleo },
    chipOpcionTexto: { color: '#475569', fontSize: 13, fontWeight: FONTS.bold },
    chipOpcionTextoActivo: { color: COLORS.blancoPuro },
    especieBloqueada: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: SIZES.radioBoton, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
    especieTexto: { color: '#334155', fontSize: 15, fontWeight: FONTS.bold },
    toggleFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, marginTop: 5 },
    checkbox: { width: 26, height: 26, borderRadius: 6, borderWidth: 1, borderColor: '#94a3b8', alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: COLORS.blancoPuro },
    checkboxActivo: { backgroundColor: COLORS.azulMarino, borderColor: COLORS.azulMarino },
    toggleTexto: { color: '#334155', fontSize: 15, fontWeight: '600' },
    cajaBloqueoSeguridad: { flexDirection: 'row', backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5' },
    textoBloqueoSeguridad: { flex: 1, color: '#991b1b', fontSize: 13, fontWeight: 'bold', lineHeight: 18 }
});
