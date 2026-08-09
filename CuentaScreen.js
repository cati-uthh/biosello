import React, { useContext, useEffect, useState } from 'react';
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

const API_BASE_URL = 'https://biosello-backend.vercel.app/api';

export default function CuentaScreen({ navigation }) {
  const { sesionActiva, usuario, setUsuario, setSesionActiva } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [perfil, setPerfil] = useState(null);
  
  // Estado del formulario
  const [form, setForm] = useState({
    nombre: '',
    email: '', 
    telefono: '',
    nombre_negocio: '',
    municipio: '',
    direccion: '',
    rfc: '',
    perfil: '' // Se mantiene para mostrar en UI, pero no se enviará en el PUT
  });

  const idUsuario = usuario?.id_usuario || usuario?.id;

  useEffect(() => {
    const cargarPerfil = async () => {
      if (!idUsuario) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/perfil?id_usuario=${idUsuario}`);
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

    cargarPerfil();
  }, [idUsuario]);

  const actualizar = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  /**
   * Función para validar los datos antes de enviarlos al servidor.
   * Retorna un string con el error si falla, o null si todo es correcto.
   */
  const validarFormulario = () => {
    if (!form.nombre.trim()) return "El nombre es un campo obligatorio.";
    if (!form.email.trim()) return "El correo electrónico es obligatorio.";
    
    // Validación de formato de correo usando Expresiones Regulares (Regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return "Ingresa un formato de correo electrónico válido.";
    
    // Validación de teléfono (mínimo 10 dígitos si se proporciona)
    if (form.telefono && form.telefono.trim().length < 10) {
      return "El número de teléfono debe tener al menos 10 dígitos.";
    }

    // Validación de RFC (12 caracteres para morales, 13 para físicas)
    if (form.rfc && (form.rfc.trim().length < 12 || form.rfc.trim().length > 13)) {
      return "El RFC debe tener entre 12 y 13 caracteres.";
    }

    return null; // Pasa todas las validaciones
  };

  const guardarCambios = async () => {
    if (!idUsuario) return;

    // Ejecutar validaciones del lado del cliente
    const errorValidacion = validarFormulario();
    if (errorValidacion) {
      Alert.alert('Revisa tus datos', errorValidacion);
      return;
    }

    setGuardando(true);
    try {
      /**
       * SANITIZACIÓN DE DATOS (Prevención de escalada de privilegios):
       * Construimos un payload estricto. Excluimos intencionalmente campos sensibles 
       * como 'perfil' o 'estatus_verificacion' para evitar que un usuario manipule 
       * la petición e intente cambiar su nivel de acceso en la base de datos.
       */
      const payload = {
        id_usuario: idUsuario,
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        nombre_negocio: form.nombre_negocio.trim(),
        municipio: form.municipio.trim(),
        direccion: form.direccion.trim(),
        rfc: form.rfc.trim().toUpperCase() // Estandarizamos RFC a mayúsculas
      };

      const response = await fetch(`${API_BASE_URL}/perfil`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        style: 'destructive',
        onPress: () => {
          setUsuario(null);
          setSesionActiva(false);
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

  if (loading) {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator size="large" color={COLORS.azulMarino} />
        <Text style={styles.estadoTexto}>Cargando cuenta...</Text>
      </View>
    );
  }

  // VISTA CUANDO EL USUARIO NO TIENE SESIÓN ACTIVA (ESTILIZADA)
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

  // VISTA PRINCIPAL CON SESIÓN ACTIVA
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
        {renderCampo({ label: 'Correo electrónico', campo: 'email', keyboardType: 'email-address', editable:false })}
        {renderCampo({ label: 'Teléfono', campo: 'telefono', keyboardType: 'phone-pad' })}
        {renderCampo({ label: 'Perfil de acceso', campo: 'perfil', editable: false })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Datos del Negocio</Text>
        {renderCampo({ label: 'Nombre comercial', campo: 'nombre_negocio' })}
        {renderCampo({ label: 'Municipio', campo: 'municipio' })}
        {renderCampo({ label: 'Dirección', campo: 'direccion' })}
        {renderCampo({ label: 'RFC', campo: 'rfc', autoCapitalize: 'characters' })}
      </View>

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
    // --- ESTILOS GENERALES Y CON SESIÓN ---
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
    
    botonGuardar: { backgroundColor: COLORS.azulMarino, borderRadius: 10, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 12, elevation: 2 },
    textoGuardar: { color: COLORS.blancoPuro, fontSize: 16, fontWeight: FONTS.bold },
    botonDeshabilitado: { backgroundColor: '#94a3b8', elevation: 0 },
    
    botonSalir: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', borderRadius: 10, minHeight: 54, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    textoSalir: { color: COLORS.rojoIntenso, fontSize: 16, fontWeight: FONTS.bold },

    // --- NUEVOS ESTILOS: VISTA SIN SESIÓN ACTIVA ---
    sesionVacia: { flex: 1, backgroundColor: COLORS.blancoPuro, paddingHorizontal: 25, justifyContent: 'center', alignItems: 'center' },
    sesionIcono: { marginBottom: 20, backgroundColor: '#f1f5f9', padding: 25, borderRadius: 60 },
    sesionTitulo: { color: COLORS.azulMarino, fontSize: 22, fontWeight: FONTS.bold, textAlign: 'center', marginBottom: 10 },
    sesionTexto: { color: '#64748b', fontSize: 15, textAlign: 'center', marginBottom: 35, lineHeight: 22 },
    
    botonRegistro: { backgroundColor: COLORS.rojoIntenso, width: '100%', paddingVertical: 16, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 2 },
    textoBotonRegistro: { color: COLORS.blancoPuro, fontSize: 16, fontWeight: FONTS.bold, marginLeft: 10 },
    
    botonLogin: { backgroundColor: COLORS.blancoPuro, borderWidth: 2, borderColor: COLORS.azulMarino, width: '100%', paddingVertical: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    textoBotonLogin: { color: COLORS.azulMarino, fontSize: 16, fontWeight: FONTS.bold, marginLeft: 10 },
    
    botonInicio: { paddingVertical: 12, paddingHorizontal: 20 },
    textoBotonInicio: { color: '#64748b', fontSize: 15, fontWeight: FONTS.bold, textDecorationLine: 'underline' }
});