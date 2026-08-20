# Arquitectura del frontend

El punto de entrada se mantiene deliberadamente pequeño:

- `index.js` registra la aplicación en Expo.
- `App.js` monta los proveedores globales y la navegación.
- `src/navigation/AppNavigator.js` define stacks, tabs y rutas.

## Estructura

```text
src/
├── components/
│   └── common/                 Componentes reutilizables sin lógica de dominio
├── config/                     Configuración de entorno y endpoints
├── context/                    Estado global mediante React Context
├── features/
│   └── realidadAumentada/      Funcionalidad nativa de RA y sus componentes
├── navigation/                 Navegadores y composición de rutas
├── screens/
│   ├── autenticacion/
│   ├── cuenta/
│   ├── empleados/
│   ├── inicio/
│   ├── lotes/
│   ├── sucursales/
│   └── trazabilidad/
├── theme/                      Colores, tipografías y medidas compartidas
└── utils/                      Funciones puras y adaptadores reutilizables
```

Los recursos estáticos permanecen en `assets/`, las pruebas E2E en `e2e/` y los
plugins de Expo en `plugins/`.

## Reglas de dependencia

1. Las pantallas pueden consumir `components`, `config`, `context`, `theme` y
   `utils`.
2. Los componentes comunes no deben importar pantallas.
3. La navegación es el único lugar donde se registran pantallas globales.
4. Las funcionalidades nativas autocontenidas viven bajo `features`.
5. La URL del backend se configura en `src/config/api.js`. En desarrollo puede
   sobrescribirse con `EXPO_PUBLIC_API_BASE_URL` sin editar el código.

`TrazabilidadLegacyScreen.js` se conserva como implementación histórica, pero no
está registrada en la navegación activa. La consulta utilizada actualmente es
`IngresoManualScreen.js` dentro del flujo del escáner.
