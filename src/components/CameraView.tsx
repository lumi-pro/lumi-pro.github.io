/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { FillLightPreset, SplitMode } from '../types';
import { analyticsTracker } from '../utils/analytics';
import { Camera, CameraOff, RefreshCw, Grid3X3, AlertCircle, Sparkles } from 'lucide-react';
// @ts-ignore
import portraitImage from '../assets/images/portrait_simulate_1779326784414.png';

interface CameraViewProps {
  activePreset: FillLightPreset;
  splitMode: SplitMode;
  splitPresetLeft: FillLightPreset;
  splitPresetRight: FillLightPreset;
  brightness: number; // 0.1 to 1.0
  softness: number; // 0.1 to 1.0
  onBrightnessChange: (val: number) => void;
  onSoftnessChange: (val: number) => void;
  mirrorCamera: boolean;
  gridEnabled: boolean;
  useSimulatedPortrait: boolean;
  onSimulatedPortraitToggle: (val: boolean) => void;
  isPip?: boolean;
}

export const CameraView: React.FC<CameraViewProps> = ({
  activePreset,
  splitMode,
  splitPresetLeft,
  splitPresetRight,
  brightness,
  softness,
  onBrightnessChange,
  onSoftnessChange,
  mirrorCamera,
  gridEnabled,
  useSimulatedPortrait,
  onSimulatedPortraitToggle,
  isPip = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'requesting' | 'active' | 'denied' | 'error'>('requesting');
  const [isDragging, setIsDragging] = useState<'none' | 'adjusting'>('none');
  const dragStartRef = useRef<{ x: number; y: number; brightness: number; softness: number }>({ x: 0, y: 0, brightness: 0.8, softness: 0.5 });
  const [hudMessage, setHudMessage] = useState<{ visible: boolean; type: 'brightness' | 'softness'; value: number } | null>(null);
  const hudTimeoutRef = useRef<number | null>(null);

  // Initialize camera access
  useEffect(() => {
    if (useSimulatedPortrait) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      setCameraState('denied');
      return;
    }

    let activeStream: MediaStream | null = null;
    setCameraState('requesting');

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1080 },
            height: { ideal: 1440 }, // Front selfie optimized portrait aspect
          },
          audio: false,
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        setCameraState('active');
        analyticsTracker.track('camera_start', { success: true });
      } catch (err: any) {
        console.warn('Camera access denied or unavailable. Switching to default high-fidelity simulation portrait mode.', err);
        setCameraState('denied');
        onSimulatedPortraitToggle(true);
        analyticsTracker.track('camera_start', { success: false, error: err?.name || 'unknown' });
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [useSimulatedPortrait]);

  // Keep video source object in sync with active stream
  useEffect(() => {
    if (videoRef.current && stream && cameraState === 'active') {
      try {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
        videoRef.current.play().catch((playErr) => {
          console.warn('React video autoPlay failed or was interrupted:', playErr);
        });
      } catch (err) {
        console.error('Failed to bind mediaStream to video srcObject:', err);
      }
    }
  }, [stream, cameraState]);

  // Handle gesture controls for brightness & softness (which operates the fill light mechanics)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      brightness,
      softness,
    };
    setIsDragging('adjusting');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging !== 'adjusting') return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const newBrightness = Math.max(0.15, Math.min(1.0, dragStartRef.current.brightness - deltaY / 320));
    const newSoftness = Math.max(0.1, Math.min(1.0, dragStartRef.current.softness + deltaX / 320));

    const isVerticalDrag = Math.abs(deltaY) > Math.abs(deltaX);

    if (isVerticalDrag) {
      onBrightnessChange(parseFloat(newBrightness.toFixed(2)));
      showHud('brightness', newBrightness);
    } else {
      onSoftnessChange(parseFloat(newSoftness.toFixed(2)));
      showHud('softness', newSoftness);
    }
  };

  const handlePointerUp = () => {
    setIsDragging('none');
  };

  const showHud = (type: 'brightness' | 'softness', value: number) => {
    if (hudTimeoutRef.current) {
      window.clearTimeout(hudTimeoutRef.current);
    }
    setHudMessage({ visible: true, type, value });
    hudTimeoutRef.current = window.setTimeout(() => {
      setHudMessage((prev) => (prev ? { ...prev, visible: false } : null));
    }, 1200);
  };

  // Natural exposure booster styling for natural-looking illumination inside viewfinder
  const getCameraFilterStyle = () => {
    const contrastPct = 100 + (softness - 0.5) * 8; // gentle soft contrast adjustment (100% is natural)
    const saturatePct = 101; 
    const exposureBoost = 1.0 + (brightness - 0.5) * 0.16; // gentle lighting reflection boost
    return {
      filter: `contrast(${contrastPct}%) saturate(${saturatePct}%) brightness(${exposureBoost})`,
    };
  };

  if (isPip) {
    return (
      <div className="relative w-full h-full bg-[#1A1A1A] overflow-hidden select-none">
        {/* Full block with clean feed/portrait */}
        {cameraState === 'active' && !useSimulatedPortrait ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={getCameraFilterStyle()}
            className={`w-full h-full object-cover transition-all duration-300 ${
              mirrorCamera ? '-scale-x-100' : ''
            }`}
          />
        ) : (
          <div className="relative w-full h-full overflow-hidden">
            <img
              src={portraitImage}
              alt="Aesthetic Simulated Portrait"
              style={getCameraFilterStyle()}
              className="w-full h-full object-cover select-none transition-all duration-300"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Small subtle badge indicating floating cam feed */}
        <div className="absolute top-3 left-3 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[9px] font-sans text-white/95 tracking-wide">
          {cameraState === 'active' ? 'LIVE FEED / 前置镜头' : 'PREVIEW / 自拍镜头'}
        </div>

        {gridEnabled && (
          <div className="absolute inset-0 pointer-events-none opacity-30 z-35 bg-transparent">
            <div className="w-full h-full grid grid-cols-3 grid-rows-3">
              <div className="border-b border-r border-dashed border-white" />
              <div className="border-b border-r border-dashed border-white" />
              <div className="border-b border-dashed border-white" />
              <div className="border-b border-r border-dashed border-white" />
              <div className="border-b border-r border-dashed border-white" />
              <div className="border-b border-dashed border-white" />
              <div className="border-r border-dashed border-white" />
              <div className="border-r border-dashed border-white" />
              <div className="bg-transparent" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-full h-full bg-transparent overflow-hidden select-none cursor-move"
      id="selfie-camera-viewport"
    >
      
      {/* =========================================================
          Ⅱ. FLOATING VIEWPORT WINDOW (Natural reflection, no LUT)
          Floats over the glowing light backdrop as a centered card
          ========================================================= */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[72%] aspect-[3/4] max-h-[75%] rounded-[32px] border-4 border-white/95 shadow-[0_24px_55px_rgba(0,0,0,0.4),inset_0_0_12px_rgba(255,255,255,0.25)] overflow-hidden bg-neutral-900 z-30 transition-all duration-300 transform"
        style={{
          // Extra real subtle dynamic ambient backlight glow behind the viewfinder card
          boxShadow: `0 24px 55px rgba(0,0,0,0.4), 0 0 45px ${splitMode === 'none' ? activePreset.color : splitPresetLeft.color}55`
        }}
      >
        {/* Core Live Stream View / Sim */}
        {cameraState === 'active' && !useSimulatedPortrait ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={getCameraFilterStyle()}
            className={`w-full h-full object-cover transition-all duration-300 ${
              mirrorCamera ? '-scale-x-100' : ''
            }`}
          />
        ) : (
          <div className="relative w-full h-full overflow-hidden">
            <img
              src={portraitImage}
              alt="Aesthetic Simulated Portrait"
              style={getCameraFilterStyle()}
              className="w-full h-full object-cover select-none transition-all duration-300 transform scale-[1.02]"
              referrerPolicy="no-referrer"
            />
            
            {/* Simulation mode indicator banner */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-35 py-1 px-3 rounded-full bg-black/55 backdrop-blur-md border border-white/10 flex items-center gap-1.5 justify-center whitespace-nowrap scale-90">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFEFEA] animate-pulse" />
              <p className="text-[9px] text-white/95 font-medium tracking-wide">
                {cameraState === 'active' ? '自拍模拟器' : '模拟器模式'}
              </p>
            </div>
          </div>
        )}

        {/* Studio mirror ring glow reflection overlay inside visor to mimic ringlight looks */}
        <div className="absolute inset-0 pointer-events-none z-35 border-[6px] border-white/5 bg-gradient-to-tr from-white/[0.04] to-transparent" />

        {/* Camera guides/grid lines */}
        {gridEnabled && (
          <div className="absolute inset-0 pointer-events-none z-35 bg-transparent">
            {/* Simple Grid3x3 Layout Lines */}
            <div className="w-full h-full border-collapse grid grid-cols-3 grid-rows-3 opacity-30">
              <div className="border-b border-r border-dashed border-white/50" />
              <div className="border-b border-r border-dashed border-white/50" />
              <div className="border-b border-dashed border-white/50" />
              <div className="border-b border-r border-dashed border-white/50" />
              <div className="border-b border-r border-dashed border-white/50" />
              <div className="border-b border-dashed border-white/50" />
              <div className="border-r border-dashed border-white/50" />
              <div className="border-r border-dashed border-white/50" />
              <div className="bg-transparent" />
            </div>
          </div>
        )}
      </div>


      {/* =========================================================
          Ⅲ. MINIMALIST GESTURE FLOATING HINTS & HUD
          ========================================================= */}
      
      {/* 1. Gesture HUD popup panel (Apple-like design) */}
      {hudMessage && hudMessage.visible && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 transition-opacity duration-300">
          <div className="px-5 py-3 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 flex flex-col items-center gap-1.5 shadow-2xl scale-95 transition-all">
            <span className="text-white/60 font-sans text-[10px] tracking-widest uppercase">
              {hudMessage.type === 'brightness' ? '高亮补光' : '柔和光温'}
            </span>
            <span className="text-white text-lg font-heading font-semibold tracking-wider">
              {Math.round(hudMessage.value * 100)}%
            </span>
            {/* Visual mini glow indicator progress bar */}
            <div className="w-24 h-1 bg-white/15 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{ 
                  width: `${hudMessage.value * 100}%`,
                  boxShadow: '0 0 8px rgba(255,255,255,0.8)'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Floating instruction watermark hint */}
      <div className="absolute bottom-4 left-0 right-0 z-30 flex justify-center pointer-events-none">
        <span className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] text-white/70 tracking-widest font-sans uppercase">
          {splitMode !== 'none' ? '↕ 调节总亮度 | 🌗 双色棚温混配' : '↕ 补光亮度 | ↔ 左右温润柔和'}
        </span>
      </div>

    </div>
  );
};
