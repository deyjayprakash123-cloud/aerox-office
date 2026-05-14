'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import dynamic from 'next/dynamic';

const Particles = () => {
  const mesh = useRef<THREE.Points>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const particlesCount = 2000;

  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);
    
    const colorA = new THREE.Color('#00F2FF');
    const colorB = new THREE.Color('#7000FF');

    for (let i = 0; i < particlesCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;

      const mixedColor = colorA.clone().lerp(colorB, Math.random());
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }
    return [positions, colors];
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.rotation.y += delta * 0.05;
      mesh.current.rotation.x += delta * 0.02;

      // Slight reaction to mouse
      mesh.current.position.x += (mousePosition.x * 0.5 - mesh.current.position.x) * 0.05;
      mesh.current.position.y += (mousePosition.y * 0.5 - mesh.current.position.y) * 0.05;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particlesCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Dynamically import Canvas to avoid SSR issues
const Canvas = dynamic(() => import('@react-three/fiber').then(mod => mod.Canvas), { ssr: false });

export default function BackgroundAether() {
  return (
    <div className="fixed inset-0 z-[-1] bg-[#050505]">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <Particles />
      </Canvas>
    </div>
  );
}
