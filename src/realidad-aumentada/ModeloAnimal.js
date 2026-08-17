import React from 'react';
import {
    ViroBox,
    ViroMaterials,
    ViroNode,
    ViroSphere
} from '@reactvision/react-viro';

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

// Las primitivas de Viro trabajan en unidades de mundo (metros en RA). Estos
// límites contienen toda la geometría de cada animal, incluidas colas y cuernos.
const LIMITES_MODELOS_RA = Object.freeze({
    [ANIMALES_RA.VACA]: {
        min: [-0.98, 0.01, -0.44],
        max: [1, 1.3, 0.44]
    },
    [ANIMALES_RA.CERDO]: {
        min: [-0.95, 0.01, -0.44],
        max: [1.02, 1.17, 0.44]
    }
});

export const TAMANO_MAXIMO_MODELO_RA = 0.48;

export const obtenerAjusteModeloRA = (animal) => {
    const animalNormalizado = normalizarAnimalRA(animal);
    const { min, max } = LIMITES_MODELOS_RA[animalNormalizado];
    const dimensiones = max.map((valorMaximo, indice) => valorMaximo - min[indice]);
    const dimensionMayor = Math.max(...dimensiones);
    const escalaNormalizada = TAMANO_MAXIMO_MODELO_RA / dimensionMayor;
    const centroHorizontal = [
        (min[0] + max[0]) / 2,
        min[1],
        (min[2] + max[2]) / 2
    ];

    return {
        escalaNormalizada,
        posicionCentrada: centroHorizontal.map((valor) => -valor),
        dimensionesOriginales: dimensiones,
        dimensionesNormalizadas: dimensiones.map((valor) => valor * escalaNormalizada)
    };
};

ViroMaterials.createMaterials({
    raVacaBlanco: { diffuseColor: '#F8FAFC', lightingModel: 'Lambert' },
    raVacaNegro: { diffuseColor: '#111827', lightingModel: 'Lambert' },
    raVacaHocico: { diffuseColor: '#E8B4B8', lightingModel: 'Lambert' },
    raCuerno: { diffuseColor: '#E7D8B1', lightingModel: 'Lambert' },
    raCerdoRosa: { diffuseColor: '#F3A7B8', lightingModel: 'Lambert' },
    raCerdoOscuro: { diffuseColor: '#D97A91', lightingModel: 'Lambert' },
    raPezuña: { diffuseColor: '#3F2D2D', lightingModel: 'Lambert' },
    raOjo: { diffuseColor: '#09090B', lightingModel: 'Lambert' }
});

function Caja({ position, scale, material, rotation = [0, 0, 0] }) {
    return (
        <ViroBox
            position={position}
            scale={scale}
            rotation={rotation}
            materials={[material]}
        />
    );
}

function Esfera({ position, scale, material }) {
    return (
        <ViroSphere
            position={position}
            scale={scale}
            widthSegmentCount={16}
            heightSegmentCount={12}
            materials={[material]}
        />
    );
}

function ModeloVaca() {
    return (
        <ViroNode>
            <Caja position={[0, 0.76, 0]} scale={[0.78, 0.42, 0.4]} material="raVacaBlanco" />

            <Esfera position={[0.62, 0.86, 0]} scale={[0.31, 0.31, 0.3]} material="raVacaBlanco" />
            <Caja position={[0.86, 0.76, 0]} scale={[0.22, 0.15, 0.27]} material="raVacaHocico" />

            <Esfera position={[0.72, 0.9, 0.22]} scale={[0.045, 0.055, 0.045]} material="raOjo" />
            <Esfera position={[0.72, 0.9, -0.22]} scale={[0.045, 0.055, 0.045]} material="raOjo" />

            <Esfera position={[0.56, 1.08, 0.27]} scale={[0.17, 0.07, 0.11]} material="raVacaNegro" />
            <Esfera position={[0.56, 1.08, -0.27]} scale={[0.17, 0.07, 0.11]} material="raVacaNegro" />
            <Caja position={[0.67, 1.19, 0.17]} scale={[0.045, 0.18, 0.045]} rotation={[0, 0, -18]} material="raCuerno" />
            <Caja position={[0.67, 1.19, -0.17]} scale={[0.045, 0.18, 0.045]} rotation={[0, 0, -18]} material="raCuerno" />

            <Esfera position={[-0.22, 0.86, 0.38]} scale={[0.25, 0.2, 0.045]} material="raVacaNegro" />
            <Esfera position={[0.28, 0.64, 0.39]} scale={[0.2, 0.15, 0.045]} material="raVacaNegro" />
            <Esfera position={[-0.35, 0.72, -0.39]} scale={[0.22, 0.18, 0.045]} material="raVacaNegro" />

            <Caja position={[0.46, 0.34, 0.24]} scale={[0.13, 0.55, 0.13]} material="raVacaBlanco" />
            <Caja position={[0.46, 0.34, -0.24]} scale={[0.13, 0.55, 0.13]} material="raVacaBlanco" />
            <Caja position={[-0.46, 0.34, 0.24]} scale={[0.13, 0.55, 0.13]} material="raVacaBlanco" />
            <Caja position={[-0.46, 0.34, -0.24]} scale={[0.13, 0.55, 0.13]} material="raVacaBlanco" />

            <Caja position={[0.46, 0.06, 0.24]} scale={[0.15, 0.09, 0.16]} material="raPezuña" />
            <Caja position={[0.46, 0.06, -0.24]} scale={[0.15, 0.09, 0.16]} material="raPezuña" />
            <Caja position={[-0.46, 0.06, 0.24]} scale={[0.15, 0.09, 0.16]} material="raPezuña" />
            <Caja position={[-0.46, 0.06, -0.24]} scale={[0.15, 0.09, 0.16]} material="raPezuña" />

            <Esfera position={[0.05, 0.44, 0]} scale={[0.2, 0.13, 0.16]} material="raVacaHocico" />
            <Caja position={[-0.78, 0.74, 0]} scale={[0.07, 0.48, 0.07]} rotation={[0, 0, -20]} material="raVacaNegro" />
            <Esfera position={[-0.87, 0.5, 0]} scale={[0.09, 0.13, 0.09]} material="raVacaNegro" />
        </ViroNode>
    );
}

function ModeloCerdo() {
    return (
        <ViroNode>
            <Esfera position={[0, 0.6, 0]} scale={[0.76, 0.46, 0.43]} material="raCerdoRosa" />
            <Esfera position={[0.59, 0.69, 0]} scale={[0.36, 0.34, 0.33]} material="raCerdoRosa" />
            <Caja position={[0.88, 0.61, 0]} scale={[0.2, 0.15, 0.25]} material="raCerdoOscuro" />

            <Esfera position={[0.71, 0.77, 0.25]} scale={[0.045, 0.055, 0.045]} material="raOjo" />
            <Esfera position={[0.71, 0.77, -0.25]} scale={[0.045, 0.055, 0.045]} material="raOjo" />
            <Esfera position={[0.99, 0.63, 0.075]} scale={[0.025, 0.035, 0.025]} material="raOjo" />
            <Esfera position={[0.99, 0.63, -0.075]} scale={[0.025, 0.035, 0.025]} material="raOjo" />

            <Caja position={[0.52, 1.03, 0.22]} scale={[0.16, 0.22, 0.07]} rotation={[0, 0, -15]} material="raCerdoOscuro" />
            <Caja position={[0.52, 1.03, -0.22]} scale={[0.16, 0.22, 0.07]} rotation={[0, 0, -15]} material="raCerdoOscuro" />

            <Caja position={[0.4, 0.27, 0.25]} scale={[0.14, 0.42, 0.14]} material="raCerdoRosa" />
            <Caja position={[0.4, 0.27, -0.25]} scale={[0.14, 0.42, 0.14]} material="raCerdoRosa" />
            <Caja position={[-0.4, 0.27, 0.25]} scale={[0.14, 0.42, 0.14]} material="raCerdoRosa" />
            <Caja position={[-0.4, 0.27, -0.25]} scale={[0.14, 0.42, 0.14]} material="raCerdoRosa" />

            <Caja position={[0.4, 0.05, 0.25]} scale={[0.16, 0.08, 0.16]} material="raPezuña" />
            <Caja position={[0.4, 0.05, -0.25]} scale={[0.16, 0.08, 0.16]} material="raPezuña" />
            <Caja position={[-0.4, 0.05, 0.25]} scale={[0.16, 0.08, 0.16]} material="raPezuña" />
            <Caja position={[-0.4, 0.05, -0.25]} scale={[0.16, 0.08, 0.16]} material="raPezuña" />

            <Caja position={[-0.73, 0.75, 0]} scale={[0.08, 0.24, 0.08]} rotation={[0, 0, 48]} material="raCerdoOscuro" />
            <Caja position={[-0.84, 0.88, 0]} scale={[0.08, 0.2, 0.08]} rotation={[0, 0, -48]} material="raCerdoOscuro" />
        </ViroNode>
    );
}

export default function ModeloAnimal({ animal }) {
    const animalNormalizado = normalizarAnimalRA(animal);
    const { escalaNormalizada, posicionCentrada } = obtenerAjusteModeloRA(animalNormalizado);

    return (
        <ViroNode scale={[escalaNormalizada, escalaNormalizada, escalaNormalizada]}>
            <ViroNode position={posicionCentrada}>
                {animalNormalizado === ANIMALES_RA.CERDO
                    ? <ModeloCerdo />
                    : <ModeloVaca />}
            </ViroNode>
        </ViroNode>
    );
}
