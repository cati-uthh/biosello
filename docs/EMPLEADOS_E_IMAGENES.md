# Empleados e imágenes de animales

## Módulo de empleados

La opción **Mis empleados** del panel abre `GestionEmpleados.js`. El módulo consume
`/api/empleados` y permite listar, crear, editar y desactivar empleados de la matriz o
sucursal seleccionada.

El backend usa la tabla aditiva `empleado_negocio` para asociar una cuenta de `usuario`
con un negocio sin modificar los lotes existentes. La eliminación es lógica: desactiva
el acceso, pero conserva la cuenta y las referencias históricas de trazabilidad.

Antes de desplegar los cambios, en el repositorio `biosello-backend` se debe:

1. comprobar con `SHOW CREATE TABLE usuario` y `SHOW CREATE TABLE negocio` que las
   llaves relacionadas sean `INT` con el mismo signo y que `usuario.perfil` acepte el
   valor `empleado`;
2. configurar `JWT_SECRET` en Vercel con un valor aleatorio de al menos 32 caracteres;
3. ejecutar la siguiente migración;
4. desplegar el backend y después cerrar e iniciar sesión nuevamente en la app.

```sql
database/migrations/20260819_empleado_negocio.sql
```

Después se puede desplegar la ruta `api/empleados.js`. El cambio de `api/login.js`
emite una sesión firmada y permite que una cuenta con perfil `empleado` reciba el
`id_negocio` al iniciar sesión. La API obtiene la identidad administradora desde esa
sesión; no confía en un `id_admin` enviado por el cliente.

`JWT_SECRET` debe existir únicamente en el backend. No debe agregarse al proyecto de
Expo, usar el prefijo `EXPO_PUBLIC_` ni guardarse en el repositorio.

## Fotografía del animal

El formulario único de lotes admite imágenes JPG, JPEG, PNG y WEBP de hasta 3 MB.
La selección se valida y se muestra como vista previa local tanto para bovinos como
para porcinos.

Las fotografías se almacenan en el Blob Store público conectado a `biosello-backend`.
La API `/api/imagenes-animal` exige un JWT válido, comprueba el MIME, el tamaño real y
la firma binaria del archivo antes de enviarlo a Vercel Blob. Ninguna credencial de
Blob se incluye en Expo.

Antes de desplegar se debe ejecutar una sola vez en la base de datos:

```sql
MIGRACION_IMAGEN_ANIMAL.sql
```

El registro guarda `imagen_animal_url` y `imagen_animal_pathname` en `animal`. La URL
se devuelve en `detalles_trazabilidad.imagen_animal_url`; si no existe, la consulta QR
mantiene el marcador **Sin fotografía**. Si la carga termina pero falla el registro del
lote, la aplicación solicita eliminar el Blob temporal para evitar archivos huérfanos.

El límite se mantiene en 3 MB porque la aplicación envía Base64 a una función de
Vercel y la solicitud completa debe permanecer por debajo del límite de 4.5 MB. El
botón de Realidad Aumentada permanece condicionado a una consulta realizada mediante
QR y está alineado junto a la fotografía o su marcador.
