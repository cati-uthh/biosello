import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { AuthContext } from './AuthContext';
import { COLORS, SIZES, FONTS } from './src/theme/theme';
import { buscarLotePorIdentificador, extraerIdentificadorQR } from './src/utils/qr';

const nombreEspecie = (especie) => {
  if (especie === 'PORCINO') return 'Cerdo';
  if (especie === 'BOVINO') return 'Res';
  return especie || 'Sin especie';
};

export default function EscanerQR({ navigation }) {
  const { usuario } = useContext(AuthContext);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [loteEncontrado, setLoteEncontrado] = useState(null);
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await Camera.getCameraPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(true);
      } else {
        setShowPermissionModal(true);
      }
    })();
  }, []);

  const requestPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    setShowPermissionModal(false);
  };

  const consultarQR = async (contenido) => {
    setScanned(true);
    setConsultando(true);
    setLoteEncontrado(null);
    setMensajeError('');

    try {
      const identificador = extraerIdentificadorQR(contenido);
      if (!identificador) throw new Error('El codigo QR no contiene datos de lote.');

      const lote = await buscarLotePorIdentificador(identificador, usuario);
      setLoteEncontrado(lote);
    } catch (error) {
      setMensajeError(error.message || 'No se pudo consultar la trazabilidad del lote.');
    } finally {
      setConsultando(false);
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    consultarQR(data);
  };

  const escanearDeNuevo = () => {
    setScanned(false);
    setConsultando(false);
    setLoteEncontrado(null);
    setMensajeError('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.instructionText}>
        Coloca el codigo QR en el cuadro{'\n'}para consultar su trazabilidad
      </Text>

      <View style={styles.scannerWrapper}>
        {hasPermission ? (
          <CameraView
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            style={styles.camera}
          />
        ) : (
          <View style={styles.cameraPlaceholder} />
        )}
      </View>

      {consultando && (
        <View style={styles.resultCard}>
          <ActivityIndicator color={COLORS.azulMarino} />
          <Text style={styles.estadoTexto}>Consultando lote...</Text>
        </View>
      )}

      {mensajeError ? (
        <View style={styles.errorCard}>
          <Text style={styles.resultTitle}>QR no encontrado</Text>
          <Text style={styles.estadoTexto}>{mensajeError}</Text>
        </View>
      ) : null}

      {loteEncontrado && (
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
      )}

      <Text style={styles.helpText}>¿No detecta el codigo QR?</Text>

      <TouchableOpacity
        style={styles.manualButton}
        onPress={() => navigation.navigate('IngresoManual')}
      >
        <Text style={styles.manualButtonText}>Ingresar manualmente</Text>
      </TouchableOpacity>

      {scanned && (
        <TouchableOpacity style={[styles.manualButton, styles.scanAgainButton]} onPress={escanearDeNuevo}>
          <Text style={styles.manualButtonText}>Escanear de nuevo</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showPermissionModal} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Permisos de camara</Text>
            <Text style={styles.modalText}>Necesitamos acceder a tu camara para poder escanear el codigo QR.</Text>
            <TouchableOpacity onPress={requestPermission}>
              <Text style={styles.modalActionText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.blancoPuro },
  content: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24, paddingBottom: 36 },
  instructionText: { fontSize: SIZES.textoBase, textAlign: 'center', fontWeight: FONTS.bold, marginBottom: 24, color: '#0f172a', lineHeight: 22 },
  scannerWrapper: { width: 250, height: 250, overflow: 'hidden', borderRadius: SIZES.radioTarjeta, marginBottom: 24, backgroundColor: '#f0f0f0' },
  camera: { flex: 1 },
  cameraPlaceholder: { flex: 1, backgroundColor: '#E8E8E8' },
  resultCard: { width: '100%', borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', borderRadius: SIZES.radioTarjeta, padding: 14, marginBottom: 16, alignItems: 'center' },
  errorCard: { width: '100%', borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', borderRadius: SIZES.radioTarjeta, padding: 14, marginBottom: 16, alignItems: 'center' },
  resultTitle: { color: COLORS.azulMarino, fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, textAlign: 'center' },
  resultSubtitle: { color: '#64748b', fontSize: 13, marginTop: 4, marginBottom: 10, textAlign: 'center' },
  estadoTexto: { color: '#64748b', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 19 },
  infoBox: { width: '100%', backgroundColor: COLORS.blancoPuro, borderRadius: SIZES.radioBoton, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, marginTop: 8 },
  infoLine: { color: '#475569', fontSize: 13, lineHeight: 21 },
  bold: { color: '#1e293b', fontWeight: FONTS.bold },
  helpText: { fontSize: 14, fontWeight: FONTS.bold, marginBottom: 10, color: '#0f172a' },
  manualButton: { backgroundColor: COLORS.rojoIntenso, paddingVertical: 12, paddingHorizontal: 30, borderRadius: SIZES.radioBoton, width: '100%', alignItems: 'center' },
  scanAgainButton: { marginTop: 10, backgroundColor: COLORS.azulMarino },
  manualButtonText: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, fontSize: SIZES.textoBase },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#F3E5F5', padding: 20, borderRadius: SIZES.radioTarjeta, width: '80%' },
  modalTitle: { fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, marginBottom: 10, color: COLORS.azulMarino },
  modalText: { fontSize: 14, marginBottom: 20 },
  modalActionText: { color: COLORS.azulMarino, fontWeight: FONTS.bold, textAlign: 'right' }
});
