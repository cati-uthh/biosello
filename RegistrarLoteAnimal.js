import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
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
import { COLORS, SIZES, FONTS } from './src/theme/theme';
import { API_BASE_URL, getAuthHeaders } from './src/utils/auth';
import {
    eliminarImagenAnimalTemporal,
    formatearTamanioArchivo,
    liberarUriImagenTemporal,
    seleccionarImagenAnimal,
    subirImagenAnimal
} from './src/utils/imagenAnimal';

const TIPOS_LOTE = [
    { id: 'res', label: 'Res', especie: 'BOVINO', icono: 'nutrition', color: COLORS.rojoIntenso, fondo: '#fff1f2' },
    { id: 'cerdo', label: 'Cerdo', especie: 'PORCINO', icono: 'restaurant', color: '#db2777', fondo: '#fdf2f8' }
];

const SEXOS = ['HEMBRA', 'MACHO'];
const MOTIVOS = ['SACRIFICIO'];
const ESTADOS_LOTE = ['activo', 'procesado', 'vendido', 'caducado'];

// Clasificaciones coherentes filtradas por Especie y Sexo
const obtenerClasificaciones = (especie, sexo) => {
    if (especie === 'PORCINO') {
        return sexo === 'HEMBRA' ? ['MARRANA', 'LECHON', 'CERDO_ENGORDA'] : ['LECHON', 'CERDO_ENGORDA'];
    }
    // BOVINO
    return sexo === 'HEMBRA' 
        ? ['VAQUILLA', 'VACA', 'BECERRA'] 
        : ['TORETE', 'TORO', 'BECERRO', 'BUEY'];
};

const obtenerCodigoSugerido = () => {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    return `LOT-${anio}-${mes}-001`;
};

const crearFormInicial = (especie = 'BOVINO') => ({
    guia_transito: { 
        folio_guia: '', 
        num_reemo: '',
        motivo_movilizacion: 'SACRIFICIO',
        fecha_expedicion: '',
        vigencia_dias: '3',
        centro_expedidor: '',
        elaboro: ''
    },
    origen: {
        upp_origen: '',
        localidad_origen: '',
        municipio_origen: 'Huejutla de Reyes',
        entidad_federativa: 'Hidalgo'
    },
    propietario: {
        nombre_propietario: '',
        curp_propietario: '',
        upp_propietario: ''
    },
    rastro: {
        num_rastro: '',
        nombre_rastro: '',
        nombre_destinatario: '',
        municipio: 'Huejutla de Reyes',
        entidad_federativa: 'Hidalgo'
    },
    animal: {
        num_arete: '',
        especie,
        sexo: 'HEMBRA',
        clasificacion: especie === 'PORCINO' ? 'MARRANA' : 'VAQUILLA',
        meses_edad: '',
        arete_faltante: false,
        imagen: null
    },
    lote: {
        codigo_lote: obtenerCodigoSugerido(),
        tipo_corte: '',
        peso_kg: '',
        fecha_ingreso: '',
        fecha_vencimiento: '',
        estado: 'activo'
    }
});

const limpiarTexto = (valor) => String(valor || '').trim();

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

const fechaValida = (valor) => /^\d{2}\/\d{2}\/(\d{2}|\d{4})$/.test(limpiarTexto(valor));

const InputCampo = ({
    grupo,
    campo,
    label,
    placeholder,
    ayuda,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    maxLength,
    editable = true,
    formData,
    errores,
    actualizarCampo
}) => {
    const valor = String(formData[grupo][campo] ?? '');
    const error = errores[`${grupo}.${campo}`];

    return (
        <View style={styles.campo}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[
                    styles.input,
                    !editable && styles.inputDeshabilitado,
                    error && styles.inputError
                ]}
                placeholder={placeholder}
                placeholderTextColor="#94a3b8"
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                maxLength={maxLength}
                editable={editable}
                value={valor}
                onChangeText={(text) => actualizarCampo(grupo, campo, text)}
            />
            {ayuda && !error && <Text style={styles.textoAyuda}>{ayuda}</Text>}
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const FechaCampo = ({ grupo, campo, label, ayuda, formData, errores, abrirCalendario }) => {
    const error = errores[`${grupo}.${campo}`];
    return (
        <View style={styles.campo}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={[styles.input, styles.inputFechaBoton, error && styles.inputError]}
                onPress={() => abrirCalendario(grupo, campo, label)}
            >
                <Text style={[styles.fechaBotonTexto, !formData[grupo][campo] && styles.fechaPlaceholder]}>
                    {formData[grupo][campo] || 'DD/MM/AA'}
                </Text>
                <Ionicons name="calendar" size={18} color="#002855" />
            </TouchableOpacity>
            {ayuda && !error && <Text style={styles.textoAyuda}>{ayuda}</Text>}
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const OpcionesCampo = ({ grupo, campo, label, opciones, formData, actualizarCampo }) => (
    <View style={styles.campo}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.opciones}>
            {opciones.map((opcion) => {
                const activo = formData[grupo][campo] === opcion;
                return (
                    <TouchableOpacity
                        key={opcion}
                        style={[styles.opcion, activo && styles.opcionActiva]}
                        onPress={() => actualizarCampo(grupo, campo, opcion)}
                    >
                        <Text style={[styles.opcionTexto, activo && styles.opcionTextoActiva]}>{opcion}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    </View>
);

const Seccion = ({ titulo, subtitulo, icono, children }) => (
    <View style={styles.seccion}>
        <View style={styles.seccionHeader}>
            <View style={styles.iconoSeccion}>
                <Ionicons name={icono} size={18} color="#002855" />
            </View>
            <View style={styles.seccionTexto}>
                <Text style={styles.seccionTitulo}>{titulo}</Text>
                {subtitulo && <Text style={styles.seccionSubtitulo}>{subtitulo}</Text>}
            </View>
        </View>
        {children}
    </View>
);

export default function RegistrarLoteAnimal({ onVolver, idNegocio, nombreNegocio }) {
    const { usuario } = useContext(AuthContext);
    const idNegocioActivo = idNegocio || usuario?.id_negocio || usuario?.negocio?.id_negocio || null;
    const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
    const [formData, setFormData] = useState(() => crearFormInicial());
    const [errores, setErrores] = useState({});
    const [loading, setLoading] = useState(false);
    const [calendarioActivo, setCalendarioActivo] = useState(null);
    const [seleccionandoImagen, setSeleccionandoImagen] = useState(false);

    useEffect(() => {
        const uriTemporal = formData.animal.imagen?.uri;
        return () => liberarUriImagenTemporal(uriTemporal);
    }, [formData.animal.imagen?.uri]);

    const actualizarCampo = (grupo, campo, valor) => {
        setFormData((prev) => {
            const nuevoGrupo = { ...prev[grupo], [campo]: valor };
            
            // Si cambia el sexo, reseteamos la clasificación al primer valor válido de la nueva lista
            if (grupo === 'animal' && campo === 'sexo') {
                const opcionesDisponibles = obtenerClasificaciones(prev.animal.especie, valor);
                nuevoGrupo.clasificacion = opcionesDisponibles[0];
            }

            return { ...prev, [grupo]: nuevoGrupo };
        });
    };

    const seleccionarTipoLote = (tipo) => {
        setTipoSeleccionado(tipo);
        setErrores({});
        setCalendarioActivo(null);
        setFormData(crearFormInicial(tipo.especie));
    };

    const abrirCalendario = (grupo, campo, titulo) => {
        setCalendarioActivo({ grupo, campo, titulo });
    };

    const seleccionarFecha = (fecha) => {
        if (!calendarioActivo) return;
        actualizarCampo(calendarioActivo.grupo, calendarioActivo.campo, formatearParaUI(fecha));
        setCalendarioActivo(null);
    };

    const seleccionarFotografia = async () => {
        if (seleccionandoImagen) return;

        setSeleccionandoImagen(true);
        try {
            const imagen = await seleccionarImagenAnimal();
            if (!imagen) return;

            actualizarCampo('animal', 'imagen', imagen);
            setErrores((prev) => ({ ...prev, 'animal.imagen': null }));
        } catch (error) {
            const mensaje = error?.message || 'No se pudo procesar la fotografía seleccionada.';
            setErrores((prev) => ({ ...prev, 'animal.imagen': mensaje }));
            Alert.alert('Fotografía no válida', mensaje);
        } finally {
            setSeleccionandoImagen(false);
        }
    };

    const quitarFotografia = () => {
        actualizarCampo('animal', 'imagen', null);
        setErrores((prev) => ({ ...prev, 'animal.imagen': null }));
    };

    const validarCampos = () => {
        const nuevosErrores = {};
        const requerido = (grupo, campo, mensaje) => {
            if (!limpiarTexto(formData[grupo][campo])) {
                nuevosErrores[`${grupo}.${campo}`] = mensaje;
            }
        };

        // Campos estrictamente obligatorios (*)
        requerido('guia_transito', 'folio_guia', 'El folio de guía es obligatorio.');
        requerido('origen', 'localidad_origen', 'La localidad de origen es obligatoria.');
        requerido('propietario', 'nombre_propietario', 'El nombre del propietario es obligatorio.');
        requerido('animal', 'num_arete', 'El número de identificación (Sello/Arete) es obligatorio.');
        requerido('lote', 'tipo_corte', 'El tipo de corte es obligatorio.');
        requerido('lote', 'peso_kg', 'El peso es obligatorio.');
        requerido('lote', 'fecha_ingreso', 'La fecha de ingreso es obligatoria.');
        requerido('lote', 'fecha_vencimiento', 'La fecha de vencimiento es obligatoria.');

        if (formData.guia_transito.fecha_expedicion && !fechaValida(formData.guia_transito.fecha_expedicion)) {
            nuevosErrores['guia_transito.fecha_expedicion'] = 'Usa el formato DD/MM/AA o DD/MM/AAAA.';
        }
        if (formData.lote.fecha_ingreso && !fechaValida(formData.lote.fecha_ingreso)) {
            nuevosErrores['lote.fecha_ingreso'] = 'Usa el formato DD/MM/AA o DD/MM/AAAA.';
        }
        if (formData.lote.fecha_vencimiento && !fechaValida(formData.lote.fecha_vencimiento)) {
            nuevosErrores['lote.fecha_vencimiento'] = 'Usa el formato DD/MM/AA o DD/MM/AAAA.';
        }

        setErrores(nuevosErrores);
        return nuevosErrores;
    };

    const construirPayload = (imagenSubida = null) => {
        const timestampUnico = Date.now().toString().slice(-6);

        return {
            guia_transito: {
                folio_guia: limpiarTexto(formData.guia_transito.folio_guia), 
                num_reemo: limpiarTexto(formData.guia_transito.num_reemo) || null,
                motivo_movilizacion: 'SACRIFICIO',
                fecha_expedicion: formData.guia_transito.fecha_expedicion 
                    ? formatearParaBD(limpiarTexto(formData.guia_transito.fecha_expedicion)) 
                    : formatearParaBD(limpiarTexto(formData.lote.fecha_ingreso)),
                vigencia_dias: Number(formData.guia_transito.vigencia_dias) || 3,
                centro_expedidor: limpiarTexto(formData.guia_transito.centro_expedidor) || 'AGL LOCAL',
                elaboro: limpiarTexto(formData.guia_transito.elaboro) || 'SISTEMA'
            },
            origen: {
                upp_origen: limpiarTexto(formData.origen.upp_origen) || `UPP-${timestampUnico}`,
                localidad_origen: limpiarTexto(formData.origen.localidad_origen),
                municipio_origen: limpiarTexto(formData.origen.municipio_origen) || 'Huejutla de Reyes',
                entidad_federativa: limpiarTexto(formData.origen.entidad_federativa) || 'Hidalgo'
            },
            propietario: {
                nombre_propietario: limpiarTexto(formData.propietario.nombre_propietario),
                curp_propietario: limpiarTexto(formData.propietario.curp_propietario).toUpperCase() || `CURP${timestampUnico}XXXXX`,
                upp_propietario: limpiarTexto(formData.propietario.upp_propietario) || `UPP-${timestampUnico}`
            },
            rastro: {
                num_rastro: limpiarTexto(formData.rastro.num_rastro) || `RAS-${timestampUnico}`,
                nombre_rastro: limpiarTexto(formData.rastro.nombre_rastro) || 'RASTRO MUNICIPAL',
                nombre_destinatario: limpiarTexto(formData.rastro.nombre_destinatario) || 'CARNICERIA',
                municipio: limpiarTexto(formData.rastro.municipio) || 'Huejutla de Reyes',
                entidad_federativa: limpiarTexto(formData.rastro.entidad_federativa) || 'Hidalgo'
            },
            animal: {
                num_arete: limpiarTexto(formData.animal.num_arete),
                especie: formData.animal.especie,
                sexo: formData.animal.sexo,
                clasificacion: formData.animal.clasificacion,
                meses_edad: Number(formData.animal.meses_edad) || 12,
                arete_faltante: formData.animal.arete_faltante ? 1 : 0,
                imagen_animal_url: imagenSubida?.url || null,
                imagen_animal_pathname: imagenSubida?.pathname || null
            },
            lote: {
                codigo_lote: 'AUTO',
                tipo_corte: limpiarTexto(formData.lote.tipo_corte),
                peso_kg: Number(formData.lote.peso_kg),
                fecha_ingreso: formatearParaBD(limpiarTexto(formData.lote.fecha_ingreso)),
                fecha_vencimiento: formatearParaBD(limpiarTexto(formData.lote.fecha_vencimiento)),
                estado: formData.lote.estado,
                id_negocio: idNegocioActivo,
                id_empleado: usuario?.id_usuario || usuario?.id || null
            }
        };
    };

    const registrarLoteAnimal = async () => {
        const erroresEncontrados = validarCampos();
        
        if (Object.keys(erroresEncontrados).length > 0) {
            const listaMensajes = Object.values(erroresEncontrados).map(msg => `• ${msg}`).join('\n');
            Alert.alert('Datos Incompletos', `Por favor completa los campos obligatorios (*):\n\n${listaMensajes}`);
            return;
        }

        setLoading(true);
        let imagenSubida = null;
        try {
            if (formData.animal.imagen) {
                imagenSubida = await subirImagenAnimal(formData.animal.imagen, usuario);
            }

            const response = await fetch(`${API_BASE_URL}/registrar-lote-animal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders(usuario) },
                body: JSON.stringify(construirPayload(imagenSubida))
            });

            const result = await response.json();

            if (!response.ok || result.success === false) {
                await eliminarImagenAnimalTemporal(imagenSubida, usuario);
                Alert.alert('Error', result.error || 'No se pudo guardar el registro.');
                return;
            }

            const avisoImagen = formData.animal.imagen
                ? '\n\nLa fotografia fue almacenada y aparecera al consultar el codigo QR.'
                : '';

            Alert.alert('Registro Exitoso', `El lote ha sido guardado con el código: ${result.data?.codigo_lote}${avisoImagen}`, [
                {
                    text: 'Entendido',
                    onPress: () => {
                        setFormData(crearFormInicial(tipoSeleccionado?.especie || 'BOVINO'));
                        setErrores({});
                        if (onVolver) onVolver();
                    }
                }
            ]);
        } catch (error) {
            await eliminarImagenAnimalTemporal(imagenSubida, usuario);
            Alert.alert(
                'No se pudo completar el registro',
                error?.message || 'No se pudo conectar con el servidor.'
            );
        } finally {
            setLoading(false);
        }
    };

    if (!tipoSeleccionado) {
        return (
            <View style={styles.pantallaSelector}>
                <TouchableOpacity
                    style={styles.botonRegresarLink}
                    onPress={onVolver}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Volver al Panel Principal"
                >
                    <Ionicons name="arrow-back" size={19} color={COLORS.azulMarino} />
                    <Text style={styles.textoRegresarLink}>Volver al Panel Principal</Text>
                </TouchableOpacity>

                <Text style={styles.titulo}>Registrar Lote / Animal</Text>
                <Text style={styles.subtitulo}>
                    ¿Qué tipo de lote deseas registrar?{nombreNegocio ? ` · ${nombreNegocio}` : ''}
                </Text>

                <View style={styles.selectorGrid}>
                    {TIPOS_LOTE.map((tipo) => (
                        <TouchableOpacity
                            key={tipo.id}
                            style={styles.tarjetaTipo}
                            onPress={() => seleccionarTipoLote(tipo)}
                            activeOpacity={0.75}
                            accessibilityRole="button"
                            accessibilityLabel={`Registrar lote de ${tipo.label}`}
                        >
                            <View style={[styles.iconoTipo, { backgroundColor: tipo.fondo }]}>
                                <Ionicons name={tipo.icono} size={28} color={tipo.color} />
                            </View>
                            <Text style={styles.tipoTitulo}>Lote de {tipo.label}</Text>
                            <Text style={styles.tipoSubtitulo}>{tipo.especie}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    }

    const opcionesClasificacion = obtenerClasificaciones(formData.animal.especie, formData.animal.sexo);

    return (
        <View style={styles.pantalla}>
            <ScrollView
                style={styles.contenedor}
                contentContainerStyle={styles.contenido}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity
                    style={styles.botonRegresarLink}
                    onPress={onVolver}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Volver al Panel Principal"
                >
                    <Ionicons name="arrow-back" size={19} color={COLORS.azulMarino} />
                    <Text style={styles.textoRegresarLink}>Volver al Panel Principal</Text>
                </TouchableOpacity>

                <Text style={styles.titulo}>Registrar Lote de {tipoSeleccionado.label}</Text>
                {nombreNegocio ? <Text style={styles.subtitulo}>Sucursal: {nombreNegocio}</Text> : null}
                <Text style={styles.leyendaObligatorio}>
                    * Los campos marcados con (*) son obligatorios para la trazabilidad y consulta.
                </Text>

                <Seccion titulo="1. Guía de tránsito" subtitulo="Documento de movilización" icono="document-text">
                    <InputCampo
                        grupo="guia_transito"
                        campo="folio_guia"
                        label="Folio de guía *"
                        placeholder="Ej. 55627"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="guia_transito"
                        campo="num_reemo"
                        label="Número REEMO (Opcional)"
                        placeholder="Ej. 214970"
                        keyboardType="numeric"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <OpcionesCampo
                        grupo="guia_transito"
                        campo="motivo_movilizacion"
                        label="Motivo de movilización *"
                        opciones={MOTIVOS}
                        formData={formData}
                        actualizarCampo={actualizarCampo}
                    />
                    <FechaCampo
                        grupo="guia_transito"
                        campo="fecha_expedicion"
                        label="Fecha de expedición (Opcional)"
                        formData={formData}
                        errores={errores}
                        abrirCalendario={abrirCalendario}
                    />
                    <InputCampo
                        grupo="guia_transito"
                        campo="vigencia_dias"
                        label="Vigencia en días (Opcional)"
                        placeholder="3"
                        keyboardType="numeric"
                        maxLength={3}
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="guia_transito"
                        campo="centro_expedidor"
                        label="Centro expedidor (Opcional)"
                        placeholder="Ej. AGL HUEJUTLA"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="guia_transito"
                        campo="elaboro"
                        label="Elaboró (Opcional)"
                        placeholder="Nombre del responsable"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                </Seccion>

                <Seccion titulo="2. Origen" subtitulo="Predio o rancho de procedencia" icono="location">
                    <InputCampo
                        grupo="origen"
                        campo="upp_origen"
                        label="UPP origen (Opcional)"
                        placeholder="Ej. 130285311002"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="origen"
                        campo="localidad_origen"
                        label="Localidad origen *"
                        placeholder="Ej. Chalahuiyapa"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="origen"
                        campo="municipio_origen"
                        label="Municipio origen (Opcional)"
                        placeholder="Ej. Huejutla de Reyes"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="origen"
                        campo="entidad_federativa"
                        label="Entidad federativa (Opcional)"
                        placeholder="Ej. Hidalgo"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                </Seccion>

                <Seccion titulo="3. Propietario" subtitulo="Dueño legal del animal" icono="person">
                    <InputCampo
                        grupo="propietario"
                        campo="nombre_propietario"
                        label="Nombre propietario *"
                        placeholder="Nombre completo"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="propietario"
                        campo="curp_propietario"
                        label="CURP propietario (Opcional)"
                        placeholder="18 caracteres"
                        autoCapitalize="characters"
                        maxLength={18}
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="propietario"
                        campo="upp_propietario"
                        label="UPP propietario (Opcional)"
                        placeholder="Ej. 130285311002"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                </Seccion>

                <Seccion titulo="4. Rastro" subtitulo="Destino del sacrificio" icono="business">
                    <InputCampo
                        grupo="rastro"
                        campo="num_rastro"
                        label="Número de rastro (Opcional)"
                        placeholder="Ej. 2151"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="rastro"
                        campo="nombre_rastro"
                        label="Nombre del rastro (Opcional)"
                        placeholder="Ej. RASTRO MUNICIPAL"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="rastro"
                        campo="nombre_destinatario"
                        label="Destinatario (Opcional)"
                        placeholder="Nombre completo"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="rastro"
                        campo="municipio"
                        label="Municipio (Opcional)"
                        placeholder="Ej. Huejutla de Reyes"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="rastro"
                        campo="entidad_federativa"
                        label="Entidad federativa (Opcional)"
                        placeholder="Ej. Hidalgo"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                </Seccion>

                <Seccion titulo="5. Animal" subtitulo="Datos de identificación" icono="paw">
                    <InputCampo
                        grupo="animal"
                        campo="num_arete"
                        label="Número de Identificación (Sello o Arete) *"
                        placeholder="Ej. 1301226566"
                        keyboardType="numeric"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <OpcionesCampo
                        grupo="animal"
                        campo="sexo"
                        label="Sexo *"
                        opciones={SEXOS}
                        formData={formData}
                        actualizarCampo={actualizarCampo}
                    />
                    <OpcionesCampo
                        grupo="animal"
                        campo="clasificacion"
                        label="Clasificación *"
                        opciones={opcionesClasificacion}
                        formData={formData}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="animal"
                        campo="meses_edad"
                        label="Edad en meses (Opcional)"
                        placeholder="Ej. 18"
                        keyboardType="numeric"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <View style={styles.campoImagen}>
                        <Text style={styles.label}>Fotografía del animal (Opcional)</Text>
                        {formData.animal.imagen ? (
                            <View style={styles.imagenSeleccionadaFila}>
                                <Image
                                    source={{ uri: formData.animal.imagen.uri }}
                                    style={styles.imagenPreview}
                                    resizeMode="cover"
                                    accessibilityLabel="Vista previa de la fotografía del animal"
                                />
                                <View style={styles.imagenInformacion}>
                                    <Text style={styles.imagenNombre} numberOfLines={2}>{formData.animal.imagen.nombre}</Text>
                                    <Text style={styles.imagenDetalle}>{formData.animal.imagen.mimeType}</Text>
                                    <Text style={styles.imagenDetalle}>{formatearTamanioArchivo(formData.animal.imagen.tamanioBytes)}</Text>
                                    <View style={styles.accionesImagen}>
                                        <TouchableOpacity
                                            style={styles.botonCambiarImagen}
                                            onPress={seleccionarFotografia}
                                            disabled={seleccionandoImagen}
                                            accessibilityRole="button"
                                            accessibilityLabel="Cambiar fotografía del animal"
                                        >
                                            {seleccionandoImagen
                                                ? <ActivityIndicator size="small" color={COLORS.azulMarino} />
                                                : <><Ionicons name="images-outline" size={16} color={COLORS.azulMarino} /><Text style={styles.textoCambiarImagen}>Cambiar</Text></>}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.botonQuitarImagen}
                                            onPress={quitarFotografia}
                                            accessibilityRole="button"
                                            accessibilityLabel="Quitar fotografía del animal"
                                        >
                                            <Ionicons name="trash-outline" size={16} color={COLORS.rojoIntenso} />
                                            <Text style={styles.textoQuitarImagen}>Quitar</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.selectorImagen, errores['animal.imagen'] && styles.inputError]}
                                onPress={seleccionarFotografia}
                                disabled={seleccionandoImagen}
                                accessibilityRole="button"
                                accessibilityLabel="Seleccionar fotografía del animal"
                            >
                                {seleccionandoImagen ? (
                                    <ActivityIndicator color={COLORS.azulCeruleo} />
                                ) : (
                                    <>
                                        <View style={styles.iconoSelectorImagen}>
                                            <Ionicons name="camera-outline" size={24} color={COLORS.azulCeruleo} />
                                        </View>
                                        <View style={styles.textoSelectorImagen}>
                                            <Text style={styles.tituloSelectorImagen}>Seleccionar fotografía</Text>
                                            <Text style={styles.detalleSelectorImagen}>JPG, JPEG, PNG o WEBP · Máximo 3 MB</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={19} color="#64748b" />
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                        {errores['animal.imagen'] && <Text style={styles.errorText}>{errores['animal.imagen']}</Text>}
                        <View style={styles.avisoAlmacenamiento}>
                            <Ionicons name="cloud-upload-outline" size={16} color="#92400e" />
                            <Text style={styles.textoAvisoAlmacenamiento}>
                                La fotografia se subira de forma segura al guardar el lote y aparecera en la consulta del QR.
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.toggleFila}
                        onPress={() => actualizarCampo('animal', 'arete_faltante', !formData.animal.arete_faltante)}
                    >
                        <View style={[styles.checkbox, formData.animal.arete_faltante && styles.checkboxActivo]}>
                            {formData.animal.arete_faltante && <Ionicons name="checkmark" size={16} color={COLORS.blancoPuro} />}
                        </View>
                        <Text style={styles.toggleTexto}>Arete físico faltante en animal (Opcional)</Text>
                    </TouchableOpacity>
                </Seccion>

                <Seccion titulo="6. Lote de carne" subtitulo="Entrada al inventario" icono="cube">
                    <InputCampo
                        grupo="lote"
                        campo="codigo_lote"
                        label="Código de lote (Autogenerado)"
                        editable={false}
                        ayuda="Identificador asignado automáticamente."
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="lote"
                        campo="tipo_corte"
                        label="Tipo de corte *"
                        placeholder="Ej. Canal entera, Pulpa"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="lote"
                        campo="peso_kg"
                        label="Peso final en kg *"
                        placeholder="Ej. 125.50"
                        keyboardType="decimal-pad"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <FechaCampo
                        grupo="lote"
                        campo="fecha_ingreso"
                        label="Fecha de producción / ingreso *"
                        formData={formData}
                        errores={errores}
                        abrirCalendario={abrirCalendario}
                    />
                    <FechaCampo
                        grupo="lote"
                        campo="fecha_vencimiento"
                        label="Fecha preferente de consumo *"
                        formData={formData}
                        errores={errores}
                        abrirCalendario={abrirCalendario}
                    />
                    <OpcionesCampo
                        grupo="lote"
                        campo="estado"
                        label="Estado inicial del lote *"
                        opciones={ESTADOS_LOTE}
                        formData={formData}
                        actualizarCampo={actualizarCampo}
                    />
                </Seccion>

                <TouchableOpacity
                    style={[styles.botonPrincipal, loading && styles.botonDeshabilitado]}
                    onPress={registrarLoteAnimal}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={COLORS.blancoPuro} />
                    ) : (
                        <Text style={styles.textoBotonPrincipal}>Guardar lote y animal</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <CalendarioModal
                visible={Boolean(calendarioActivo)}
                value={calendarioActivo ? formData[calendarioActivo.grupo][calendarioActivo.campo] : ''}
                title={calendarioActivo?.titulo || 'Seleccionar fecha'}
                onSelect={seleccionarFecha}
                onClose={() => setCalendarioActivo(null)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: COLORS.blancoPuro },
    pantallaSelector: { flex: 1, backgroundColor: COLORS.blancoPuro, paddingHorizontal: 20, paddingTop: 20 },
    selectorGrid: { flexDirection: 'row', gap: 12, marginTop: 16 },
    tarjetaTipo: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, padding: 16, backgroundColor: COLORS.blancoPuro },
    iconoTipo: { width: 44, height: 44, borderRadius: SIZES.radioBoton, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    tipoTitulo: { fontSize: 15, fontWeight: FONTS.bold, color: '#0f172a' },
    tipoSubtitulo: { fontSize: 12, color: '#64748b', marginTop: 4 },
    subtitulo: { fontSize: 14, color: '#64748b', marginTop: 6 },
    contenedor: { flex: 1, backgroundColor: COLORS.blancoPuro, paddingHorizontal: 20, paddingTop: 15 },
    contenido: { paddingBottom: 40 },
    botonRegresarLink: { alignSelf: 'flex-start', minHeight: 44, marginVertical: 6, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
    textoRegresarLink: { color: COLORS.azulMarino, fontWeight: FONTS.bold, fontSize: 14 },
    titulo: { fontSize: SIZES.tituloPantalla, fontWeight: FONTS.bold, color: COLORS.azulMarino, marginTop: 10 },
    leyendaObligatorio: { fontSize: 13, color: COLORS.rojoIntenso, marginTop: 6, marginBottom: 18, fontStyle: 'italic', fontWeight: '500' },
    seccion: { backgroundColor: COLORS.blancoPuro, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, padding: 14, marginBottom: 14 },
    seccionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    iconoSeccion: { width: 36, height: 36, borderRadius: SIZES.radioBoton, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    seccionTexto: { flex: 1 },
    seccionTitulo: { fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, color: '#0f172a' },
    seccionSubtitulo: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    campo: { marginBottom: 12 },
    label: { color: '#334155', fontSize: 13, fontWeight: FONTS.bold, marginBottom: 6 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: SIZES.radioBoton, paddingHorizontal: 12, paddingVertical: 11, color: '#0f172a', fontSize: 15 },
    inputDeshabilitado: { backgroundColor: '#e2e8f0', color: '#64748b' },
    inputError: { borderColor: COLORS.rojoIntenso, backgroundColor: '#fff1f2' },
    inputFechaBoton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fechaBotonTexto: { color: '#0f172a', fontSize: 15 },
    fechaPlaceholder: { color: '#94a3b8' },
    textoAyuda: { color: '#64748b', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
    errorText: { color: COLORS.rojoIntenso, fontSize: 12, marginTop: 4 },
    especieBloqueada: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: SIZES.radioBoton, paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
    especieTexto: { color: '#334155', fontSize: 14, fontWeight: FONTS.bold },
    opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    opcion: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: COLORS.blancoPuro, borderRadius: SIZES.radioBoton, paddingVertical: 8, paddingHorizontal: 10 },
    opcionActiva: { borderColor: COLORS.azulMarino, backgroundColor: COLORS.azulCeruleo },
    opcionTexto: { color: '#475569', fontSize: 12, fontWeight: FONTS.bold },
    opcionTextoActiva: { color: COLORS.blancoPuro },
    toggleFila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: '#94a3b8', alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: COLORS.blancoPuro },
    checkboxActivo: { backgroundColor: COLORS.azulMarino, borderColor: COLORS.azulMarino },
    toggleTexto: { color: '#334155', fontSize: 14, fontWeight: '600' },
    campoImagen: { marginBottom: 14 },
    selectorImagen: { minHeight: 78, borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: SIZES.radioBoton, backgroundColor: '#f8fafc', padding: 12, flexDirection: 'row', alignItems: 'center' },
    iconoSelectorImagen: { width: 44, height: 44, borderRadius: SIZES.radioBoton, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
    textoSelectorImagen: { flex: 1, paddingRight: 8 },
    tituloSelectorImagen: { color: COLORS.azulMarino, fontSize: 14, fontWeight: FONTS.bold },
    detalleSelectorImagen: { color: '#64748b', fontSize: 11, lineHeight: 16, marginTop: 3 },
    imagenSeleccionadaFila: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: SIZES.radioBoton, backgroundColor: '#f8fafc', padding: 10, flexDirection: 'row', alignItems: 'center' },
    imagenPreview: { width: 92, height: 92, borderRadius: SIZES.radioBoton, backgroundColor: '#e2e8f0' },
    imagenInformacion: { flex: 1, minWidth: 0, marginLeft: 11 },
    imagenNombre: { color: '#0f172a', fontSize: 13, fontWeight: FONTS.bold },
    imagenDetalle: { color: '#64748b', fontSize: 11, marginTop: 2 },
    accionesImagen: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
    botonCambiarImagen: { minHeight: 38, paddingHorizontal: 10, borderRadius: SIZES.radioBoton, backgroundColor: '#e0f2fe', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
    textoCambiarImagen: { color: COLORS.azulMarino, fontSize: 12, fontWeight: FONTS.bold },
    botonQuitarImagen: { minHeight: 38, paddingHorizontal: 10, borderRadius: SIZES.radioBoton, backgroundColor: '#fff1f2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
    textoQuitarImagen: { color: COLORS.rojoIntenso, fontSize: 12, fontWeight: FONTS.bold },
    avisoAlmacenamiento: { marginTop: 8, padding: 9, borderRadius: SIZES.radioBoton, backgroundColor: '#fffbeb', flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    textoAvisoAlmacenamiento: { flex: 1, color: '#92400e', fontSize: 11, lineHeight: 16 },
    botonPrincipal: { backgroundColor: COLORS.azulCeruleo, paddingVertical: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 54, marginTop: 4, marginBottom: 20 },
    botonDeshabilitado: { backgroundColor: '#94a3b8' },
    textoBotonPrincipal: { color: COLORS.blancoPuro, fontSize: SIZES.textoBase, fontWeight: FONTS.bold }
});
