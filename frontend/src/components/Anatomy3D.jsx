import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { User, Activity, AlertCircle } from 'lucide-react';

export default function Anatomy3D({ selectedSystem, onSelectSystem, biometrics }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Dimensions
    const width = currentMount.clientWidth;
    const height = 340;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    // Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Anatomical Body Root
    const bodyGroup = new THREE.Group();

    // Material with NASA Holographic Cyber Look
    const baseMat = new THREE.MeshPhongMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.45,
      wireframe: true,
    });
    const highlightMat = new THREE.MeshPhongMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.85,
    });

    // 1. Head (Neuro-Ophthalmic / SANS)
    const headGeo = new THREE.SphereGeometry(0.55, 24, 24);
    const headMesh = new THREE.Mesh(headGeo, selectedSystem === 'NEURO_OPHTHALMIC' ? highlightMat : baseMat);
    headMesh.position.y = 2.4;
    bodyGroup.add(headMesh);

    // 2. Chest & Heart (Cardiovascular)
    const torsoGeo = new THREE.CylinderGeometry(0.8, 0.65, 1.8, 20);
    const torsoMesh = new THREE.Mesh(torsoGeo, selectedSystem === 'CARDIOVASCULAR' ? highlightMat : baseMat);
    torsoMesh.position.y = 1.0;
    bodyGroup.add(torsoMesh);

    // 3. Spine / Pelvis / Legs (Musculoskeletal / Bone Density)
    const pelvisGeo = new THREE.CylinderGeometry(0.65, 0.6, 0.7, 16);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, selectedSystem === 'MUSCULOSKELETAL' ? highlightMat : baseMat);
    pelvisMesh.position.y = -0.15;
    bodyGroup.add(pelvisMesh);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.2, 0.15, 2.0, 16);
    const leftLeg = new THREE.Mesh(legGeo, selectedSystem === 'MUSCULOSKELETAL' ? highlightMat : baseMat);
    leftLeg.position.set(-0.35, -1.45, 0);
    const rightLeg = new THREE.Mesh(legGeo, selectedSystem === 'MUSCULOSKELETAL' ? highlightMat : baseMat);
    rightLeg.position.set(0.35, -1.45, 0);
    bodyGroup.add(leftLeg, rightLeg);

    scene.add(bodyGroup);

    // Animation Loop (Slow Hologram Rotation)
    let animationFrameId;
    const animate = () => {
      bodyGroup.rotation.y += 0.007;
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [selectedSystem]);

  return (
    <div className="hud-panel p-5 flex flex-col">
      <div className="hud-corner-tl" /><div className="hud-corner-br" />
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <User className="w-4 h-4" /> Modèle Anatomique 3D Interactif
          </span>
          <p className="text-xs text-slate-400 font-mono">Biomarqueurs HRP & Détection Syndrome SANS</p>
        </div>

        {/* Quick System Selector */}
        <div className="flex flex-wrap gap-1 font-mono text-[11px]">
          <button 
            onClick={() => onSelectSystem('NEURO_OPHTHALMIC')}
            className={`px-2.5 py-1 rounded transition border ${selectedSystem === 'NEURO_OPHTHALMIC' ? 'bg-cyan-950 text-cyan-300 border-cyan-400' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
          >
            Cerveau / SANS
          </button>
          <button 
            onClick={() => onSelectSystem('CARDIOVASCULAR')}
            className={`px-2.5 py-1 rounded transition border ${selectedSystem === 'CARDIOVASCULAR' ? 'bg-cyan-950 text-cyan-300 border-cyan-400' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
          >
            Cœur / Vaisseaux
          </button>
          <button 
            onClick={() => onSelectSystem('MUSCULOSKELETAL')}
            className={`px-2.5 py-1 rounded transition border ${selectedSystem === 'MUSCULOSKELETAL' ? 'bg-cyan-950 text-cyan-300 border-cyan-400' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
          >
            Os / Squelette
          </button>
          <button 
            onClick={() => onSelectSystem('IMMUNE')}
            className={`px-2.5 py-1 rounded transition border ${selectedSystem === 'IMMUNE' ? 'bg-cyan-950 text-cyan-300 border-cyan-400' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
          >
            Immunitaire
          </button>
        </div>
      </div>

      {/* 3D Viewport */}
      <div ref={mountRef} className="w-full h-[340px] bg-slate-950/80 rounded-lg border border-slate-800 relative overflow-hidden flex items-center justify-center">
        <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400 bg-slate-950/70 px-2 py-1 rounded border border-cyan-500/20 pointer-events-none">
          Rotation Holographique Continue • Système actif : {selectedSystem}
        </div>
      </div>

      {/* Biometric Readings Drawer */}
      <div className="mt-4 bg-slate-900/90 p-4 rounded-lg border border-slate-800 font-mono text-xs">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-cyan-300 uppercase">Données Cliniques Télémétriques HRP</span>
          <span className="text-[10px] text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">Connecté Supabase</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">PRESSION INTRACRÂNIENNE</div>
            <div className="text-base font-bold text-amber-400 mt-0.5">14.2 mmHg <span className="text-[10px] font-normal text-slate-500">(Normal: 10-15)</span></div>
          </div>
          <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">ŒDÈME PAPILLAIRE (SANS)</div>
            <div className="text-base font-bold text-cyan-300 mt-0.5">Grade 1 <span className="text-[10px] font-normal text-slate-500">(Frisén 0-4)</span></div>
          </div>
          <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">ACTIVITÉ LYMPHOCYTES T</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">0.88 <span className="text-[10px] font-normal text-slate-500">(Index Ref: 1.0)</span></div>
          </div>
          <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">RÉACTIVATION VIRALE (VZV/EBV)</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">NÉGATIF</div>
          </div>
        </div>
      </div>
    </div>
  );
}
