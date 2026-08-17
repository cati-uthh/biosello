# Modelos 3D locales para Realidad Aumentada

La implementación actual no descarga recursos: la vaca y el cerdo se construyen con geometría 3D local en `src/realidad-aumentada/ModeloAnimal.js`.

Para sustituir esas representaciones por modelos artísticos, el formato recomendado es **GLB 2.0**, porque conserva mallas, materiales, texturas y animaciones en un solo archivo.

Coloca los archivos con estos nombres:

- `assets/models/vaca/vaca.glb`
- `assets/models/cerdo/cerdo.glb`

Metro ya está configurado para empaquetarlos. La importación debe ser estática, por ejemplo:

```js
const MODELOS = {
    vaca: require('../../assets/models/vaca/vaca.glb'),
    cerdo: require('../../assets/models/cerdo/cerdo.glb')
};
```

Después se pueden renderizar con `Viro3DObject`, usando `source={MODELOS[animal]}` y `type="GLB"`. No se deben usar URLs remotas.
