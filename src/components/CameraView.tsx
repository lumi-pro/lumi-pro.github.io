/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
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
  language?: string;
}

export const CameraView = forwardRef<{ capture: () => Promise<string> }, CameraViewProps>(({
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
  language = 'zh',
}, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'requesting' | 'active' | 'denied' | 'error'>('requesting');
  const [isDragging, setIsDragging] = useState<'none' | 'adjusting'>('none');
  const dragStartRef = useRef<{ x: number; y: number; brightness: number; softness: number }>({ x: 0, y: 0, brightness: 0.8, softness: 0.5 });
  const [hudMessage, setHudMessage] = useState<{ visible: boolean; type: 'brightness' | 'softness'; value: number } | null>(null);
  const hudTimeoutRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    capture: async () => {
      const canvas = document.createElement('canvas');
      const width = 1080;
      const height = 1440;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }

      // Draw the raw un-filtered base image or video
      if (cameraState === 'active' && !useSimulatedPortrait && videoRef.current) {
        const video = videoRef.current;
        const videoW = video.videoWidth;
        const videoH = video.videoHeight;
        
        ctx.save();
        if (mirrorCamera) {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
        }
        
        if (videoW && videoH) {
          // Centered crop (simulate object-cover) to maintain original aspect ratio without stretching
          const targetAspect = width / height; // 3:4 = 0.75
          const videoAspect = videoW / videoH;
          
          let sx = 0;
          let sy = 0;
          let sWidth = videoW;
          let sHeight = videoH;
          
          if (videoAspect > targetAspect) {
            // Video is wider than 3:4 -> Crop horizontally
            sWidth = videoH * targetAspect;
            sx = (videoW - sWidth) / 2;
          } else {
            // Video is taller than 3:4 -> Crop vertically
            sHeight = videoW / targetAspect;
            sy = (videoH - sHeight) / 2;
          }
          
          ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, width, height);
        } else {
          ctx.drawImage(video, 0, 0, width, height);
        }
        ctx.restore();
      } else {
        // Draw raw simulated portrait image
        const img = new Image();
        img.src = portraitImage;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // avoid hanging if image loading fails
        });
        
        ctx.save();
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;
        if (imgW && imgH) {
          const targetAspect = width / height;
          const imgAspect = imgW / imgH;
          
          let sx = 0;
          let sy = 0;
          let sWidth = imgW;
          let sHeight = imgH;
          
          if (imgAspect > targetAspect) {
            sWidth = imgH * targetAspect;
            sx = (imgW - sWidth) / 2;
          } else {
            sHeight = imgW / targetAspect;
            sy = (imgH - sHeight) / 2;
          }
          
          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, width, height);
        } else {
          ctx.drawImage(img, 0, 0, width, height);
        }
        ctx.restore();
      }

      return canvas.toDataURL('image/jpeg', 0.96);
    }
  }));

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
    const contrastPct = 96 - (softness - 0.5) * 8; // gentle soft contrast drop for smooth skin tone integration
    const saturatePct = 103 + (brightness - 0.5) * 6; // slightly healthier lip/cheek pink balance
    const exposureBoost = 1.05 + (brightness - 0.5) * 0.28; // high illumination boost for darker environments
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
      
      {/* Core Live Stream View / Sim */}
      {cameraState === 'active' && !useSimulatedPortrait ? (
        <div className="w-full h-full relative">
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
          
          {/* Real-time Defocus Bloom layer to simulate physical mist skin-smoothing filter */}
          <div 
            className="absolute inset-0 pointer-events-none mix-blend-screen opacity-0 transition-opacity duration-300"
            style={{
              opacity: softness * 0.38,
            }}
          >
            <video
              autoPlay
              playsInline
              muted
              style={{
                ...getCameraFilterStyle(),
                filter: `${getCameraFilterStyle().filter} blur(6px) saturate(108%)`,
              }}
              className={`w-full h-full object-cover ${mirrorCamera ? '-scale-x-100' : ''}`}
            />
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full overflow-hidden">
          <img
            src={portraitImage}
            alt="Aesthetic Simulated Portrait"
            style={getCameraFilterStyle()}
            className="w-full h-full object-cover select-none transition-all duration-300 transform scale-[1.01]"
            referrerPolicy="no-referrer"
          />
          
          {/* Real-time Defocus Bloom layer on simulator image to show luxurious creamy skin texture */}
          <div 
            className="absolute inset-0 pointer-events-none mix-blend-screen transition-opacity duration-300"
            style={{
              opacity: softness * 0.38,
            }}
          >
            <img
              src={portraitImage}
              alt=""
              style={{
                ...getCameraFilterStyle(),
                filter: `${getCameraFilterStyle().filter} blur(5px) saturate(108%)`,
              }}
              className="w-full h-full object-cover transform scale-[1.01]"
            />
          </div>
          
          {/* Simulation mode indicator banner */}
          <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-35 py-1 px-3.5 rounded-full bg-white/25 backdrop-blur-md border border-white/20 flex items-center gap-1.5 justify-center whitespace-nowrap scale-85">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFEFEA] animate-pulse" />
            <p className="text-[9px] text-white/95 font-sans tracking-wider font-semibold uppercase">
              {cameraState === 'active' ? 'INTELLIGENT MIRROR' : 'LUMI PREVIEW'}
            </p>
          </div>
        </div>
      )}

      {/* Gentle ambient color light bounce projection overlay (extremely subtle, no wash out) */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-color transition-opacity duration-300 z-15"
        style={{
          background: splitMode === 'none'
            ? `radial-gradient(circle at 50% 45%, ${activePreset.color}db 0%, transparent 68%)`
            : `linear-gradient(to right, ${splitPresetLeft.color}bf 0%, rgba(255,255,255,0.2) 50%, ${splitPresetRight.color}bf 100%)`,
          opacity: brightness * 0.08,
        }}
      />

      {/* Premium Under-eye & shadow corrector vector glow for facial light lift */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-300 z-18"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.3) 25%, transparent 65%)',
          opacity: brightness * softness * 0.35,
        }}
      />

      {/* Subtle skin smoothing glow halo booster (translucent high key feeling) */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-soft-light transition-opacity duration-500 z-12"
        style={{
          background: 'linear-gradient(210deg, rgba(255,255,255,0.4) 0%, transparent 70%)',
          opacity: brightness * 0.2,
        }}
      />

      {/* Camera guides/grid lines */}
      {gridEnabled && (
        <div className="absolute inset-0 pointer-events-none z-35 bg-transparent">
          {/* Simple Grid3x3 Layout Lines */}
          <div className="w-full h-full border-collapse grid grid-cols-3 grid-rows-3 opacity-20">
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


      {/* =========================================================
          Ⅲ. MINIMALIST GESTURE FLOATING HINTS & HUD
          ========================================================= */}
      
      {/* 1. Gesture HUD popup panel (Apple-like design) */}
      {hudMessage && hudMessage.visible && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 transition-opacity duration-300">
          <div className="px-5 py-3 rounded-2xl bg-black/75 backdrop-blur-md border border-white/10 flex flex-col items-center gap-1.5 shadow-2xl scale-95 transition-all">
            <span className="text-white/60 font-sans text-[10px] tracking-widest uppercase">
              {hudMessage.type === 'brightness' ? '高亮补光' : '温润肤色'}
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

      {/* 2. Floating instruction watermark hints (Separated left and right to prevent blocking the face) */}
      <div className="absolute bottom-4 left-4 right-4 z-30 flex justify-between items-center pointer-events-none gap-2">
        <span className="px-3 py-1.5 rounded-full bg-white/20 border border-white/10 backdrop-blur-md text-[9.5px] text-[#2D2D2D] font-sans font-medium tracking-wide shadow-sm flex items-center gap-1">
          {language === 'zh' ? '↕ 补发光亮度' : '↕ Light Intensity'}
        </span>
        <span className="px-3 py-1.5 rounded-full bg-white/20 border border-white/10 backdrop-blur-md text-[9.5px] text-[#2D2D2D] font-sans font-medium tracking-wide shadow-sm flex items-center gap-1">
          {splitMode !== 'none' 
            ? (language === 'zh' ? '↔ 左右温区混配' : '↔ Split Zone Mix')
            : (language === 'zh' ? '↔ 智能温润柔和' : '↔ Soft Skin Style')
          }
        </span>
      </div>

    </div>
  );
});
