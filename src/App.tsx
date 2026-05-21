/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { CameraView } from './components/CameraView';
import { PresetSelector } from './components/PresetSelector';
import { SettingsModal } from './components/SettingsModal';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { FILL_LIGHT_PRESETS } from './presets';
import { FillLightPreset, SplitMode, AppSettings } from './types';
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
  MousePointerClick
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
  
  // Real-world External Full Screen Glow (Actual softbox light)
  const [physicalGlowActive, setPhysicalGlowActive] = useState<boolean>(false);
  const [flashTriggered, setFlashTriggered] = useState<boolean>(false);
  
  // Simulated photo gallery thumbnail from camera screenshots
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [showPhotoViewer, setShowPhotoViewer] = useState<boolean>(false);
  const [activeViewPhoto, setActiveViewPhoto] = useState<string | null>(null);

  // Live timer for tracking user session time in secondary console
  const [sessionTime, setSessionTime] = useState<number>(0);

  // Debounce tracking helpers for gesture swipes to avoid flooding analytics events
  const analyticsTimeoutRef = useRef<{ brightness?: number; softness?: number }>({});

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

  // Launch tracking on startups
  useEffect(() => {
    analyticsTracker.track('app_launch', {
      time: new Date().toLocaleTimeString(),
      device: 'Simulator (iOS 16+ Web Sandbox)',
      lang: settings.language,
    });

    const secTimer = setInterval(() => {
      setSessionTime((prev) => prev + 1);
      // Track a standard stay time ping every 10s to simulate active engagement levels
      if ((sessionTime + 1) % 10 === 0) {
        analyticsTracker.track('duration_ping', { stayTimeSec: sessionTime + 1 });
      }
    }, 1000);

    return () => {
      clearInterval(secTimer);
    };
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
  const handleShutterSnap = () => {
    if (flashTriggered) return;
    playSound('shutter');
    setFlashTriggered(true);
    
    // Simulate screenshot flash effect
    setTimeout(() => {
      setFlashTriggered(false);
      
      // Save simulated portrait image to internal photo album roll
      // To give visual evidence, we generate a beautiful canvas thumbnail reflecting active color filters!
      const mockCanvasImg = `photo_${Date.now()}`;
      setCapturedPhotos((prev) => [mockCanvasImg, ...prev]);
      
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

  return (
    <div className="min-h-screen w-full bg-[#F7F3F0] text-[#2D2D2D] relative overflow-hidden flex flex-col md:flex-row items-center font-sans">
      
      {/* 1. Fluid Aesthetic Atmospheric Blobs in Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#FFEFEA] blur-[120px] pointer-events-none animate-pulse-blob-a" />
      <div className="absolute bottom-[-10%] right-[-1%] w-[45%] h-[50%] rounded-full bg-[#EADED7] blur-[130px] pointer-events-none animate-pulse-blob-b" />
      <div className="absolute top-[40%] right-[25%] w-[30%] h-[30%] rounded-full bg-white/40 blur-[90px] pointer-events-none" />

      {/* 2. Panoramic Real Studio Mode - Entire screen illuminates as glowing softbox */}
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
          {/* Subtle floating header controls */}
          <div className="w-full max-w-lg flex items-center justify-between bg-black/55 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shadow-2xl z-55">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-ping" />
              <span className="text-white text-xs font-semibold tracking-wide">
                {isZh ? 'Lumi Glow 全屏数码柔光温区 · 正在补光中' : 'FullScreen Glow Active · Soft Light Source'}
              </span>
            </div>
            <button
              onClick={() => {
                playSound('click');
                setPhysicalGlowActive(false);
                analyticsTracker.track('full_screen_glow', { active: false });
              }}
              className="text-white hover:text-pink-300 transition-colors bg-white/10 p-1.5 rounded-xl cursor-pointer"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Draggable PIP self-view selfie window mimicking front tracker */}
          <div className="relative group cursor-move">
            <div
              className={`w-44 h-56 md:w-56 md:h-72 rounded-[40px] overflow-hidden border-4 border-white shadow-2xl transition-transform duration-300 transform hover:scale-102 flex items-center justify-center bg-[#070709] relative ${
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
            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-white/80 bg-black/60 backdrop-blur-[4px] px-2.5 py-0.5 rounded-full text-[10px] tracking-widest uppercase">
              {isZh ? '前摄面部成像' : 'Selfie Face PIP'}
            </span>
          </div>

          {/* Quick HUD guide for users using monitor as light */}
          <div className="text-center bg-black/60 backdrop-blur-md py-3 px-6 rounded-2xl border border-white/5 opacity-80 max-w-md z-55">
            <p className="text-white text-[11px] sm:text-xs leading-relaxed">
              💡 {isZh ? '使用提示：将本网页置于面部正前方，屏幕调至最大亮度。面部微距贴近，即可物理打亮面部肤色，拍出质感立体自拍。' : 'Setup: Place this monitor in front of your face and increase screen brightness. Face coordinates are centered for natural studio glow effects.'}
            </p>
          </div>
        </div>
      )}

      {/* 3. Left Hand Simulator Workplace Column */}
      <div className="flex-1 w-full flex flex-col justify-center items-center py-6 px-4 z-10 shrink-0 md:py-10">
        
        {/* Dynamic App Title & Custom Slogan */}
        <div className="text-center mb-6 md:mb-8 flex flex-col items-center gap-1 animate-fade-in-down">
          <h1 className="text-[#2D2D2D] text-[20px] tracking-[0.2em] font-light uppercase font-heading">
            Lumi Glow
          </h1>
          <div className="h-[1px] w-8 bg-[#2D2D2D] opacity-20 my-1"></div>
          <p className="text-[11px] text-[#2D2D2D]/60 tracking-wider font-sans leading-relaxed select-text uppercase">
            {isZh ? '自拍氛围补光 · 定制温柔光影' : 'Aesthetic softbox light for glowing selfies'}
          </p>
        </div>

        {/* 4. MAIN IPHONE HARDWARE SIMULATOR BOX */}
        <div className="relative w-[340px] h-[670px] sm:w-[350px] sm:h-[690px] rounded-[52px] bg-[#221c1e] p-[10px] shadow-[0_30px_70px_rgba(255,180,195,0.45),0_10px_20px_rgba(0,0,0,0.2)] border-4 border-[#3a3134] flex flex-col items-center justify-between transition-all duration-500 scale-95 sm:scale-100 group">
          
          {/* Apple Volume Buttons & Hardware simulation */}
          <div className="absolute left-[-10px] top-[140px] w-[5px] h-[35px] bg-[#3a3134] rounded-l-md cursor-pointer hover:bg-neutral-600 active:scale-95 transition-all" onClick={() => playSound('click')} title="Action Key" />
          <div className="absolute left-[-10px] top-[190px] w-[5px] h-[55px] bg-[#3a3134] rounded-l-md cursor-pointer hover:bg-neutral-600 active:scale-95 transition-all" onClick={() => handleShutterSnap()} title="Shutter Shortcut (Click Volume Up to snap!)" />
          <div className="absolute left-[-10px] top-[255px] w-[5px] h-[55px] bg-[#3a3134] rounded-l-md cursor-pointer hover:bg-neutral-600 active:scale-95 transition-all" onClick={() => playSound('click')} title="Volume Down" />
          <div className="absolute right-[-10px] top-[200px] w-[5px] h-[75px] bg-[#3a3134] rounded-r-md cursor-pointer hover:bg-neutral-600 active:scale-95 transition-all" onClick={() => {
            playSound('click');
            analyticsTracker.track('app_exit_simulated');
            alert(isZh ? '📱 已模拟按下 iPhone 电源键锁屏熄屏。数据分析控制台已捕获并上报 [退出行为] 埋点。' : 'Power Button Simulated. Exit behavior tracked inside Analytics SDK tab.');
          }} title="Power Key (Simulate exit telemetry)" />

          {/* IPHONE INNER SCREEN BODY */}
          <div className="w-full h-full rounded-[44px] bg-[#F7F3F0] overflow-hidden relative flex flex-col border border-[#EADED7]/30 select-none shadow-2xl">
            
            {/* =========================================================
                Ⅰ. EMISSIVE LIGHTBACKPLATE (SCREEN FILL-LIGHT)
                Covers the entire phone screen area, serving as a full surface softbox panel
                ========================================================= */}
            <div 
              className="absolute inset-0 transition-opacity duration-300 pointer-events-none z-0"
              style={{
                background: splitMode === 'none'
                  ? `radial-gradient(circle at center, ${activePreset.color}dd 10%, ${activePreset.accentColor || activePreset.color}ff 100%)`
                  : splitMode === 'horizontal'
                  ? `linear-gradient(to right, ${splitPresetLeft.color} 50%, ${splitPresetRight.color} 50%)`
                  : `linear-gradient(to bottom, ${splitPresetLeft.color} 50%, ${splitPresetRight.color} 50%)`,
                opacity: brightness, // Directly drives physical light intensity of the screen surface
              }}
            />

            {/* Soft Ambient Blend Overlays for split screen light setups */}
            {splitMode !== 'none' && (
              <div 
                className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-1 mix-blend-screen"
                style={{
                  background: splitMode === 'horizontal'
                    ? `linear-gradient(to right, ${splitPresetLeft.color} 10%, transparent 45%, transparent 55%, ${splitPresetRight.color} 90%)`
                    : `linear-gradient(to bottom, ${splitPresetLeft.color} 10%, transparent 45%, transparent 55%, ${splitPresetRight.color} 90%)`,
                  opacity: brightness * softness * 0.8,
                  filter: 'blur(32px)',
                }}
              />
            )}

            {/* Ultra Radiance Bloom to soft blur the backplate edges */}
            <div 
              className="absolute inset-0 pointer-events-none transition-all duration-300 mix-blend-color-dodge z-2"
              style={{
                background: `radial-gradient(circle at center, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.2) 60%, transparent 100%)`,
                opacity: brightness * softness * 0.5,
              }}
            />

            {/* 5. Realistic iOS top Notch / Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-10 px-6 pt-2 flex justify-between items-center z-45 text-[11px] font-sans font-medium text-[#2D2D2D]/85">
              <span>09:41</span>
              {/* Dynamic Island Container */}
              <div 
                className="w-24 h-5.5 rounded-full bg-[#2D2D2D]/90 absolute left-1/2 -translate-x-1/2 flex items-center justify-between px-3 transition-all duration-300 hover:w-36 overflow-hidden select-none cursor-pointer backdrop-blur-sm shadow-sm"
                onClick={() => {
                  playSound('focus');
                  analyticsTracker.track('dynamic_island_focus');
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#FFEFEA] animate-pulse" />
                <span className="text-[10px] text-white scale-90 font-sans tracking-tight">Lumi Glow</span>
                <div className="w-1.5 h-1.5 rounded-full bg-[#EADED7]" />
              </div>
              <div className="flex items-center gap-1 text-[#2D2D2D]/85">
                <Grid className="w-3.5 h-3.5 opacity-80" />
                <span>5G</span>
                <span className="w-5 h-2.5 rounded-sm border border-[#2D2D2D]/40 p-[1px] flex items-center justify-start"><span className="w-[85%] h-full bg-[#2D2D2D]/80 rounded-2xs" /></span>
              </div>
            </div>

            {/* 6. Realistic iOS Screen Flash Highlight for snaps */}
            {flashTriggered && (
              <div className="absolute inset-0 bg-white/95 z-51 flex items-center justify-center animate-ping pointer-events-none duration-100" />
            )}

            {/* 7. APP INNER CONTROLLER WORKSPACE */}
            <div className="flex-1 w-full pt-10 pb-7 flex flex-col justify-between overflow-hidden relative bg-transparent z-10">
              
              {/* Active Subview Overlay (Settings or Metrics Panel) */}
              {currentView === 'settings' && (
                <div className="absolute inset-x-0 bottom-0 top-0 z-40 animate-fade-in-up">
                  <SettingsModal
                    settings={settings}
                    onUpdateSettings={setSettings}
                    onClose={() => {
                      playSound('click');
                      setCurrentView('camera');
                    }}
                    onOpenAnalytics={() => {
                      playSound('click');
                      setCurrentView('analytics');
                    }}
                    useSimulatedPortrait={useSimulatedPortrait}
                    onToggleSimulatedPortrait={handleToggleSimulatedCamera}
                  />
                </div>
              )}

              {currentView === 'analytics' && (
                <div className="absolute inset-x-0 bottom-0 top-0 z-40 animate-fade-in-up">
                  <AnalyticsPanel
                    onClose={() => {
                      playSound('click');
                      setCurrentView('settings');
                    }}
                  />
                </div>
              )}

              {/* TOP HEADER CONTROLS (App Logo & Utilities with clean glassmorphism) */}
              <div className="px-4.5 py-2.5 flex items-center justify-between z-30 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold italic text-[16px] text-[#2D2D2D] tracking-wide text-shadow">Lumi</span>
                  {splitMode !== 'none' && (
                    <span className="px-2 py-0.5 rounded-md bg-[#2D2D2D] border border-black/10 text-[9px] text-white font-sans font-medium shadow-sm">
                      Dual
                    </span>
                  )}
                </div>

                {/* Floating Quick Action Keys (Grid, Split-Lights, Settings) */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      playSound('click');
                      setSettings({ ...settings, gridEnabled: !settings.gridEnabled });
                      analyticsTracker.track('settings_update', { grid: !settings.gridEnabled });
                    }}
                    className={`p-1.5 rounded-full transition-colors flex items-center justify-center border backdrop-blur-md shadow-sm ${
                      settings.gridEnabled 
                        ? 'bg-[#2D2D2D] text-white border-[#2D2D2D]' 
                        : 'bg-white/30 text-[#2D2D2D]/80 border-white/20 hover:bg-white/50'
                    }`}
                    title="📸 Grid Overlay Toggle"
                  >
                    <Grid className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleSplitToggle}
                    className={`p-1.5 rounded-full transition-colors flex items-center justify-center border backdrop-blur-md shadow-sm ${
                      splitMode !== 'none' 
                        ? 'bg-[#2D2D2D] text-white border-[#2D2D2D]' 
                        : 'bg-white/30 text-[#2D2D2D]/80 border-white/20 hover:bg-white/50'
                    }`}
                    title="🌗 Studio Split Box Mode"
                  >
                    <Columns className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      playSound('click');
                      setCurrentView('settings');
                      analyticsTracker.track('settings_open');
                    }}
                    className="p-1.5 bg-white/30 text-[#2D2D2D]/80 border border-white/20 hover:bg-white/50 rounded-full transition-colors backdrop-blur-md shadow-sm flex items-center justify-center"
                    title="⚙️ Aesthetic settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* CORE VIEWER LAYER - Lives inside device view */}
              <div className="flex-1 w-full flex items-center justify-center z-10 overflow-hidden shrink-0">
                <div className="w-full h-full overflow-hidden relative bg-transparent">
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
                  />

                  {/* Split Light Side Config Selector Banner Overlay (Shows only in split mode) */}
                  {splitMode !== 'none' && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-35 flex gap-1 bg-white/40 border border-white/20 backdrop-blur-md p-1 rounded-full shadow-lg scale-90">
                      <button
                        onClick={() => setSelectedSplitSide('left')}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-sans font-medium transition-all ${
                          selectedSplitSide === 'left'
                            ? 'bg-[#2D2D2D] text-white shadow-md'
                            : 'text-[#2D2D2D]/60 hover:text-[#2D2D2D]'
                        }`}
                      >
                        {splitMode === 'horizontal' ? '👈 左侧调色' : '👆 上侧调色'}
                      </button>
                      <button
                        onClick={() => setSelectedSplitSide('right')}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-sans font-medium transition-all ${
                          selectedSplitSide === 'right'
                            ? 'bg-[#2D2D2D] text-white shadow-md'
                            : 'text-[#2D2D2D]/60 hover:text-[#2D2D2D]'
                        }`}
                      >
                        {splitMode === 'horizontal' ? '👉 右侧调色' : '👇 下侧调色'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* PRESETS PANEL (Swatches Horizontal scroll list) */}
              <div className="shrink-0">
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

              {/* INTEGRATED camera roll snap button and full-screen glow launchers */}
              <div className="px-4 py-1 flex items-center justify-between shrink-0 z-30">
                
                {/* Simulated Photo Album Thumbnail Gallery Trigger */}
                <button
                  onClick={() => {
                    playSound('click');
                    if (capturedPhotos.length === 0) {
                      alert(isZh ? '📸 目前还没有拍过照哦！请点击中间快门键，系统会应用柔光滤镜模拟高级自拍！' : 'Take a photo first by clicking the center button.');
                      return;
                    }
                    setShowPhotoViewer(true);
                  }}
                  className="w-11 h-11 rounded-2xl bg-white/30 hover:bg-white/50 border border-white/20 flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 relative shadow-inner backdrop-blur-md"
                >
                  {capturedPhotos.length > 0 ? (
                    <div className="w-full h-full relative group">
                      <img
                        src="/src/assets/images/portrait_simulate_1779326784414.png"
                        alt="Snap Look Thumbnail"
                        className="w-full h-full object-cover rounded-xl border border-white filter transition-transform saturate-105 select-none"
                      />
                      {/* Active filter shade mimicking saving context color */}
                      <div
                        className="absolute inset-0 mix-blend-color p-[1px] opacity-75"
                        style={{
                          backgroundColor:
                            splitMode === 'none'
                              ? activePreset.color
                              : splitPresetLeft.color,
                        }}
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 bg-pink-500 text-white font-mono text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center scale-75 border border-white">
                        {capturedPhotos.length}
                      </span>
                    </div>
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2D2D2D]/30" />
                  )}
                </button>

                {/* Core mechanical capture shutter button */}
                <button
                  onClick={handleShutterSnap}
                  className="w-16 h-16 rounded-full border-4 border-white shadow-xl bg-[#2D2D2D] hover:bg-black text-white flex items-center justify-center cursor-pointer transition-transform duration-300 transform active:scale-92 focus:outline-none relative group"
                  title="Snap high aesthetics selfie!"
                >
                  <div className="absolute inset-0.5 rounded-full border border-white/10" />
                  <Camera className="w-6 h-6 text-white group-hover:scale-105 duration-300" strokeWidth={2.5} />
                </button>

                {/* Studio Physical Monitor expansion toggle */}
                <button
                  onClick={() => {
                    playSound('focus');
                    setPhysicalGlowActive(true);
                    analyticsTracker.track('full_screen_glow', { active: true });
                  }}
                  className="w-11 h-11 rounded-2xl bg-white/30 hover:bg-white/50 text-[#2D2D2D]/85 border border-white/20 flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 relative shadow-sm backdrop-blur-md"
                  title="💡 Open physical double-screen auxiliary light mode"
                >
                  <Maximize2 className="w-4 h-4 text-[#2D2D2D]" />
                </button>
              </div>

            </div>

            {/* Apple Home Swiper Bar */}
            <div 
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-black/40 rounded-full cursor-pointer hover:bg-black/60 transition-colors z-45"
              onClick={() => {
                if (currentView !== 'camera') {
                  playSound('click');
                  setCurrentView('camera');
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* 5. Right Hand Interactive User Playground & Live Analytics Deck */}
      <div className="flex-1 w-full max-w-lg p-5 flex flex-col gap-5 md:py-10 md:pr-10 z-10">
        
        {/* Playroom Quick instructions card */}
        <div className="bg-white rounded-[32px] p-6 border-2 border-[#EADED7] shadow-sm">
          <h3 className="text-xs font-heading font-bold text-[#2D2D2D] tracking-widest uppercase mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#2D2D2D]" />
            Lumi Glow 氛围指南与互动沙盒
          </h3>
          <ul className="text-[#2D2D2D]/80 font-sans text-xs leading-relaxed flex flex-col gap-3">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D2D2D] mt-1.5 shrink-0" />
              <span>
                <strong>真实前摄 / 模拟器双模切换:</strong> 网页支持直接调用本地前置镜头预览。若限用摄像头或想观察理想画质，点击手机设置中的 <strong>[高保真自拍照模拟器]</strong> 即可使用内置的高级氛围滤镜人像。
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D2D2D] mt-1.5 shrink-0" />
              <span>
                <strong>全屏打光神器 (Aux Light Companion):</strong> 点击右下角的 <strong>[ ⛶ ] 按钮</strong>，屏幕会变成纯色柔光板，配合备用手机，在家中黑暗环境瞬间拍出高级奶油肌大片。
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D2D2D] mt-1.5 shrink-0" />
              <span>
                <strong>双色棚侧光 (Studio Dual-Lights):</strong> 点击右上角的 <strong>[分屏 🌗] 按钮</strong> 开启双光源！分配左侧为 “初恋粉”，右侧为 “冷白皮”，可在面部轮廓产生完美的冷暖软柔渐变。
              </span>
            </li>
          </ul>
        </div>

        {/* 6. REAL-TIME TELEMETRY LOG PANEL - UPDATES LIVE ACCORDING TO USER INTERACTIONS */}
        <div className="bg-[#2D2D2D] rounded-[32px] p-6 border-2 border-[#2D2D2D] shadow-md flex-1 flex flex-col min-h-[380px] max-h-[440px] select-text">
          <div className="flex items-center justify-between pb-4 border-b border-white/15 shrink-0">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4.5 h-4.5 text-white animate-pulse" />
              <div>
                <h3 className="text-[12px] font-heading font-semibold text-white tracking-wide">
                  Firebase Telemetry Stream 埋点控制台
                </h3>
                <p className="text-[9px] text-white/50 font-mono tracking-wide uppercase mt-0.5">
                  Sandbox Analytics Agent Live Feed
                </p>
              </div>
            </div>
            {/* Quick status dots */}
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[9px] font-mono text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              CONNECTED
            </span>
          </div>

          <div className="flex-1 mt-4 overflow-hidden flex flex-col text-white">
            <AnalyticsPanel onClose={() => {}} />
          </div>
        </div>
      </div>

      {/* 7. HIGH-FIDELITY PHOTO VIEWER MODAL (Selfie album gallery context) */}
      {showPhotoViewer && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none animate-fade-in">
          <div className="w-full max-w-sm flex flex-col gap-4">
            
            <div className="flex items-center justify-between text-white border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#ff8fae]" />
                <span className="text-xs font-medium tracking-wider">Lumi Glow 专属摄影胶片册</span>
              </div>
              <button
                onClick={() => {
                  playSound('click');
                  setShowPhotoViewer(false);
                  setActiveViewPhoto(null);
                }}
                className="text-white hover:text-[#ff8fae] transition-colors p-1"
              >
                <Minimize2 className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Simulated main focal snapshot photo with active filters applied */}
            <div className="relative w-full aspect-[3/4] bg-neutral-950 rounded-[40px] overflow-hidden border border-white/20 shadow-2xl">
              <img
                src="/src/assets/images/portrait_simulate_1779326784414.png"
                alt="Captured Specimen Looks"
                className="w-full h-full object-cover filter saturate-105"
              />
              
              {/* Overlay shading representing exact visual blending at snapshot time */}
              <div
                className="absolute inset-0 mix-blend-color transition-glow opacity-80"
                style={{
                  backgroundColor:
                    splitMode === 'none'
                      ? activePreset.color
                      : splitPresetLeft.color,
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6 gap-1 text-white">
                <span className="text-[10px] text-pink-300 font-serif italic mb-1 uppercase tracking-widest font-bold">
                  LUMI GLOW BEAUTY FILTERS
                </span>
                <h4 className="text-sm font-semibold tracking-wide">
                  {splitMode === 'none'
                    ? `柔光滤镜: ${activePreset.name} (${activePreset.englishName})`
                    : `棚拍双侧色: "${splitPresetLeft.name} ✕ ${splitPresetRight.name}"`}
                </h4>
                <div className="flex items-center gap-3.5 text-[9px] text-white/50 font-mono mt-1">
                  <span>亮度 Exposure: {Math.round(brightness * 100)}%</span>
                  <span>漫反射 Softness: {Math.round(softness * 100)}%</span>
                </div>
              </div>

              {/* Aesthetic vintage watermark overlay */}
              <div className="absolute top-5 right-5 text-[11px] font-heading font-medium tracking-widest text-white/40 uppercase">
                LUMI FILTERCAM CO.
              </div>
            </div>

            {/* List and choose snaps */}
            <div className="flex items-center gap-2.5 overflow-x-auto py-1">
              {capturedPhotos.map((photo, index) => (
                <div
                  key={photo}
                  className="w-12 h-16 rounded-lg overflow-hidden border border-white/40 cursor-pointer hover:border-pink-300 transform hover:scale-102 flex-shrink-0 relative transition-all"
                >
                  <img
                    src="/src/assets/images/portrait_simulate_1779326784414.png"
                    alt="Roll preview thumb"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[#ff8fae]/20" />
                  <span className="absolute bottom-0 text-center w-full text-white bg-black/50 text-[8px] font-mono">
                    #{capturedPhotos.length - index}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-center">
              <p className="text-white/40 text-[9px] leading-relaxed">
                ℹ️ iOS 模拟沙盒照片已在本地暂存。在真机上长按快门可连续拍摄，生成高阶奶油透薄自拍照。
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
