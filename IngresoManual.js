import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { AuthContext } from './AuthContext';
import { COLORS, SIZES, FONTS } from './src/theme/theme';
import { buscarLotePorIdentificador, extraerIdentificadorQR } from './src/utils/qr';

const nombreEspecie = (especie) => {
  if (especie === 'PORCINO') return 'Cerdo';
  if (especie === 'BOVINO') return 'Res';
  return especie || 'Sin especie';
};

export default function IngresoManual() {
  const { usuario } = useContext(AuthContext);
  const [codigo, setCodigo] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [loteEncontrado, setLoteEncontrado] = useState(null);
  const [mensajeError, setMensajeError] = useState('');

  const handleBuscar = async () => {
    const valor = codigo.trim();
    if (!valor) {
      setMensajeError('Ingresa un codigo de lote o pega el contenido del QR.');
      setLoteEncontrado(null);
      return;
    }

    setBuscando(true);
    setMensajeError('');
    setLoteEncontrado(null);

    try {
      const identificador = extraerIdentificadorQR(valor);
      if (!identificador) throw new Error('El codigo no contiene datos de lote.');

      const lote = await buscarLotePorIdentificador(identificador, usuario);
      setLoteEncontrado(lote);
    } catch (error) {
      setMensajeError(error.message || 'No se pudo consultar ese lote.');
    } finally {
      setBuscando(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>
        Ingresa el codigo del lote{'\n'}o pega el contenido del QR
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Ej. LOT-2026-0001"
        placeholderTextColor="#666"
        autoCapitalize="characters"
        value={codigo}
        onChangeText={setCodigo}
      />

      <TouchableOpacity style={[styles.primaryButton, buscando && styles.disabledButton]} onPress={handleBuscar} disabled={buscando}>
        {buscando ? (
          <ActivityIndicator color={COLORS.blancoPuro} />
        ) : (
          <Text style={styles.buttonText}>Buscar lote</Text>
        )}
      </TouchableOpacity>

      {mensajeError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>No se encontro el lote</Text>
          <Text style={styles.errorText}>{mensajeError}</Text>
        </View>
      ) : null}

      {loteEncontrado ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{loteEncontrado.codigo_lote || `Lote #${loteEncontrado.id_lote}`}</Text>
          <Text style={styles.resultSubtitle}>{nombreEspecie(loteEncontrado.especie)} · {loteEncontrado.estado || 'sin estado'}</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoLine}><Text style={styles.bold}>Corte:</Text> {loteEncontrado.tipo_corte || 'N/D'}</Text>
            <Text style={styles.infoLine}><Text style={styles.bold}>Peso:</Text> {loteEncontrado.peso_kg || 'N/D'} kg</Text>
            <Text style={styles.infoLine}><Text style={styles.bold}>Produccion:</Text> {loteEncontrado.fecha_ingreso || 'N/D'}</Text>
            <Text style={styles.infoLine}><Text style={styles.bold}>Consumo pref.:</Text> {loteEncontrado.fecha_vencimiento || 'N/D'}</Text>
            <Text style={styles.infoLine}><Text style={styles.bold}>Arete:</Text> {loteEncontrado.num_arete || 'N/D'}</Text>
            <Text style={styles.infoLine}><Text style={styles.bold}>Guia:</Text> {loteEncontrado.folio_guia || 'N/D'}</Text>
          </View>
        </View>
      ) : (
        <>
          <Image
            source={require('./assets/ayuda-qr.png')}
            style={styles.helpImage}
            resizeMode="contain"
          />

          <Text style={styles.helpText}>
            El codigo se encuentra en la parte inferior{'\n'}de la etiqueta QR.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.blancoPuro },
  content: { alignItems: 'center', paddingTop: 50, paddingHorizontal: 30, paddingBottom: 36 },
  title: { fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, color: '#000', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  input: { width: '100%', minHeight: 50, borderColor: '#999', borderWidth: 1, borderRadius: SIZES.radioInput, paddingHorizontal: 15, fontSize: SIZES.textoBase, marginBottom: 20, color: '#000', backgroundColor: COLORS.blancoPuro },
  primaryButton: { backgroundColor: COLORS.rojoIntenso, minHeight: 48, borderRadius: SIZES.radioBoton, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  disabledButton: { backgroundColor: '#94a3b8' },
  buttonText: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, fontSize: SIZES.textoBase },
  errorCard: { width: '100%', borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', borderRadius: SIZES.radioTarjeta, padding: 14, marginBottom: 18 },
  errorTitle: { color: COLORS.rojoIntenso, fontSize: 15, fontWeight: FONTS.bold, textAlign: 'center' },
  errorText: { color: '#7f1d1d', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  resultCard: { width: '100%', borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', borderRadius: SIZES.radioTarjeta, padding: 14, marginBottom: 16 },
  resultTitle: { color: COLORS.azulMarino, fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, textAlign: 'center' },
  resultSubtitle: { color: '#64748b', fontSize: 13, marginTop: 4, marginBottom: 10, textAlign: 'center' },
  infoBox: { width: '100%', backgroundColor: COLORS.blancoPuro, borderRadius: SIZES.radioBoton, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, marginTop: 8 },
  infoLine: { color: '#475569', fontSize: 13, lineHeight: 21 },
  bold: { color: '#1e293b', fontWeight: FONTS.bold },
  helpImage: { width: 250, height: 200, marginTop: 18, marginBottom: 15 },
  helpText: { fontSize: 14, color: '#666', textAlign: 'center', fontWeight: '600', lineHeight: 20 }
});
