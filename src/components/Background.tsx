'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Stars, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

export function Background() {
    const sphereRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (sphereRef.current) {
            sphereRef.current.rotation.y += 0.002;
            sphereRef.current.rotation.z += 0.001;
        }
    });

    return (
        <>
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1.5} color="#8b5cf6" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ec4899" />

            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <Sphere ref={sphereRef} args={[15, 64, 64]} position={[0, 0, -20]}>
                    <MeshDistortMaterial
                        color="#1e1b4b"
                        attach="material"
                        distort={0.4}
                        speed={1.5}
                        roughness={0.2}
                        metalness={0.8}
                        transparent
                        opacity={0.3}
                    />
                </Sphere>
            </Float>
        </>
    );
}
