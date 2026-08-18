# Modelos 3D locales para Realidad Aumentada

La aplicación empaqueta dos modelos GLB 2.0 con sus materiales y texturas
embebidos. No se descargan recursos durante la experiencia de RA.

- `vaca/vaca.glb`: normalizado a escala `0.016166992`, rotación Y de `90°`.
- `cerdo/cerdo.glb`: normalizado a escala `0.003057138`, rotación Y de
  `43.22633°`.

Ambos quedan apoyados en Y=0 y con un largo aproximado de 0.48 m. Los ajustes
se encuentran en `src/realidad-aumentada/ModeloAnimal.js`.

## Atribuciones

Los modelos conservan su licencia CC BY 4.0 y sus metadatos originales dentro
del GLB:

- **Cow**, por [Josué Boisvert](https://sketchfab.com/JosueBoisvert),
  [fuente](https://sketchfab.com/3d-models/cow-99d333e3b4e4470a8d7d38436489c001),
  licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **lowpoly pig**, por [fabiotambone](https://sketchfab.com/fabiotambone),
  [fuente](https://sketchfab.com/3d-models/lowpoly-pig-26ae14bd0d2b4650b4bf878ca85ad06a),
  licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
