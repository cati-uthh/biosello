import React, { useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const pad = (value) => String(value).padStart(2, '0');
const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const fechaDesdeValor = (valor) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(valor || ''))) {
    const [year, month, day] = valor.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date();
};

export default function CalendarioModal({ visible, value, title = 'Seleccionar fecha', onSelect, onClose }) {
  const [mesVisible, setMesVisible] = useState(() => fechaDesdeValor(value));

  const diasMes = useMemo(() => {
    const year = mesVisible.getFullYear();
    const month = mesVisible.getMonth();
    const primerDia = new Date(year, month, 1).getDay();
    const totalDias = new Date(year, month + 1, 0).getDate();
    const celdas = [];

    for (let index = 0; index < primerDia; index += 1) celdas.push(null);
    for (let dia = 1; dia <= totalDias; dia += 1) celdas.push(new Date(year, month, dia));

    while (celdas.length % 7 !== 0) celdas.push(null);
    return celdas;
  }, [mesVisible]);

  const cambiarMes = (delta) => {
    setMesVisible((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const seleccionar = (fecha) => {
    if (!fecha) return;
    onSelect(toDateKey(fecha));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity style={styles.iconButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#002855" />
            </TouchableOpacity>
          </View>

          <View style={styles.monthRow}>
            <TouchableOpacity style={styles.iconButton} onPress={() => cambiarMes(-1)}>
              <Ionicons name="chevron-back" size={20} color="#002855" />
            </TouchableOpacity>
            <Text style={styles.monthText}>{MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}</Text>
            <TouchableOpacity style={styles.iconButton} onPress={() => cambiarMes(1)}>
              <Ionicons name="chevron-forward" size={20} color="#002855" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {DIAS.map((dia, index) => (
              <Text key={`${dia}-${index}`} style={styles.weekText}>{dia}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {diasMes.map((fecha, index) => {
              const key = fecha ? toDateKey(fecha) : `empty-${index}`;
              const activo = fecha && key === value;

              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.dayCell, activo && styles.dayCellActive]}
                  disabled={!fecha}
                  onPress={() => seleccionar(fecha)}
                >
                  <Text style={[styles.dayText, activo && styles.dayTextActive]}>
                    {fecha ? fecha.getDate() : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  title: {
    color: '#002855',
    fontSize: 18,
    fontWeight: 'bold'
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  monthText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold'
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6
  },
  weekText: {
    width: '14.285%',
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8
  },
  dayCellActive: {
    backgroundColor: '#002855'
  },
  dayText: {
    color: '#0f172a',
    fontWeight: '600'
  },
  dayTextActive: {
    color: '#ffffff'
  }
});
