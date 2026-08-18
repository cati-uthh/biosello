import React from 'react';
import { Viro3DObject, ViroNode } from '@reactvision/react-viro';

export const ANIMALES_RA = Object.freeze({
    VACA: 'vaca',
    CERDO: 'cerdo'
});

export const normalizarAnimalRA = (animal) => (
    animal === ANIMALES_RA.CERDO ? ANIMALES_RA.CERDO : ANIMALES_RA.VACA
);

export const obtenerNombreAnimalRA = (animal) => (
    normalizarAnimalRA(animal) === ANIMALES_RA.CERDO ? 'Cerdo' : 'Vaca'
);

export const TAMANO_MAXIMO_MODELO_RA = 0.48;

// Los GLB usan unidades y orígenes distintos. Estos ajustes se calcularon a
// partir de la caja envolvente mundial de cada archivo para conservar las
// proporciones, apoyar las patas en Y=0 y dejar el largo máximo en 48 cm.
const AJUSTES_MODELOS_RA = Object.freeze({
    [ANIMALES_RA.VACA]: Object.freeze({
        source: require('../../assets/models/vaca/vaca.glb'),
        escalaNormalizada: 0.016166992,
        posicionCentrada: Object.freeze([0, 0.085715, 1.835680]),
        rotacionInicial: Object.freeze([0, 90, 0]),
        dimensionesNormalizadas: Object.freeze([0.48, 0.231329, 0.119564])
    }),
    [ANIMALES_RA.CERDO]: Object.freeze({
        source: require('../../assets/models/cerdo/cerdo.glb'),
        escalaNormalizada: 0.003057138,
        posicionCentrada: Object.freeze([9.902304, 0.871994, 9.399734]),
        rotacionInicial: Object.freeze([0, 43.22633, 0]),
        dimensionesNormalizadas: Object.freeze([0.48, 0.25777, 0.154052])
    })
});

export const obtenerAjusteModeloRA = (animal) => (
    AJUSTES_MODELOS_RA[normalizarAnimalRA(animal)]
);

export default function ModeloAnimal({
    animal,
    onLoadStart,
    onLoadEnd,
    onError
}) {
    const ajuste = obtenerAjusteModeloRA(animal);
    const escala = ajuste.escalaNormalizada;

    return (
        <ViroNode
            scale={[escala, escala, escala]}
            rotation={ajuste.rotacionInicial}
        >
            <Viro3DObject
                source={ajuste.source}
                type="GLB"
                position={ajuste.posicionCentrada}
                onLoadStart={onLoadStart}
                onLoadEnd={onLoadEnd}
                onError={onError}
            />
        </ViroNode>
    );
}
