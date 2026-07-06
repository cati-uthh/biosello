import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from './AuthContext';
import { COLORS, SIZES, FONTS } from './src/theme/theme';
import { API_BASE_URL, getAuthHeaders } from './src/utils/auth';

export default function CuentaScreen({ navigation }) {
  const { sesionActiva, sesionCargando, usuario, cerrarSesion: cerrarSesionAuth } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState(null);

  const idUsuario = usuario?.id_usuario || usuario?.id;

  useEffect(() => {
    const cargarPerfil = async () => {
      if (sesionCargando) return;

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
      } catch (error) {
        Alert.alert('Error de conexión', 'No se pudo conectar con el servidor.');
      } finally {
        setLoading(false);
      }
    };

    cargarPerfil();
  }, [idUsuario, sesionCargando, usuario]);

  const cerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: cerrarSesionAuth
      }
    ]);
  };

  const textoDato = (valor) => {
    if (valor === null || valor === undefined || String(valor).trim() === '') return 'N/D';
    return String(valor);
  };

  const renderDato = ({ label, value }) => (
    <View style={styles.datoFila} key={label}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.datoValor}>{textoDato(value)}</Text>
    </View>
  );

  if (sesionCargando || loading) {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator color="#002855" />
        <Text style={styles.estadoTexto}>Cargando cuenta...</Text>
      </View>
    );
  }

  if (!sesionActiva || !idUsuario) {
    return (
      <ScrollView style={styles.sesionVacia} contentContainerStyle={styles.sesionContenido}>
        <View style={styles.sesionHero}>
          <View style={styles.sesionIcono}>
            <Ionicons name="person-circle-outline" size={52} color={COLORS.blancoPuro} />
          </View>
          <Text style={styles.sesionTitulo}>Perfil de invitado</Text>
          <Text style={styles.sesionTexto}>
            Crea una cuenta personal para guardar tu perfil o registra un negocio para administrar lotes y trazabilidad.
          </Text>
        </View>

        <TouchableOpacity style={styles.botonUsuario} onPress={() => navigation.navigate('actRegistroUsuario')}>
          <Ionicons name="person-add-outline" size={18} color="#ffffff" />
          <Text style={styles.textoBotonUsuario}>Crear cuenta personal</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botonRegistro} onPress={() => navigation.navigate('actRegistroNegocio')}>
          <Ionicons name="business-outline" size={18} color="#002855" />
          <Text style={styles.textoBotonRegistro}>Registrar mi negocio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botonLogin} onPress={() => navigation.navigate('actInicioSesion')}>
          <Ionicons name="log-in-outline" size={18} color="#002855" />
          <Text style={styles.textoBotonLogin}>Iniciar sesion</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botonInicio} onPress={() => navigation.navigate('Inicio')}>
          <Text style={styles.textoBotonInicio}>Volver a inicio</Text>
        </TouchableOpacity>
      </ScrollView>
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
        {renderDato({ label: 'Nombre', value: perfil?.nombre })}
        {renderDato({ label: 'Correo electrónico', value: perfil?.email })}
        {renderDato({ label: 'Teléfono', value: perfil?.telefono })}
        {renderDato({ label: 'Perfil', value: perfil?.perfil })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Negocio</Text>
        {renderDato({ label: 'Nombre comercial', value: perfil?.nombre_negocio })}
        {renderDato({ label: 'Municipio', value: perfil?.municipio })}
        {renderDato({ label: 'Dirección', value: perfil?.direccion })}
        {renderDato({ label: 'RFC', value: perfil?.rfc })}
      </View>

      <View style={styles.avisoCard}>
        <Ionicons name="lock-closed-outline" size={18} color={COLORS.azulMarino} />
        <Text style={styles.avisoTexto}>Los datos de perfil son solo de consulta. Cualquier corrección debe validarse fuera de esta pantalla.</Text>
      </View>

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
    sesionVacia: { flex: 1, backgroundColor: COLORS.blancoPuro },
    sesionContenido: { flexGrow: 1, padding: 22, justifyContent: 'center' },
    sesionHero: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, backgroundColor: '#f8fafc', padding: 18, alignItems: 'center', marginBottom: 18 },
    sesionIcono: { width: 72, height: 72, borderRadius: SIZES.radioTarjeta, backgroundColor: COLORS.azulMarino, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    sesionTitulo: { color: COLORS.azulMarino, fontSize: SIZES.tituloPantalla, fontWeight: FONTS.bold, textAlign: 'center' },
    sesionTexto: { color: '#64748b', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 },
    botonUsuario: { backgroundColor: COLORS.rojoIntenso, borderRadius: 9, minHeight: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 10 },
    textoBotonUsuario: { color: COLORS.blancoPuro, fontSize: 15, fontWeight: FONTS.bold },
    botonRegistro: { borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', borderRadius: 9, minHeight: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 10 },
    textoBotonRegistro: { color: COLORS.azulMarino, fontSize: 15, fontWeight: FONTS.bold },
    botonLogin: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: COLORS.blancoPuro, borderRadius: 9, minHeight: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 10 },
    textoBotonLogin: { color: COLORS.azulMarino, fontSize: 15, fontWeight: FONTS.bold },
    botonInicio: { alignItems: 'center', paddingVertical: 10 },
    textoBotonInicio: { color: '#64748b', fontSize: 14, fontWeight: '600' },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    avatar: { width: 52, height: 52, borderRadius: SIZES.radioTarjeta, backgroundColor: COLORS.azulMarino, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    titulo: { color: COLORS.azulMarino, fontSize: SIZES.tituloPantalla, fontWeight: FONTS.bold },
    subtitulo: { color: '#64748b', fontSize: 13, marginTop: 3, textTransform: 'capitalize' },
    card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioTarjeta, padding: 14, marginBottom: 14, backgroundColor: COLORS.blancoPuro },
    cardTitulo: { color: '#0f172a', fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, marginBottom: 10 },
    datoFila: { marginBottom: 12 },
    label: { color: '#64748b', fontSize: 12, fontWeight: FONTS.bold, marginBottom: 6 },
    datoValor: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: SIZES.radioBoton, paddingHorizontal: 12, paddingVertical: 11, color: '#0f172a', fontSize: 14 },
    avisoCard: { borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', borderRadius: SIZES.radioTarjeta, padding: 12, flexDirection: 'row', gap: 8, marginBottom: 14 },
    avisoTexto: { flex: 1, color: '#1e3a8a', fontSize: 13, lineHeight: 18 },
    botonSalir: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', borderRadius: 9, minHeight: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    textoSalir: { color: COLORS.rojoIntenso, fontSize: 15, fontWeight: FONTS.bold }
});

