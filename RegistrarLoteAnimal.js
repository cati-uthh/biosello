import React, { useContext, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import CalendarioModal from './CalendarioModal';
import { AuthContext } from './AuthContext';

const API_BASE_URL = 'https://biosello-backend.vercel.app/api';

const TIPOS_LOTE = [
    { id: 'res', label: 'Res', especie: 'BOVINO', icono: 'nutrition', color: '#D32F2F', fondo: '#fff1f2' },
    { id: 'cerdo', label: 'Cerdo', especie: 'PORCINO', icono: 'restaurant', color: '#db2777', fondo: '#fdf2f8' }
];
const SEXOS = ['MACHO', 'HEMBRA'];
const CLASIFICACIONES_BOVINO = ['VAQUILLA', 'VACA', 'TORETE', 'TORO', 'BECERRO', 'BECERRA', 'BUEY'];
const CLASIFICACIONES_PORCINO = ['LECHON', 'CERDO_ENGORDA', 'MARRANA', 'SEMENTAL'];
const clasificacionesPorEspecie = (especie) => (especie === 'PORCINO' ? CLASIFICACIONES_PORCINO : CLASIFICACIONES_BOVINO);
const MOTIVOS = ['SACRIFICIO', 'ENGORDA', 'REPRODUCCION', 'EXPOSICION', 'VENTA'];
const ESTADOS_LOTE = ['activo', 'procesado', 'vendido', 'caducado'];

const crearFormInicial = (especie = 'BOVINO') => ({
    guía_tránsito: {
        folio_guía: '',
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
        clasificacion: especie === 'PORCINO' ? 'CERDO_ENGORDA' : 'VAQUILLA',
        meses_edad: '',
        arete_faltante: false
    },
    lote: {
        codigo_lote: '',
        tipo_corte: '',
        peso_kg: '',
        fecha_ingreso: '',
        fecha_vencimiento: '',
        estado: 'activo'
    }
});

const limpiarTexto = (valor) => String(valor || '').trim();
const fechaValida = (valor) => /^\d{4}-\d{2}-\d{2}$/.test(limpiarTexto(valor));
const númeroPositivo = (valor) => {
    const número = Number(valor);
    return Number.isFinite(número) && número > 0;
};

const nombreEspecie = (especie) => {
    if (especie === 'PORCINO') return 'Cerdo';
    if (especie === 'BOVINO') return 'Res';
    return especie || 'Sin especie';
};

const normalizarClave = (clave) => String(clave || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

const MAPA_DATOS_GUIA = {
    folio: ['guía_tránsito', 'folio_guía'],
    folio_guía: ['guía_tránsito', 'folio_guía'],
    guía: ['guía_tránsito', 'folio_guía'],
    num_reemo: ['guía_tránsito', 'num_reemo'],
    reemo: ['guía_tránsito', 'num_reemo'],
    motivo: ['guía_tránsito', 'motivo_movilizacion'],
    motivo_movilizacion: ['guía_tránsito', 'motivo_movilizacion'],
    fecha: ['guía_tránsito', 'fecha_expedicion'],
    fecha_expedicion: ['guía_tránsito', 'fecha_expedicion'],
    vigencia: ['guía_tránsito', 'vigencia_dias'],
    vigencia_dias: ['guía_tránsito', 'vigencia_dias'],
    centro: ['guía_tránsito', 'centro_expedidor'],
    centro_expedidor: ['guía_tránsito', 'centro_expedidor'],
    elaboro: ['guía_tránsito', 'elaboro'],
    upp_origen: ['origen', 'upp_origen'],
    localidad_origen: ['origen', 'localidad_origen'],
    municipio_origen: ['origen', 'municipio_origen'],
    entidad_origen: ['origen', 'entidad_federativa'],
    entidad_federativa_origen: ['origen', 'entidad_federativa'],
    propietario: ['propietario', 'nombre_propietario'],
    nombre_propietario: ['propietario', 'nombre_propietario'],
    curp: ['propietario', 'curp_propietario'],
    curp_propietario: ['propietario', 'curp_propietario'],
    upp_propietario: ['propietario', 'upp_propietario'],
    num_rastro: ['rastro', 'num_rastro'],
    rastro: ['rastro', 'nombre_rastro'],
    nombre_rastro: ['rastro', 'nombre_rastro'],
    destinatario: ['rastro', 'nombre_destinatario'],
    nombre_destinatario: ['rastro', 'nombre_destinatario'],
    municipio_rastro: ['rastro', 'municipio'],
    entidad_rastro: ['rastro', 'entidad_federativa'],
    arete: ['animal', 'num_arete'],
    num_arete: ['animal', 'num_arete'],
    sexo: ['animal', 'sexo'],
    clasificacion: ['animal', 'clasificacion'],
    edad: ['animal', 'meses_edad'],
    meses_edad: ['animal', 'meses_edad'],
    codigo_lote: ['lote', 'codigo_lote'],
    lote: ['lote', 'codigo_lote'],
    tipo_corte: ['lote', 'tipo_corte'],
    corte: ['lote', 'tipo_corte'],
    peso: ['lote', 'peso_kg'],
    peso_kg: ['lote', 'peso_kg'],
    fecha_ingreso: ['lote', 'fecha_ingreso'],
    fecha_vencimiento: ['lote', 'fecha_vencimiento']
};

const convertirDatosEscaneados = (datos) => {
    if (!datos || typeof datos !== 'object') return null;

    const grupos = ['guía_tránsito', 'origen', 'propietario', 'rastro', 'animal', 'lote'];
    if (grupos.some((grupo) => datos[grupo] && typeof datos[grupo] === 'object')) {
        return datos;
    }

    const resultado = {
        guía_tránsito: {},
        origen: {},
        propietario: {},
        rastro: {},
        animal: {},
        lote: {}
    };

    Object.entries(datos).forEach(([clave, valor]) => {
        const destino = MAPA_DATOS_GUIA[normalizarClave(clave)];
        if (!destino || valor === undefined || valor === null || String(valor).trim() === '') return;
        const [grupo, campo] = destino;
        resultado[grupo][campo] = String(valor).trim();
    });

    return grupos.some((grupo) => Object.keys(resultado[grupo]).length > 0) ? resultado : null;
};

const normalizarDatosEscaneados = (contenido) => {
    const textoPlano = String(contenido || '').trim();
    if (!textoPlano) return null;

    try {
        return convertirDatosEscaneados(JSON.parse(textoPlano));
    } catch (error) {
        // El codigo puede venir como URL, query string o texto plano.
    }

    const datos = {};
    try {
        if (/^https?:\/\//i.test(textoPlano)) {
            const url = new URL(textoPlano);
            url.searchParams.forEach((valor, clave) => {
                datos[clave] = valor;
            });
        }
    } catch (error) {
        // Si no es URL valida, se intenta como texto delimitado.
    }

    if (Object.keys(datos).length === 0 && textoPlano.includes('=')) {
        const query = textoPlano.startsWith('?') ? textoPlano.slice(1) : textoPlano;
        new URLSearchParams(query).forEach((valor, clave) => {
            datos[clave] = valor;
        });
    }

    if (Object.keys(datos).length === 0) {
        textoPlano.split(/\r?\n|;/).forEach((linea) => {
            const separador = linea.includes(':') ? ':' : '=';
            const indice = linea.indexOf(separador);
            if (indice <= 0) return;
            datos[linea.slice(0, indice).trim()] = linea.slice(indice + 1).trim();
        });
    }

    return convertirDatosEscaneados(datos);
};

// ---------------------------------------------------------------------------
// IMPORTANTE: InputCampo, FechaCampo, OpcionesCampo y Seccion viven FUERA del
// componente RegistrarLoteAnimal. Antes InputCampo se definia dentro del
// componente (envuelto en useRef), lo que provocaba que React lo tratara
// como un tipo de componente distinto en cada render del padre, desmontando
// y remontando el TextInput en cada tecla -> el teclado se cerraba tras
// escribir un solo caracter. Al declararlo aqui afuera, su identidad se
// mantiene estable entre renders y el foco del input ya no se pierde.
// ---------------------------------------------------------------------------

const InputCampo = ({
    grupo,
    campo,
    label,
    placeholder,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    maxLength,
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
                style={[styles.input, error && styles.inputError]}
                placeholder={placeholder}
                placeholderTextColor="#94a3b8"
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                maxLength={maxLength}
                value={valor}
                onChangeText={(text) => actualizarCampo(grupo, campo, text)}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const FechaCampo = ({ grupo, campo, label, formData, errores, abrirCalendario }) => {
    const error = errores[`${grupo}.${campo}`];
    return (
        <View style={styles.campo}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={[styles.input, styles.inputFechaBoton, error && styles.inputError]}
                onPress={() => abrirCalendario(grupo, campo, label)}
            >
                <Text style={[styles.fechaBotonTexto, !formData[grupo][campo] && styles.fechaPlaceholder]}>
                    {formData[grupo][campo] || 'Seleccionar fecha'}
                </Text>
                <Ionicons name="calendar" size={18} color="#002855" />
            </TouchableOpacity>
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

export default function RegistrarLoteAnimal({ onVolver }) {
    const { usuario } = useContext(AuthContext);
    const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
    const [formData, setFormData] = useState(() => crearFormInicial());
    const [errores, setErrores] = useState({});
    const [loading, setLoading] = useState(false);
    const [escanerVisible, setEscanerVisible] = useState(false);
    const [scanBloqueado, setScanBloqueado] = useState(false);
    const [calendarioActivo, setCalendarioActivo] = useState(null);

    const actualizarCampo = (grupo, campo, valor) => {
        setFormData((prev) => ({
            ...prev,
            [grupo]: {
                ...prev[grupo],
                [campo]: valor
            }
        }));
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
        actualizarCampo(calendarioActivo.grupo, calendarioActivo.campo, fecha);
        setCalendarioActivo(null);
    };

    const aplicarDatosGuía = (datosGuía = {}) => {
        setFormData((prev) => ({
            ...prev,
            guía_tránsito: { ...prev.guía_tránsito, ...(datosGuía.guía_tránsito || {}) },
            origen: { ...prev.origen, ...(datosGuía.origen || {}) },
            propietario: { ...prev.propietario, ...(datosGuía.propietario || {}) },
            rastro: { ...prev.rastro, ...(datosGuía.rastro || {}) },
            animal: {
                ...prev.animal,
                ...(datosGuía.animal || {}),
                especie: tipoSeleccionado?.especie || prev.animal.especie
            },
            lote: { ...prev.lote, ...(datosGuía.lote || {}) }
        }));
    };

    const cerrarEscanerGuía = () => {
        setEscanerVisible(false);
        setScanBloqueado(false);
    };

    const escanearGuíaTransito = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a la camara para escanear la guía.');
            return;
        }

        setScanBloqueado(false);
        setEscanerVisible(true);
    };

    const procesarCodigoGuía = ({ data }) => {
        if (scanBloqueado) return;
        setScanBloqueado(true);

        const datosDetectados = normalizarDatosEscaneados(data);

        if (!datosDetectados) {
            Alert.alert(
                'Guía no reconocida',
                'El codigo fue leido, pero no tiene datos compatibles para autocompletar el formulario.',
                [
                    { text: 'Escanear de nuevo', onPress: () => setScanBloqueado(false) },
                    { text: 'Cerrar', onPress: cerrarEscanerGuía }
                ]
            );
            return;
        }

        aplicarDatosGuía(datosDetectados);
        cerrarEscanerGuía();
        Alert.alert('Guía leida', 'Se autocompletaron los campos encontrados en el codigo.');
    };

    const validarCampos = () => {
        const nuevosErrores = {};
        const requerido = (grupo, campo, mensaje) => {
            if (!limpiarTexto(formData[grupo][campo])) {
                nuevosErrores[`${grupo}.${campo}`] = mensaje;
            }
        };

        requerido('guía_tránsito', 'folio_guía', 'El folio de guía es obligatorio.');
        requerido('guía_tránsito', 'fecha_expedicion', 'La fecha de expedicion es obligatoria.');
        requerido('guía_tránsito', 'centro_expedidor', 'El centro expedidor es obligatorio.');
        requerido('origen', 'upp_origen', 'La UPP de origen es obligatoria.');
        requerido('origen', 'localidad_origen', 'La localidad de origen es obligatoria.');
        requerido('origen', 'municipio_origen', 'El municipio de origen es obligatorio.');
        requerido('origen', 'entidad_federativa', 'La entidad federativa es obligatoria.');
        requerido('propietario', 'nombre_propietario', 'El propietario es obligatorio.');
        requerido('propietario', 'curp_propietario', 'La CURP del propietario es obligatoria.');
        requerido('propietario', 'upp_propietario', 'La UPP del propietario es obligatoria.');
        requerido('rastro', 'num_rastro', 'El número de rastro es obligatorio.');
        requerido('rastro', 'nombre_rastro', 'El nombre del rastro es obligatorio.');
        requerido('rastro', 'nombre_destinatario', 'El destinatario es obligatorio.');
        requerido('rastro', 'municipio', 'El municipio del rastro es obligatorio.');
        requerido('rastro', 'entidad_federativa', 'La entidad federativa del rastro es obligatoria.');
        requerido('animal', 'num_arete', 'El número de arete es obligatorio.');
        requerido('animal', 'meses_edad', 'La edad en meses es obligatoria.');
        requerido('lote', 'codigo_lote', 'El codigo de lote es obligatorio.');
        requerido('lote', 'tipo_corte', 'El tipo de corte es obligatorio.');
        requerido('lote', 'peso_kg', 'El peso es obligatorio.');
        requerido('lote', 'fecha_ingreso', 'La fecha de ingreso es obligatoria.');
        requerido('lote', 'fecha_vencimiento', 'La fecha de vencimiento es obligatoria.');

        if (formData.propietario.curp_propietario && limpiarTexto(formData.propietario.curp_propietario).length !== 18) {
            nuevosErrores['propietario.curp_propietario'] = 'La CURP debe tener 18 caracteres.';
        }

        if (formData.guía_tránsito.fecha_expedicion && !fechaValida(formData.guía_tránsito.fecha_expedicion)) {
            nuevosErrores['guía_tránsito.fecha_expedicion'] = 'Usa el formato AAAA-MM-DD.';
        }

        if (formData.lote.fecha_ingreso && !fechaValida(formData.lote.fecha_ingreso)) {
            nuevosErrores['lote.fecha_ingreso'] = 'Usa el formato AAAA-MM-DD.';
        }

        if (formData.lote.fecha_vencimiento && !fechaValida(formData.lote.fecha_vencimiento)) {
            nuevosErrores['lote.fecha_vencimiento'] = 'Usa el formato AAAA-MM-DD.';
        }

        if (formData.guía_tránsito.vigencia_dias && !númeroPositivo(formData.guía_tránsito.vigencia_dias)) {
            nuevosErrores['guía_tránsito.vigencia_dias'] = 'La vigencia debe ser mayor a 0.';
        }

        if (formData.animal.meses_edad && !Number.isInteger(Number(formData.animal.meses_edad))) {
            nuevosErrores['animal.meses_edad'] = 'La edad debe ser un número entero.';
        }

        if (formData.lote.peso_kg && !númeroPositivo(formData.lote.peso_kg)) {
            nuevosErrores['lote.peso_kg'] = 'El peso debe ser mayor a 0.';
        }

        if (
            fechaValida(formData.lote.fecha_ingreso)
            && fechaValida(formData.lote.fecha_vencimiento)
            && new Date(formData.lote.fecha_vencimiento) < new Date(formData.lote.fecha_ingreso)
        ) {
            nuevosErrores['lote.fecha_vencimiento'] = 'El vencimiento no puede ser anterior al ingreso.';
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const construirPayload = () => ({
        guía_tránsito: {
            folio_guía: limpiarTexto(formData.guía_tránsito.folio_guía),
            num_reemo: limpiarTexto(formData.guía_tránsito.num_reemo) || null,
            motivo_movilizacion: formData.guía_tránsito.motivo_movilizacion,
            fecha_expedicion: limpiarTexto(formData.guía_tránsito.fecha_expedicion),
            vigencia_dias: Number(formData.guía_tránsito.vigencia_dias),
            centro_expedidor: limpiarTexto(formData.guía_tránsito.centro_expedidor),
            elaboro: limpiarTexto(formData.guía_tránsito.elaboro) || null
        },
        origen: {
            upp_origen: limpiarTexto(formData.origen.upp_origen),
            localidad_origen: limpiarTexto(formData.origen.localidad_origen),
            municipio_origen: limpiarTexto(formData.origen.municipio_origen),
            entidad_federativa: limpiarTexto(formData.origen.entidad_federativa)
        },
        propietario: {
            nombre_propietario: limpiarTexto(formData.propietario.nombre_propietario),
            curp_propietario: limpiarTexto(formData.propietario.curp_propietario).toUpperCase(),
            upp_propietario: limpiarTexto(formData.propietario.upp_propietario)
        },
        rastro: {
            num_rastro: limpiarTexto(formData.rastro.num_rastro),
            nombre_rastro: limpiarTexto(formData.rastro.nombre_rastro),
            nombre_destinatario: limpiarTexto(formData.rastro.nombre_destinatario),
            municipio: limpiarTexto(formData.rastro.municipio),
            entidad_federativa: limpiarTexto(formData.rastro.entidad_federativa)
        },
        animal: {
            num_arete: limpiarTexto(formData.animal.num_arete),
            especie: formData.animal.especie,
            sexo: formData.animal.sexo,
            clasificacion: formData.animal.clasificacion,
            meses_edad: Number(formData.animal.meses_edad),
            arete_faltante: formData.animal.arete_faltante ? 1 : 0
        },
        lote: {
            codigo_lote: limpiarTexto(formData.lote.codigo_lote),
            tipo_corte: limpiarTexto(formData.lote.tipo_corte),
            peso_kg: Number(formData.lote.peso_kg),
            fecha_ingreso: limpiarTexto(formData.lote.fecha_ingreso),
            fecha_vencimiento: limpiarTexto(formData.lote.fecha_vencimiento),
            estado: formData.lote.estado,
            id_negocio: usuario?.id_negocio || usuario?.negocio?.id_negocio || null,
            id_empleado: usuario?.id_usuario || usuario?.id || null
        }
    });

    const registrarLoteAnimal = async () => {
        if (!validarCampos()) {
            Alert.alert('Revisa el formulario', 'Hay campos obligatorios o formatos pendientes.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/registrar-lote-animal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(construirPayload())
            });

            const textResult = await response.text();
            let result = {};

            try {
                result = textResult ? JSON.parse(textResult) : {};
            } catch (error) {
                throw new Error(`Respuesta no valida del servidor: ${textResult.substring(0, 120)}`);
            }

            if (!response.ok || result.success === false) {
                Alert.alert('Error', result.error || `No se pudo guardar el registro (${response.status}).`);
                return;
            }

            Alert.alert('Registro guardado', 'El lote, animal y guía quedaron registrados correctamente.', [
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
            Alert.alert('Error de conexion', `No se pudo conectar con el servidor. ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!tipoSeleccionado) {
        return (
            <View style={styles.pantallaSelector}>
                <TouchableOpacity style={styles.botonRegresarLink} onPress={onVolver}>
                    <Text style={styles.textoRegresarLink}>Volver al Panel Principal</Text>
                </TouchableOpacity>

                <Text style={styles.titulo}>Registrar Lote / Animal</Text>
                <Text style={styles.subtitulo}>Que tipo de lote deseas registrar?</Text>

                <View style={styles.selectorGrid}>
                    {TIPOS_LOTE.map((tipo) => (
                        <TouchableOpacity
                            key={tipo.id}
                            style={styles.tarjetaTipo}
                            onPress={() => seleccionarTipoLote(tipo)}
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

    return (
        <View style={styles.pantalla}>
            <ScrollView
                style={styles.contenedor}
                contentContainerStyle={styles.contenido}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity style={styles.botonRegresarLink} onPress={onVolver}>
                    <Text style={styles.textoRegresarLink}>Volver al Panel Principal</Text>
                </TouchableOpacity>

                <Text style={styles.titulo}>Registrar Lote de {tipoSeleccionado.label}</Text>
                <Text style={styles.subtitulo}>
                    Captura basada en la Guía de Transito del Animal. La especie se asigna automáticamente como {tipoSeleccionado.especie}.
                </Text>

                <Seccion
                    titulo="Guía de tránsito"
                    subtitulo="Documento oficial de movilizacion"
                    icono="document-text"
                >
                    <TouchableOpacity style={styles.botonEscanear} onPress={escanearGuíaTransito}>
                        <Ionicons name="scan" size={18} color="#ffffff" />
                        <Text style={styles.textoBotonEscanear}>Escanear guía de tránsito</Text>
                    </TouchableOpacity>
                    <InputCampo
                        grupo="guía_tránsito"
                        campo="folio_guía"
                        label="Folio de guía"
                        placeholder="Ej. 55627"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="guía_tránsito"
                        campo="num_reemo"
                        label="Numero REEMO"
                        placeholder="Ej. 214970"
                        keyboardType="numeric"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <OpcionesCampo
                        grupo="guía_tránsito"
                        campo="motivo_movilizacion"
                        label="Motivo de movilizacion"
                        opciones={MOTIVOS}
                        formData={formData}
                        actualizarCampo={actualizarCampo}
                    />
                    <FechaCampo
                        grupo="guía_tránsito"
                        campo="fecha_expedicion"
                        label="Fecha de expedición"
                        formData={formData}
                        errores={errores}
                        abrirCalendario={abrirCalendario}
                    />
                    <InputCampo
                        grupo="guía_tránsito"
                        campo="vigencia_dias"
                        label="Vigencia en dias"
                        placeholder="3"
                        keyboardType="numeric"
                        maxLength={3}
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="guía_tránsito"
                        campo="centro_expedidor"
                        label="Centro expedidor"
                        placeholder="Ej. AGL HUEJUTLA DE REYES"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="guía_tránsito"
                        campo="elaboro"
                        label="Elaboro"
                        placeholder="Nombre de quien elaboro"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                </Seccion>

                <Seccion
                    titulo="Origen"
                    subtitulo="Predio o rancho del animal"
                    icono="location"
                >
                    <InputCampo
                        grupo="origen"
                        campo="upp_origen"
                        label="UPP origen"
                        placeholder="Ej. 130285311002"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="origen"
                        campo="localidad_origen"
                        label="Localidad origen"
                        placeholder="Ej. Chalahuiyapa"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="origen"
                        campo="municipio_origen"
                        label="Municipio origen"
                        placeholder="Ej. Huejutla de Reyes"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="origen"
                        campo="entidad_federativa"
                        label="Entidad federativa"
                        placeholder="Ej. Hidalgo"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                </Seccion>

                <Seccion
                    titulo="Propietario"
                    subtitulo="Dueno legal en origen"
                    icono="person"
                >
                    <InputCampo
                        grupo="propietario"
                        campo="nombre_propietario"
                        label="Nombre propietario"
                        placeholder="Nombre completo"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="propietario"
                        campo="curp_propietario"
                        label="CURP propietario"
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
                        label="UPP propietario"
                        placeholder="Ej. 130285311002"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                </Seccion>

                <Seccion
                    titulo="Destino / rastro"
                    subtitulo="Instalacion de sacrificio"
                    icono="business"
                >
                    <InputCampo
                        grupo="rastro"
                        campo="num_rastro"
                        label="Numero de rastro"
                        placeholder="Ej. 2151"
                        keyboardType="numeric"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="rastro"
                        campo="nombre_rastro"
                        label="Nombre del rastro"
                        placeholder="Ej. RASTRO MUNICIPAL"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="rastro"
                        campo="nombre_destinatario"
                        label="Destinatario"
                        placeholder="Nombre completo"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="rastro"
                        campo="municipio"
                        label="Municipio"
                        placeholder="Ej. Huejutla de Reyes"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="rastro"
                        campo="entidad_federativa"
                        label="Entidad federativa"
                        placeholder="Ej. Hidalgo"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                </Seccion>

                <Seccion
                    titulo="Animal"
                    subtitulo="Identificacion y clasificacion"
                    icono="paw"
                >
                    <InputCampo
                        grupo="animal"
                        campo="num_arete"
                        label="Numero de arete"
                        placeholder="Ej. 1301226566"
                        keyboardType="numeric"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <View style={styles.campo}>
                        <Text style={styles.label}>Especie</Text>
                        <View style={styles.especieBloqueada}>
                            <Ionicons name="lock-closed" size={16} color="#475569" />
                            <Text style={styles.especieTexto}>{nombreEspecie(formData.animal.especie)} ({formData.animal.especie})</Text>
                        </View>
                    </View>
                    <OpcionesCampo
                        grupo="animal"
                        campo="sexo"
                        label="Sexo"
                        opciones={SEXOS}
                        formData={formData}
                        actualizarCampo={actualizarCampo}
                    />
                    <OpcionesCampo
                        grupo="animal"
                        campo="clasificacion"
                        label="Clasificación"
                        opciones={clasificacionesPorEspecie(formData.animal.especie)}
                        formData={formData}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="animal"
                        campo="meses_edad"
                        label="Edad en meses"
                        placeholder="Ej. 18"
                        keyboardType="numeric"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <TouchableOpacity
                        style={styles.toggleFila}
                        onPress={() => actualizarCampo('animal', 'arete_faltante', !formData.animal.arete_faltante)}
                    >
                        <View style={[styles.checkbox, formData.animal.arete_faltante && styles.checkboxActivo]}>
                            {formData.animal.arete_faltante && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                        </View>
                        <Text style={styles.toggleTexto}>Arete faltante</Text>
                    </TouchableOpacity>
                </Seccion>

                <Seccion
                    titulo="Lote de carne"
                    subtitulo="Entrada nueva al inventario"
                    icono="cube"
                >
                    <InputCampo
                        grupo="lote"
                        campo="codigo_lote"
                        label="Codigo de lote"
                        placeholder="Ej. LOT-2026-0001"
                        autoCapitalize="characters"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="lote"
                        campo="tipo_corte"
                        label="Tipo de corte"
                        placeholder="Ej. Canal, res molida, bistec"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <InputCampo
                        grupo="lote"
                        campo="peso_kg"
                        label="Peso kg"
                        placeholder="Ej. 125.50"
                        keyboardType="decimal-pad"
                        formData={formData}
                        errores={errores}
                        actualizarCampo={actualizarCampo}
                    />
                    <FechaCampo
                        grupo="lote"
                        campo="fecha_ingreso"
                        label="Fecha de producción"
                        formData={formData}
                        errores={errores}
                        abrirCalendario={abrirCalendario}
                    />
                    <FechaCampo
                        grupo="lote"
                        campo="fecha_vencimiento"
                        label="Fecha preferente de consumo"
                        formData={formData}
                        errores={errores}
                        abrirCalendario={abrirCalendario}
                    />
                    <OpcionesCampo
                        grupo="lote"
                        campo="estado"
                        label="Estado"
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
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={styles.textoBotonPrincipal}>Guardar lote y animal</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={escanerVisible} animationType="slide" onRequestClose={cerrarEscanerGuía}>
                <View style={styles.escanerPantalla}>
                    <View style={styles.escanerHeader}>
                        <Text style={styles.escanerTitulo}>Escanear guía de tránsito</Text>
                        <TouchableOpacity style={styles.escanerCerrar} onPress={cerrarEscanerGuía}>
                            <Ionicons name="close" size={22} color="#002855" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.escanerMarco}>
                        <CameraView
                            style={styles.escanerCamara}
                            onBarcodeScanned={scanBloqueado ? undefined : procesarCodigoGuía}
                            barcodeScannerSettings={{
                                barcodeTypes: ['qr', 'pdf417', 'code128', 'code39', 'ean13']
                            }}
                        />
                    </View>

                    <Text style={styles.escanerAyuda}>
                        Coloca el QR o codigo de la guía dentro del recuadro. Si la guía solo viene impresa sin codigo, captura los datos manualmente.
                    </Text>

                    {scanBloqueado && (
                        <TouchableOpacity style={styles.botonReintentarScan} onPress={() => setScanBloqueado(false)}>
                            <Text style={styles.textoReintentarScan}>Escanear de nuevo</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Modal>
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
    pantalla: {
        flex: 1,
        backgroundColor: '#ffffff'
    },
    pantallaSelector: {
        flex: 1,
        backgroundColor: '#ffffff',
        paddingHorizontal: 20,
        paddingTop: 20
    },
    selectorGrid: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16
    },
    tarjetaTipo: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 16,
        backgroundColor: '#ffffff'
    },
    iconoTipo: {
        width: 44,
        height: 44,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12
    },
    tipoTitulo: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#0f172a'
    },
    tipoSubtitulo: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 4
    },
    contenedor: {
        flex: 1,
        backgroundColor: '#ffffff',
        paddingHorizontal: 20,
        paddingTop: 15
    },
    contenido: {
        paddingBottom: 40
    },
    botonRegresarLink: {
        marginVertical: 10
    },
    textoRegresarLink: {
        color: '#002855',
        fontWeight: 'bold',
        fontSize: 14
    },
    titulo: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#002855',
        marginTop: 10
    },
    subtitulo: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 4,
        marginBottom: 18,
        lineHeight: 19
    },
    seccion: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 14,
        marginBottom: 14
    },
    seccionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    iconoSeccion: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10
    },
    seccionTexto: {
        flex: 1
    },
    seccionTitulo: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a'
    },
    seccionSubtitulo: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2
    },
    campo: {
        marginBottom: 12
    },
    label: {
        color: '#334155',
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 6
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 11,
        color: '#0f172a',
        fontSize: 15
    },
    inputError: {
        borderColor: '#D32F2F',
        backgroundColor: '#fff1f2'
    },
    inputFechaBoton: {
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    fechaBotonTexto: {
        color: '#0f172a',
        fontSize: 15
    },
    fechaPlaceholder: {
        color: '#94a3b8'
    },
    botonEscanear: {
        backgroundColor: '#002855',
        borderRadius: 8,
        paddingVertical: 11,
        paddingHorizontal: 12,
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    textoBotonEscanear: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold'
    },
    escanerPantalla: {
        flex: 1,
        backgroundColor: '#ffffff',
        paddingHorizontal: 20,
        paddingTop: 24
    },
    escanerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18
    },
    escanerTitulo: {
        color: '#002855',
        fontSize: 20,
        fontWeight: 'bold'
    },
    escanerCerrar: {
        width: 40,
        height: 40,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center'
    },
    escanerMarco: {
        height: 320,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#0f172a'
    },
    escanerCamara: {
        flex: 1
    },
    escanerAyuda: {
        color: '#475569',
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        marginTop: 18
    },
    botonReintentarScan: {
        backgroundColor: '#002855',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 16
    },
    textoReintentarScan: {
        color: '#ffffff',
        fontWeight: 'bold'
    },
    especieBloqueada: {
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    especieTexto: {
        color: '#334155',
        fontSize: 14,
        fontWeight: 'bold'
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 12,
        marginTop: 4
    },
    opciones: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    opcion: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        backgroundColor: '#ffffff',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10
    },
    opcionActiva: {
        borderColor: '#002855',
        backgroundColor: '#002855'
    },
    opcionTexto: {
        color: '#475569',
        fontSize: 12,
        fontWeight: 'bold'
    },
    opcionTextoActiva: {
        color: '#ffffff'
    },
    toggleFila: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#94a3b8',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        backgroundColor: '#ffffff'
    },
    checkboxActivo: {
        backgroundColor: '#002855',
        borderColor: '#002855'
    },
    toggleTexto: {
        color: '#334155',
        fontSize: 14,
        fontWeight: '600'
    },
    botonPrincipal: {
        backgroundColor: '#D32F2F',
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 54,
        marginTop: 4,
        marginBottom: 20
    },
    botonDeshabilitado: {
        backgroundColor: '#94a3b8'
    },
    textoBotonPrincipal: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold'
    }
});