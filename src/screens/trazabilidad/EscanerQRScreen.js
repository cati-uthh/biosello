import React, { useCallback, useState, useEffect, useRef } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Animated, 
  Easing 
} from 'react-native';
import { CameraView, Camera } from "expo-camera";
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../../theme/theme';
import { extraerIdentificadorQR } from '../../utils/qr';

export default function EscanerQR({ navigation }) {
  const isFocused = useIsFocused();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // Animación del láser / barra de escaneo
  const scanAnim = useRef(new Animated.Value(0)).current;

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

  // Control del ciclo de animación del escáner
  useEffect(() => {
    let animLoop = null;
    if (hasPermission && isFocused && !scanned) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      animLoop.start();
    } else {
      scanAnim.setValue(0);
    }

    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [hasPermission, isFocused, scanned, scanAnim]);

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
    }, [])
  );

  const requestPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    setShowPermissionModal(false);
  };

  const handleBarCodeScanned = ({ data }) => {
    setScanned(true);

    const identificador = extraerIdentificadorQR(data);
    const idExtraido = identificador?.idLote || identificador?.codigoLote || data;

    navigation.navigate('IngresoManual', {
      codigoQR: idExtraido,
      origenConsulta: 'qr',
      id_corte: identificador?.idCorte || '',
      incluir_tip_cuidado: identificador?.incluirTipCuidado !== undefined ? Boolean(identificador.incluirTipCuidado) : true,
      incluir_recomendacion: identificador?.incluirRecomendacion !== undefined ? Boolean(identificador.incluirRecomendacion) : true
    });
  };

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 195],
  });

  return (
    <View style={styles.container}>
      <Text style={styles.instructionText}>
        Coloque el código QR en el cuadro{'\n'}para escanear
      </Text>

      <View style={styles.scannerWrapper}>
         {hasPermission && isFocused ? (
            <View style={styles.cameraContainer}>
              <CameraView
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                style={styles.camera}
              />

              {/* Esquinas guía del visor */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />

              {/* Barra / Haz de escaneo láser animada */}
              {!scanned && (
                <Animated.View style={[styles.scanBarContainer, { transform: [{ translateY }] }]}>
                  <LinearGradient
                    colors={['rgba(2, 132, 199, 0.0)', 'rgba(2, 132, 199, 0.25)', 'rgba(2, 132, 199, 0.75)']}
                    style={styles.scanBeam}
                  />
                  <View style={styles.scanLaser} />
                </Animated.View>
              )}
            </View>
         ) : (
            <View style={styles.cameraPlaceholder}>
              <TouchableOpacity
                style={styles.retryCameraButton}
                onPress={() => setShowPermissionModal(true)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Activar cámara"
              >
                <Text style={styles.retryCameraText}>Activar cámara</Text>
              </TouchableOpacity>
            </View>
         )}
      </View>

      <Text style={styles.helpText}>¿No detecta el código QR?</Text>
      
      {/* Botón manual mandando el parámetro vacío */}
      <TouchableOpacity 
        style={styles.manualButton} 
        onPress={() => navigation.navigate('IngresoManual', {
          codigoQR: '',
          origenConsulta: 'manual'
        })}
      >
        <Text style={styles.manualButtonText}>Ingresar manualmente</Text>
      </TouchableOpacity>

      {scanned && (
         <TouchableOpacity style={[styles.manualButton, {marginTop: 10, backgroundColor: '#003366'}]} onPress={() => setScanned(false)}>
            <Text style={styles.manualButtonText}>Escanear de nuevo</Text>
         </TouchableOpacity>
      )}

      {/* Modal de Permisos */}
      <Modal
        visible={showPermissionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Permisos de cámara</Text>
            <Text style={styles.modalText}>Necesitamos acceder a tu cámara para poder escanear el código QR.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowPermissionModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancelar solicitud de permiso de cámara"
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={requestPermission}
                accessibilityRole="button"
                accessibilityLabel="Permitir acceso a la cámara"
              >
                <Text style={styles.modalActionText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.blancoPuro, alignItems: 'center', paddingTop: 40 },
  instructionText: { fontSize: SIZES.textoBase, textAlign: 'center', fontWeight: FONTS.bold, marginBottom: 30 },
  scannerWrapper: { 
    width: 250, 
    height: 250, 
    overflow: 'hidden', 
    borderRadius: SIZES.radioTarjeta, 
    marginBottom: 40, 
    backgroundColor: '#0f172a',
    position: 'relative'
  },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  
  // Esquinas de enfoque del visor
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: COLORS.azulCeruleo,
    zIndex: 10
  },
  cornerTopLeft: {
    top: 12,
    left: 12,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 6
  },
  cornerTopRight: {
    top: 12,
    right: 12,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 6
  },
  cornerBottomLeft: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 6
  },
  cornerBottomRight: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 6
  },

  // Haz láser y barra de escaneo
  scanBarContainer: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    height: 32,
    zIndex: 5,
    justifyContent: 'flex-end'
  },
  scanBeam: {
    width: '100%',
    height: 28
  },
  scanLaser: {
    width: '100%',
    height: 3,
    backgroundColor: COLORS.azulCeruleo,
    borderRadius: 2,
    shadowColor: COLORS.azulCeruleo,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6
  },

  cameraPlaceholder: { flex: 1, backgroundColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center' },
  retryCameraButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: SIZES.radioBoton, backgroundColor: COLORS.azulMarino, alignItems: 'center', justifyContent: 'center' },
  retryCameraText: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, fontSize: 14 },
  helpText: { fontSize: 14, fontWeight: FONTS.bold, marginBottom: 10 },
  manualButton: { backgroundColor: COLORS.rojoIntenso, paddingVertical: 12, paddingHorizontal: 30, borderRadius: SIZES.radioBoton, width: '80%', alignItems: 'center' },
  manualButtonText: { color: COLORS.blancoPuro, fontWeight: FONTS.bold, fontSize: SIZES.textoBase },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#F3E5F5', padding: 20, borderRadius: SIZES.radioTarjeta, width: '80%' },
  modalTitle: { fontSize: SIZES.tituloSeccion, fontWeight: FONTS.bold, marginBottom: 10, color: COLORS.azulMarino },
  modalText: { fontSize: 14, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  modalButton: { minHeight: 44, minWidth: 88, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { color: '#475569', fontWeight: FONTS.bold },
  modalActionText: { color: COLORS.azulMarino, fontWeight: FONTS.bold }
});

