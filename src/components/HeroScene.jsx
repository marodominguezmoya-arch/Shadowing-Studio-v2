import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

function WireIcosahedron() {
  const meshRef = useRef();
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    // Rotation continue et lente
    meshRef.current.rotation.y += delta * 0.12;
    meshRef.current.rotation.x += delta * 0.05;
    // Parallax douce vers la position de la souris
    const targetX = mouse.current.y * 0.25;
    const targetY = mouse.current.x * 0.35;
    meshRef.current.rotation.x += (targetX - meshRef.current.rotation.x * 0.15) * 0.02;
    meshRef.current.rotation.y += (targetY - meshRef.current.rotation.y * 0.15) * 0.02;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[2.1, 0]} />
      <meshBasicMaterial color="#C9A961" wireframe transparent opacity={0.45} />
    </mesh>
  );
}

export default function HeroScene() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <WireIcosahedron />
    </Canvas>
  );
}
