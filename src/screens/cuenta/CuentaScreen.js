import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { API_BASE_URL } from '../../config/api';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, SIZES, FONTS } from '../../theme/theme';
import { getAuthHeaders, obtenerBiometriaCuenta, eliminarBiometriaCuenta } from '../../utils/auth';

const normalizarIdentificador = (valor) => String(valor || '').trim().toLowerCase();

export default function CuentaScreen({ navigation }) {
  const { sesionActiva, sesionCargando, usuario, setUsuario, cerrarSesion: cerrarSesionAuth } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [perfil, setPerfil] = useState(null);
  
  // Estado para la opción de Biometría en Perfil
  const [biometriaHabilitada, setBiometriaHabilitada] = useState(false);
  const [dispositivoSoportaBiometria, setDispositivoSoportaBiometria] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    email: '', 
    telefono: '',
    nombre_negocio: '',
    municipio: '',
    direccion: '',
    rfc: '',
    perfil: ''
  });

  const idUsuario = usuario?.id_usuario || usuario?.id;

  useEffect(() => {
    if (sesionCargando) return;
    cargarPerfil();
    comprobarConfiguracionBiometrica();
  }, [idUsuario, sesionCargando]);

  const comprobarConfiguracionBiometrica = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const registrado = await LocalAuthentication.isEnrolledAsync();
      const esCompatible = compatible && registrado;
      setDispositivoSoportaBiometria(esCompatible);

      if (esCompatible) {
        const cuentaGuardada = await obtenerBiometriaCuenta();
        const identificadoresSesion = [usuario?.email, usuario?.correo, usuario?.telefono]
          .map(normalizarIdentificador)
          .filter(Boolean);
        const estaActiva = Boolean(cuentaGuardada && identificadoresSesion.includes(normalizarIdentificador(cuentaGuardada.identificador)));
        setBiometriaHabilitada(estaActiva);
      } else {
        setBiometriaHabilitada(false);
      }
    } catch (e) {
      setDispositivoSoportaBiometria(false);
      setBiometriaHabilitada(false);
    }
  };

  const alternarBiometria = async (valor) => {
    if (valor) {
      const cuentaGuardada = await obtenerBiometriaCuenta();
      const identificadoresSesion = [usuario?.email, usuario?.correo, usuario?.telefono]
        .map(normalizarIdentificador)
        .filter(Boolean);

      if (!cuentaGuardada || !identificadoresSesion.includes(normalizarIdentificador(cuentaGuardada.identificador))) {
        await eliminarBiometriaCuenta();
        setBiometriaHabilitada(false);
        Alert.alert(
          'Vinculación requerida',
          'Por seguridad, cierra sesión e inicia nuevamente con tu contraseña. Al ingresar se te preguntará si deseas vincular la huella digital a esta cuenta.'
        );
        return;
      }

      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirma tu huella digital',
        fallbackLabel: 'Cancelar'
      });

      if (auth.success) {
        setBiometriaHabilitada(true);
        Alert.alert('Huella Activada', 'Ahora podrás ingresar rápidamente desde la pantalla de inicio de sesión.');
      }
    } else {
      await eliminarBiometriaCuenta();
      setBiometriaHabilitada(false);
      Alert.alert('Huella Desactivada', 'Se ha retirado la opción de acceso por huella para tu cuenta.');
    }
  };

  const cargarPerfil = async () => {
    if (!idUsuario) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/perfil?id_usuario=${idUsuario}`, {
        headers: getAuthHeaders(usuario)
      });
      const result = await response.json();

      if (!response.ok || result.success === false) {
        Alert.alert('No se pudo cargar la cuenta', result.error || 'Intenta de nuevo más tarde.');
        return;
      }

      const data = result.data || {};
      setPerfil(data);
      setForm({
        nombre: data.nombre || '',
        email: data.email || '',
        telefono: data.telefono || '',
        nombre_negocio: data.nombre_negocio || '',
        municipio: data.municipio || '',
        direccion: data.direccion || '',
        rfc: data.rfc || '',
        perfil: data.perfil || ''
      });
    } catch (error) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const actualizar = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const validarFormulario = () => {
    if (!form.nombre.trim()) return "El nombre es un campo obligatorio.";
    if (!form.email.trim()) return "El correo electrónico es obligatorio.";
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return "Ingresa un formato de correo electrónico válido.";
    
    if (form.telefono && form.telefono.trim().length < 10) {
      return "El número de teléfono debe tener al menos 10 dígitos.";
    }

    if (form.rfc && (form.rfc.trim().length < 12 || form.rfc.trim().length > 13)) {
      return "El RFC debe tener entre 12 y 13 caracteres.";
    }

    return null;
  };

  const guardarCambios = async () => {
    if (!idUsuario) return;

    const errorValidacion = validarFormulario();
    if (errorValidacion) {
      Alert.alert('Revisa tus datos', errorValidacion);
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        id_usuario: idUsuario,
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        nombre_negocio: form.nombre_negocio.trim(),
        municipio: form.municipio.trim(),
        direccion: form.direccion.trim(),
        rfc: form.rfc.trim().toUpperCase()
      };

      const response = await fetch(`${API_BASE_URL}/perfil`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(usuario) },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok || result.success === false) {
        Alert.alert('No se pudo guardar', result.error || 'Revisa los datos e intenta de nuevo.');
        return;
      }

      const data = result.data || {};
      setPerfil(data);
      setUsuario({ ...usuario, ...data, id: data.id_usuario, id_usuario: data.id_usuario });
      Alert.alert('Cuenta actualizada', 'Tus datos se guardaron correctamente.');
    } catch (error) {
      Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  const cerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        onPress: async () => {
          await eliminarBiometriaCuenta();
          cerrarSesionAuth();
        }
      }
    ]);
  };

  const renderCampo = ({ label, campo, keyboardType = 'default', editable = true }) => (
    <View style={styles.campo} key={campo}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputBloqueado]}
        value={String(form[campo] ?? '')}
        onChangeText={(valor) => actualizar(campo, valor)}
        keyboardType={keyboardType}
        editable={editable}
        placeholderTextColor="#94a3b8"
      />
    </View>
  );

  if (sesionCargando || loading) {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator size="large" color={COLORS.azulMarino} />
        <Text style={styles.estadoTexto}>Cargando cuenta...</Text>
      </View>
    );
  }

  if (!sesionActiva || !idUsuario) {
    return (
      <View style={styles.sesionVacia}>
        <View style={styles.sesionIcono}>
          <Ionicons name="person-circle-outline" size={80} color={COLORS.azulMarino} />
        </View>
        <Text style={styles.sesionTitulo}>Tu cuenta aún no está activa</Text>
        <Text style={styles.sesionTexto}>
          Para ver o editar tu perfil, necesitas registrar tu negocio o iniciar sesión con una cuenta existente.
        </Text>

        <TouchableOpacity style={styles.botonRegistro} onPress={() => navigation.navigate('actRegistroNegocio')}>
          <Ionicons name="business-outline" size={20} color={COLORS.blancoPuro} />
          <Text style={styles.textoBotonRegistro}>Registrar mi negocio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botonLogin} onPress={() => navigation.navigate('actInicioSesion')}>
          <Ionicons name="log-in-outline" size={22} color={COLORS.azulMarino} />
          <Text style={styles.textoBotonLogin}>Iniciar sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botonInicio} onPress={() => navigation.navigate('Inicio')}>
          <Text style={styles.textoBotonInicio}>Volver a inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color={COLORS.blancoPuro} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>{perfil?.nombre || 'Mi cuenta'}</Text>
          <Text style={styles.subtitulo}>{perfil?.perfil || 'usuario'} · {perfil?.estatus_verificacion || 'sin negocio'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Datos de Usuario</Text>
        {renderCampo({ label: 'Nombre completo', campo: 'nombre' })}
        {renderCampo({ label: 'Correo electrónico', campo: 'email', keyboardType: 'email-address', editable: false })}
        {renderCampo({ label: 'Teléfono', campo: 'telefono', keyboardType: 'phone-pad' })}
        {renderCampo({ label: 'Perfil de acceso', campo: 'perfil', editable: false })}
      </View>

      {/* SECCIÓN SEGURIDAD: CONTROL DE BIOMETRÍA */}
      {dispositivoSoportaBiometria && (
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Seguridad y Acceso</Text>
          <View style={styles.filaFilaSwitch}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.labelSwitch}>Acceso por Huella Digital / Rostro</Text>
              <Text style={styles.subtextoSwitch}>
                Permite iniciar sesión rápidamente sin escribir la contraseña.
              </Text>
            </View>
            <Switch
              value={biometriaHabilitada}
              onValueChange={alternarBiometria}
              trackColor={{ false: '#cbd5e1', true: COLORS.azulCeruleo }}
              thumbColor={biometriaHabilitada ? COLORS.azulMarino : '#f4f3f4'}
            />
          </View>
        </View>
      )}


      <TouchableOpacity style={[styles.botonGuardar, guardando && styles.botonDeshabilitado]} onPress={guardarCambios} disabled={guardando}>
        {guardando ? <ActivityIndicator color={COLORS.blancoPuro} /> : <Text style={styles.textoGuardar}>Guardar cambios</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.botonSalir} onPress={cerrarSesion}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.rojoIntenso} />
        <Text style={styles.textoSalir}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: COLORS.blancoPuro, paddingHorizontal: 20, paddingTop: 18 },
    contenido: { paddingBottom: 40 },
    cargando: { flex: 1, backgroundColor: COLORS.blancoPuro, alignItems: 'center', justifyContent: 'center' },
    estadoTexto: { color: '#64748b', marginTop: 12, fontSize: 15, fontWeight: '500' },
    
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatar: { width: 56, height: 56, borderRadius: SIZES.radioTarjeta, backgroundColor: COLORS.azulMarino, alignItems: 'center', justifyContent: 'center', marginRight: 15, elevation: 2 },
    titulo: { color: COLORS.azulMarino, fontSize: SIZES.tituloPantalla, fontWeight: FONTS.bold },
    subtitulo: { color: '#64748b', fontSize: 13, marginTop: 4, textTransform: 'capitalize' },
    
    card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, padding: 18, marginBottom: 16, backgroundColor: COLORS.blancoPuro, elevation: 1 },
    cardTitulo: { color: '#0f172a', fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8 },
    
    campo: { marginBottom: 14 },
    label: { color: '#475569', fontSize: 12, fontWeight: FONTS.bold, marginBottom: 6 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: SIZES.radioBoton, paddingHorizontal: 14, paddingVertical: 12, color: '#0f172a', fontSize: 15 },
    inputBloqueado: { color: '#94a3b8', backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
    
    filaFilaSwitch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    labelSwitch: { color: '#0f172a', fontSize: 14, fontWeight: FONTS.bold },
    subtextoSwitch: { color: '#64748b', fontSize: 12, marginTop: 2, lineHeight: 16 },

    botonGuardar: { backgroundColor: COLORS.azulMarino, borderRadius: 10, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 12, elevation: 2 },
    textoGuardar: { color: COLORS.blancoPuro, fontSize: 16, fontWeight: FONTS.bold },
    botonDeshabilitado: { backgroundColor: '#94a3b8', elevation: 0 },
    
    botonSalir: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', borderRadius: 10, minHeight: 54, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    textoSalir: { color: COLORS.rojoIntenso, fontSize: 16, fontWeight: FONTS.bold },

    sesionVacia: { flex: 1, backgroundColor: COLORS.blancoPuro, paddingHorizontal: 25, justifyContent: 'center', alignItems: 'center' },
    sesionIcono: { marginBottom: 20, backgroundColor: '#f1f5f9', padding: 25, borderRadius: 60 },
    sesionTitulo: { color: COLORS.azulMarino, fontSize: 22, fontWeight: FONTS.bold, textAlign: 'center', marginBottom: 10 },
    sesionTexto: { color: '#64748b', fontSize: 15, textAlign: 'center', marginBottom: 35, lineHeight: 22 },

    botonRegistro: { backgroundColor: COLORS.rojoIntenso, width: '100%', paddingVertical: 16, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12, elevation: 2 },
    textoBotonRegistro: { color: COLORS.blancoPuro, fontSize: 16, fontWeight: FONTS.bold, marginLeft: 10 },
    
    botonLogin: { backgroundColor: COLORS.blancoPuro, borderWidth: 2, borderColor: COLORS.azulMarino, width: '100%', paddingVertical: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    textoBotonLogin: { color: COLORS.azulMarino, fontSize: 16, fontWeight: FONTS.bold, marginLeft: 10 },
    
    botonInicio: { paddingVertical: 12, paddingHorizontal: 20 },
    textoBotonInicio: { color: '#64748b', fontSize: 15, fontWeight: FONTS.bold, textDecorationLine: 'underline' }
});
