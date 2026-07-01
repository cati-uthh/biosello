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
import CalendarioModal from './CalendarioModal';
import { AuthContext } from './AuthContext';

const API_BASE_URL = 'https://biosello-backend.vercel.app/api';

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
            'No se recomienda consumo ni venta.',
            'Separar el lote, revisar olor/color/textura y aplicar el protocolo sanitario del negocio.'
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
            'Priorizar venta o consumo preferente.',
            'Mantener refrigerado entre 0 °C y 4 °C y evitar exposición prolongada.'
        ];
    }

    return [
        'Mantener refrigerado entre 0 °C y 4 °C.',
        'Si no se venderá pronto, considerar congelación controlada y rotación PEPS.'
    ];
};

const crearFormularioEdicion = (lote) => ({
    lote: {
        codigo_lote: String(lote?.codigo_lote || ''),
        tipo_corte: String(lote?.tipo_corte || ''),
        peso_kg: String(lote?.peso_kg || ''),
        fecha_ingreso: String(lote?.fecha_ingreso || ''),
        fecha_vencimiento: String(lote?.fecha_vencimiento || ''),
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

export default function MisLotes({ onVolver }) {
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
        idNegocio: usuario?.id_negocio || usuario?.negocio?.id_negocio,
        idEmpleado: usuario?.id_usuario || usuario?.id
    }), [usuario]);

    const cargarLotes = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (idsSesion.idNegocio) params.append('id_negocio', String(idsSesion.idNegocio));
            if (idsSesion.idEmpleado) params.append('id_empleado', String(idsSesion.idEmpleado));
            if (filtroActivo.especie) params.append('especie', filtroActivo.especie);
            if (filtroActivo.estado) params.append('estado', filtroActivo.estado);
            if (filtroActivo.tipo === 'fecha' && fechaIngreso.trim()) params.append('fecha_ingreso', fechaIngreso.trim());

            const query = params.toString();
            const response = await fetch(`${API_BASE_URL}/lotes${query ? `?${query}` : ''}`);
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
    }, [idsSesion, filtroActivo, fechaIngreso]);

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
        if (calendarioActivo?.modo === 'filtro') setFechaIngreso(fecha);
        if (calendarioActivo?.modo === 'edicion') actualizarForm('lote', calendarioActivo.campo, fecha);
        setCalendarioActivo(null);
    };

    const cambiarEstado = async (lote, estado) => {
        if (lote.estado === estado) return;

        setGuardando(true);
        try {
            const response = await fetch(`${API_BASE_URL}/lotes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_lote: lote.id_lote,
                    estado,
                    id_usuario: idsSesion.idEmpleado || null
                })
            });
            const result = await response.json();

            if (!response.ok || result.success === false) {
                Alert.alert('Error', result.error || 'No se pudo actualizar el estado.');
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

    const guardarEdicion = async () => {
        if (!loteSeleccionado) return;

        setGuardando(true);
        try {
            const response = await fetch(`${API_BASE_URL}/lotes`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_lote: loteSeleccionado.id_lote,
                    id_usuario: idsSesion.idEmpleado || null,
                    lote: formEdicion.lote,
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
            if (idsSesion.idEmpleado) params.append('id_usuario', String(idsSesion.idEmpleado));
            const response = await fetch(`${API_BASE_URL}/lotes?${params.toString()}`, { method: 'DELETE' });
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
                <Text style={styles.fechaBotonTexto}>{formEdicion.lote[campo] || 'Seleccionar fecha'}</Text>
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refrescar} />}
        >
            <TouchableOpacity style={styles.botonRegresarLink} onPress={onVolver}>
                <Text style={styles.textoRegresarLink}>Volver al Panel Principal</Text>
            </TouchableOpacity>

            <View style={styles.encabezadoFila}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.titulo}>Lotes registrados</Text>
                    <Text style={styles.subtitulo}>Consulta lotes, estados y recomendaciones de conservación.</Text>
                </View>
                <TouchableOpacity style={styles.botonIcono} onPress={refrescar}>
                    <Ionicons name="refresh" size={20} color="#002855" />
                </TouchableOpacity>
            </View>

            <View style={styles.panelFiltros}>
                <Text style={styles.filtroTitulo}>Filtro</Text>
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
                        <Text style={[styles.fechaBotonTexto, !fechaIngreso && styles.fechaPlaceholder]}>{fechaIngreso || 'Seleccionar fecha'}</Text>
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
                    <ActivityIndicator color="#002855" />
                    <Text style={styles.estadoTexto}>Cargando lotes...</Text>
                </View>
            ) : lotes.length === 0 ? (
                <View style={styles.estadoVacio}>
                    <Ionicons name="cube-outline" size={32} color="#94a3b8" />
                    <Text style={styles.estadoTitulo}>Sin lotes registrados</Text>
                    <Text style={styles.estadoTexto}>Ajusta el filtro o registra un lote nuevo.</Text>
                </View>
            ) : (
                <View style={styles.tabla}>
                    <View style={[styles.tablaFila, styles.tablaHeader]}>
                        <Text style={[styles.th, styles.colId]}>ID lote</Text>
                        <Text style={[styles.th, styles.colFecha]}>Producción</Text>
                        <Text style={[styles.th, styles.colFecha]}>Consumo pref.</Text>
                        <Text style={[styles.th, styles.colEstado]}>Estado</Text>
                    </View>
                    {lotes.map((lote) => {
                        const estadoColor = colorEstado(lote.estado);
                        return (
                            <TouchableOpacity key={String(lote.id_lote)} style={styles.tablaFila} onPress={() => setLoteSeleccionado(lote)}>
                                <Text style={[styles.td, styles.colId]} numberOfLines={1}>{lote.codigo_lote}</Text>
                                <Text style={[styles.td, styles.colFecha]}>{lote.fecha_ingreso}</Text>
                                <Text style={[styles.td, styles.colFecha]}>{lote.fecha_vencimiento}</Text>
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
                            <Text style={styles.detalle}><Text style={styles.bold}>Peso:</Text> {loteSeleccionado.peso_kg} kg</Text>
                            <Text style={styles.detalle}><Text style={styles.bold}>Fecha de producción:</Text> {loteSeleccionado.fecha_ingreso}</Text>
                            <Text style={styles.detalle}><Text style={styles.bold}>Consumo preferente:</Text> {loteSeleccionado.fecha_vencimiento}</Text>
                            <Text style={styles.detalle}><Text style={styles.bold}>Arete:</Text> {loteSeleccionado.num_arete || 'N/D'}</Text>
                            <Text style={styles.detalle}><Text style={styles.bold}>Clasificación:</Text> {loteSeleccionado.clasificacion || 'N/D'}</Text>
                            <Text style={styles.detalle}><Text style={styles.bold}>Guía:</Text> {loteSeleccionado.folio_guia || 'N/D'}</Text>
                        </View>

                        <View style={styles.detalleCard}>
                            <Text style={styles.detalleTitulo}>Cambiar estado</Text>
                            <View style={styles.opcionesFila}>
                                {ESTADOS_LOTE_UI.map((estado) => {
                                    const activo = loteSeleccionado.estado === estado.value;
                                    return (
                                        <TouchableOpacity key={estado.value} style={[styles.chipOpcion, activo && styles.chipOpcionActivo]} disabled={guardando} onPress={() => cambiarEstado(loteSeleccionado, estado.value)}>
                                            <Text style={[styles.chipOpcionTexto, activo && styles.chipOpcionTextoActivo]}>{estado.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.recomendacionCard}>
                            <Text style={styles.detalleTitulo}>Recomendaciones</Text>
                            {recomendacionesLote(loteSeleccionado).map((texto, index) => (
                                <Text key={String(index)} style={styles.recomendacion}>• {texto}</Text>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.botonPrimario} onPress={() => abrirEdicion(loteSeleccionado)}>
                            <Ionicons name="create" size={18} color="#ffffff" />
                            <Text style={styles.textoBotonPrimario}>Editar lote</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.botonEliminar} onPress={() => confirmarEliminar(loteSeleccionado)}>
                            <Ionicons name="trash" size={18} color="#D32F2F" />
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
                                {formEdicion.animal.arete_faltante && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                            </View>
                            <Text style={styles.toggleTexto}>Arete faltante</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={[styles.botonPrimario, guardando && styles.botonDeshabilitado]} onPress={guardarEdicion} disabled={guardando}>
                        {guardando ? <ActivityIndicator color="#ffffff" /> : (
                            <>
                                <Ionicons name="save" size={18} color="#ffffff" />
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
    contenedor: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 16, paddingTop: 15 },
    contenido: { paddingBottom: 40 },
    botonRegresarLink: { marginVertical: 10 },
    textoRegresarLink: { color: '#002855', fontWeight: 'bold', fontSize: 14 },
    encabezadoFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    titulo: { fontSize: 22, fontWeight: 'bold', color: '#002855' },
    subtitulo: { fontSize: 13, color: '#64748b', marginTop: 4 },
    botonIcono: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
    panelFiltros: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginBottom: 14, backgroundColor: '#ffffff' },
    filtroTitulo: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginBottom: 10 },
    dropdownBoton: { minHeight: 46, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc' },
    dropdownTexto: { color: '#0f172a', fontSize: 14, fontWeight: 'bold' },
    dropdownLista: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginTop: 8, overflow: 'hidden', backgroundColor: '#ffffff' },
    dropdownItem: { minHeight: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    dropdownItemTexto: { color: '#475569', fontSize: 14, fontWeight: '600' },
    dropdownItemTextoActivo: { color: '#002855', fontWeight: 'bold' },
    inputFecha: { marginTop: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a' },
    inputFechaBoton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fechaBotonTexto: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
    fechaPlaceholder: { color: '#94a3b8' },
    botonLimpiar: { marginTop: 12, alignSelf: 'flex-start' },
    textoLimpiar: { color: '#002855', fontWeight: 'bold', fontSize: 13 },
    estadoCentrado: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    estadoVacio: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc' },
    estadoTitulo: { fontSize: 15, fontWeight: 'bold', color: '#334155', marginTop: 10 },
    estadoTexto: { fontSize: 13, color: '#64748b', marginTop: 6, textAlign: 'center' },
    tabla: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, overflow: 'hidden', backgroundColor: '#ffffff' },
    tablaFila: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingHorizontal: 8 },
    tablaHeader: { backgroundColor: '#f8fafc' },
    th: { color: '#475569', fontSize: 11, fontWeight: 'bold' },
    td: { color: '#0f172a', fontSize: 12, fontWeight: '600' },
    colId: { flex: 1.2, marginRight: 6 },
    colFecha: { flex: 1, marginRight: 6 },
    colEstado: { flex: 0.9 },
    modalPantalla: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 18 },
    modalContenido: { paddingBottom: 36 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitulo: { color: '#002855', fontSize: 22, fontWeight: 'bold' },
    modalSubtitulo: { color: '#64748b', fontSize: 13, marginTop: 3 },
    detalleCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginBottom: 14, backgroundColor: '#ffffff' },
    recomendacionCard: { borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 14, marginBottom: 14, backgroundColor: '#eff6ff' },
    detalleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    detalleTitulo: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
    badgeEstado: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center' },
    badgeTexto: { fontSize: 11, fontWeight: 'bold' },
    detalle: { fontSize: 14, color: '#475569', lineHeight: 22 },
    recomendacion: { fontSize: 13, color: '#1e3a8a', lineHeight: 20 },
    bold: { fontWeight: 'bold', color: '#1e293b' },
    botonPrimario: { backgroundColor: '#002855', borderRadius: 9, minHeight: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 10 },
    textoBotonPrimario: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
    botonEliminar: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', borderRadius: 9, minHeight: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    textoBotonEliminar: { color: '#D32F2F', fontSize: 15, fontWeight: 'bold' },
    botonDeshabilitado: { backgroundColor: '#94a3b8' },
    campo: { marginBottom: 12 },
    label: { color: '#64748b', fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontSize: 14 },
    opcionesFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipOpcion: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#ffffff' },
    chipOpcionActivo: { borderColor: '#002855', backgroundColor: '#002855' },
    chipOpcionTexto: { color: '#475569', fontSize: 12, fontWeight: 'bold' },
    chipOpcionTextoActivo: { color: '#ffffff' },
    especieBloqueada: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
    especieTexto: { color: '#334155', fontSize: 14, fontWeight: 'bold' },
    toggleFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: '#94a3b8', alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: '#ffffff' },
    checkboxActivo: { backgroundColor: '#002855', borderColor: '#002855' },
    toggleTexto: { color: '#334155', fontSize: 14, fontWeight: '600' }
});
