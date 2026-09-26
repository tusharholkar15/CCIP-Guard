'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function ThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070a, 0.045);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.5, 7.5);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x05070a, 0); // Transparent background to blend with CSS
    container.appendChild(renderer.domElement);

    // 4. Subtle ambient & directional lights
    const ambientLight = new THREE.AmbientLight(0x0a1525, 1.2);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x38bdf8, 2.5, 25);
    cyanLight.position.set(-6, 5, 3);
    scene.add(cyanLight);

    const emeraldLight = new THREE.PointLight(0x22c55e, 2.0, 25);
    emeraldLight.position.set(6, -3, 2);
    scene.add(emeraldLight);

    // Group for objects with parallax
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // ─── Perspective Grid Floor ──────────────────────────────────────────
    const gridHelper = new THREE.GridHelper(40, isMobile ? 30 : 50, 0x1e3a5f, 0x0f1d2e);
    gridHelper.position.y = -3.2;
    // Fade out grid in distance
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.35;
    worldGroup.add(gridHelper);

    // ─── Subtle Orbital Rings ────────────────────────────────────────────
    const ringGeo1 = new THREE.RingGeometry(4.2, 4.22, isMobile ? 48 : 80);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = Math.PI * 0.35;
    ringMesh1.rotation.y = Math.PI * 0.1;
    ringMesh1.position.set(0, 0.2, -1.5);
    worldGroup.add(ringMesh1);

    const ringGeo2 = new THREE.RingGeometry(5.8, 5.82, isMobile ? 48 : 80);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = Math.PI * 0.45;
    ringMesh2.rotation.y = -Math.PI * 0.15;
    ringMesh2.position.set(0, -0.2, -2.5);
    worldGroup.add(ringMesh2);

    // ─── Floating Geometric Wireframe Objects ────────────────────────────
    // Object 1: Icosahedron wireframe (Left / background)
    const icoGeo = new THREE.IcosahedronGeometry(1.4, 0);
    const icoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    });
    const icoMesh = new THREE.Mesh(icoGeo, icoMat);
    icoMesh.position.set(-4.5, 1.8, -2.5);
    worldGroup.add(icoMesh);

    // Object 2: Octahedron wireframe (Right / midground)
    const octaGeo = new THREE.OctahedronGeometry(1.6, 0);
    const octaMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const octaMesh = new THREE.Mesh(octaGeo, octaMat);
    octaMesh.position.set(4.8, -0.8, -2);
    worldGroup.add(octaMesh);

    // Object 3: Dodecahedron wireframe (Distant center-right)
    const dodecaGeo = new THREE.DodecahedronGeometry(1.1, 0);
    const dodecaMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.09,
    });
    const dodecaMesh = new THREE.Mesh(dodecaGeo, dodecaMat);
    dodecaMesh.position.set(3.2, 2.5, -4);
    worldGroup.add(dodecaMesh);

    // Object 4: Torus wireframe (Distant lower-left)
    const torusGeo = new THREE.TorusGeometry(1.2, 0.25, 8, isMobile ? 18 : 28);
    const torusMat = new THREE.MeshBasicMaterial({
      color: 0x1e3a5f,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const torusMesh = new THREE.Mesh(torusGeo, torusMat);
    torusMesh.position.set(-3.8, -2.0, -3.5);
    torusMesh.rotation.x = Math.PI * 0.25;
    worldGroup.add(torusMesh);

    // ─── Network Nodes & Constellation ───────────────────────────────────
    const nodeCount = isMobile ? 35 : 70;
    const nodeGeo = new THREE.BufferGeometry();
    const nodePositions = new Float32Array(nodeCount * 3);
    const nodeVelocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const x = (Math.random() - 0.5) * 18;
      const y = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 8 - 2;
      nodePositions[i * 3] = x;
      nodePositions[i * 3 + 1] = y;
      nodePositions[i * 3 + 2] = z;

      nodeVelocities.push({
        x: (Math.random() - 0.5) * 0.0015,
        y: (Math.random() - 0.5) * 0.0015,
        z: (Math.random() - 0.5) * 0.0015,
      });
    }

    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    const nodeMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.04,
      transparent: true,
      opacity: 0.4,
    });
    const nodePoints = new THREE.Points(nodeGeo, nodeMat);
    worldGroup.add(nodePoints);

    // Dynamic constellation lines between nearby nodes
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.06,
    });

    const maxLineSegments = isMobile ? 40 : 90;
    const linePositions = new Float32Array(maxLineSegments * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineMesh = new THREE.LineSegments(lineGeo, lineMat);
    worldGroup.add(lineMesh);

    // ─── Mouse Parallax Interaction ──────────────────────────────────────
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      mouseX = (e.clientX - halfW) / halfW;
      mouseY = (e.clientY - halfH) / halfH;
    };

    if (!prefersReducedMotion && !isMobile) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    // ─── Resize Handler ──────────────────────────────────────────────────
    const handleResize = () => {
      if (!container) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // ─── Animation Loop ──────────────────────────────────────────────────
    let animationFrameId: number;

    const animate = () => {
      if (!prefersReducedMotion) {
        // Slow ambient rotation
        icoMesh.rotation.x += 0.0012;
        icoMesh.rotation.y += 0.0018;

        octaMesh.rotation.x -= 0.0014;
        octaMesh.rotation.z += 0.001;

        dodecaMesh.rotation.y += 0.0009;
        dodecaMesh.rotation.z += 0.0011;

        torusMesh.rotation.y += 0.001;
        torusMesh.rotation.x += 0.0008;

        ringMesh1.rotation.z += 0.0004;
        ringMesh2.rotation.z -= 0.0003;

        // Slow node drift
        const posAttr = nodeGeo.attributes.position as THREE.BufferAttribute;
        const posArray = posAttr.array as Float32Array;

        for (let i = 0; i < nodeCount; i++) {
          posArray[i * 3] += nodeVelocities[i].x;
          posArray[i * 3 + 1] += nodeVelocities[i].y;
          posArray[i * 3 + 2] += nodeVelocities[i].z;

          // Soft boundary wrap
          if (Math.abs(posArray[i * 3]) > 10) nodeVelocities[i].x *= -1;
          if (Math.abs(posArray[i * 3 + 1]) > 6) nodeVelocities[i].y *= -1;
          if (Math.abs(posArray[i * 3 + 2]) > 5) nodeVelocities[i].z *= -1;
        }
        posAttr.needsUpdate = true;

        // Update constellation lines (connect nodes within distance)
        let lineIdx = 0;
        const linePos = (lineGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
        const connectionDistSq = isMobile ? 3.5 : 5.0;

        for (let i = 0; i < nodeCount && lineIdx < maxLineSegments * 6; i++) {
          const x1 = posArray[i * 3];
          const y1 = posArray[i * 3 + 1];
          const z1 = posArray[i * 3 + 2];

          for (let j = i + 1; j < nodeCount && lineIdx < maxLineSegments * 6; j++) {
            const x2 = posArray[j * 3];
            const y2 = posArray[j * 3 + 1];
            const z2 = posArray[j * 3 + 2];

            const dx = x1 - x2;
            const dy = y1 - y2;
            const dz = z1 - z2;
            const distSq = dx * dx + dy * dy + dz * dz;

            if (distSq < connectionDistSq) {
              linePos[lineIdx++] = x1;
              linePos[lineIdx++] = y1;
              linePos[lineIdx++] = z1;
              linePos[lineIdx++] = x2;
              linePos[lineIdx++] = y2;
              linePos[lineIdx++] = z2;
            }
          }
        }

        // Clear remaining line coordinates
        while (lineIdx < maxLineSegments * 6) {
          linePos[lineIdx++] = 0;
        }
        lineGeo.attributes.position.needsUpdate = true;

        // Smooth parallax damping
        targetX += (mouseX * 0.35 - targetX) * 0.03;
        targetY += (mouseY * 0.2 - targetY) * 0.03;

        worldGroup.rotation.y = targetX * 0.3;
        worldGroup.rotation.x = -targetY * 0.2;
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // ─── Cleanup ─────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose geometries
      gridHelper.geometry.dispose();
      ringGeo1.dispose();
      ringGeo2.dispose();
      icoGeo.dispose();
      octaGeo.dispose();
      dodecaGeo.dispose();
      torusGeo.dispose();
      nodeGeo.dispose();
      lineGeo.dispose();

      // Dispose materials
      (gridHelper.material as THREE.Material).dispose();
      ringMat1.dispose();
      ringMat2.dispose();
      icoMat.dispose();
      octaMat.dispose();
      dodecaMat.dispose();
      torusMat.dispose();
      nodeMat.dispose();
      lineMat.dispose();

      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
    />
  );
}
