/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CameraView } from './components/CameraView';
import { PresetSelector } from './components/PresetSelector';
import { SettingsModal } from './components/SettingsModal';
import { FILL_LIGHT_PRESETS } from './presets';
import { FillLightPreset, SplitMode, AppSettings, CapturedPhoto } from './types';
import { analyticsTracker } from './utils/analytics';

// Consumer-focused descriptions helper for AI selfie suggestions
const getSelfieBullets = (presetId: string, isZh: boolean) => {
  if (isZh) {
    switch (presetId) {
      case 'cream':
        return [
          '适合日常、温煦居家光照自拍',
          '奶油温润质地，均匀提亮面中',
          '弱化细小毛孔，抚平微小暗影',
          '完美锁住慵懒好气色'
        ];
      case 'love':
        return [
          '适合约会、粉嫩心动自拍',
          '打造粉润白里透红剔透美肌',
          '柔和对冲环境生硬色泽',
          '尽显甜美少女感与元气神采'
        ];
      case 'cold':
      case 'studio_white':
        return [
          '适合夜晚及昏暗暗光环境自拍',
          '去白去黄，提塑清亮瓷白冷肌',
          '增加眼神光，立体五官骨相',
          '高奢冷感并保留夜间真实格调'
        ];
      case 'sunset':
        return [
          '适合假日午后、胶片故事感自拍',
          '微醺晚霞蜜橘光晕，复古迷人',
          '弱化肤色疲倦感，面龐更立体',
          '流溢海报画报级照片光影魅力'
        ];
      default:
        return [
          '适合当前环境的精选搭配色彩',
          '补足面部主光，还原饱满肤质',
          '告别暗灰失光，清透润泽',
          '保留背景生动真实的环境深度'
        ];
    }
  } else {
    switch (presetId) {
      case 'cream':
        return [
          'Perfect for cozy indoor portrait slots',
          'Cream velvet texturing, soft midface lift',
          'Blurs subtle tired folds under lower eye lids',
          'Preserves comfortable household rest mood'
        ];
      case 'love':
        return [
          'Ideal for peach-sweet romantic portraits',
          'Infuses dewy rosy skin bloom flush cheeks',
          'Mildly absorbs ambient clinical lamp glares',
          'Locker of youthful, high-vibe confidence'
        ];
      case 'cold':
      case 'studio_white':
        return [
          'Highly recommended for urban night walks',
          'Wipes out yellowish cast, porcelain cool skin',
          'Sparks beautiful focal points in pupils',
          'Presents premium luxury without caking'
        ];
      case 'sunset':
        return [
          'Top pick for retro aesthetic snapshot frames',
          'Simulates orange golden hours light shafts',
          'Soothes skin tiredness with golden overlays',
          'Dials in timeless film editorial textures'
        ];
      default:
        return [
          'Selected custom contrast spectrum matched',
          'Fills dark face points evenly with soft shine',
          'Neutralizes flat grays with skin freshness',
          'Keeps natural environment background layers'
        ];
    }
  }
};

// Before / After Comparison Slider Component
const BeforeAfterSlider: React.FC<{ activePreset: any; isZh: boolean }> = ({ activePreset, isZh }) => {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1) { // Left mouse button pressed
      handleMove(e.clientX);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  return (
    <div className="flex flex-col gap-1.5 text-left mt-1">
      <span className="text-[10px] text-white/50 font-sans font-semibold tracking-wider flex items-center gap-1.5">
        ✨ {isZh ? '补光对比 (左右拖动滑槽)' : 'Before / After (Slide divider)'}
      </span>
      
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseDown={handleMouseDown}
        className="relative w-full h-[155px] rounded-xl overflow-hidden border border-white/10 shadow-inner select-none cursor-col-resize group"
      >
        {/* Layer 1: BEFORE (Soft Dull, Shadowed, Dark bluish/grayish filter) */}
        <div className="absolute inset-0 bg-stone-950">
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
            alt="Before fill light"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover filter brightness-70 contrast-[1.02] grayscale-[15%] saturate-85 blur-[0.2px]"
          />
          {/* Bluish underexposed tint */}
          <div className="absolute inset-0 bg-indigo-950/20 mix-blend-color-burn" />
          
          <span className="absolute top-2 left-2 text-[9px] font-bold bg-black/60 text-stone-300 px-1.5 py-0.5 rounded-md backdrop-blur-xs tracking-wider z-10 transition-opacity">
            {isZh ? '未开启补光' : 'Before Glow'}
          </span>
        </div>

        {/* Layer 2: AFTER (Beautifully Lit, Warm creamy/cool glow matching activePreset tint) */}
        <div 
          className="absolute inset-0 pointer-events-none transition-all"
          style={{
            clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`
          }}
        >
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
            alt="After fill light"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover filter brightness-110 contrast-105 saturate-105"
          />
          {/* Dynamic soft light filter matching activePreset */}
          <div 
            className="absolute inset-0 mix-blend-soft-light transition-all duration-300"
            style={{
              backgroundColor: activePreset.color || '#FFFDF0',
              opacity: 0.4
            }}
          />
          {/* Dynamic screen bezel glow simulation */}
          <div 
            className="absolute inset-0 shadow-[inset_0_0_25px_rgba(255,255,255,0.4)] mix-blend-overlay transition-all duration-300"
            style={{
              borderColor: activePreset.color,
            }}
          />

          <span className="absolute top-2 right-2 text-[9px] font-bold bg-indigo-600/90 text-white px-1.5 py-0.5 rounded-md backdrop-blur-xs tracking-wider z-10">
            {isZh ? `已开启「${activePreset.name}」` : `${activePreset.englishName} active`}
          </span>
        </div>

        {/* Comparison Drag Handle slider */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-white pointer-events-none z-20 shadow-lg"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white text-zinc-900 border border-indigo-400 text-[8px] font-extrabold tracking-tight shadow-md flex items-center justify-center gap-1 select-none whitespace-nowrap opacity-90 group-hover:opacity-100 transition-opacity">
            <span>{isZh ? '◀ 前' : '◀ BEF'}</span>
            <span className="text-[7px] text-zinc-400">|</span>
            <span>{isZh ? '后 ▶' : 'AFT ▶'}</span>
          </div>
        </div>
      </div>
      
      <span className="text-[8.5px] text-white/30 text-center tracking-tight">
        {isZh ? '左右拖动中心拉杆，感受 Lumi 专属美学温润补光的变化' : 'Drag sliding lever to check the luminous luster contrast'}
      </span>
    </div>
  );
};
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
  Trash2,
  Sliders
} from 'lucide-react';

interface AmbientScenario {
  id: string;
  name: string;
  englishName: string;
  icon: string;
  brightness: number;
  warmth: number;
  recommendedPresetId: string;
  adviceZh: string;
  adviceEn: string;
}

interface UserPreferences {
  favoritePresetId: string;
  usageCounts: Record<string, number>;
  averageBrightness: number;
  averageSoftness: number;
  nighttimePresetId: string;
  autoApply: boolean; // Lumi Auto-Tune system! Default is true!
  styleMode: 'natural' | 'glamorous' | 'cool_tech'; // user selfie preference style
  sceneMemory?: Record<string, {
    presetId: string;
    brightness: number;
    softness: number;
    intensityLevel: 'soft' | 'normal' | 'rich' | 'studio';
  }>;
  lastSelectedPresetId?: string;
  consecutiveCount?: number;
}

const AMB_SCENARIOS: AmbientScenario[] = [
  {
    id: 'dull',
    name: '面部暗沉',
    englishName: 'Dull Skin',
    icon: '👤',
    brightness: 110,
    warmth: 1.0,
    recommendedPresetId: 'cream',
    adviceZh: '面部略显疲惫，建议开启「奶油肌」饱满补光',
    adviceEn: 'Dull tone detected. Try "Cream Skin" to bright up',
  },
  {
    id: 'dark_warm',
    name: '暗黄低光',
    englishName: 'Dark Warm',
    icon: '🌙',
    brightness: 60,
    warmth: 1.45,
    recommendedPresetId: 'cold',
    adviceZh: '光影昏暗偏黄，建议一键应用「冷白皮」去黄提亮',
    adviceEn: 'Dim & yellow context. Suggest cool "Ice White" light',
  },
  {
    id: 'warm_restaurant',
    name: '暖色餐厅',
    englishName: 'Warm Light',
    icon: '🍷',
    brightness: 120,
    warmth: 1.55,
    recommendedPresetId: 'sunset',
    adviceZh: '温馨室温烘托，合衬点亮「日落橘」暖夕阳微光',
    adviceEn: 'Warm surrounding ambiance. Try "Sunset Glow" style',
  },
  {
    id: 'night_cool',
    name: '夜晚冷调',
    englishName: 'Night Cool',
    icon: '🌌',
    brightness: 45,
    warmth: 0.75,
    recommendedPresetId: 'moonlight',
    adviceZh: '夜色冰亮幽暗，建议开启「月光蓝」打造通透眼神光',
    adviceEn: 'Night cold scene. Match with icy "Moonlight" light',
  },
  {
    id: 'daylight_bright',
    name: '户外日光',
    englishName: 'Daylight',
    icon: '☀️',
    brightness: 200,
    warmth: 0.95,
    recommendedPresetId: 'love',
    adviceZh: '户外光照充盈，推荐使用「初恋粉」红润通透气色',
    adviceEn: 'Bright daylight. Match with rosy "First Love" skin',
  }
];

export default function App() {
  // Primary States
  const [activePreset, setActivePreset] = useState<FillLightPreset>(FILL_LIGHT_PRESETS[0]);
  const [isLightSelected, setIsLightSelected] = useState<boolean>(false);
  const [immersiveMode, setImmersiveMode] = useState<boolean>(false);
  const [splitMode, setSplitMode] = useState<SplitMode>('none');
  const [splitPresetLeft, setSplitPresetLeft] = useState<FillLightPreset>(FILL_LIGHT_PRESETS[1]); // 初恋粉
  const [splitPresetRight, setSplitPresetRight] = useState<FillLightPreset>(FILL_LIGHT_PRESETS[2]); // 冷白皮
  const [selectedSplitSide, setSelectedSplitSide] = useState<'left' | 'right'>('left');

  const [brightness, setBrightness] = useState<number>(0.80); // 15% to 100%
  const [softness, setSoftness] = useState<number>(0.70); // Color saturation/dilution
  const [intensityLevel, setIntensityLevel] = useState<'soft' | 'normal' | 'rich' | 'studio'>('normal');

  // AI Ambient Light Recommendation Engine States
  const [ambientStats, setAmbientStats] = useState<{
    brightness: number;
    warmth: number;
    faceBrightness: number;
    bgBrightness: number;
    underEyeShadow: number;
    backlightRatio: number;
    isYellowLight: boolean;
    skinToneWarmth: number;
    contrastRatio: number;
  }>({
    brightness: 110,
    warmth: 1.0,
    faceBrightness: 125,
    bgBrightness: 115,
    underEyeShadow: 95,
    backlightRatio: 0.92,
    isYellowLight: false,
    skinToneWarmth: 1.02,
    contrastRatio: 30,
  });
  const [simulatedScenario, setSimulatedScenario] = useState<string>('none');
  const [lastRestoredSceneKey, setLastRestoredSceneKey] = useState<string>('');
  const [restoreMessage, setRestoreMessage] = useState<string>('');
  const [isAiPanelExpanded, setIsAiPanelExpanded] = useState<boolean>(false);
  const [isAiScanning, setIsAiScanning] = useState<boolean>(false);

  // Scene Locking & Anti-flicker states
  const [manualLockMode, setManualLockMode] = useState<boolean>(false);
  const [lockedStats, setLockedStats] = useState<{
    brightness: number;
    warmth: number;
    faceBrightness: number;
    bgBrightness: number;
    underEyeShadow: number;
    backlightRatio: number;
    isYellowLight: boolean;
    skinToneWarmth: number;
    contrastRatio: number;
    simulatedScenario: string;
    styleMode: string;
  } | null>(null);
  const [sceneChangeScore, setSceneChangeScore] = useState<number>(0);
  const [lockedRecommendedInfo, setLockedRecommendedInfo] = useState<any>(null);

  // Real-time or Advanced AI Results from Gemini
  const [aiReport, setAiReport] = useState<{
    skinTone: string;
    brightness: string;
    shadows: string;
    sceneCharacteristics: string;
    problems: string;
    reasoningZh: string;
    reasoningEn: string;
    recommendedPresetId: string;
    recommendedIntensity: string;
    targetBrightness: number;
    targetSoftness: number;
  } | null>(null);

  // AI Cognitive Personal preferences state
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
       const saved = localStorage.getItem('lumi_user_preferences');
       if (saved) {
         const parsed = JSON.parse(saved);
         return {
           favoritePresetId: parsed.favoritePresetId || 'cream',
           usageCounts: parsed.usageCounts || { cream: 3, love: 1, cold: 2 },
           averageBrightness: parsed.averageBrightness ?? 0.80,
           averageSoftness: parsed.averageSoftness ?? 0.70,
           nighttimePresetId: parsed.nighttimePresetId || 'cold',
           autoApply: parsed.autoApply ?? true,
           styleMode: parsed.styleMode || 'natural',
           sceneMemory: parsed.sceneMemory || {},
           lastSelectedPresetId: parsed.lastSelectedPresetId || '',
           consecutiveCount: parsed.consecutiveCount ?? 0,
         };
       }
    } catch (e) {
       console.error('Failed to load user preferences', e);
    }
    return {
       favoritePresetId: 'cream',
       usageCounts: { cream: 2, love: 1, cold: 1 },
       averageBrightness: 0.80,
       averageSoftness: 0.70,
       nighttimePresetId: 'cold',
       autoApply: true,
       styleMode: 'natural',
       sceneMemory: {},
       lastSelectedPresetId: '',
       consecutiveCount: 0,
    };
  });

// Keep preferences in persistent storage
  useEffect(() => {
    try {
      localStorage.setItem('lumi_user_preferences', JSON.stringify(preferences));
    } catch (e) {
      console.error('Failed to save user preferences', e);
    }
  }, [preferences]);

  // Simulated Hardware & Settings States
  const [settings, setSettings] = useState<AppSettings>({
    language: 'zh',
    hapticFeedback: true,
    guideOverlay: true,
    gridEnabled: false,
    mirrorCamera: true,
    highQualityStream: true,
  });

  const isZh = settings.language === 'zh';

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
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState<boolean>(false);

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

  const getSceneKey = (stats: typeof ambientStats) => {
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 18 || currentHour < 6;
    const bKey = stats.faceBrightness < 95 ? 'low' : stats.faceBrightness > 160 ? 'high' : 'mid';
    const wKey = stats.skinToneWarmth > 1.25 ? 'warm' : stats.skinToneWarmth < 0.88 ? 'cool' : 'neutral';
    const tKey = isNight ? 'night' : 'day';
    const oKey = simulatedScenario === 'daylight_bright' || (simulatedScenario === 'none' && stats.bgBrightness > 180) ? 'outdoor' : 'indoor';
    return `${bKey}_${wKey}_${tKey}_${oKey}`;
  };

  const updateSceneMemory = (presetId: string, bValue: number, sValue: number, intensity: typeof intensityLevel) => {
    const sKey = getSceneKey(ambientStats);
    setPreferences(prev => {
      const currentMemory = prev.sceneMemory || {};
      const updatedMemory = {
        ...currentMemory,
        [sKey]: {
          presetId,
          brightness: bValue,
          softness: sValue,
          intensityLevel: intensity
        }
      };
      
      const nextPrefs = {
        ...prev,
        sceneMemory: updatedMemory
      };
      
      try {
        localStorage.setItem('lumi_user_preferences', JSON.stringify(nextPrefs));
      } catch (err) {
        console.error('Failed to save to scene preference memory', err);
      }
      
      return nextPrefs;
    });
  };

  const calculateSceneChangeScore = (current: typeof ambientStats, locked: any) => {
    if (!locked) return 100;

    let score = 0;

    // 1. Scene category / simulated scenario change (causes instant 100% change rating)
    if (simulatedScenario !== locked.simulatedScenario) {
      return 100;
    }
    // 2. Personal makeup aesthetic profile changes
    if (preferences.styleMode !== locked.styleMode) {
      return 100;
    }

    // 3. Ambient face brightness change (exceeding 30%)
    const brightnessDiffPct = Math.abs(current.faceBrightness - locked.faceBrightness) / (locked.faceBrightness || 1);
    if (brightnessDiffPct > 0.30) {
      // 30% brightness change is significant. Diff of 30% maps to ~45 points change weight
      score += Math.min(60, Math.round(brightnessDiffPct * 150));
    }

    // 4. White balance / skin tone warmth change (exceeding 20%)
    const warmthDiffPct = Math.abs(current.skinToneWarmth - locked.skinToneWarmth) / (locked.skinToneWarmth || 1);
    if (warmthDiffPct > 0.20) {
      // 20% warmth change is significant. Diff of 20% maps to ~40 points change weight
      score += Math.min(60, Math.round(warmthDiffPct * 200));
    }

    // 5. Environmental background brightness change (exceeding 30%)
    const bgDiffPct = Math.abs(current.bgBrightness - locked.bgBrightness) / (locked.bgBrightness || 1);
    if (bgDiffPct > 0.30) {
      score += Math.min(45, Math.round(bgDiffPct * 120));
    }

    // 6. Extreme backlight ratio changes
    const backlightDiff = Math.abs(current.backlightRatio - locked.backlightRatio);
    if (backlightDiff > 0.40) {
      score += Math.min(30, Math.round(backlightDiff * 50));
    }

    // 7. Facial occlusion / shadowing adjustments (exceeding 15%)
    const eyeShadowDiff = Math.abs(current.underEyeShadow - locked.underEyeShadow);
    if (eyeShadowDiff > 15) {
      score += Math.min(25, Math.round((eyeShadowDiff - 15) * 1.5));
    }

    return Math.min(100, score);
  };

  const handleAmbientDetected = (stats: typeof ambientStats) => {
    setAmbientStats(stats);
    
    // If we have an active advanced Gemini AI vision report, we respect and freeze that
    if (aiReport) {
      if (!lockedStats) {
        setLockedStats({
          ...stats,
          simulatedScenario,
          styleMode: preferences.styleMode
        });
        setSceneChangeScore(0);
      } else {
        const score = calculateSceneChangeScore(stats, lockedStats);
        setSceneChangeScore(score);
        if (score > 70) {
          setAiReport(null); // automatic fade-back to rule-based sensory tracking when scene changes significantly
          setLockedStats(null);
        }
      }
      return;
    }

    // 1. Initial sensory state or complete scene unlock
    if (!lockedStats) {
      const recommendation = getRecommendation(stats.brightness, stats.warmth);
      setLockedRecommendedInfo(recommendation);
      setLockedStats({
        ...stats,
        simulatedScenario,
        styleMode: preferences.styleMode
      });
      setSceneChangeScore(0);

      // Verify custom personal Scene Memory cache
      const sKey = getSceneKey(stats);
      const saved = preferences.sceneMemory?.[sKey];

      if (saved) {
        const matchedPreset = FILL_LIGHT_PRESETS.find(p => p.id === saved.presetId);
        if (matchedPreset) {
          if (!manualLockMode && preferences.autoApply) {
            setActivePreset(matchedPreset);
            setIsLightSelected(true);
            setBrightness(saved.brightness);
            setSoftness(saved.softness);
            setIntensityLevel(saved.intensityLevel || 'normal');
          }
          const presetName = isZh ? matchedPreset.name : matchedPreset.englishName;
          const msg = isZh 
            ? `✨ [AI 记忆还原] 来到新场景，自动恢复您在此环境偏爱的「${presetName}」补光`
            : `✨ [Memory Restored] Sensed scene key! Loaded your custom "${presetName}" setup`;
          showToast(msg);
        }
      } else {
        // Cold start - autoapply the new recommendation if allowed & not manually overridden
        const matchedPreset = FILL_LIGHT_PRESETS.find(p => p.id === recommendation.presetId);
        if (matchedPreset) {
          if (!manualLockMode && preferences.autoApply) {
            setActivePreset(matchedPreset);
            setIsLightSelected(true);
            
            let targetB = matchedPreset.intensity;
            targetB = parseFloat(((targetB * 0.35) + (preferences.averageBrightness * 0.65)).toFixed(2));
            if (targetB < 0.25) targetB = 0.25;
            if (targetB > 1.0) targetB = 1.0;

            let targetS = 0.65;
            targetS = parseFloat(((targetS * 0.4) + (preferences.averageSoftness * 0.6)).toFixed(2));
            if (targetS < 0.15) targetS = 0.15;
            if (targetS > 0.95) targetS = 0.95;

            setBrightness(targetB);
            setSoftness(targetS);
          }
          const presetName = isZh ? matchedPreset.name : matchedPreset.englishName;
          const msg = isZh 
            ? `✨ [Lumi AI 智能自适应] 来到新环境，自选推荐最佳「${presetName}」`
            : `✨ [Lumi AI Ambiance] Located new scene! Custom recommending "${presetName}" preset`;
          showToast(msg);
        }
      }
    } else {
      // 2. We have a stable locked base state. Evaluate if scene has changed beyond threshold
      const score = calculateSceneChangeScore(stats, lockedStats);
      setSceneChangeScore(score);

      if (score > 70) {
        // Scene changed significantly! Trigger recalculation and reset state tracking base
        const recommendation = getRecommendation(stats.brightness, stats.warmth);
        setLockedRecommendedInfo(recommendation);
        setLockedStats({
          ...stats,
          simulatedScenario,
          styleMode: preferences.styleMode
        });
        setSceneChangeScore(0);

        // Verify custom Scene Memory
        const sKey = getSceneKey(stats);
        const saved = preferences.sceneMemory?.[sKey];

        if (saved) {
          const matchedPreset = FILL_LIGHT_PRESETS.find(p => p.id === saved.presetId);
          if (matchedPreset) {
            if (!manualLockMode && preferences.autoApply) {
              setActivePreset(matchedPreset);
              setIsLightSelected(true);
              setBrightness(saved.brightness);
              setSoftness(saved.softness);
              setIntensityLevel(saved.intensityLevel || 'normal');
            }
            const presetName = isZh ? matchedPreset.name : matchedPreset.englishName;
            const msg = isZh 
              ? `✨ [AI 记忆还原] 自拍场景已变，已自动恢复在相同场景最喜爱的「${presetName}」`
              : `✨ [Memory Restored] Environment changed, loaded your favorite "${presetName}" setup`;
            showToast(msg);
          }
        } else {
          // Cold start - autoapply fresh recommender parameters
          const matchedPreset = FILL_LIGHT_PRESETS.find(p => p.id === recommendation.presetId);
          if (matchedPreset) {
            if (!manualLockMode && preferences.autoApply) {
              setActivePreset(matchedPreset);
              setIsLightSelected(true);
              
              let targetB = matchedPreset.intensity;
              targetB = parseFloat(((targetB * 0.35) + (preferences.averageBrightness * 0.65)).toFixed(2));
              if (targetB < 0.25) targetB = 0.25;
              if (targetB > 1.0) targetB = 1.0;

              let targetS = 0.65;
              targetS = parseFloat(((targetS * 0.4) + (preferences.averageSoftness * 0.6)).toFixed(2));
              if (targetS < 0.15) targetS = 0.15;
              if (targetS > 0.95) targetS = 0.95;

              setBrightness(targetB);
              setSoftness(targetS);
            }
            const presetName = isZh ? matchedPreset.name : matchedPreset.englishName;
            const msg = isZh 
              ? `✨ [Lumi AI 场景重估] 光线明显发生变化，重新为您推选「${presetName}」配方`
              : `✨ [Lumi AI Scene Reset] Significant sensory shift, matching new "${presetName}" preset`;
            showToast(msg);
          }
        }
      }
    }
  };

  const getRecommendation = (bright: number, warm: number) => {
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 18 || currentHour < 6;

    const detectedTime = isNight 
      ? (isZh ? '暗夜时刻 🌌' : 'Night Scene 🌌') 
      : (isZh ? '和煦白昼 ☀️' : 'Daylight Hours ☀️');

    // Layer 2: Resolve background scenario context types
    let effectiveScenId = simulatedScenario;
    if (effectiveScenId === 'none') {
      if (bright > 165) {
        effectiveScenId = 'daylight_bright'; // Open Outdoor Sunbeams
      } else if (warm > 1.25) {
        effectiveScenId = bright < 95 ? 'dark_warm' : 'warm_restaurant'; // Warm Bedroom vs Cafe/Restaurant
      } else if (warm < 0.88 && bright < 95) {
        effectiveScenId = 'night_cool'; // Night Street or Dark Balcony
      } else if (bright < 118) {
        effectiveScenId = 'dull'; // Grayish white wall room
      } else {
        effectiveScenId = 'normal'; // Standard comfortable LED room
      }
    }

    // Layer 1: Person makeup styles from preference
    const makeupStyleZh = preferences.styleMode === 'glamorous' 
      ? '精致心动蜜桃妆' 
      : preferences.styleMode === 'cool_tech' 
      ? '高级无瑕微冷哑光妆' 
      : '原生清爽空气裸妆';
    const makeupStyleEn = preferences.styleMode === 'glamorous' 
      ? 'Vibrant peach glamorous contour' 
      : preferences.styleMode === 'cool_tech' 
      ? 'Sophisticated chic cool-matte nude' 
      : 'Fresh minimal dewy bare finish';

    // Core variables mapping the 3 upgraded layers
    let presetId = 'cream';
    let labelZh = '元气匀净';
    let labelEn = 'Skin Perfector';

    // Person layers
    let pSkinTempZh = '';
    let pSkinTempEn = '';
    let pBrightnessZh = '';
    let pBrightnessEn = '';
    let pShadowsZh = '';
    let pShadowsEn = '';
    let pDullnessZh = '';
    let pDullnessEn = '';
    let p3DZh = '';
    let p3DEn = '';
    let pEyeShadowZh = '';
    let pEyeShadowEn = '';

    // Environment layers
    let bgLampZh = '';
    let bgLampEn = '';
    let bgWallZh = '';
    let bgWallEn = '';
    let bgNightZh = '';
    let bgNightEn = '';
    let bgInOutZh = '';
    let bgInOutEn = '';
    let bgTempZh = '';
    let bgTempEn = '';

    // Reasoning layers
    let stepsZh: string[] = [];
    let stepsEn: string[] = [];
    let baseAdviceZh = '';
    let baseAdviceEn = '';

    let detectedBright = '';
    let detectedWarm = '';
    let detectedBg = '';
    let detectedSkin = '';
    let detectedPlace = '';

    // Advanced local AI adaptive matrix matching rules incorporating multi-sensor profiles:
    if (effectiveScenId === 'dark_warm' || (ambientStats.isYellowLight && ambientStats.faceBrightness < 100)) {
      // 1. FIRST LAYER (PERSON): Dull skin + Warm Cast + Under-eye Dark Circles
      // 2. SECOND LAYER (BG): Warm Yellow bulbs + Wooden accents + Cozy home
      // 3. SMART DE-DUPLICATION RULE: Background yellow is high, so AVOID sunset/orange lights. Recommend a clarifying neutral 'cream' warmth to avoid over-yellowing!
      // 4. THIRD LAYER (INTENT): Everyday Cozy Home Soft Focus selfie
      presetId = 'cream'; 
      labelZh = '丝滑提亮自适应';
      labelEn = 'Velvet Contrast';

      pSkinTempZh = '肤色泛黄，暖光在局部产生红热堆积，底气色缺乏剔透透白亮斑';
      pSkinTempEn = 'Skin is yellowish with warm light overload, lacking cold porcelains';
      pBrightnessZh = '面庞光感较暗，受杂光倾斜照入影响，面颊受光稍显欠曝';
      pBrightnessEn = 'Face structure suffers minor underexposure slots';
      pShadowsZh = '鼻翼及折转轮廓留存有中度温热软阴影';
      pShadowsEn = 'Soft downward yellow folds near jawlines';
      pDullnessZh = '因熬夜有些许油脂发黄，伴随面容少许灰沉色块';
      pDullnessEn = 'Low skin bounce with subtle flat yellow sebum stains';
      p3DZh = '顶层漫光角度导致五官微微沉闷，阴影起落被吃掉';
      p3DEn = 'Face depth is slightly flattened by direct ambient bulbs';
      pEyeShadowZh = '眼底有较显眼下暗沉，面部少许疲态阴网痕迹';
      pEyeShadowEn = 'Minor dark circles under eyelids from monitor exposure';

      bgLampZh = '家中暖白LED吸顶主灯，间歇夹杂周围黄色床头台灯或壁灯';
      bgLampEn = 'Cozy household ambient LED ceiling bowl combined with yellow spots';
      bgWallZh = '温润温馨的米黄色墙体质感或居家布艺软夹板背景';
      bgWallEn = 'Comfortable light yellow wallpaper with warm wood structures';
      bgNightZh = '属于舒适放松、休憩、安逸的典型居家卧房/客厅场景';
      bgNightEn = 'Cozy interior bedroom or home workspace backdrop';
      bgInOutZh = '温馨舒适的室内居家角';
      bgInOutEn = 'Caring private home bedroom';
      bgTempZh = '温馨暖和暖黄';
      bgTempEn = 'Cozy warm temperature sphere';

      baseAdviceZh = '✨ 脸颊有点疲倦，试试「奶油肌」饱满气色哦';
      baseAdviceEn = '✨ Cozy yet warm yellow home detected. Since the backdrop already carries heavy yellow casts, Lumi avoided deep oranges and auto-applied clarifying "Cream Skin" instead. It softly neutralizes skin dullness and plumps under-eye dark circles, creating a clean velvety finish.';

      stepsZh = [
        '第一步【人物特征分析】：侦测到面泛微黄、眼下暗沉泪沟，当前妆容呈现精致暖意。',
        '第二步【背景场景匹配】：捕捉到温馨居家暖灯及木质背景，环境已严重暖色溢出。',
        '第三步【自拍意图对冲】：推测为居家放松、生活记录之极简慢意自拍，自动避免推荐暖橘色，极速注入温和「奶油肌」柔和漫补，抚平细小疲态阴影。'
      ];
      stepsEn = [
        'Step 1 [Portrait Analysis]: Yellow skin cast and mild dark circles spotted, featuring fresh dewy makeup.',
        'Step 2 [Background Scan]: Cozy home yellow bulbs and wooden borders found. Warm hues are already saturated.',
        'Step 3 [Intent Inference]: Deduced as a cozy home selfie. Stopped Sunset Orange, fitting "Cream Skin" instead to reset gray spots and plump folds.'
      ];

      detectedBright = isZh ? '夜色暗光' : 'Cozy Dim Light';
      detectedWarm = isZh ? '温馨烛光' : 'Warm Orange Cast';
      detectedBg = isZh ? '温暖舒适居家' : 'Cozy Living Space';
      detectedSkin = isZh ? '肤色偏黄·眼下暗沉' : 'Warm skin & dark circles';
      detectedPlace = isZh ? '舒适卧室' : 'Home Bedroom';

    } else if (effectiveScenId === 'warm_restaurant') {
      // 1. FIRST LAYER (PERSON): balmy golden-hour skin, glowing peach look
      // 2. SECOND LAYER (BG): cafe scene, golden wood, romantic lighting
      // 3. THIRD LAYER (INTENT): Sophisticated Social Share / Dining date, high emotional vibe
      presetId = 'special_soft_sweet'; // Sweet Peach Special
      labelZh = '精致名媛蜜桃';
      labelEn = 'Glamour Peach';

      pSkinTempZh = '面庞光感莹润，散发暖杏色泽';
      pSkinTempEn = 'Sensational warm peach skin luster with golden glow';
      pBrightnessZh = '采光温和得当，明暗部起伏饱满，骨相十分立体';
      pBrightnessEn = 'Perfect lighting levels with elegant natural side-shadows';
      pShadowsZh = '颧骨下方及颚缘分布有轻柔曼妙的修容式微影';
      pShadowsEn = 'Soft decorative shadows mapping beautiful jawlines';
      pDullnessZh = '澄澈晶莹，少许水光折射感，神采奕奕';
      pDullnessEn = 'Plump, glossy skin textures with great emotional vitalities';
      p3DZh = '面部折线感极佳，配合微侧光源更显立体有致';
      p3DEn = 'High-fashion dimensional details under warm side keylights';
      pEyeShadowZh = '眼睑舒展，仅残留淡淡生活正常气色起伏影痕';
      pEyeShadowEn = 'Inconspicuous shadows smoothly covered by champagne highlights';

      bgLampZh = '咖啡馆精致装饰性落地球、慢摇摇曳金光或吊灯';
      bgLampEn = 'Cozy golden café chandelier or candlelight desk spots';
      bgWallZh = '经典复古木质家具、咖啡机铜色光泽与皮质靠椅';
      bgWallEn = 'Elegant restaurant wooden textures and dark leather backs';
      bgNightZh = '属于充满小资情调、品质约会、午后享受的休闲场景';
      bgNightEn = 'Romantic cafe or dining table background';
      bgInOutZh = '充满优雅格调的高端餐饮空间';
      bgInOutEn = 'Luxury indoor restaurant table';
      bgTempZh = '温馨曼妙柔和金';
      bgTempEn = 'Balmy gold café light';

      baseAdviceZh = '✨ 这里灯光温润，用「柔樱粉黛」气色加分哦';
      baseAdviceEn = '✨ Sophisticated cafe scenery detected with excellent makeup and dimensional skin. Lumi deduced this is a social-sharing self-portrait! We selected sweet velvet "Sweet Peach" fill light to inject a rosy blossom flush on your cheeks, outlining stunning photogenic confidence.';

      stepsZh = [
        '第一步【人物特征分析】：检测到极佳的面庞维度与舒润妆容，面部毫无疲态。',
        '第二步【背景场景匹配】：定位到咖啡厅/精致宴会现场、极富格调之暖香香槟背景。',
        '第三步【自拍意图对冲】：推测为高端社交分享、好友聚会自拍大片，自动选用特调「柔樱粉黛」蜜温渲染，完美提亮瞳孔，流溢迷人亮眸。'
      ];
      stepsEn = [
        'Step 1 [Portrait Analysis]: Brilliant face shape and gorgeous lip-cheek tone detected with zero fatigue.',
        'Step 2 [Background Scan]: Refined cafe or upscale dining lobby with warm champagne glitz.',
        'Step 3 [Intent Inference]: Inferred as a classy social sharing snapshot. Programmed sweet "Sweet Peach" spectrum to enrich peach undertones and light up pupils.'
      ];

      detectedBright = isZh ? '暖意适中' : 'Cozy Warm Light';
      detectedWarm = isZh ? '暖光蜜金' : 'Glistening Amber';
      detectedBg = isZh ? '艺术格调咖啡厅' : 'Aesthetic Café Background';
      detectedSkin = isZh ? '红润通透·骨相立体' : 'Dewy peach & sculpted';
      detectedPlace = isZh ? '高格调慢空间' : 'Vivid Restaurant';

    } else if (effectiveScenId === 'night_cool' || (isNight && ambientStats.bgBrightness < 80)) {
      // 1. FIRST LAYER (PERSON): cold dark blue casting, face obscured, dark circles pronounced
      // 2. SECOND LAYER (BG): midnight dark, balcony/street scene, deep indigo sky
      // 3. THIRD LAYER (INTENT): Atmospheric Midnight Portrait / Deep Mood Shot
      presetId = 'special_ambient_mood'; // Velvet Mood Special
      labelZh = '幽谧微醺霓虹';
      labelEn = 'Aesthetic Neon';

      pSkinTempZh = '背光笼罩于极冷深夜幽暗中，肤质折射清冷微蓝';
      pSkinTempEn = 'Deep night cobalt blue skin background and low face lux';
      pBrightnessZh = '光感极为稀缺，面颊在黑暗阴影中缺失反射层次';
      pBrightnessEn = 'Extremely low lighting, facial details slightly obscured';
      pShadowsZh = '深重的黑曜石暗影全面压迫额骨及唇周两侧';
      pShadowsEn = 'Heavy graphite-colored shadow blocks on the temples';
      pDullnessZh = '肤色处于夜色疲倦底调，气色黯淡无光，略发灰涩';
      pDullnessEn = 'Low skin bounce under cool dark sky, eyes look dim';
      p3DZh = '面部骨骼线条完全淹没在暗光中，失去明显长宽透度';
      p3DEn = 'Facial lines lack contour definition and boundary separation';
      pEyeShadowZh = '眼下方伴随极显眼的熬夜重影，泪痕暗沉随低照度加重';
      pEyeShadowEn = 'Strong under-eye shadows reflecting late-night fatigue';

      bgLampZh = '远处闪烁的道路霓虹、散漫高层夜景星点灯斑或月牙光晕';
      bgLampEn = 'Distant urban sodium street lamps and neon bokeh glow';
      bgWallZh = '沉寂墨蓝的室外长空、暗色雕护栏或高空露天落地玻璃';
      bgWallEn = 'Dark twilight sky or plain midnight glass balcony backdrop';
      bgNightZh = '属于静谧黑夜、城市午夜露台或寂静户外夜生活环境';
      bgNightEn = 'Typical dark outdoor city-view balcony setting';
      bgInOutZh = '视野宏大的深夜城市高空阳台';
      bgInOutEn = 'Deep night open terrace';
      bgTempZh = '清冷高阶幽深蓝';
      bgTempEn = 'Midnight icy indigo tone';

      baseAdviceZh = '✨ 深夜太暗啦，配上「迷醺氛围」绝美夜调哦';
      baseAdviceEn = '✨ Mystical city nightscape detected. Shooting stark white flash would wash out this gorgeous skyline and blind you. Lumi deduced this is an ambient night mood self-portrait! We deployed fancy neon "Velvet Mood" fill: rendering cozy twilight violet highlights on your cheekbones, instantly erasing late-night shadow.';

      stepsZh = [
        '第一步【人物特征分析】：侦测到肌肤暗黑失光、受暗处黑眼圈困扰，冷蓝底影遮挡五官。',
        '第二步【背景场景匹配】：定位至开阔都市夜景地，环境充满大面积夜幕深蓝，具有稀落点光源。',
        '第三步【自拍意图对冲】：推测为深夜质感氛围自拍、情绪肖像记录，自动加载「霓虹夜幕」霓紫与极曜金辉交融，对冲暗沉，渲染夜色璀璨眼神。'
      ];
      stepsEn = [
        'Step 1 [Portrait Analysis]: Deep dark eye circles and heavy shadow blocks caused by dim night lighting.',
        'Step 2 [Background Scan]: Pitch dark terrace space surrounded by majestic twilight cobalt skyline.',
        'Step 3 [Intent Inference]: Inferred as a late-night artistic aesthetic portrait. Avoided generic white flash, overlaying cozy "Velvet Mood" purple highlights for cinema vibes.'
      ];

      detectedBright = isZh ? '夜景光寂' : 'Midnight Low Lux';
      detectedWarm = isZh ? '荧虹深蓝' : 'Neon Cobalt Blue';
      detectedBg = isZh ? '幽密都市夜景' : 'Urban Skyline Lights';
      detectedSkin = isZh ? '清暗无光·黑眼圈明显' : 'Obscured & tired gaze';
      detectedPlace = isZh ? '高空露天露台' : 'Night Open Balcony';

    } else if (effectiveScenId === 'dull' || (ambientStats.bgBrightness > 140 && ambientStats.faceBrightness < 115)) {
      // 1. FIRST LAYER (PERSON): Warmth/coolness yellowish skin, face dullness with grayish casts
      // 2. SECOND LAYER (BG): White walls, office lighting, bland backdrops reflecting cold fluorescence
      // 3. SMART DE-DUPLICATION RULE: White wall environment reflects cold dull gray, so we give cold Porcelain white to counter yellowish skin, OR we boost anti-dullness teal-mint!
      // 4. THIRD LAYER (INTENT): Work/Daily commute, clearing office fatigue
      presetId = 'special_cold_white'; // Porcelain Cool特调
      labelZh = '冰透去黄特调';
      labelEn = 'Porcelain Cool';

      pSkinTempZh = '肤质带有熬夜泛黄、底色青灰，通透度随荧光管平照下降';
      pSkinTempEn = 'Complexion is yellowish-gray with flat room textures';
      pBrightnessZh = '采光均匀分布，但主体面颊呈疲倦哑光，高光泽缺乏气血张力';
      pBrightnessEn = 'Uniform light levels but face skin is dry and dull';
      pShadowsZh = '眼角下方与鼻基底深处投射有细长浅灰暗影';
      pShadowsEn = 'Acast of minor tired lines around base of noise';
      pDullnessZh = '油脂氧化引起的黄绿感，伴随办公屏显长期辐射带来的灰冷光';
      pDullnessEn = 'Low transparency and flat yellow sebum spots due to screen glares';
      p3DZh = '面部折角在纯白发散光源中略显平扁，缺乏错落有致的维度';
      p3DEn = 'Flat facial contours caused by multi-angle reflection';
      pEyeShadowZh = '眼下方散落明显色斑与浅暗泪沟暗印';
      pEyeShadowEn = 'Bluish gray shadows and noticeable monitor-fatigue fatigue lines';

      bgLampZh = '大面积方形嵌入式白色荧光灯框或白色吸顶灯条';
      bgLampEn = 'Diffuse corporate white overhead office fluorescent tube grids';
      bgWallZh = '纯白色光滑普通石膏粉刷墙，反射大量冷色散漫杂影';
      bgWallEn = 'Plain matte-white drywall background bouncing monotonic cold grays';
      bgNightZh = '属于专注、高能、理性的办公室工作间或标准居家自学室';
      bgNightEn = 'Daytime office workplace or simple clinical white-collar study room';
      bgInOutZh = '典型的明亮浅色写字楼办公桌';
      bgInOutEn = 'Office desk corporate room';
      bgTempZh = '自然中性冷爽白';
      bgTempEn = 'Clinical fluorescent cool white';

      baseAdviceZh = '✨ 灯光太硬皮肤累，推荐「清冽瓷白」更通透';
      baseAdviceEn = '✨ Clinical white office walls and fluorescents detected, causing a tiresome yellow-gray skin tone. Lumi inferred you are in a professional daily commute mood! We calibrated a customized "Porcelain Cool" icy-blue white filter. It completely counteracts yellow skin sebum and purifies tired eyes in one click.';

      stepsZh = [
        '第一步【人物特征分析】：侦测到皮脂微泛黄、脸颊伴随少许暗灰色块，眼底略带工作疲惫。',
        '第二步【背景场景匹配】：捕捉到大平荧光管及白墙反光环境，背景已存在高亮度冷灰色调。',
        '第三步【自拍意图对冲】：推测为高频日常通勤、精神气色状态恢复之瞬间记录，选用高精「清冽瓷白」滤除灰暗杂色，拉开水光透明感。'
      ];
      stepsEn = [
        'Step 1 [Portrait Analysis]: Fatigued skin tones with slight yellow sebum oxidation and screen-glared eye bags.',
        'Step 2 [Background Scan]: Plain matte-white office plaster backing casting flat shadows.',
        'Step 3 [Intent Inference]: Inferred as a workday daily commute profile refresh. Deployed Porcelain Blue-White filter "Porcelain Cool" to override yellowing aspects.'
      ];

      detectedBright = isZh ? '平光冷白' : 'Flat White Light';
      detectedWarm = isZh ? '冷淡中性' : 'Clinical Cool Temp';
      detectedBg = isZh ? '高反射纯浅背景' : 'White Office Wall';
      detectedSkin = isZh ? '蜡黄暗灰且现疲惫' : 'Yellowish-gray & tired screen face';
      detectedPlace = isZh ? '办公大楼办公桌' : 'Corporate Desk';

    } else if (effectiveScenId === 'daylight_bright') {
      // 1. FIRST LAYER (PERSON): sun-washed, extreme sun reflection
      // 2. SECOND LAYER (BG): open air, daylight, greenery
      // 3. THIRD LAYER (INTENT): active outdoor sharing, vitalities
      presetId = 'love'; 
      labelZh = '气血填充防御';
      labelEn = 'Blush Protection';

      pSkinTempZh = '高光晶透白里透红，日晒反光率极高';
      pSkinTempEn = 'Healthy vibrant outdoor skin reflection under full sun';
      pBrightnessZh = '采光超载充充盈，面颊被金熙日光强烈直晒';
      pBrightnessEn = 'High-level solar lighting close to overexposure scale';
      pShadowsZh = '鼻梁及睫毛等部分在直射下，投下细尖硬影子';
      pShadowsEn = 'Sharp solar peak point shadows near cheek contours';
      pDullnessZh = '极其通透，角质清澈干净，唯独正面略微高光泛白';
      pDullnessEn = 'Outstanding clarity with glowing textures but raw color washed out';
      p3DZh = '极硬的大平光将面部起伏压平，部分暗部比例流失';
      p3DEn = 'Strong vertical sunbeams flatten dynamic jaw contours';
      pEyeShadowZh = '眼下方泪沟阴影已被亮眼太阳直晒消融、干净亮丽';
      pEyeShadowEn = 'Eye lines and dark circles completely washed out by daylight';

      bgLampZh = '天幕湛蓝开阔、烈日高空斜射或耀目自然日光照耀';
      bgLampEn = 'Open daylight sun or natural sky sunbeams';
      bgWallZh = '室外开阔建筑剪影、茂盛绿叶植物背景或公园露天长凳';
      bgWallEn = 'Glistening tree leaves or concrete outdoor park silhouettes';
      bgNightZh = '典型的晴朗假日、徒步、野餐等户外旅行自拍场景';
      bgNightEn = 'Sunny afternoon outdoor recreation backdrop';
      bgInOutZh = '视野空旷、采光极大的野外自然场域';
      bgInOutEn = 'Open natural outdoor location';
      bgTempZh = '纯净闪亮柔烈阳';
      bgTempEn = 'Natural solar glare temp';

      baseAdviceZh = '✨ 阳光太亮啦，用「初恋粉」锁住白里透红哦';
      baseAdviceEn = '✨ Sunny bright outdoors detected. Massive daylight can bleach your face and wash away your natural blushes. Lumi recommended pink-soft "First Love" schema, adding an artistic peach rose filter to absorb the raw glare and lock in a beautiful healthy flush.';

      stepsZh = [
        '第一步【人物特征分析】：检测到极高照度下皮肤充盈白里透红，面容略有暴晒漂白感。',
        '第二步【背景场景匹配】：定位至极高采光的户外野外长廊，阳光和绿化呈现出饱和暖色。',
        '第三步【自拍意图对冲】：推测为旅游博主分享、假日踏青打卡之户外运动自拍，自动选用红晕色系「初恋粉」舒展气色，防御烈日过曝扁平感。'
      ];
      stepsEn = [
        'Step 1 [Portrait Analysis]: Highlight overload, skin is clear but base colors look washed out by white glare.',
        'Step 2 [Background Scan]: Dynamic vibrant outdoors under extreme daylight brightness.',
        'Step 3 [Intent Inference]: Inferred as a holiday outdoor vlog snap. Deployed sweet rosy "First Love" to absorb harsh solar glare and build smooth rosy depth.'
      ];

      detectedBright = isZh ? '日光刺射' : 'Vibrant Sunbeam';
      detectedWarm = isZh ? '天然灼璨' : 'Solar Golden Glow';
      detectedBg = isZh ? '开阔大自然背景' : 'Vibrant Greenery Background';
      detectedSkin = isZh ? '照度盈溢·高光偏白' : 'Clear & slight sun-washed';
      detectedPlace = isZh ? '公园等露天场所' : 'Sunny Outdoor Area';

    } else {
      // Normal Comfortable Balanced Room Daylight (fallback of fallbacks)
      presetId = 'cream';
      labelZh = '原生本色水感';
      labelEn = 'Natural Dewy';

      pSkinTempZh = '白净自然，肤温在最佳清亮水准，极其衬底容肌理';
      pSkinTempEn = 'Flawless balanced skin temperature with great nude finish';
      pBrightnessZh = '采光温和、面部的黑白细节过渡得体、自然可人';
      pBrightnessEn = 'Perfect and pleasing room light saturation levels';
      pShadowsZh = '颧下两侧分布微弱、柔和流转的自然阴部线条';
      pShadowsEn = 'Soft barely-there shadows tracing regular face arcs';
      pDullnessZh = '角质润泽通透，仅略带有普通客房之浅平平淡感';
      pDullnessEn = 'Clear translucent skin layers with standard flat light gray';
      p3DZh = '面庞比例整齐，轮廓在线条漫射下极其饱满对称';
      p3DEn = 'Perfect facial symmetry with healthy glowing contours';
      pEyeShadowZh = '眼下方基本处于自然明亮、生活性微褶痕迹';
      pEyeShadowEn = 'Minor standard eyelid shadows easily blended out';

      bgLampZh = '室内温和白光LED天花吸顶板灯，光能分布非常均顺高雅';
      bgLampEn = 'Soft corporate or home LED panel casting evenly balanced glow';
      bgWallZh = '整洁轻奢的纯白乳胶粉刷墙或清爽白色落地推拉玻璃框窗';
      bgWallEn = 'Clean white smooth plaster drywall and large clear sliding windows';
      bgNightZh = '属于最百搭、最多功能的常规日间居家、小憩或自拍姿态场景';
      bgNightEn = 'Comfortable daytime balanced room backdrop';
      bgInOutZh = '常规光源充足、安静整洁的房中写字桌';
      bgInOutEn = 'Quiet indoor desk room';
      bgTempZh = '和煦健康饱满白';
      bgTempEn = 'Neutral comfortable white temp';

      baseAdviceZh = '✨ 光亮刚刚好，推荐「奶油肌」打造透亮婴儿肌';
      baseAdviceEn = '✨ Balance is amazing with natural uniform window light. Lumi deduced this is a cozy daytime portrait snap. We suited our signature velvet "Cream Skin" preset. It subtly plumps and erases any minor facial corners without caking, presenting clear high-definition skin.';

      stepsZh = [
        '第一步【人物特征分析】：侦测到极均匀完美的采光结构与饱满神采，气色透亮水润。',
        '第二步【背景场景匹配】：捕捉到照度平衡之采光舒适室内，偏白米色背景干净极简。',
        '第三步【自拍意图对冲】：推测为生活日常性随手自拍、简约状态定格，自动采用标杆「奶油肌」柔和赋亮，打造水光绒雾名媛颜。'
      ];
      stepsEn = [
        'Step 1 [Portrait Analysis]: Harmonious facial distribution, healthy moisture, and zero screen fatigue.',
        'Step 2 [Background Scan]: Simple interior room with comfortable neutral-white brightness.',
        'Step 3 [Intent Inference]: Inferred as a relaxed daily self-capture. Selected "Cream Skin" to lock raw elegance.'
      ];

      detectedBright = isZh ? '温和采光' : 'Uniform Daylight';
      detectedWarm = isZh ? '均衡温白' : 'Balanced White';
      detectedBg = isZh ? '简约整洁室内' : 'Plain Indoor Canvas';
      detectedSkin = isZh ? '清润红晕·通透有度' : 'Pristine & healthy';
      detectedPlace = isZh ? '明亮起居室' : 'Vibrant Indoor Room';
    }

    // 3. Apply User Design Bias Overlay / Habits & Memory Integration!
    let memoryEffect = '';
    const favPreset = FILL_LIGHT_PRESETS.find(p => p.id === preferences.favoritePresetId);
    const favName = favPreset ? (isZh ? favPreset.name : favPreset.englishName) : '';

    if (preferences.styleMode === 'cool_tech' && presetId !== 'cold' && presetId !== 'special_cold_white' && presetId !== 'moonlight') {
      presetId = 'special_cold_white';
      baseAdviceZh = `✨ 已为你定制冷白色，一键拍出清冷名媛感`;
      baseAdviceEn = `✨ [Habits Tuned] Knowing your aesthetic style matches cold tones, Lumi calibrated suggestion to icy cool "Porcelain Cool", filtering secondary yellow stains and locking crisp chic complexions.`;
      memoryEffect = isZh ? '✦ 已融入您近期的「高级冷色」自拍美学习惯：偏置清冷高亮配方' : '✦ Style Bias adjusted to high-fashion Cool White';

      stepsZh = [
        stepsZh[0],
        isZh ? '💡 【习惯融合】：激活您爱用「高级冷色」冷肌冷白自拍之个性惯用倾向。' : '💡 [Bias Active]: Loving cold chic photography signature style.',
        isZh ? '对冲补光配方自动由温热转换至「清冽瓷白」冰晶光谱，抚平唇下一抹细痕，拉高额角透析瓷感。' : 'Shifted default suggestion to cold "Porcelain Cool" fill light to optimize ice skin clarity.'
      ];
      stepsEn = [
        stepsEn[0],
        '💡 [Bias Active]: Preferred aesthetic style is cold high-fashion.',
        'Adjusted primary tuning vector to cool "Porcelain Cool" filter to highlight luxury pristine complexions.'
      ];
    } else if (preferences.styleMode === 'glamorous' && presetId !== 'love' && presetId !== 'special_soft_sweet') {
      presetId = 'special_soft_sweet';
      baseAdviceZh = `✨ 已为你定制浪漫甜系粉桃，自带心动腮红哦`;
      baseAdviceEn = `✨ [Habits Tuned] Knowing your aesthetic style loves sweet and vibrant aesthetics, Lumi adjusted recommendation to soft "Sweet Peach" flush, neutralizing pale shadow lines with cozy peaches.`;
      memoryEffect = isZh ? '✦ 已融入您近期的「甜系氛围」自拍美学习惯：偏置粉桃蜜意配方' : '✦ Style Bias adjusted to sweet Glamour Peach';

      stepsZh = [
        stepsZh[0],
        isZh ? '💡 【习惯融合】：激活您爱用「甜系氛围」名媛蜜桃腮红补色自拍之个性惯用倾向。' : '💡 [Bias Active]: Loving romantic sweet blush photography signature style.',
        isZh ? '对冲补光配方自动由普通白色转换至特调「柔樱粉黛」漫射，使面骨下方附着一层心动饱满绯红。' : 'Shifted default suggestion to rosy "Sweet Peach" light fill to cast heart-beating blush curves.'
      ];
      stepsEn = [
        stepsEn[0],
        '💡 [Bias Active]: Preferred aesthetic style is romantic sweet peach blush.',
        'Shifted default suggestion to rosy "Sweet Peach" light fill to cast heart-beating blush arcs.'
      ];
    } else {
      if (preferences.favoritePresetId && favName) {
        memoryEffect = isZh 
          ? `✦ 契合您日常高频应用的「${favName}」补色方案（此位置已累计应用达 ${preferences.usageCounts[preferences.favoritePresetId] || 1} 次）`
          : `✦ Adapted to your staple 「${favName}」 light preference`;
      } else {
        memoryEffect = isZh ? '✦ Lumi 空气智感补光镜已就绪，随时按下快门定格至臻气色！' : '✦ Lumi AI Ambiance system standby, ready to snap!';
      }
    }

    return {
      presetId,
      adviceZh: baseAdviceZh,
      adviceEn: baseAdviceEn,
      labelZh,
      labelEn,
      
      // Face
      portraitSkinTempZh: pSkinTempZh,
      portraitSkinTempEn: pSkinTempEn,
      portraitBrightnessZh: pBrightnessZh,
      portraitBrightnessEn: pBrightnessEn,
      portraitShadowsZh: pShadowsZh,
      portraitShadowsEn: pShadowsEn,
      portraitDullnessZh: pDullnessZh,
      portraitDullnessEn: pDullnessEn,
      portraitMakeupZh: makeupStyleZh,
      portraitMakeupEn: makeupStyleEn,
      portrait3DZh: p3DZh,
      portrait3DEn: p3DEn,
      portraitEyeShadowZh: pEyeShadowZh,
      portraitEyeShadowEn: pEyeShadowEn,

      // Context
      bgLampZh,
      bgLampEn,
      bgWallZh,
      bgWallEn,
      bgNightZh,
      bgNightEn,
      bgInOutZh,
      bgInOutEn,
      bgTempZh,
      bgTempEn,

      // Neural
      stepsZh,
      stepsEn,

      // Legacy compatibility
      detectedBright,
      detectedWarm,
      detectedBg,
      detectedSkin,
      detectedTime,
      detectedPlace,
      memoryEffect
    };
  };


  const recommendedInfo = aiReport ? {
    presetId: aiReport.recommendedPresetId,
    labelZh: isZh ? 'AI 订制' : 'AI Custom',
    labelEn: 'AI Custom',
    
    // Portrait features
    portraitSkinTempZh: aiReport.skinTone,
    portraitSkinTempEn: aiReport.skinTone,
    portraitBrightnessZh: aiReport.brightness,
    portraitBrightnessEn: aiReport.brightness,
    portraitShadowsZh: aiReport.shadows,
    portraitShadowsEn: aiReport.shadows,
    portraitDullnessZh: aiReport.problems,
    portraitDullnessEn: aiReport.problems,
    portraitMakeupZh: isZh ? '智能人像重构' : 'AI Smart Reconstruction',
    portraitMakeupEn: 'AI Smart Reconstruction',
    portrait3DZh: isZh ? '面部骨骼微雕对冲' : 'Pro Facial Contouring',
    portrait3DEn: 'Pro Facial Contouring',
    portraitEyeShadowZh: aiReport.shadows,
    portraitEyeShadowEn: aiReport.shadows,

    // Background features
    bgLampZh: aiReport.sceneCharacteristics,
    bgLampEn: aiReport.sceneCharacteristics,
    bgWallZh: aiReport.sceneCharacteristics,
    bgWallEn: aiReport.sceneCharacteristics,
    bgNightZh: isZh ? 'AI 捕捉视界场景' : 'AI Captured Sphere',
    bgNightEn: 'AI Captured Sphere',
    bgInOutZh: isZh ? 'AI 镜头分析' : 'AI Lens Scan',
    bgInOutEn: 'AI Lens Scan',
    bgTempZh: isZh ? 'AI 智能配光' : 'AI Smart Spectrum',
    bgTempEn: 'AI Smart Spectrum',

    // Neural Step Log (Reasoning Process)
    stepsZh: [
      `[AI RENDER] 分析人像肤色: ${aiReport.skinTone}`,
      `[AI RENDER] 锁定环境与瑕疵: ${aiReport.problems}`,
      `[AI RENDER] 自动优化补光: 配对 ${FILL_LIGHT_PRESETS.find(p => p.id === aiReport.recommendedPresetId)?.name || '奶油肌'}，亮度 ${Math.round(aiReport.targetBrightness*100)}%，柔和度 ${Math.round(aiReport.targetSoftness*100)}%`
    ],
    stepsEn: [
      `[AI RENDER] Analyse portrait skin: ${aiReport.skinTone}`,
      `[AI RENDER] Locate shadows/backlight: ${aiReport.problems}`,
      `[AI RENDER] Adaptive filling: match ${FILL_LIGHT_PRESETS.find(p => p.id === aiReport.recommendedPresetId)?.englishName || 'Cream Skin'}, brightness ${Math.round(aiReport.targetBrightness*100)}%, softness ${Math.round(aiReport.targetSoftness*100)}%`
    ],

    adviceZh: aiReport.reasoningZh,
    adviceEn: aiReport.reasoningEn,

    detectedBright: isZh ? '智能自适应亮度' : 'Adaptive Brightness',
    detectedWarm: isZh ? '智能自适应色彩' : 'Adaptive Coloring',
    detectedBg: isZh ? '最佳环境匹配' : 'Environment Synced',
    detectedSkin: isZh ? '人像匀净白皙' : 'Portrait Brightening',
    detectedTime: isZh ? '精选氛围补光' : 'Curated Ambiance',
    detectedPlace: isZh ? '高级人像环境' : 'Premium Sphere',
    memoryEffect: ''
  } : getRecommendation(ambientStats.brightness, ambientStats.warmth);

  const recommendedPreset = FILL_LIGHT_PRESETS.find(p => p.id === recommendedInfo.presetId) || FILL_LIGHT_PRESETS[0];

  // ⚡ Lumi AI Auto-Tune / 自动追光 effect
  useEffect(() => {
    if (preferences.autoApply && !manualLockMode) {
      if (aiReport) {
        const pres = FILL_LIGHT_PRESETS.find(p => p.id === aiReport.recommendedPresetId) || recommendedPreset;
        setActivePreset(pres);
        setIsLightSelected(true);
        setBrightness(aiReport.targetBrightness);
        setSoftness(aiReport.targetSoftness);
        if (aiReport.recommendedIntensity) {
          setIntensityLevel(aiReport.recommendedIntensity as any);
        }
      } else {
        setActivePreset(recommendedPreset);
        setIsLightSelected(true);
        
        let targetB = recommendedPreset.intensity;
        targetB = parseFloat(((targetB * 0.35) + (preferences.averageBrightness * 0.65)).toFixed(2));
        
        if (targetB < 0.25) targetB = 0.25;
        if (targetB > 1.0) targetB = 1.0;

        let targetS = 0.65;
        targetS = parseFloat(((targetS * 0.4) + (preferences.averageSoftness * 0.6)).toFixed(2));
        if (targetS < 0.15) targetS = 0.15;
        if (targetS > 0.95) targetS = 0.95;

        setBrightness(targetB);
        setSoftness(targetS);
      }
    }
  }, [recommendedPreset.id, preferences.autoApply, aiReport, manualLockMode]);

  const handleApplyAiRecommendation = () => {
    playSound('focus'); // play mechanical cinematic dual-tone sound for magical feeling
    setActivePreset(recommendedPreset);
    setIsLightSelected(true);
    setManualLockMode(false); // Reset manual override as user has locked onto AI advice
    setImmersiveMode(true); // Enter immersive selfie mode on applying AI recommendations
    analyticsTracker.track('ai_apply_recommendation', {
      ambientScenario: simulatedScenario,
      bright: ambientStats.brightness,
      warmth: ambientStats.warmth,
      presetId: recommendedPreset.id,
      presetName: recommendedPreset.name,
    });
    showToast(isZh 
      ? `✨ Lumi 智能补光：已为你定制并极速匹配「${recommendedPreset.name}」顶尖方案！` 
      : `✨ Lumi AI: Instantly customized & applied 「${recommendedPreset.englishName}」!`
    );
  };

  const handleRecordPresetUsage = (presetId: string) => {
    setPreferences((prev) => {
      const counts = { ...prev.usageCounts };
      counts[presetId] = (counts[presetId] || 0) + 1;
      
      // Determine favorite preset
      let fav = prev.favoritePresetId;
      let maxCount = 0;
      Object.keys(counts).forEach((key) => {
        if (counts[key] > maxCount) {
          maxCount = counts[key];
          fav = key;
        }
      });

      // Capture nighttime favorite
      const currentHour = new Date().getHours();
      const isNight = currentHour >= 18 || currentHour < 6;
      const nightSet = isNight ? presetId : prev.nighttimePresetId;

      return {
        ...prev,
        usageCounts: counts,
        favoritePresetId: fav,
        nighttimePresetId: nightSet,
      };
    });
  };

  const handlePresetSelect = (preset: FillLightPreset) => {
    playSound('click');
    setActivePreset(preset);
    setIsLightSelected(true);
    setManualLockMode(true); // Enter manual lock mode on choice
    handleRecordPresetUsage(preset.id);
    setIsAiPanelExpanded(false);
    setImmersiveMode(true); // Auto-trigger immersive selfie mode on selection
    analyticsTracker.track('preset_change', {
      presetId: preset.id,
      presetName: preset.name,
      mode: 'single',
    });
    showToast(isZh 
      ? `💡 配色已手动锁定。AI 自动切换已暂停，您可在 AI 面板中重新开启追光。`
      : `💡 Color selected and locked. Lumi AI auto-tuning paused. Resume anytime from the AI Panel.`
    );
  };

  const handleSplitPresetSelect = (preset: FillLightPreset, side: 'left' | 'right') => {
    playSound('click');
    if (side === 'left') {
      setSplitPresetLeft(preset);
    } else {
      setSplitPresetRight(preset);
    }
    setIsLightSelected(true);
    setManualLockMode(true); // Enter manual lock mode on split choice
    setIsAiPanelExpanded(false);
    setImmersiveMode(true); // Auto-trigger immersive selfie mode on split choice
    analyticsTracker.track('split_preset_change', {
      side,
      presetId: preset.id,
      presetName: preset.name,
      pairedWith: side === 'left' ? splitPresetRight.id : splitPresetLeft.id,
    });
    showToast(isZh
      ? `💡 左右分屏已手动锁定。AI 自动切换已暂停，可在 AI 面板中重新开启追光。`
      : `💡 Split-light locked. Lumi AI auto-tuning paused. Resume anytime from the AI Panel.`
    );
  };

  const handleBrightnessChange = (val: number) => {
    setBrightness(val);
    
    // Smoothly update preferred average
    setPreferences(prev => ({
      ...prev,
      averageBrightness: parseFloat(((prev.averageBrightness * 4 + val) / 5).toFixed(3))
    }));
    
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

    // Smoothly update preferred average
    setPreferences(prev => ({
      ...prev,
      averageSoftness: parseFloat(((prev.averageSoftness * 4 + val) / 5).toFixed(3))
    }));

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
        viewfinderSize: viewfinderSize,
        intensityLevel: intensityLevel,
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

  const handleAiScan = async () => {
    if (isAiScanning) return;

    // API verification check
    const storedEndpoint = localStorage.getItem('lumi_api_endpoint') || '';
    const storedKey = localStorage.getItem('lumi_api_key') || '';
    if (!storedEndpoint || !storedKey) {
      playSound('focus');
      setShowApiKeyPrompt(true);
      return;
    }

    setIsAiScanning(true);
    playSound('shutter');
    
    try {
      let base64Image = '';
      if (mainCameraRef.current) {
        base64Image = await mainCameraRef.current.capture();
      } else {
        throw new Error(isZh ? '补光相机未加载完成，请重新打开相机设备权限。' : 'Camera not fully loaded, please check stream permission.');
      }

      showToast(isZh ? '正在连接至臻 AI 视界服务器进行多维度场景分析...' : 'Connecting to AI vision engine for multi-attribute scene analysis...');

      let report: any = null;
      let useDirectFallback = false;

      try {
        const response = await fetch('/api/gemini/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64Image,
            ambientStats,
            preferences,
            simulatedScenario,
            apiEndpoint: storedEndpoint,
            apiKey: storedKey,
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          report = await response.json();
        } else {
          console.warn('Backend server returned non-JSON or error, attempting direct client-side fallback call. Content-Type:', contentType, 'Status:', response.status);
          useDirectFallback = true;
        }
      } catch (fetchErr) {
        console.warn('Failed to contact backend API route, attempting direct client-side fallback call:', fetchErr);
        useDirectFallback = true;
      }

      // DIRECT CLIENT-SIDE FALLBACK CALL (Excellent for Serverless hosting like Vercel)
      if (useDirectFallback) {
        showToast(isZh ? '⚡️ 正在通过客户端直连您的自定义 AI 补光接口...' : '⚡️ Re-routing to direct client-side connection with custom API...');
        
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const endpointStr = storedEndpoint.trim();
        const isGeminiUrl = endpointStr.includes("googleapis.com") || endpointStr.includes("google") || endpointStr.includes("gemini");
        
        let targetUrl = endpointStr;
        let headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        let bodyData: any = {};
        
        const schemaKeys = [
          "skinTone", "brightness", "shadows", "sceneCharacteristics", "problems",
          "recommendedPresetId", "recommendedIntensity", "targetBrightness", "targetSoftness",
          "reasoningZh", "reasoningEn"
        ];
        
        const promptText = `
          You are Lumi, a highly sophisticated celebrity studio portrait photographer, cosmetics advisor, and AI selfie lighting guru.
          Analyze the attached camera viewfinder selfie frame from the user, combining it with any environmental and preferences context provided.
          Perform a highly intelligent, premium, multi-layered aesthetic and lighting evaluation.
          
          Return a raw valid JSON object. Ensure the JSON strictly contains these keys: ${schemaKeys.join(", ")}.

          1. PORTRAIT ANALYSIS (人物分析):
             - Skin warmth, coolness, transparency, facial shadows (leads, folds), dark circles, dimensionality, lip and eye brightness.
             - If face is yellow/fatigued, recommend cool corrective light like 'special_cold_white' (Porcelain Cool) or 'cold' (Ice White), NEVER recommend amber/yellow lights.

          2. BACKGROUND SCENARIO ANALYSIS (背景分析):
             - If background is already yellow or warm, avoid recommending warm sunset orange lights.

          3. SELFIE INTENTION INFERENCE (自拍目的):
             - Creative intent context (office: 'cream'/'special_anti_dullness'/'studio_white', social: 'special_soft_sweet'/'love'/'pearl_glow', nighttime: 'special_ambient_mood'/'moonlight'/'velvet_purple').

          4. AVAILABLE PRESET SELECTIONS (ID mapping):
             - 'cream', 'love', 'cold', 'sunset', 'moonlight', 'velvet_purple', 'rosy_wine', 'aurora_cyan', 'deep_peach', 'studio_white', 'pearl_glow', 'light_honey'
             - 'special_blood_boost', 'special_cold_white', 'special_soft_sweet', 'special_korean_dewy', 'special_ambient_mood', 'special_anti_dullness', 'special_natural_daylight', 'special_sunset_glow', 'special_acne_corrector'
        `;

        if (isGeminiUrl) {
          if (!targetUrl.includes(":generateContent")) {
            targetUrl = targetUrl.replace(/\/+$/, "");
            if (!targetUrl.includes("/v1beta") && !targetUrl.includes("/v1")) {
              targetUrl = targetUrl + "/v1beta/models/gemini-1.5-flash:generateContent";
            } else {
              targetUrl = targetUrl + "/models/gemini-1.5-flash:generateContent";
            }
          }
          if (!targetUrl.includes("key=")) {
            targetUrl += (targetUrl.includes("?") ? "&" : "?") + "key=" + storedKey;
          }
          
          bodyData = {
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Data
                  }
                },
                { text: promptText }
              ]
            },
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  skinTone: { type: "STRING" },
                  brightness: { type: "STRING" },
                  shadows: { type: "STRING" },
                  sceneCharacteristics: { type: "STRING" },
                  problems: { type: "STRING" },
                  recommendedPresetId: { type: "STRING" },
                  recommendedIntensity: { type: "STRING" },
                  targetBrightness: { type: "NUMBER" },
                  targetSoftness: { type: "NUMBER" },
                  reasoningZh: { type: "STRING" },
                  reasoningEn: { type: "STRING" }
                },
                required: schemaKeys
              }
            }
          };
        } else {
          if (!targetUrl.includes("/chat/completions")) {
            targetUrl = targetUrl.replace(/\/+$/, "") + "/chat/completions";
          }
          if (storedKey) {
            headers["Authorization"] = `Bearer ${storedKey}`;
          }
          
          let modelName = 'gpt-4o-mini';
          if (targetUrl.includes('deepseek')) {
            modelName = 'deepseek-chat';
          } else if (targetUrl.includes('anthropic') || targetUrl.includes('claude')) {
            modelName = 'claude-3-5-sonnet';
          } else if (targetUrl.includes('siliconflow')) {
            modelName = 'google/gemini-2.5-flash';
          }
          
          bodyData = {
            model: modelName,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: promptText + `\n\nCRITICAL: Return a raw valid JSON object. Ensure the JSON strictly contains these keys: ${schemaKeys.join(", ")}.`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Data}`
                    }
                  }
                ]
              }
            ]
          };
        }

        const directResponse = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyData)
        });

        if (!directResponse.ok) {
          const errMsg = await directResponse.text();
          throw new Error(`Direct connection failure: ${directResponse.status} - ${errMsg}`);
        }

        const data = await directResponse.json();
        let resultText = "";
        
        if (isGeminiUrl) {
          resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        } else {
          resultText = data?.choices?.[0]?.message?.content || "{}";
        }
        
        let cleaned = resultText.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        }
        
        report = JSON.parse(cleaned);
        if (typeof report.targetBrightness === 'string') report.targetBrightness = parseFloat(report.targetBrightness) || 0.8;
        if (typeof report.targetSoftness === 'string') report.targetSoftness = parseFloat(report.targetSoftness) || 0.7;
      }

      if (!report || typeof report !== 'object') {
        throw new Error('AI returned an invalid or empty report frame.');
      }

      // Save report content
      setAiReport(report);
      setManualLockMode(false); // Reset manual lock when they explicitly trigger AI analysis
      setLockedStats(null); // Reset locked base to baseline from newly scanned frame
      
      // Auto-tune sliders & configurations
      const pres = FILL_LIGHT_PRESETS.find(p => p.id === report.recommendedPresetId);
      if (pres) {
        setActivePreset(pres);
        setIsLightSelected(true);
      }
      setBrightness(report.targetBrightness);
      setSoftness(report.targetSoftness);
      if (report.recommendedIntensity) {
        setIntensityLevel(report.recommendedIntensity as any);
      }

      playSound('focus');
      showToast(isZh 
        ? `✨ AI 自适应优化完毕！已精准契合「${pres?.name || '奶油肌'}」方案并自动优调亮度及柔和度。` 
        : `✨ AI Adaptive Match complete! Transitioned to 「${pres?.englishName || 'Cream Skin'}」.`
      );
    } catch (err: any) {
      console.error('Lumi Vision API failed:', err);
      
      // Smart Fallback Recommendation Response inside client in case both call avenues failed:
      let fallbackPreset = preferences?.favoritePresetId || "cream";
      if (ambientStats) {
        const isDark = (ambientStats.brightness || 100) < 60;
        const isWarm = (ambientStats.warmth || 1.0) > 1.15;
        if (isWarm) {
          fallbackPreset = "cold"; // neutralize warm ambient glow with ice white
        } else if (isDark) {
          fallbackPreset = "moonlight"; // moonlight blue atmospheric glow
        }
      }
      
      const localReport = {
        skinTone: "已为您智能微调自拍色光比例",
        brightness: "已自动微调最佳自拍亮度层次",
        shadows: "已自动均匀弱化面部暗沉与多余阴影",
        sceneCharacteristics: `Lumi 智能光感控制：自动适配环境`,
        problems: `自适应校准 (已启用本地精调模式)`,
        recommendedPresetId: fallbackPreset,
        recommendedIntensity: "normal" as any,
        targetBrightness: preferences?.averageBrightness ? preferences.averageBrightness / 100 : 0.80,
        targetSoftness: preferences?.averageSoftness ? preferences.averageSoftness / 100 : 0.70,
        reasoningZh: "✨ [Lumi 智能自适应补光] 正在使用本地智能自适应控光程序，已为您精准匹配最佳光美学方案，护航完美出片！",
        reasoningEn: "✨ [Lumi Local Calibration] Device auto-lighting triggered. Lumi auto-selected the best natural spectrum based on your ambient tone to guarantee a stunning photograph."
      };
      
      setAiReport(localReport);
      setManualLockMode(false);
      setLockedStats(null);
      
      const pres = FILL_LIGHT_PRESETS.find(p => p.id === localReport.recommendedPresetId);
      if (pres) {
        setActivePreset(pres);
        setIsLightSelected(true);
      }
      setBrightness(localReport.targetBrightness);
      setSoftness(localReport.targetSoftness);
      setIntensityLevel(localReport.recommendedIntensity);
      
      playSound('focus');
      showToast(isZh 
        ? "✨ 已为您自动降级至设备端高精光感推荐参数！" 
        : "✨ Local sensor calibration auto-applied as fallback!"
      );
    } finally {
      setIsAiScanning(false);
    }
  };

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

      // 6. Watermark decoration removed as requested by the user
      // No logo, dates, or filter parameters will be printed on the final capture.

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

  const getViewfinderStyle = () => {
    const shadowIntensityMultiplier = 
      intensityLevel === 'soft' ? 0.35 :
      intensityLevel === 'normal' ? 1.0 :
      intensityLevel === 'rich' ? 1.95 :
      3.20; // Massive continuous studio bloom!

    const shadowBlurRadius = 
      intensityLevel === 'soft' ? '30px' :
      intensityLevel === 'normal' ? '70px' :
      intensityLevel === 'rich' ? '120px' :
      '180px';

    const baseShadow = isLightSelected
      ? `0 0 ${shadowBlurRadius} ${15 * shadowIntensityMultiplier}px ${splitMode === 'none' ? activePreset.color : splitPresetLeft.color}a4`
      : `0 24px 60px -15px rgba(0,0,0,0.6), 0 0 ${shadowBlurRadius} ${15 * shadowIntensityMultiplier}px ${splitMode === 'none' ? activePreset.color : splitPresetLeft.color}a4`;
    
    if (viewfinderSize === 'standard') {
      return {
        width: 'min(100%, calc(46vh * 0.75))',
        aspectRatio: '3/4',
        maxHeight: '46vh',
        boxShadow: baseShadow,
      };
    }
    if (viewfinderSize === 'compact') {
      return {
        width: 'min(70%, calc(35vh * 0.75))',
        aspectRatio: '3/4',
        maxHeight: '35vh',
        boxShadow: baseShadow,
      };
    }
    // circle
    return {
      width: 'min(55%, calc(25vh))',
      aspectRatio: '1/1',
      maxHeight: '25vh',
      boxShadow: baseShadow,
    };
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
              className={`w-44 aspect-[3/4] md:w-56 rounded-[40px] overflow-hidden border-4 border-white shadow-2xl flex items-center justify-center bg-[#070709] relative ${
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
                language={settings.language}
                onAmbientDetected={handleAmbientDetected}
                simulatedScenario={simulatedScenario}
                intensityLevel={intensityLevel}
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
        <div 
          className={`w-full flex items-center justify-between mb-2 select-none transition-all duration-300 transform ${
            immersiveMode 
              ? 'opacity-0 pointer-events-none -translate-y-2' 
              : 'opacity-100 pointer-events-auto translate-y-0'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="bg-black/20 text-white border border-white/10 px-3 py-1 rounded-full font-serif font-black italic text-sm tracking-widest shadow-md backdrop-blur-md">
              Lumi
            </span>
            {splitMode !== 'none' && (
              <span className="px-2 py-0.5 rounded-full bg-pink-500/80 border border-white/20 backdrop-blur-md text-[8px] text-white font-sans font-bold uppercase tracking-wider">
                DUAL
              </span>
            )}
          </div>

          {/* Icons Bar Capsule (Apple Studio design) */}
          <div className="flex items-center gap-0.5 bg-black/20 border border-white/10 backdrop-blur-md px-1 py-1 rounded-full shadow-lg transition-all">
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
        <div className="flex-1 w-full flex flex-col items-center justify-center overflow-hidden py-1 min-h-[35vh]">
          <div 
            className={`overflow-hidden relative transition-all duration-500 ease-out border-4 border-white/85 bg-stone-950
              ${viewfinderSize === 'standard' ? 'rounded-[36px]' : ''}
              ${viewfinderSize === 'compact' ? 'rounded-[32px]' : ''}
              ${viewfinderSize === 'circle' ? 'rounded-full' : ''}
            `}
            style={getViewfinderStyle()}
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
              onAmbientDetected={handleAmbientDetected}
              simulatedScenario={simulatedScenario}
              intensityLevel={intensityLevel}
              aiDiagnostic={isAiPanelExpanded}
              isScanning={isAiScanning}
            />

            {/* Split controls overlay */}
            {splitMode !== 'none' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-35 flex gap-1 bg-black/20 border border-white/10 backdrop-blur-md p-1 rounded-full shadow-xl scale-95 animate-fade-in">
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
          </div>
        </div>

        {/* =========================================================
            Ⅱ. UNIFIED LUMI AI CONTROL CONSOLE DRAWER (MASTER DECK)
            ========================================================= */}
        <div 
          className={`w-full flex flex-col gap-2 z-20 transition-all duration-300 ease-out transform select-none ${
            immersiveMode 
              ? 'opacity-0 pointer-events-none translate-y-4 scale-98' 
              : 'opacity-100 pointer-events-auto translate-y-0 scale-100'
          }`}
        >


          <div className="w-full flex flex-col items-center mb-1 px-3 animate-fade-in">
            {!isAiPanelExpanded ? (
              /* 🌲 COMPACT COLLAPSED SINGLE-LINE LUXURY PILL */
              <div 
                onClick={() => {
                  playSound('click');
                  setIsAiPanelExpanded(true);
                }}
                className="w-full bg-black/30 hover:bg-black/40 border border-white/15 hover:border-indigo-500/35 px-4 py-3 rounded-2xl shadow-md backdrop-blur-md flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-99 group"
              >
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs font-semibold text-white tracking-wider flex items-center gap-1.5">
                    {isZh ? 'Lumi AI 氛围自拍系统' : 'Lumi AI Ambiance System'}
                  </span>
                  <span className="text-[10px] text-[#A6B5FF]/80 font-medium tracking-tight mt-0.5">
                    {isZh ? '找到最适合你的自拍光线' : 'Find the best lighting for your selfie'}
                  </span>
                </div>
                <span className="text-xs text-indigo-300 font-bold hover:text-indigo-200 transition-colors flex items-center gap-0.5 whitespace-nowrap">
                  {isZh ? '【展开】' : '【Expand】'}
                </span>
              </div>
            ) : (
              /* 🎨 EXPANDED HIGH-FIDELITY ATMOSPHERE DECK */
              <div className="w-full bg-black/35 border border-white/10 rounded-2xl p-3 shadow-xl backdrop-blur-lg flex flex-col gap-2.5">
                
                {/* Header: Title + Auto Apply Toggle */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div 
                    onClick={() => {
                      playSound('click');
                      setIsAiPanelExpanded(false);
                    }}
                    className="flex items-center gap-1.5 min-w-0 cursor-pointer group/hdr hover:opacity-90"
                  >
                    <span className="relative flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 group-hover/hdr:scale-105 transition-transform">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    </span>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold text-white tracking-wider flex items-center gap-1.5">
                        {isZh ? 'Lumi AI 氛围自拍系统' : 'Lumi AI Ambiance System'}
                        <span className="text-[9.5px] bg-white/5 text-white/40 group-hover/hdr:text-indigo-300 group-hover/hdr:bg-indigo-500/10 transition-all font-sans px-1.5 py-0.5 rounded-md">
                          {isZh ? '【收起】' : '【Fold】'}
                        </span>
                      </span>
                      <span className="text-[10px] text-[#A6B5FF]/80 font-medium tracking-tight">
                        {isZh ? '找到最适合你的自拍光线' : 'Find the best lighting for your selfie'}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Auto Apply */}
                  <button
                    onClick={() => {
                      playSound('click');
                      setPreferences(prev => {
                        const next = !prev.autoApply;
                        if (next) {
                          setActivePreset(recommendedPreset);
                          setIsLightSelected(true);
                          setManualLockMode(false);
                          setLockedStats(null);
                        }
                        return { ...prev, autoApply: next };
                      });
                    }}
                    className={`px-3 py-1 rounded-full text-[9.5px] font-sans font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                      preferences.autoApply
                        ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400 font-extrabold shadow-sm'
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                  >
                    <span className={`w-1 h-1 rounded-full ${preferences.autoApply ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
                    <span>{preferences.autoApply ? (isZh ? '自动匹配·开' : 'Auto-Match On') : (isZh ? '手动选光·关' : 'Manual Match')}</span>
                  </button>
                </div>

                {/* Core Button: 一键优化自拍光线 */}
                <div className="w-full flex flex-col gap-1 text-left mt-0.5 animate-fade-in">
                  <button
                    onClick={handleAiScan}
                    disabled={isAiScanning}
                    className={`w-full py-2.5 px-4 rounded-xl font-sans text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-lg select-none cursor-pointer border relative overflow-hidden active:scale-98
                      ${isAiScanning 
                        ? 'bg-stone-900 border-white/5 text-[#A6B5FF]' 
                        : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-purple-500 text-white border-indigo-400/20 shadow-[0_0_15px_rgba(99,102,241,0.35)]'
                      }
                    `}
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isAiScanning ? 'animate-spin' : 'animate-bounce'}`} />
                    <span>
                      {isAiScanning 
                        ? (isZh ? 'Lumi AI 正在深度感应面部及场景细节...' : 'Lumi AI is tracking portrait details...') 
                        : (isZh ? '✨ 一键优化自拍光线' : '✨ Optimize Selfie Lighting')
                      }
                    </span>
                  </button>
                  {aiReport && (
                    <div className="flex items-center justify-between text-[8px] text-indigo-300 bg-indigo-950/20 border border-indigo-500/15 py-1 px-2.5 rounded-lg mt-0.5 font-mono">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                        <span>{isZh ? '已为您和煦调节多端环境自拍色光比例' : 'Successfully adjusted multi-attribute lighting'}</span>
                      </span>
                      <button 
                        onClick={() => {
                          playSound('click');
                          setAiReport(null);
                          showToast(isZh ? '已恢复至实时光度感应' : 'Reset to Live ambient sensor');
                        }} 
                        className="text-[#FFE2EC] font-bold hover:underline"
                      >
                        [{isZh ? '重置' : 'Reset'}]
                      </button>
                    </div>
                  )}
                </div>

                {/* ✨ 实时分析卡片 (Real-time Analysis Card) */}
                <div className="w-full flex flex-col gap-2 bg-white/5 border border-white/10 rounded-xl p-3 text-left font-sans text-xs">
                  <div className="text-[11px] font-semibold tracking-wide text-[#A6B5FF] flex items-center gap-1.5 pb-1 border-b border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>✨ {isZh ? '当前环境分析' : 'Current Environment Analysis'}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 text-[11px] text-white/80">
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">{isZh ? '环境亮度：' : 'Ambient Light:'}</span>
                      <span className="font-medium text-emerald-400">
                        {ambientStats.brightness < 60 ? (isZh ? '环境偏暗' : 'Dim') : (ambientStats.brightness < 115 ? (isZh ? '亮度适中' : 'Normal') : (isZh ? '环境明亮' : 'Bright'))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">{isZh ? '自拍状态：' : 'Selfie Status:'}</span>
                      <span className="font-medium text-amber-300">
                        {ambientStats.backlightRatio > 1.35 
                          ? (isZh ? '环境逆光' : 'Backlight') 
                          : (ambientStats.faceBrightness < 95 ? (isZh ? '面部光线不足' : 'Facial shadows detected') : (isZh ? '光线均匀明亮' : 'Even & clear'))
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">{isZh ? '推荐方案：' : 'Recommended Scheme:'}</span>
                      <span className="font-semibold text-indigo-300">
                        {isZh ? `高级${recommendedPreset.name}补光` : `Premium ${recommendedPreset.englishName}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ✨ Lumi AI 自拍建议 (AI Recommendation Area) */}
                <div 
                  onClick={() => {
                    playSound('focus');
                    setActivePreset(recommendedPreset);
                    setIsLightSelected(true);
                    setImmersiveMode(true);
                    showToast(isZh 
                      ? `✨ Lumi 氛围补光就绪：已匹配「${recommendedPreset.name}」自拍光线！`
                      : `✨ Lumi Selected: Applied "${recommendedPreset.englishName}" glow!`
                    );
                  }}
                  className="bg-black/20 hover:bg-black/30 rounded-xl p-4 border border-indigo-500/10 flex flex-col gap-2 relative overflow-hidden text-left cursor-pointer transition-all active:scale-99 hover:border-indigo-400/20 group/advice"
                >
                  <div className="flex gap-2 items-center text-[11px] font-sans font-semibold tracking-wider text-indigo-300">
                    <span>✨</span>
                    <span>{isZh ? 'Lumi AI 自拍建议' : 'Lumi AI Selfie Advisory'}</span>
                    <span className="ml-auto text-[8.5px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 px-1.5 py-0.5 rounded-md opacity-80 group-hover/advice:opacity-100 transition-opacity">
                      {isZh ? '进入极简发光 ↗' : 'Minimal Light Surface ↗'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-1">
                    <p className="text-[12px] font-semibold text-emerald-300">
                      {isZh ? `已为你推荐「${recommendedPreset.name}」` : `Recommended "${recommendedPreset.englishName}"`}
                    </p>
                    <div className="flex flex-col gap-1 pl-1">
                      {getSelfieBullets?.(recommendedPreset.id, isZh)?.map((bullet: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-white/85">
                          <span className="text-[9px] text-indigo-300 select-none">•</span>
                          <span>{bullet}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* If Auto Apply is off, show the manual apply button */}
                  {!preferences.autoApply && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playSound('focus');
                        setActivePreset(recommendedPreset);
                        setIsLightSelected(true);
                        setImmersiveMode(true);
                        showToast(isZh 
                          ? `✨ 已为您一键应用「${recommendedPreset.name}」自拍补光！` 
                          : `✨ Applied optimized 「${recommendedPreset.englishName}」 lighting!`
                        );
                      }}
                      className="w-full mt-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[10px] text-white font-sans font-bold tracking-wider cursor-pointer shadow-md transition-all active:scale-98"
                    >
                      💡 {isZh ? `一键优化自拍光线` : `Optimize Selfie Lighting`}
                    </button>
                  )}
                </div>

                {/* ✨ 新增 Before / After 对比 Slider Card */}
                <BeforeAfterSlider activePreset={recommendedPreset} isZh={isZh} />

                {/* Row 2: Aesthetic Preference Segment (Style Selection) */}
                <div className="flex flex-col gap-1 text-left bg-black/10 rounded-xl p-2.5 border border-white/5 mt-1">
                  <span className="text-[10px] text-white/50 font-sans font-semibold tracking-wider mb-1">
                    🎨 {isZh ? '自拍风格选择' : 'Style Presets Preference'}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => {
                        playSound('click');
                        setPreferences(prev => ({ ...prev, styleMode: 'natural' }));
                      }}
                      className={`py-2 px-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 border cursor-pointer transition-all duration-200 active:scale-95 ${
                        preferences.styleMode === 'natural'
                          ? 'bg-white text-neutral-900 border-white shadow-sm font-bold'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 border-transparent'
                      }`}
                    >
                      <span className="text-[11px] font-semibold">{isZh ? '原生感' : 'Natural'}</span>
                      <span className={`text-[8.5px] ${preferences.styleMode === 'natural' ? 'text-black/60' : 'text-white/40'} font-medium`}>
                        {isZh ? '自然真实' : 'Raw & Real'}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        playSound('click');
                        setPreferences(prev => ({ ...prev, styleMode: 'cool_tech' }));
                      }}
                      className={`py-2 px-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 border cursor-pointer transition-all duration-200 active:scale-95 ${
                        preferences.styleMode === 'cool_tech'
                          ? 'bg-white text-neutral-900 border-white shadow-sm font-bold'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 border-transparent'
                      }`}
                    >
                      <span className="text-[11px] font-semibold">{isZh ? '冷白感' : 'Ice Glow'}</span>
                      <span className={`text-[8.5px] ${preferences.styleMode === 'cool_tech' ? 'text-black/60' : 'text-white/40'} font-medium`}>
                        {isZh ? '清透提亮' : 'Cool Bright'}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        playSound('click');
                        setPreferences(prev => ({ ...prev, styleMode: 'glamorous' }));
                      }}
                      className={`py-2 px-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 border cursor-pointer transition-all duration-200 active:scale-95 ${
                        preferences.styleMode === 'glamorous'
                          ? 'bg-white text-neutral-900 border-white shadow-sm font-bold'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 border-transparent'
                      }`}
                    >
                      <span className="text-[11px] font-semibold">{isZh ? '氛围感' : 'Vibe Portrait'}</span>
                      <span className={`text-[8.5px] ${preferences.styleMode === 'glamorous' ? 'text-black/60' : 'text-white/40'} font-medium`}>
                        {isZh ? '柔和电影感' : 'Soft Filmic'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Row 4: Expandable Simulation Controls Sub-panel */}
                <div className="flex flex-col gap-1 text-left border-t border-white/5 pt-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40 font-sans font-semibold tracking-wider flex items-center gap-1">
                      🔧 {isZh ? '模拟不同自拍环境（调试）' : 'Aesthetic Simulation Sandbox'}
                    </span>
                    <button
                      onClick={() => {
                        playSound('click');
                        setSimulatedScenario(simulatedScenario === 'none' ? 'dull' : 'none');
                      }}
                      className="text-[9.5px] text-[#A6B5FF] hover:text-white font-sans font-bold transition-colors"
                    >
                      {simulatedScenario !== 'none' ? (isZh ? '关闭环境模拟' : 'Close Ambient') : (isZh ? '环境模拟 🔧' : 'Simulate 🔧')}
                    </button>
                  </div>

                  {simulatedScenario !== 'none' && (
                    <div className="w-full flex gap-1 py-1 overflow-x-auto scrollbar-none snap-x justify-start mt-0.5">
                      {AMB_SCENARIOS.map((scen) => (
                        <button
                          key={scen.id}
                          onClick={() => {
                            playSound('click');
                            setSimulatedScenario(scen.id);
                            setAmbientStats({ brightness: scen.brightness, warmth: scen.warmth });
                          }}
                          className={`flex-shrink-0 snap-center min-w-[76px] px-2 py-1 flex flex-col items-center gap-0.5 border rounded-lg text-[9px] font-sans cursor-pointer transition-all duration-200 ${
                            simulatedScenario === scen.id
                              ? 'bg-white text-neutral-900 border-white font-extrabold shadow-sm scale-102'
                              : 'bg-white/5 text-white/70 border-white/5 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="text-xs leading-none">{scen.icon}</span>
                          <span className="tracking-tight font-medium text-[8.5px]">{isZh ? scen.name : scen.englishName}</span>
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          playSound('click');
                          setSimulatedScenario('none');
                          setAmbientStats({ brightness: 110, warmth: 1.0 });
                        }}
                        className="flex-shrink-0 snap-center min-w-[70px] px-2 py-1 flex flex-col items-center gap-0.5 bg-red-400/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 cursor-pointer transition-all rounded-lg text-[9px] font-sans"
                      >
                        <span className="text-xs leading-none">🔄</span>
                        <span className="tracking-tight font-medium text-[8.5px]">{isZh ? '重置亮度' : 'Reset'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Collapse Button at the bottom of the deck */}
                <button
                  onClick={() => {
                    playSound('click');
                    setImmersiveMode(true);
                  }}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] text-white/60 hover:text-white font-sans font-semibold border border-white/5 hover:border-white/10 transition-all cursor-pointer flex items-center justify-center gap-1 mt-1"
                >
                  <span>{isZh ? '开启沉浸补光' : 'Enter Immersive Glow'}</span>
                  <span className="text-[8px] opacity-60">▲</span>
                </button>

              </div>
            )}
          </div>

          {/* Viewfinder Size Switcher (Gives back maximum screen glow) */}
          <div className="w-full flex justify-center mb-1 mt-0.5 animate-fade-in">
            <div className="flex items-center gap-0.5 bg-black/20 border border-white/10 backdrop-blur-md p-0.5 rounded-full shadow-md text-white">
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
                {isZh ? '全幅预览' : 'Full Frame'}
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
                {isZh ? '高亮悬浮' : 'High Light'}
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
                {isZh ? '环形柔光' : 'Halo'}
              </button>
            </div>
          </div>

          {/* 🎛️ STANDARD FULL APP CONTROL PANEL DECK */}
          <div className="bg-black/25 backdrop-blur-md rounded-[24px] p-0.5 border border-white/10 shadow-lg mx-3">
            <PresetSelector
              presets={FILL_LIGHT_PRESETS}
              activePreset={activePreset}
              onSelect={handlePresetSelect}
              splitMode={splitMode}
              splitPresetLeft={splitPresetLeft}
              splitPresetRight={splitPresetRight}
              onSelectSplitSide={handleSplitPresetSelect}
              selectedSplitSide={selectedSplitSide}
              isZh={isZh}
              intensityLevel={intensityLevel}
              onIntensityChange={(lvl) => {
                playSound('focus');
                setIntensityLevel(lvl);
              }}
            />
          </div>

        </div>

        {/* =========================================================
            Ⅳ. UNIFIED STABLE SHUTTER & GALLERY CONTROL ROW
            ========================================================= */}
        <div className="w-full flex items-center justify-between px-8 py-2 shrink-0 z-30 select-none">
          
          {/* Gallery Thumbnail (Statically aligned to left) */}
          {capturedPhotos.length > 0 ? (
            <button
              onClick={() => {
                playSound('click');
                setShowPhotoViewer(true);
              }}
              className="w-12 h-12 rounded-full bg-black/20 hover:bg-black/35 border border-white/10 flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 relative shadow-md backdrop-blur-md"
            >
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
            </button>
          ) : (
            <div className="w-12 h-12" />
          )}

          {/* Shutter Camera Button (Statically aligned to center) */}
          <button
            onClick={handleShutterSnap}
            className="w-18 h-18 rounded-full border-4 border-white shrink-0 shadow-[0_0_32px_rgba(255,255,255,0.85),0_12px_24px_rgba(0,0,0,0.3)] bg-white hover:bg-neutral-50 active:scale-95 text-neutral-800 flex items-center justify-center cursor-pointer transition-all duration-300 relative group"
          >
            <div className="absolute inset-1.5 rounded-full border border-neutral-900/10 bg-neutral-100" />
            <Camera className="w-6.5 h-6.5 text-neutral-900 z-10 transition-transform group-hover:scale-110 duration-250" strokeWidth={2.2} />
          </button>

          {/* Action toggle button (Statically aligned to right) */}
          {immersiveMode ? (
            /* Tuning console unfold trigger in Immersive Mode */
            <button
              onClick={() => {
                playSound('click');
                setImmersiveMode(false); // Unfurls console panel
              }}
              className="w-12 h-12 rounded-full bg-black/25 hover:bg-black/35 text-white border border-white/10 flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-md backdrop-blur-md transition-all active:scale-95 animate-fade-in"
              title={isZh ? '打开调色控制台' : 'Open Tuning Console'}
            >
              <Sliders className="w-4 h-4 text-pink-300" />
              <span className="text-[7.5px] scale-90 text-white/75 font-sans font-medium">{isZh ? '调色' : 'Tune'}</span>
            </button>
          ) : (
            /* Immersive transition button to collapse manually */
            <button
              onClick={() => {
                playSound('click');
                setImmersiveMode(true);
              }}
              className="w-12 h-12 rounded-full bg-black/25 hover:bg-black/35 text-white border border-white/10 flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-md backdrop-blur-md transition-all active:scale-95"
              title={isZh ? '隐藏控制台' : 'Hide Console'}
            >
              <Sliders className="w-4 h-4 text-pink-300 rotate-180" />
              <span className="text-[7.5px] scale-90 text-white/75 font-sans font-medium">{isZh ? '收起' : 'Hide'}</span>
            </button>
          )}

        </div>

        <div className="text-center text-[10px] text-white/50 tracking-widest uppercase mt-0.5">
          designed by lumi in california
        </div>

      </div>

      {/* 7. HIGH-FIDELITY PHOTO VIEWER MODAL */}
      {showPhotoViewer && (() => {
        const photoToRender = activeViewPhoto || capturedPhotos[0];
        return (
          <div className="fixed inset-0 z-50 bg-[#0c0a0b]/98 backdrop-blur-md flex flex-col items-center justify-start sm:justify-center p-6 pt-16 sm:pt-6 select-none animate-fade-in text-white animate-scale-in overflow-y-auto">
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

              {/* Snapshot image with active filters applied - matches original viewfinder ratio and shape */}
              <div 
                className={`relative mx-auto bg-neutral-950 overflow-hidden border border-white/20 shadow-2xl transition-all duration-300 ${
                  photoToRender?.viewfinderSize === 'circle' 
                    ? 'w-[75%] aspect-square rounded-full' 
                    : photoToRender?.viewfinderSize === 'compact'
                    ? 'w-[82%] aspect-[3/4] rounded-[32px]'
                    : 'w-full aspect-[3/4] rounded-[40px]'
                }`}
              >
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

              </div>

              {/* Clean metadata info block below the photo frame */}
              {photoToRender && (
                <div className="text-center space-y-1 py-1.5 animate-fade-in">
                  <div className="text-[10px] text-pink-300 font-sans tracking-widest font-bold uppercase">
                    {showOriginal ? (isZh ? 'ORIGINAL FEED / 原始镜头' : 'ORIGINAL FEED') : (isZh ? 'Lumi Glow 美颜自拍' : 'LUMI GLOW BEAUTY OPTIMIZED')}
                  </div>
                  <h4 className="text-xs font-semibold tracking-wide text-white/95">
                    {showOriginal ? (
                      isZh ? '前置无补光原图' : 'Raw Original Image'
                    ) : (
                      photoToRender?.splitMode === 'none'
                        ? `${isZh ? '柔光滤镜' : 'Soft Filter'}: ${photoToRender.presetName}`
                        : (isZh ? '双色混配柔滑打光' : 'Dual-Color Soft Blend')
                    )}
                  </h4>
                  <div className="flex items-center justify-center gap-3 text-[9px] text-white/60 font-mono mt-1">
                    <span>{isZh ? '曝光' : 'Exp'}: {showOriginal ? '0%' : `${Math.round((photoToRender?.brightness || 0.85) * 100)}%`}</span>
                    <span>{isZh ? '漫反射' : 'Diff'}: {showOriginal ? '0%' : `${Math.round((photoToRender?.softness || 0.65) * 100)}%`}</span>
                    <span>{isZh ? '时间' : 'Time'}: {new Date(photoToRender.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
              )}

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
                    className={`overflow-hidden border cursor-pointer flex-shrink-0 relative transition-all ${
                      photo.viewfinderSize === 'circle'
                        ? 'w-12 h-12 rounded-full'
                        : photo.viewfinderSize === 'compact'
                        ? 'w-10 h-13.5 rounded-xl'
                        : 'w-12 h-16 rounded-xl'
                    } ${
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

                    <span className={`absolute bottom-0 text-center w-full text-white bg-black/60 text-[8px] font-mono py-0.5 ${photo.viewfinderSize === 'circle' ? 'hidden' : ''}`}>
                      #{capturedPhotos.length - index}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* API Key Required dialog (iOS pop up style) */}
      {showApiKeyPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] flex items-center justify-center p-6 animate-fade-in text-sans">
          <div className="bg-white/95 rounded-[32px] max-w-[280px] w-full p-6 text-center shadow-2xl border border-pink-100/50 flex flex-col items-center gap-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-[#ff80a3] shadow-inner mb-1">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-800 tracking-wide mb-1.5">
                {isZh ? '开启 AI 追光分析' : 'AI API Config Required'}
              </h3>
              <p className="text-[11px] text-neutral-400 leading-normal px-2">
                {isZh 
                  ? '请先在「设置」中填写您的 AI 接口信息以使用 AI 补光功能。' 
                  : 'Please enter your API information in Settings to use AI features.'}
              </p>
            </div>
            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                onClick={() => {
                  playSound('click');
                  setShowApiKeyPrompt(false);
                  setCurrentView('settings');
                }}
                className="w-full py-2.5 bg-[#ff80a3] hover:bg-[#ff6290] text-white rounded-xl text-xs font-semibold active:scale-95 transition-all cursor-pointer shadow-md shadow-pink-200 select-none border-none"
              >
                {isZh ? '去设置 (Go to Settings)' : 'Go to Settings'}
              </button>
              <button
                onClick={() => {
                  playSound('click');
                  setShowApiKeyPrompt(false);
                }}
                className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 rounded-xl text-xs font-medium active:scale-95 transition-all cursor-pointer select-none border-none"
              >
                {isZh ? '取消 (Cancel)' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
