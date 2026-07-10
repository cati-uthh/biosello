// Ruta: src/theme/theme.js

export const COLORS = {
    // 1. Azul Marino Oscuro (Fondo primario institucional)
    // Uso: Reduce fatiga visual, transmite solidez y rigor tecnológico.
    azulMarino: '#041E3A',

    // 2. Azul Cerúleo Oscuro (Color secundario/acento)
    // Uso: Contraste para jerarquía visual, equilibrio de calma y seguridad.
    azulCeruleo: '#00518B',

    // 3. Rojo Intenso (Call-to-Action)
    // Uso: Botones principales. Prominencia visual y conexión con el producto cárnico.
    rojoIntenso: '#D32F2F',

    // 4. Blanco Puro (Contenedores y Tipografía principal)
    // Uso: Máximo contraste sobre el fondo azul para lectura rápida de datos.
    blancoPuro: '#FFFFFF',

    // 5. Amarillo Alerta (Estados de advertencia)
    // Uso: Mensajes de error en inputs (contraseñas/RFC), precaución semántica.
    amarilloAlerta: '#FFC107',

    // --- Colores Semánticos del Sistema (Derivados para el Dashboard) ---
    textoOscuro: '#000000', // Para texto dentro de inputs blancos
    exito: '#10b981',       // Lotes en excelente estado
    peligro: '#dc2626',     // Carne por vencer (crítico)
};


export const SIZES = {
    // --- Tipografía y Escala Visual ---
    kpi: 32,             // Números grandes (Dashboard)
    tituloPantalla: 22,  // Títulos principales (Rango: 20px - 24px)
    tituloSeccion: 16,   // Títulos de tarjetas o secciones (Rango: 16px - 18px)
    textoBase: 16,       // Inputs, botones y cuerpo de texto
    textoSecundario: 12, // Descripciones cortas y subtítulos (Rango: 11px - 13px)

    // --- Geometría y Espaciado (Border Radius) ---
    radioInput: 4,       // Estructura rígida para campos de texto
    radioBoton: 8,       // Curvatura suave para botones accionables
    radioTarjeta: 12,    // Contenedores amigables para visualización de datos
};

export const FONTS = {
    bold: 'bold',
    normal: 'normal',
};