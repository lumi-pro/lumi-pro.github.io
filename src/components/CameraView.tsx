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
  onAmbientDetected?: (stats: {
    brightness: number;
    warmth: number;
    faceBrightness: number;
    bgBrightness: number;
    underEyeShadow: number;
    backlightRatio: number;
    isYellowLight: boolean;
    skinToneWarmth: number;
    contrastRatio: number;
  }) => void;
  simulatedScenario?: string;
  intensityLevel?: 'soft' | 'normal' | 'rich' | 'studio';
  aiDiagnostic?: boolean;
  isScanning?: boolean;
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
  onAmbientDetected,
  simulatedScenario = 'none',
  intensityLevel = 'normal',
  aiDiagnostic = false,
  isScanning = false,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'requesting' | 'active' | 'denied' | 'error'>('requesting');
  const [isDragging, setIsDragging] = useState<'none' | 'adjusting'>('none');
  const dragStartRef = useRef<{ x: number; y: number; brightness: number; softness: number }>({ x: 0, y: 0, brightness: 0.8, softness: 0.5 });
  const [hudMessage, setHudMessage] = useState<{ visible: boolean; type: 'brightness' | 'softness'; value: number } | null>(null);
  const hudTimeoutRef = useRef<number | null>(null);

  // Real-time AI Vision telemetry states
  const [faceBrightness, setFaceBrightness] = useState<number>(125);
  const [bgBrightness, setBgBrightness] = useState<number>(115);
  const [underEyeShadow, setUnderEyeShadow] = useState<number>(92);
  const [backlightRatio, setBacklightRatio] = useState<number>(0.92);
  const [isYellowLight, setIsYellowLight] = useState<boolean>(false);
  const [skinToneWarmth, setSkinToneWarmth] = useState<number>(1.02);
  const [contrastRatio, setContrastRatio] = useState<number>(30);

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

  // Real-time canvas frame analysis for environment detection (Brightness and warmth/RGB ratio)
  useEffect(() => {
    if (useSimulatedPortrait || cameraState !== 'active' || !videoRef.current || !onAmbientDetected) {
      return;
    }

    let active = true;
    const analyzeCanvas = document.createElement('canvas');
    analyzeCanvas.width = 16;
    analyzeCanvas.height = 16;
    const analyzeCtx = analyzeCanvas.getContext('2d');

    const interval = setInterval(() => {
      if (!active || !videoRef.current || useSimulatedPortrait) return;
      try {
        const video = videoRef.current;
        if (video.videoWidth === 0 || video.videoHeight === 0) return;
        
        analyzeCtx?.drawImage(video, 0, 0, 16, 16);
        const imgData = analyzeCtx?.getImageData(0, 0, 16, 16);
        if (!imgData) return;

        let centerR = 0, centerG = 0, centerB = 0, centerLuma = 0, centerCount = 0;
        let outerR = 0, outerG = 0, outerB = 0, outerLuma = 0, outerCount = 0;
        let eyeR = 0, eyeG = 0, eyeB = 0, eyeLuma = 0, eyeCount = 0;
        let maxLuma = 0, minLuma = 255;

        const pixels = imgData.data;
        for (let row = 0; row < 16; row++) {
          for (let col = 0; col < 16; col++) {
            const idx = (row * 16 + col) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;

            // Face Region (4..11, 4..11)
            const isCenter = row >= 4 && row <= 11 && col >= 4 && col <= 11;
            if (isCenter) {
              centerR += r;
              centerG += g;
              centerB += b;
              centerLuma += luma;
              centerCount++;
              if (luma > maxLuma) maxLuma = luma;
              if (luma < minLuma) minLuma = luma;
              
              // Under eye shadow region (rows 7..9, cols 5..10 inside face)
              const isEye = row >= 7 && row <= 9 && col >= 5 && col <= 10;
              if (isEye) {
                eyeR += r;
                eyeG += g;
                eyeB += b;
                eyeLuma += luma;
                eyeCount++;
              }
            } else {
              outerR += r;
              outerG += g;
              outerB += b;
              outerLuma += luma;
              outerCount++;
            }
          }
        }

        const avgFaceR = centerR / (centerCount || 1);
        const avgFaceG = centerG / (centerCount || 1);
        const avgFaceB = centerB / (centerCount || 1);
        const avgFaceLuma = centerLuma / (centerCount || 1);

        const avgBgR = outerR / (outerCount || 1);
        const avgBgG = outerG / (outerCount || 1);
        const avgBgB = outerB / (outerCount || 1);
        const avgBgLuma = outerLuma / (outerCount || 1);

        const avgEyeLuma = eyeLuma / (eyeCount || 1);

        // Compute diagnostics
        const calculatedBacklightRatio = avgBgLuma / (avgFaceLuma + 1);
        const calculatedSkinToneWarmth = avgFaceR / (avgFaceB + 1);
        const calculatedContrastRatio = maxLuma - minLuma;
        const calculatedIsYellowLight = avgBgR > 1.25 * avgBgB && avgBgG > 1.15 * avgBgB;
        // Under-eye shadow index: eye depth compared to overall face
        const calculatedUnderEyeShadow = Math.round((avgEyeLuma / (avgFaceLuma + 1)) * 100);

        setFaceBrightness(Math.round(avgFaceLuma));
        setBgBrightness(Math.round(avgBgLuma));
        setUnderEyeShadow(calculatedUnderEyeShadow);
        setBacklightRatio(parseFloat(calculatedBacklightRatio.toFixed(2)));
        setIsYellowLight(calculatedIsYellowLight);
        setSkinToneWarmth(parseFloat(calculatedSkinToneWarmth.toFixed(2)));
        setContrastRatio(Math.round(calculatedContrastRatio));

        onAmbientDetected({
          brightness: Math.round(avgFaceLuma),
          warmth: parseFloat(calculatedSkinToneWarmth.toFixed(2)),
          faceBrightness: Math.round(avgFaceLuma),
          bgBrightness: Math.round(avgBgLuma),
          underEyeShadow: calculatedUnderEyeShadow,
          backlightRatio: parseFloat(calculatedBacklightRatio.toFixed(2)),
          isYellowLight: calculatedIsYellowLight,
          skinToneWarmth: parseFloat(calculatedSkinToneWarmth.toFixed(2)),
          contrastRatio: Math.round(calculatedContrastRatio),
        });
      } catch (err) {
        console.warn('Real-time frame metric calculation skip:', err);
      }
    }, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [cameraState, useSimulatedPortrait, stream, onAmbientDetected]);

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
    const intensityModifier = 
      intensityLevel === 'soft' ? -0.06 :
      intensityLevel === 'normal' ? 0 :
      intensityLevel === 'rich' ? 0.08 :
      0.16; // Studio master continuous high key power!

    const contrastPct = 96 - (softness - 0.5) * 8; // gentle soft contrast drop for smooth skin tone integration
    const saturatePct = 103 + (brightness - 0.5) * 6; // slightly healthier lip/cheek pink balance
    const exposureBoost = 1.05 + (brightness - 0.5) * 0.28 + intensityModifier; // high illumination boost for darker environments
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
      {/* Visual Environment Simulator Overlay */}
      {simulatedScenario && simulatedScenario !== 'none' && (
        <div 
          className="absolute inset-0 pointer-events-none z-20 transition-all duration-700 animate-fade-in"
          style={{
            background: 
              simulatedScenario === 'dark_warm' ? 'rgba(217, 119, 6, 0.16)' :
              simulatedScenario === 'warm_restaurant' ? 'rgba(251, 146, 60, 0.1)' :
              simulatedScenario === 'night_cool' ? 'rgba(30, 58, 138, 0.2)' :
              simulatedScenario === 'dull' ? 'rgba(100, 116, 139, 0.12)' :
              simulatedScenario === 'daylight_bright' ? 'rgba(56, 189, 248, 0.04)' : 'transparent',
            backdropFilter:
              simulatedScenario === 'dark_warm' ? 'brightness(0.72) sepia(0.25) saturate(1.15) contrast(1.05)' :
              simulatedScenario === 'warm_restaurant' ? 'brightness(0.95) sepia(0.12) saturate(1.1) contrast(1.0)' :
              simulatedScenario === 'night_cool' ? 'brightness(0.68) saturate(0.85) hue-rotate-[10deg]' :
              simulatedScenario === 'dull' ? 'brightness(0.88) saturate(0.78) contrast(1.01)' :
              simulatedScenario === 'daylight_bright' ? 'brightness(1.18) saturate(1.05) contrast(1.03)' : 'none',
            WebkitBackdropFilter: 
              simulatedScenario === 'dark_warm' ? 'brightness(0.72) sepia(0.25) saturate(1.15) contrast(1.05)' :
              simulatedScenario === 'warm_restaurant' ? 'brightness(0.95) sepia(0.12) saturate(1.1) contrast(1.0)' :
              simulatedScenario === 'night_cool' ? 'brightness(0.68) saturate(0.85) hue-rotate-[10deg]' :
              simulatedScenario === 'dull' ? 'brightness(0.88) saturate(0.78) contrast(1.01)' :
              simulatedScenario === 'daylight_bright' ? 'brightness(1.18) saturate(1.05) contrast(1.03)' : 'none',
          }}
        />
      )}
      
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
        </div>
      )}

      {/* Gentle ambient color light bounce projection overlay (extremely subtle, no wash out) */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-color transition-opacity duration-300 z-15"
        style={{
          background: splitMode === 'none'
            ? `radial-gradient(circle at 50% 45%, ${activePreset.color}db 0%, transparent 68%)`
            : `linear-gradient(to right, ${splitPresetLeft.color}bf 0%, rgba(255,255,255,0.2) 50%, ${splitPresetRight.color}bf 100%)`,
          opacity: brightness * 0.08 * (
            intensityLevel === 'soft' ? 0.45 :
            intensityLevel === 'normal' ? 1.0 :
            intensityLevel === 'rich' ? 1.70 :
            2.50
          ),
        }}
      />


      {/* Subtle skin smoothing glow halo booster (translucent high key feeling) */}
      <div 
        className="absolute inset-0 pointer-events-none mix-blend-soft-light transition-opacity duration-500 z-12"
        style={{
          background: 'linear-gradient(210deg, rgba(255,255,255,0.4) 0%, transparent 70%)',
          opacity: brightness * 0.2 * (
            intensityLevel === 'soft' ? 0.6 :
            intensityLevel === 'normal' ? 1.0 :
            intensityLevel === 'rich' ? 1.5 :
            2.1
          ),
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

      {/* Real-time AI Vision Sensor HUD Overlay */}
      {aiDiagnostic && (
        <div className="absolute inset-0 z-30 pointer-events-none select-none font-sans">
          {/* Scanning Box Corner brackets */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-44 border border-indigo-500/20 rounded-md flex items-center justify-center">
            {/* Real-time scanning line */}
            <div className="absolute w-full h-[1.5px] bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-[scan_2.5s_infinite_linear]" />
            
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#10B981]" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#10B981]" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#10B981]" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#10B981]" />
            
            <span className="absolute -top-4 text-[7px] text-[#10B981] font-bold tracking-widest bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
              {language === 'zh' ? '✨ 智能人脸对焦极速捕捉中' : '✨ OPTICAL FOCUS ACTIVE'}
            </span>
          </div>

          {/* Loading scan state */}
          {isScanning && (
            <div className="absolute inset-0 bg-indigo-950/30 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2 transition-all">
              <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
              <span className="text-[10px] tracking-widest text-[#A6B5FF] uppercase font-bold animate-pulse">
                {language === 'zh' ? '正在智能生成最美补光方案...' : 'LUMI AI ANALYZING ENVIRONMENT...'}
              </span>
            </div>
          )}
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



    </div>
  );
});
