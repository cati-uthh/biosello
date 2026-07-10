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

  const guardarCambios = async () => {
    if (!idUsuario) return;

    setGuardando(true);
    try {
      const response = await fetch(`${API_BASE_URL}/perfil`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario: idUsuario, ...form })
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
        <ActivityIndicator color="#002855" />
        <Text style={styles.estadoTexto}>Cargando cuenta...</Text>
      </View>
    );
  }

  if (!sesionActiva || !idUsuario) {
    return (
      <View style={styles.sesionVacia}>
        <View style={styles.sesionIcono}>
          <Ionicons name="person-circle-outline" size={64} color="#002855" />
        </View>
        <Text style={styles.sesionTitulo}>Tu cuenta aun no esta activa</Text>
        <Text style={styles.sesionTexto}>
          Para ver o editar tu perfil, registra tu negocio o inicia sesion con una cuenta existente.
        </Text>

        <TouchableOpacity style={styles.botonRegistro} onPress={() => navigation.navigate('actRegistroNegocio')}>
          <Ionicons name="business-outline" size={18} color="#ffffff" />
          <Text style={styles.textoBotonRegistro}>Registrar mi negocio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botonLogin} onPress={() => navigation.navigate('actInicioSesion')}>
          <Ionicons name="log-in-outline" size={18} color="#002855" />
          <Text style={styles.textoBotonLogin}>Iniciar sesion</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botonInicio} onPress={() => navigation.navigate('Inicio')}>
          <Text style={styles.textoBotonInicio}>Volver a inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido}>
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
        <Text style={styles.cardTitulo}>Usuario</Text>
        {renderCampo({ label: 'Nombre', campo: 'nombre' })}
        {renderCampo({ label: 'Correo electrónico', campo: 'email', keyboardType: 'email-address' })}
        {renderCampo({ label: 'Teléfono', campo: 'telefono', keyboardType: 'phone-pad' })}
        {renderCampo({ label: 'Perfil', campo: 'perfil', editable: false })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Negocio</Text>
        {renderCampo({ label: 'Nombre comercial', campo: 'nombre_negocio' })}
        {renderCampo({ label: 'Municipio', campo: 'municipio' })}
        {renderCampo({ label: 'Dirección', campo: 'direccion' })}
        {renderCampo({ label: 'RFC', campo: 'rfc' })}
      </View>

      <TouchableOpacity style={[styles.botonGuardar, guardando && styles.botonDeshabilitado]} onPress={guardarCambios} disabled={guardando}>
        {guardando ? <ActivityIndicator color={COLORS.blancoPuro} /> : <Text style={styles.textoGuardar}>Guardar cambios</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.botonSalir} onPress={cerrarSesion}>
        <Ionicons name="log-out-outline" size={18} color={COLORS.rojoIntenso} />
        <Text style={styles.textoSalir}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: COLORS.blancoPuro, paddingHorizontal: 20, paddingTop: 18 },
    contenido: { paddingBottom: 40 },
    cargando: { flex: 1, backgroundColor: COLORS.blancoPuro, alignItems: 'center', justifyContent: 'center' },
    estadoTexto: { color: '#64748b', marginTop: 8 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    avatar: { width: 52, height: 52, borderRadius: SIZES.radioTarjeta, backgroundColor: COLORS.azulMarino, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    titulo: { color: COLORS.azulMarino, fontSize: SIZES.tituloPantalla, fontWeight: FONTS.bold },
    subtitulo: { color: '#64748b', fontSize: 13, marginTop: 3, textTransform: 'capitalize' },
    card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, padding: 14, marginBottom: 14, backgroundColor: COLORS.blancoPuro },
    cardTitulo: { color: '#0f172a', fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, marginBottom: 10 },
    campo: { marginBottom: 12 },
    label: { color: '#64748b', fontSize: 12, fontWeight: FONTS.bold, marginBottom: 6 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: SIZES.radioBoton, paddingHorizontal: 12, paddingVertical: 10, color: '#0f172a', fontSize: 14 },
    inputBloqueado: { color: '#64748b', backgroundColor: '#f1f5f9' },
    botonGuardar: { backgroundColor: COLORS.azulMarino, borderRadius: 9, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    textoGuardar: { color: COLORS.blancoPuro, fontSize: 15, fontWeight: FONTS.bold },
    botonDeshabilitado: { backgroundColor: '#94a3b8' },
    botonSalir: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', borderRadius: 9, minHeight: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    textoSalir: { color: COLORS.rojoIntenso, fontSize: 15, fontWeight: FONTS.bold }
});

