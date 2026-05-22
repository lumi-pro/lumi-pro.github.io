/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { CameraView } from './components/CameraView';
import { PresetSelector } from './components/PresetSelector';
import { SettingsModal } from './components/SettingsModal';
import { FILL_LIGHT_PRESETS } from './presets';
import { FillLightPreset, SplitMode, AppSettings, CapturedPhoto } from './types';
import { analyticsTracker } from './utils/analytics';
import {
  Camera,
  Settings,
  Sparkles,
  Columns,
  Maximize2,
  Grid,
  TrendingUp,
  RotateCw,
  Heart,
  Volume2,
  Minimize2,
  Activity,
  Award,
  BookOpen,
  MousePointerClick,
  Trash2
} from 'lucide-react';

export default function App() {
  // Primary States
  const [activePreset, setActivePreset] = useState<FillLightPreset>(FILL_LIGHT_PRESETS[0]);
  const [splitMode, setSplitMode] = useState<SplitMode>('none');
  const [splitPresetLeft, setSplitPresetLeft] = useState<FillLightPreset>(FILL_LIGHT_PRESETS[1]); // 初恋粉
  const [splitPresetRight, setSplitPresetRight] = useState<FillLightPreset>(FILL_LIGHT_PRESETS[2]); // 冷白皮
  const [selectedSplitSide, setSelectedSplitSide] = useState<'left' | 'right'>('left');

  const [brightness, setBrightness] = useState<number>(0.85); // 15% to 100%
  const [softness, setSoftness] = useState<number>(0.65); // Color saturation/dilution

  // Simulated Hardware & Settings States
  const [settings, setSettings] = useState<AppSettings>({
    language: 'zh',
    hapticFeedback: true,
    guideOverlay: true,
    gridEnabled: false,
    mirrorCamera: true,
    highQualityStream: true,
  });

  const [useSimulatedPortrait, setUseSimulatedPortrait] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'camera' | 'settings' | 'analytics'>('camera');
  const [viewfinderSize, setViewfinderSize] = useState<'standard' | 'compact' | 'circle'>('compact');
  
  // Real-world External Full Screen Glow (Actual softbox light)
  const [physicalGlowActive, setPhysicalGlowActive] = useState<boolean>(false);
  const [flashTriggered, setFlashTriggered] = useState<boolean>(false);
  
  // Simulated photo gallery thumbnail from camera screenshots (connected to local storage)
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>(() => {
    try {
      const saved = localStorage.getItem('lumi_captured_photos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item, idx) => {
            if (typeof item === 'string') {
              return {
                id: item,
                timestamp: Date.now() - idx * 60000,
                presetColor: '#FFEFEA',
                presetName: '初恋粉',
                splitMode: 'none',
                brightness: 0.85,
                softness: 0.65,
              } as CapturedPhoto;
            }
            return item;
          });
        }
      }
    } catch (e) {
      console.error('Failed to load photos from local storage', e);
    }
    return [];
  });
  const [showPhotoViewer, setShowPhotoViewer] = useState<boolean>(false);
  const [activeViewPhoto, setActiveViewPhoto] = useState<CapturedPhoto | null>(null);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Live timer for tracking user session time in secondary console
  const [sessionTime, setSessionTime] = useState<number>(0);

  // Debounce tracking helpers for gesture swipes to avoid flooding analytics events
  const analyticsTimeoutRef = useRef<{ brightness?: number; softness?: number }>({});
  const mainCameraRef = useRef<{ capture: () => Promise<string> } | null>(null);

  // Trigger sound effect generators
  const playSound = (type: 'shutter' | 'click' | 'focus') => {
    if (!settings.hapticFeedback) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (type === 'shutter') {
        // Synthesizes a mechanical DSLR crisp click
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.05);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.12);
        
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'click') {
        // Synthesizes an Apple iOS subtle touch tick
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(450, audioCtx.currentTime + 0.01);
        
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.02);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.03);
      } else if (type === 'focus') {
        // Minimal subtle dual chime
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(audioCtx.currentTime + 0.18);
        osc2.stop(audioCtx.currentTime + 0.18);
      }
    } catch (e) {
      // Audio engine muted by system focus policy
    }
  };

  // Launch tracking on startups (exactly once on mount)
  useEffect(() => {
    analyticsTracker.track('app_launch', {
      time: new Date().toLocaleTimeString(),
      device: 'Simulator (iOS 16+ Web Sandbox)',
      lang: settings.language,
    });
  }, []);

  // Separate session timer to avoid repeating app_launch and interval resets
  useEffect(() => {
    const secTimer = setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(secTimer);
    };
  }, []);

  // Track a standard stay time ping every 10s to simulate active engagement levels
  useEffect(() => {
    if (sessionTime > 0 && sessionTime % 10 === 0) {
      analyticsTracker.track('duration_ping', { stayTimeSec: sessionTime });
    }
  }, [sessionTime]);

  const handlePresetSelect = (preset: FillLightPreset) => {
    playSound('click');
    setActivePreset(preset);
    analyticsTracker.track('preset_change', {
      presetId: preset.id,
      presetName: preset.name,
      mode: 'single',
    });
  };

  const handleSplitPresetSelect = (preset: FillLightPreset, side: 'left' | 'right') => {
    playSound('click');
    if (side === 'left') {
      setSplitPresetLeft(preset);
    } else {
      setSplitPresetRight(preset);
    }
    analyticsTracker.track('split_preset_change', {
      side,
      presetId: preset.id,
      presetName: preset.name,
      pairedWith: side === 'left' ? splitPresetRight.id : splitPresetLeft.id,
    });
  };

  const handleBrightnessChange = (val: number) => {
    setBrightness(val);
    
    // Debounce the analytics event to prevent flooding tracking history on sliding
    if (analyticsTimeoutRef.current.brightness) {
      window.clearTimeout(analyticsTimeoutRef.current.brightness);
    }
    analyticsTimeoutRef.current.brightness = window.setTimeout(() => {
      analyticsTracker.track('brightness_change', { value: val });
    }, 1000);
  };

  const handleSoftnessChange = (val: number) => {
    setSoftness(val);

    if (analyticsTimeoutRef.current.softness) {
      window.clearTimeout(analyticsTimeoutRef.current.softness);
    }
    analyticsTimeoutRef.current.softness = window.setTimeout(() => {
      analyticsTracker.track('softness_change', { value: val });
    }, 1000);
  };

  const handleSplitToggle = () => {
    playSound('click');
    let nextMode: SplitMode = 'none';
    if (splitMode === 'none') {
      nextMode = 'horizontal';
    } else if (splitMode === 'horizontal') {
      nextMode = 'vertical';
    } else {
      nextMode = 'none';
    }
    setSplitMode(nextMode);
    analyticsTracker.track('split_toggle', {
      activated: nextMode !== 'none',
      mode: nextMode,
    });
  };

  // Physically take simulated screenshot / snapshot of face filter
  const handleShutterSnap = async () => {
    if (flashTriggered) return;
    playSound('shutter');
    setFlashTriggered(true);
    
    let photoUrlString: string | undefined = undefined;
    try {
      if (mainCameraRef.current) {
        photoUrlString = await mainCameraRef.current.capture();
      }
    } catch (err) {
      console.error('Failed to capture raw frame:', err);
    }

    // Simulate screenshot flash effect
    setTimeout(() => {
      setFlashTriggered(false);
      
      // Save simulated portrait image to internal photo album roll
      // To give visual evidence, we generate a beautiful canvas thumbnail reflecting active color filters!
      const newPhoto: CapturedPhoto = {
        id: `photo_${Date.now()}`,
        timestamp: Date.now(),
        presetColor: activePreset.color,
        presetName: activePreset.name,
        splitMode: splitMode,
        splitLeftColor: splitMode !== 'none' ? splitPresetLeft.color : undefined,
        splitRightColor: splitMode !== 'none' ? splitPresetRight.color : undefined,
        brightness: brightness,
        softness: softness,
        cameraFilterClass: activePreset.cameraFilterClass,
        photoUrl: photoUrlString,
      };

      setCapturedPhotos((prev) => {
        const updated = [newPhoto, ...prev];
        try {
          localStorage.setItem('lumi_captured_photos', JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to save to local storage', e);
        }
        return updated;
      });
      
      // Auto-preview immediate fluid post-take workflow (no interruption!)
      setActiveViewPhoto(newPhoto);
      setShowPhotoViewer(true);
      showToast(isZh ? "✨ 奶油微光透薄自拍照捕获成功，已自动载入胶片预览册！" : "✨ Beautiful look captured! Saved to album preview.");

      analyticsTracker.track('snapshot_captured', {
        preset: splitMode === 'none' ? activePreset.id : `${splitPresetLeft.id}_${splitPresetRight.id}`,
        splitMode,
        brightness,
        softness,
        mirror: settings.mirrorCamera,
      });
    }, 300);
  };

  const isZh = settings.language === 'zh';

  // Toggle simulation versus physical web box
  const handleToggleSimulatedCamera = (val: boolean) => {
    setUseSimulatedPortrait(val);
    analyticsTracker.track('camera_source_changed', { mode: val ? 'simulation' : 'hardware_camera' });
  };

  // Delete specific snapshot and update persistent local storage
  const handleDeletePhoto = (photoId: string) => {
    playSound('click');
    const updated = capturedPhotos.filter(p => p.id !== photoId);
    setCapturedPhotos(updated);
    try {
      localStorage.setItem('lumi_captured_photos', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save to local storage after deletion:', e);
    }

    if (updated.length === 0) {
      setShowPhotoViewer(false);
      setActiveViewPhoto(null);
    } else {
      setActiveViewPhoto(updated[0]);
    }
    
    analyticsTracker.track('snapshot_deleted', { id: photoId });
  };

  const handleDownloadPhoto = async (photo: CapturedPhoto | null) => {
    if (!photo) return;
    playSound('click');
    showToast(isZh ? "💾 正在生成至臻奶油肌自拍照并打包下载..." : "Generating premium studio portrait for download...");
    
    try {
      const canvas = document.createElement('canvas');
      const width = 1080;
      const height = 1440;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }

      // Load base image/frame
      const img = new Image();
      img.src = photo.photoUrl || "/src/assets/images/portrait_simulate_1779326784414.png";
      img.crossOrigin = "anonymous"; // avoid tainted canvas issues
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // avoid freezing if image loading fails
      });

      // 1. Draw base picture with active camera filter adjustments
      ctx.save();
      const contrastPct = 96 - (photo.softness - 0.5) * 8;
      const saturatePct = 103 + (photo.brightness - 0.5) * 6;
      const exposureBoost = 1.05 + (photo.brightness - 0.5) * 0.28;
      ctx.filter = `contrast(${contrastPct}%) saturate(${saturatePct}%) brightness(${exposureBoost})`;
      ctx.drawImage(img, 0, 0, width, height);
      ctx.restore();

      // 2. Mist smoothing bloom blur layer
      if (photo.softness > 0.1) {
        ctx.save();
        ctx.filter = `contrast(${contrastPct}%) saturate(${saturatePct}%) brightness(${exposureBoost}) blur(6px)`;
        ctx.globalAlpha = photo.softness * 0.38;
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(img, 0, 0, width, height);
        ctx.restore();
      }

      // 4. Premium Under-eye & shadow corrector vector glow mix-blend-overlay
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = photo.brightness * photo.softness * 0.5;
      const eyeGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.65);
      eyeGrad.addColorStop(0, 'rgba(255,255,255,0.85)');
      eyeGrad.addColorStop(0.25, 'rgba(255,255,255,0.3)');
      eyeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = eyeGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // 5. Subtle skin smoothing glow halo booster mix-blend-soft-light
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = photo.brightness * 0.4;
      const haloGrad = ctx.createLinearGradient(width * 0.8, 0, 0, height);
      haloGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
      haloGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = haloGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // 6. Super aesthetic watermark decoration
      ctx.save();
      // Gradient background banner for watermark on the bottom
      const bannerGrad = ctx.createLinearGradient(0, height - 160, 0, height);
      bannerGrad.addColorStop(0, 'transparent');
      bannerGrad.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.fillStyle = bannerGrad;
      ctx.fillRect(0, height - 160, width, 160);

      // Watermark text
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('LUMI GLOW', 60, height - 90);
      
      ctx.font = '350 16px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(`FILTER: ${photo.presetName.toUpperCase()}  |  BRIGHTNESS: ${Math.round(photo.brightness * 100)}%  |  SOFTNESS: ${Math.round(photo.softness * 100)}%`, 60, height - 55);
      
      const dateText = new Date(photo.timestamp).toLocaleDateString('zh-CN', { hour12: false }) + ' ' + new Date(photo.timestamp).toLocaleTimeString('zh-CN', { hour12: false });
      ctx.textAlign = 'right';
      ctx.font = '300 18px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(dateText, width - 60, height - 55);
      ctx.restore();

      // Trigger automatic save download
      const link = document.createElement('a');
      link.download = `LUMI_GLOW_${photo.id}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.96);
      link.click();
      
      setTimeout(() => {
        showToast(isZh ? "💾 自拍照已完美高阶渲染并成功保存！" : "Photo successfully saved!");
      }, 1000);
    } catch (e) {
      console.error('Failed to composite and save photo:', e);
      showToast(isZh ? "❌ 渲染生成失败，请重试。" : "Failed to render, please try again.");
    }
  };

  return (
    <div 
      className="fixed inset-0 w-full h-full text-neutral-800 relative overflow-hidden flex flex-col font-sans select-none transition-all duration-300"
      style={{
        background: splitMode === 'none'
          ? activePreset.color
          : splitMode === 'horizontal'
          ? `linear-gradient(to right, ${splitPresetLeft.color} 0%, ${splitPresetRight.color} 100%)`
          : `linear-gradient(to bottom, ${splitPresetLeft.color} 0%, ${splitPresetRight.color} 100%)`,
      }}
    >
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] bg-white/95 backdrop-blur-md border border-[#EADED7]/60 text-neutral-800 px-5 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold tracking-wider animate-bounce">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================
          Ⅰ. ULTIMATE HARDWARE EMITTING SOFTBOX (100% Pure Solid Color Panel)
          ========================================================= */}
      
      {/* Solid Opaque Screen Panel */}
      <div 
        className="absolute inset-0 transition-all duration-300 pointer-events-none z-0"
        style={{
          background: splitMode === 'none'
            ? activePreset.color
            : splitMode === 'horizontal'
            ? `linear-gradient(to right, ${splitPresetLeft.color} 0%, ${splitPresetRight.color} 100%)`
            : `linear-gradient(to bottom, ${splitPresetLeft.color} 0%, ${splitPresetRight.color} 100%)`,
          opacity: 1.0, // Fully solid and opaque!
        }}
      />

      {/* Shutter flash */}
      {flashTriggered && (
        <div className="absolute inset-0 bg-white z-[90] flex items-center justify-center pointer-events-none animate-flash-shutter" />
      )}

      {/* Aux screen monitor expansion overlay */}
      {physicalGlowActive && (
        <div
          className="fixed inset-0 z-50 transition-glow flex flex-col items-center justify-between p-6 select-none animate-fade-in"
          style={{
            background:
              splitMode === 'none'
                ? `radial-gradient(circle, ${activePreset.color}33 0%, ${activePreset.color}FE 150%)`
                : splitMode === 'horizontal'
                ? `linear-gradient(90deg, ${splitPresetLeft.color}FD 0%, ${splitPresetRight.color}FD 100%)`
                : `linear-gradient(180deg, ${splitPresetLeft.color}FD 0%, ${splitPresetRight.color}FD 100%)`,
            backgroundColor: splitMode === 'none' ? activePreset.color : splitPresetLeft.color,
          }}
        >
          <div className="w-full max-w-lg flex items-center justify-between bg-black/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-2xl z-55">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-ping" />
              <span className="text-white text-xs font-semibold tracking-wide">
                {isZh ? 'Lumi 全屏外置柔光板模式' : 'FullScreen External Softbox Active'}
              </span>
            </div>
            <button
              onClick={() => {
                playSound('click');
                setPhysicalGlowActive(false);
              }}
              className="text-white hover:text-pink-300 transition-colors bg-white/10 p-1.5 rounded-xl cursor-pointer"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          <div className="relative group">
            <div
              className={`w-44 h-60 md:w-56 md:h-76 rounded-[40px] overflow-hidden border-4 border-white shadow-2xl flex items-center justify-center bg-[#070709] relative ${
                settings.mirrorCamera ? 'mirror-pip' : ''
              }`}
            >
              <CameraView
                activePreset={activePreset}
                splitMode={splitMode}
                splitPresetLeft={splitPresetLeft}
                splitPresetRight={splitPresetRight}
                brightness={brightness}
                softness={softness}
                onBrightnessChange={handleBrightnessChange}
                onSoftnessChange={handleSoftnessChange}
                mirrorCamera={settings.mirrorCamera}
                gridEnabled={settings.gridEnabled}
                useSimulatedPortrait={useSimulatedPortrait}
                onSimulatedPortraitToggle={handleToggleSimulatedCamera}
                isPip={true}
              />
            </div>
          </div>

          <div className="text-center bg-black/60 backdrop-blur-md py-3 px-5 rounded-2xl border border-white/5 opacity-85 max-w-md z-55">
            <p className="text-white text-xs leading-relaxed">
              💡 {isZh ? '自拍秘籍：将屏幕亮度调至最高，置于面部正前方。贴近屏幕即可利用真色彩高照度纯净出片。' : 'Selfie tip: Turn screen brightness to max, place front and close to face/skin to light up perfectly.'}
            </p>
          </div>
        </div>
      )}

      {/* Main App Container */}
      <div className="flex-1 w-full max-w-md mx-auto flex flex-col justify-between pt-12 pb-6 px-4 relative z-10">
        
        {/* Settings modal (Bottom Drawer Sheet styled) */}
        {currentView === 'settings' && (
          <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-xs flex flex-col justify-end">
            <div className="w-full h-[85vh] rounded-t-[40px] overflow-hidden shadow-2xl border-t border-white/20 animate-slide-up">
              <SettingsModal
                settings={settings}
                onUpdateSettings={setSettings}
                onClose={() => {
                  playSound('click');
                  setCurrentView('camera');
                }}
                onOpenAnalytics={() => {}}
                useSimulatedPortrait={useSimulatedPortrait}
                onToggleSimulatedPortrait={handleToggleSimulatedCamera}
              />
            </div>
          </div>
        )}

        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between mb-2 select-none">
          <div className="flex items-center gap-1.5">
            <span className="bg-black/60 text-white border border-white/10 px-3.5 py-1.5 rounded-full font-serif font-black italic text-sm tracking-widest shadow-lg backdrop-blur-md">
              Lumi
            </span>
            {splitMode !== 'none' && (
              <span className="px-2 py-0.5 rounded-full bg-pink-500/80 border border-white/20 backdrop-blur-md text-[8px] text-white font-sans font-bold uppercase tracking-wider">
                DUAL
              </span>
            )}
          </div>

          {/* Icons Bar Capsule (Apple Studio design) */}
          <div className="flex items-center gap-0.5 bg-black/60 border border-white/10 backdrop-blur-md px-1 py-1 rounded-full shadow-xl transition-all">
            <button
              onClick={() => {
                playSound('click');
                setSettings({ ...settings, gridEnabled: !settings.gridEnabled });
              }}
              className={`p-2 rounded-full transition-all duration-250 cursor-pointer ${
                settings.gridEnabled ? 'bg-white text-neutral-900 shadow-md font-semibold' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
              title="Grid Overlay"
            >
              <Grid className="w-4 h-4" />
            </button>

            <button
              onClick={handleSplitToggle}
              className={`p-2 rounded-full transition-all duration-250 cursor-pointer ${
                splitMode !== 'none' ? 'bg-white text-neutral-900 shadow-md font-semibold' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
              title="Split light"
            >
              <Columns className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                playSound('click');
                setCurrentView('settings');
              }}
              className="p-2 text-white/80 hover:bg-white/10 hover:text-white rounded-full transition-all cursor-pointer"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cinematic Viewfinder (Mirrors physical screen) */}
        <div className="flex-1 w-full flex flex-col items-center justify-center overflow-hidden py-2 min-h-[35vh]">
          <div 
            className={`overflow-hidden relative transition-all duration-500 ease-out border-4 border-white/85 bg-stone-950
              ${viewfinderSize === 'standard' ? 'w-full aspect-[3/4] max-h-[46vh] rounded-[36px]' : ''}
              ${viewfinderSize === 'compact' ? 'w-[70%] aspect-[3/4] max-h-[35vh] rounded-[32px]' : ''}
              ${viewfinderSize === 'circle' ? 'w-[55%] aspect-square rounded-full' : ''}
            `}
            style={{
              boxShadow: `0 24px 60px -15px rgba(0,0,0,0.6), 0 0 70px 15px ${splitMode === 'none' ? activePreset.color : splitPresetLeft.color}a4`
            }}
          >
            <CameraView
              ref={mainCameraRef}
              activePreset={activePreset}
              splitMode={splitMode}
              splitPresetLeft={splitPresetLeft}
              splitPresetRight={splitPresetRight}
              brightness={brightness}
              softness={softness}
              onBrightnessChange={handleBrightnessChange}
              onSoftnessChange={handleSoftnessChange}
              mirrorCamera={settings.mirrorCamera}
              gridEnabled={settings.gridEnabled}
              useSimulatedPortrait={useSimulatedPortrait}
              onSimulatedPortraitToggle={handleToggleSimulatedCamera}
              language={settings.language}
            />

            {/* Split controls overlay */}
            {splitMode !== 'none' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-35 flex gap-1 bg-black/60 border border-white/10 backdrop-blur-md p-1 rounded-full shadow-2xl scale-95">
                <button
                  onClick={() => setSelectedSplitSide('left')}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-sans font-medium transition-all ${
                    selectedSplitSide === 'left' ? 'bg-white text-black shadow-md font-semibold' : 'text-white/70'
                  }`}
                >
                  {splitMode === 'horizontal' ? '👈 左侧调色' : '👆 上侧调色'}
                </button>
                <button
                  onClick={() => setSelectedSplitSide('right')}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-sans font-medium transition-all ${
                    selectedSplitSide === 'right' ? 'bg-white text-black shadow-md font-semibold' : 'text-white/70'
                  }`}
                >
                  {splitMode === 'horizontal' ? '👉 右侧调色' : '👇 下侧调色'}
                </button>
              </div>
            )}
            
            <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none opacity-45 text-[9px] font-sans tracking-widest text-white/80 uppercase">
              {isZh ? '⇅ 上下滑动曝光 · ⇄ 左右滑动肤色' : '⇅ swipe brightness · ⇄ swipe softness'}
            </div>
          </div>
        </div>

        {/* Viewfinder Size Switcher (Gives back maximum screen glow) */}
        <div className="w-full flex justify-center mb-1 mt-1 z-20">
          <div className="flex items-center gap-0.5 bg-black/60 border border-white/10 backdrop-blur-md p-1 rounded-full shadow-lg text-white">
            <button
              onClick={() => {
                playSound('click');
                setViewfinderSize('standard');
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-sans font-medium tracking-wide transition-all duration-200 ${
                viewfinderSize === 'standard'
                  ? 'bg-white text-neutral-900 font-bold shadow-md'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              📐 {isZh ? '全幅预览' : 'Full Frame'}
            </button>
            <button
              onClick={() => {
                playSound('click');
                setViewfinderSize('compact');
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-sans font-medium tracking-wide transition-all duration-200 ${
                viewfinderSize === 'compact'
                  ? 'bg-white text-neutral-900 font-bold shadow-md'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              🔆 {isZh ? '高亮悬浮' : 'High Light'}
            </button>
            <button
              onClick={() => {
                playSound('click');
                setViewfinderSize('circle');
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-sans font-medium tracking-wide transition-all duration-200 ${
                viewfinderSize === 'circle'
                  ? 'bg-white text-neutral-900 font-bold shadow-md'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              🔮 {isZh ? '环形柔光' : 'Halo'}
            </button>
          </div>
        </div>

        {/* BOTTOM CONTROLS & COLOR SWATCHES */}
        <div className="w-full flex flex-col gap-4 mt-1">
          
          <div className="bg-black/60 backdrop-blur-md rounded-[32px] p-2 border border-white/10 shadow-xl">
            <PresetSelector
              presets={FILL_LIGHT_PRESETS}
              activePreset={activePreset}
              onSelect={handlePresetSelect}
              splitMode={splitMode}
              splitPresetLeft={splitPresetLeft}
              splitPresetRight={splitPresetRight}
              onSelectSplitSide={handleSplitPresetSelect}
              selectedSplitSide={selectedSplitSide}
            />
          </div>

          <div className="flex items-center justify-between px-8 py-1 shrink-0">
            {/* Gallery Thumbnail */}
            <button
              onClick={() => {
                playSound('click');
                if (capturedPhotos.length === 0) {
                  showToast(isZh ? '📸 拍摄第一张自拍照，即可开启专属胶片册！' : 'Take a photo first!');
                  return;
                }
                setShowPhotoViewer(true);
              }}
              className="w-12 h-12 rounded-full bg-black/60 hover:bg-black/75 border border-white/10 flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 relative shadow-xl backdrop-blur-md"
            >
              {capturedPhotos.length > 0 ? (
                <div className="w-full h-full relative group">
                  <img
                    src={capturedPhotos[0].photoUrl || "/src/assets/images/portrait_simulate_1779326784414.png"}
                    alt="Latest thumbnail"
                    className="w-full h-full object-cover rounded-full border border-white/20 transition-transform saturate-105"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 bg-neutral-900 border border-white/10 text-white font-mono text-[9px] w-5 h-5 rounded-full flex items-center justify-center scale-90 shadow-lg font-bold">
                    {capturedPhotos.length}
                  </span>
                </div>
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
              )}
            </button>

            {/* iOS Shutter Button */}
            <button
              onClick={handleShutterSnap}
              className="w-18 h-18 rounded-full border-4 border-white shrink-0 shadow-[0_0_32px_rgba(255,255,255,0.85),0_12px_24px_rgba(0,0,0,0.3)] bg-white hover:bg-neutral-50 active:scale-95 text-neutral-800 flex items-center justify-center cursor-pointer transition-all duration-300 relative group"
            >
              <div className="absolute inset-1.5 rounded-full border border-neutral-900/10 bg-neutral-100" />
              <Camera className="w-6.5 h-6.5 text-neutral-900 z-10 transition-transform group-hover:scale-110 duration-250" strokeWidth={2.2} />
            </button>

            {/* Expansion full glow key */}
            <button
              onClick={() => {
                playSound('focus');
                setPhysicalGlowActive(true);
              }}
              className="w-12 h-12 rounded-full bg-black/60 hover:bg-black/75 text-white border border-white/10 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-xl backdrop-blur-md"
              title="Full screen Glow tool"
            >
              <Maximize2 className="w-4.5 h-4.5 text-white animate-pulse" />
            </button>
          </div>

          <div className="text-center text-[10px] text-white/50 tracking-widest uppercase mt-1">
            designed by lumi in california
          </div>
        </div>

      </div>

      {/* 7. HIGH-FIDELITY PHOTO VIEWER MODAL */}
      {showPhotoViewer && (() => {
        const photoToRender = activeViewPhoto || capturedPhotos[0];
        return (
          <div className="fixed inset-0 z-50 bg-[#0c0a0b]/98 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none animate-fade-in text-white animate-scale-in">
            <div className="w-full max-w-sm flex flex-col gap-4">
              
              <div className="flex items-center justify-between text-white border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#ff8fae]" />
                  <span className="text-xs font-semibold tracking-wider">Lumi Glow 专属摄影胶片册</span>
                </div>
                <div className="flex items-center gap-2.5">
                  {photoToRender && (
                    <button
                      onClick={() => handleDeletePhoto(photoToRender.id)}
                      className="text-white/60 hover:text-rose-400 p-1.5 rounded-full hover:bg-white/5 transition-all cursor-pointer"
                      title={isZh ? '删除此照片' : 'Delete photo'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      playSound('click');
                      setShowPhotoViewer(false);
                      setActiveViewPhoto(null);
                    }}
                    className="text-white hover:text-pink-300 transition-colors p-1 cursor-pointer"
                  >
                    <Minimize2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Snapshot image with active filters applied */}
              <div className="relative w-full aspect-[3/4] bg-neutral-950 rounded-[40px] overflow-hidden border border-white/20 shadow-2xl">
                <img
                  src={photoToRender?.photoUrl || "/src/assets/images/portrait_simulate_1779326784414.png"}
                  alt="Captured Portrait"
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    showOriginal ? 'filter none scale-100 opacity-90' : 'filter saturate-105 scale-102'
                  }`}
                />
                


                {/* Diffuse mist blur dynamic layer */}
                {!showOriginal && photoToRender && (
                  <div 
                    className="absolute inset-0 pointer-events-none mix-blend-screen opacity-0 transition-opacity duration-300 animate-fade-in"
                    style={{
                      opacity: (photoToRender.softness || 0.65) * 0.35,
                    }}
                  >
                    <img
                      src={photoToRender.photoUrl || "/src/assets/images/portrait_simulate_1779326784414.png"}
                      alt=""
                      className="w-full h-full object-cover blur-[5px] saturate-108"
                    />
                  </div>
                )}

                {/* Under-eye shadow corrector glowing light overlay */}
                {!showOriginal && photoToRender && (
                  <div 
                    className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-0 transition-opacity duration-300 animate-fade-in"
                    style={{
                      background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.25) 30%, transparent 68%)',
                      opacity: (photoToRender.brightness || 0.85) * (photoToRender.softness || 0.65) * 0.45,
                    }}
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6 gap-0.5 text-white animate-fade-in">
                  <span className="text-[10px] text-pink-300 font-sans tracking-widest font-bold mb-1 uppercase">
                    {showOriginal ? 'ORIGINAL FEED / 原始镜头' : 'LUMI GLOW BEAUTY SNAP / 奶油肌自拍'}
                  </span>
                  <h4 className="text-sm font-semibold tracking-wide">
                    {showOriginal ? (
                      isZh ? '前置无补光原图' : 'Raw Original Image'
                    ) : (
                      photoToRender?.splitMode === 'none'
                        ? `柔光滤镜: ${photoToRender.presetName}`
                        : `双色混配柔滑打光`
                    )}
                  </h4>
                  <div className="flex items-center gap-3 text-[9px] text-[#DDDDDD] font-mono mt-1">
                    <span>曝光: {showOriginal ? '0%' : `${Math.round((photoToRender?.brightness || 0.85) * 100)}%`}</span>
                    <span>漫反射: {showOriginal ? '0%' : `${Math.round((photoToRender?.softness || 0.65) * 100)}%`}</span>
                    <span>时间: {photoToRender ? new Date(photoToRender.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                  </div>
                </div>

                <div className="absolute top-5 right-5 text-[11px] font-heading font-medium tracking-widest text-white/40 uppercase">
                  LUMI FILTERCAM CO.
                </div>
              </div>

              {/* Compare or Save functions */}
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex gap-2">
                  <button
                    onMouseDown={() => { playSound('click'); setShowOriginal(true); }}
                    onMouseUp={() => setShowOriginal(false)}
                    onMouseLeave={() => setShowOriginal(false)}
                    onTouchStart={() => { playSound('click'); setShowOriginal(true); }}
                    onTouchEnd={() => setShowOriginal(false)}
                    className="flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/15 text-white text-[11px] font-semibold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer select-none"
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-pulse text-pink-300" />
                    {isZh ? '按住对比原图' : 'Hold to Compare Raw'}
                  </button>

                  <button
                    onClick={() => handleDownloadPhoto(photoToRender)}
                    className="flex-1 py-2.5 rounded-2xl bg-pink-500 hover:bg-pink-600 border border-pink-400 text-white text-[11px] font-bold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-pink-500/25"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    {isZh ? '保存至系统相册' : 'Save to System Album'}
                  </button>
                </div>

                <button
                  onClick={() => {
                    playSound('click');
                    setShowPhotoViewer(false);
                    setActiveViewPhoto(null);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-white text-neutral-900 hover:bg-neutral-100 font-bold text-xs tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {isZh ? '返回继续自拍' : 'Capture New Selfie'}
                </button>
              </div>

              {/* Gallery List */}
              <div className="flex items-center gap-2.5 overflow-x-auto py-1">
                {capturedPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    onClick={() => {
                      playSound('click');
                      setActiveViewPhoto(photo);
                    }}
                    className={`w-12 h-16 rounded-xl overflow-hidden border cursor-pointer flex-shrink-0 relative transition-all ${
                      photoToRender?.id === photo.id
                        ? 'border-white ring-2 ring-white/60 scale-105'
                        : 'border-white/20 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={photo.photoUrl || "/src/assets/images/portrait_simulate_1779326784414.png"}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />

                    <span className="absolute bottom-0 text-center w-full text-white bg-black/60 text-[8px] font-mono py-0.5">
                      #{capturedPhotos.length - index}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
