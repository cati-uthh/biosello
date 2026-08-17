import React, { useCallback, useRef } from 'react';
import {
    ViroAmbientLight,
    ViroARPlaneSelector,
    ViroARScene,
    ViroDirectionalLight,
    ViroMaterials,
    ViroNode
} from '@reactvision/react-viro';
import ModeloAnimal from './ModeloAnimal';

ViroMaterials.createMaterials({
    raPlanoColocacion: {
        lightingModel: 'Constant',
        diffuseColor: 'rgba(0, 81, 139, 0.12)',
        blendMode: 'Alpha',
        cullMode: 'None',
        writesToDepthBuffer: false
    }
});

export default function EscenaAnimalRA({ sceneNavigator }) {
    const selectorPlanoRef = useRef(null);
    const propiedades = sceneNavigator?.viroAppProps || {};
    const {
        animal = 'vaca',
        escala = 1,
        rotacion = 0,
        resetKey = 0,
        onSeguimientoActualizado,
        onAnimalColocado
    } = propiedades;

    const alEncontrarAncla = useCallback((ancla) => {
        selectorPlanoRef.current?.handleAnchorFound(ancla);
    }, []);

    const alActualizarAncla = useCallback((ancla) => {
        selectorPlanoRef.current?.handleAnchorUpdated(ancla);
    }, []);

    const alEliminarAncla = useCallback((ancla) => {
        if (ancla) selectorPlanoRef.current?.handleAnchorRemoved(ancla);
    }, []);

    const habilitarArrastre = useCallback(() => {
        // La posición la conserva Viro en el nodo nativo durante el arrastre.
    }, []);

    return (
        <ViroARScene
            anchorDetectionTypes={['PlanesHorizontal']}
            onAnchorFound={alEncontrarAncla}
            onAnchorUpdated={alActualizarAncla}
            onAnchorRemoved={alEliminarAncla}
            onTrackingUpdated={(estado, motivo) => onSeguimientoActualizado?.(estado, motivo)}
        >
            <ViroAmbientLight color="#FFFFFF" />
            <ViroDirectionalLight color="#FFFFFF" direction={[-0.4, -1, -0.3]} />

            <ViroARPlaneSelector
                ref={selectorPlanoRef}
                alignment="Horizontal"
                minWidth={0.45}
                minHeight={0.45}
                hideOverlayOnSelection
                useActualShape
                material="raPlanoColocacion"
                onPlaneSelected={() => onAnimalColocado?.()}
            >
                <ViroNode
                    key={`animal-ra-${resetKey}`}
                    position={[0, 0.008, 0]}
                    dragType="FixedToWorld"
                    onDrag={habilitarArrastre}
                >
                    <ViroNode
                        scale={[escala, escala, escala]}
                        rotation={[0, rotacion, 0]}
                    >
                        <ModeloAnimal animal={animal} />
                    </ViroNode>
                </ViroNode>
            </ViroARPlaneSelector>
        </ViroARScene>
    );
}
