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

  const [brightness, setBrightness] = useState<number>(0.85); // 15% to 100%
  const [softness, setSoftness] = useState<number>(0.65); // Color saturation/dilution
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
           averageBrightness: parsed.averageBrightness ?? 0.85,
           averageSoftness: parsed.averageSoftness ?? 0.65,
           nighttimePresetId: parsed.nighttimePresetId || 'cold',
           autoApply: parsed.autoApply ?? true,
           styleMode: parsed.styleMode || 'natural',
           sceneMemory: parsed.sceneMemory || {},
         };
       }
    } catch (e) {
       console.error('Failed to load user preferences', e);
    }
    return {
       favoritePresetId: 'cream',
       usageCounts: { cream: 2, love: 1, cold: 1 },
       averageBrightness: 0.85,
       averageSoftness: 0.65,
       nighttimePresetId: 'cold',
       autoApply: true,
       styleMode: 'natural',
       sceneMemory: {},
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

  const handleAmbientDetected = (stats: typeof ambientStats) => {
    setAmbientStats(stats);
    
    if (preferences.autoApply) {
      const sKey = getSceneKey(stats);
      if (sKey !== lastRestoredSceneKey) {
        const saved = preferences.sceneMemory?.[sKey];
        if (saved) {
          const matchedPreset = FILL_LIGHT_PRESETS.find(p => p.id === saved.presetId);
          if (matchedPreset) {
            setActivePreset(matchedPreset);
            setIsLightSelected(true);
            setBrightness(saved.brightness);
            setSoftness(saved.softness);
            setIntensityLevel(saved.intensityLevel || 'normal');
            setLastRestoredSceneKey(sKey);
            
            const presetName = isZh ? matchedPreset.name : matchedPreset.englishName;
            const msg = isZh 
              ? `✨ [AI 记忆还原] 瞬间适配为您在此自拍环境习惯的「${presetName}」`
              : `✨ [Memory Restored] Switched to your favorite "${presetName}" setup for this environment`;
            
            showToast(msg);
          }
        } else {
          // Default light adaptive matching based on scene understanding
          const recommendation = getRecommendation(stats.brightness, stats.warmth);
          const matchedPreset = FILL_LIGHT_PRESETS.find(p => p.id === recommendation.presetId);
          if (matchedPreset) {
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
            setLastRestoredSceneKey(sKey);
            
            const presetName = isZh ? matchedPreset.name : matchedPreset.englishName;
            const msg = isZh 
              ? `✨ [Lumi AI 智能自适应] 检测到自拍环境变化，智能对冲并匹配「${presetName}」补光方案`
              : `✨ [Lumi AI Ambiance] Detected environment change, matching "${presetName}" style`;
            
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
      ? (isZh ? '深夜夜色 🌌' : 'Late Night 🌌') 
      : (isZh ? '明净日光 ☀️' : 'Daylight Hour ☀️');

    // Resolve scenario
    let effectiveScenId = simulatedScenario;
    if (effectiveScenId === 'none') {
      if (bright > 165) {
        effectiveScenId = 'daylight_bright';
      } else if (warm > 1.25) {
        effectiveScenId = bright < 95 ? 'dark_warm' : 'warm_restaurant';
      } else if (warm < 0.88 && bright < 95) {
        effectiveScenId = 'night_cool';
      } else {
        effectiveScenId = 'normal';
      }
    }

    const makeupStyleZh = preferences.styleMode === 'glamorous' 
      ? '精致蜜桃腮红妆' 
      : preferences.styleMode === 'cool_tech' 
      ? '高级裸感冷调妆' 
      : '元气日常淡妆';
    const makeupStyleEn = preferences.styleMode === 'glamorous' 
      ? 'Glamorous peach' 
      : preferences.styleMode === 'cool_tech' 
      ? 'Premium cool nude' 
      : 'Fresh natural light';

    // Core variables
    let presetId = 'cream';
    let labelZh = '元气提亮';
    let labelEn = 'Skin Energizer';

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

    let stepsZh: string[] = [];
    let stepsEn: string[] = [];

    let baseAdviceZh = '';
    let baseAdviceEn = '';

    let detectedBright = '';
    let detectedWarm = '';
    let detectedBg = '';
    let detectedSkin = '';
    let detectedPlace = '';

    // Advanced local AI adaptive matrix matching rules:
    if (effectiveScenId === 'dark_warm' || (ambientStats.isYellowLight && ambientStats.faceBrightness < 100)) {
      // Rule: 暖黄灯 + 面部暗沉 / Dark Yellow Ceiling Bulbs
      presetId = 'cream'; // Match Cream Skin for warm dimmer rooms as requested
      labelZh = '暖黄智能润滑';
      labelEn = 'Warm Velvet Light';

      pSkinTempZh = '肤色被灯光泛染出重度橘黄，正面缺乏润白光华';
      pSkinTempEn = 'Complexion heavily yellowed by saturated warm bulb reflects';
      pBrightnessZh = '光线偏暗，脸颊及额部处于照度欠曝区间';
      pBrightnessEn = 'Slightly underexposed facial skin details';
      pShadowsZh = '鼻侧下落形成偏暗的暖调软投影';
      pShadowsEn = 'Soft downward yellow shadows cast';
      pDullnessZh = '暗觉明显，熬夜造成的青黄色度堆积，显疲惫';
      pDullnessEn = 'Low skin transparency with excessive gray/yellow build-up';
      p3DZh = '面部五官过渡平泛，无充足透光折射度';
      p3DEn = 'Flat facial contours lacking structured reflections';
      pEyeShadowZh = '下睑沟部凹陷伴随青黑疲惫眼圈';
      pEyeShadowEn = 'Pronounced under-eye dark circles and fatigue shadows';

      bgLampZh = '检测到强烈的室内硬光及高瓦数暖黄顶灯投射';
      bgLampEn = 'Cozy high-temperature warm yellow spotlight spill';
      bgWallZh = '纯白色墙面已被杂光浸染为烛黄色';
      bgWallEn = 'Plain drywall background stained by gold bulb glow';
      bgNightZh = '属于中低照度环境或低能见度暗室';
      bgNightEn = 'Lowlight nighttime warm indoor setting';
      bgInOutZh = '典型的暖黄高热密闭房间';
      bgInOutEn = 'Enclosed interior lounge room';
      bgTempZh = '重度温黄色温 (3200K色温带度)';
      bgTempEn = 'Extreme warm amber shift (approx 3200K)';

      baseAdviceZh = '检测到您正处于低亮暖黄光线中，肤色因偏黄黯沉而显得疲态。已自动匹配经典暖白「奶油肌」填充，新增弥散漫反射，温柔抚平颧骨下的细小凹皱，还原元气莹亮！';
      baseAdviceEn = 'Dim warm lighting detected causing skin dullness. Automatically formulaized iconic cozy "Cream Skin" to offset yellow shadow cast and plump fine cheek contours, granting effortless fresh luster.';

      stepsZh = [
        '分析：捕捉到暖黄环境溢散杂光，面色因饱和黄温从而显得晦暗发涩',
        '识别：面部气色均匀但暗角累积，印入较显疲倦的下睑阴影眼袋',
        '决策：智能匹配招牌「奶油肌」光晕，中高亮度漫射以轻抚泪沟，抹平毛孔'
      ];
      stepsEn = [
        'Analyzed: Ambient saturated with warm spotlight, skin suffers yellow cast and dullness',
        'Identified: Flat cheek structure with tired under-eye bags cast by direct ceiling beam',
        'Action: Auto-applied iconic "Cream Skin" setup to fill flat shadows and restore bounciness'
      ];

      detectedBright = isZh ? '环境过暖' : 'Ambient Too Warm';
      detectedWarm = isZh ? '高热温黄' : 'High Warm Amber';
      detectedBg = isZh ? '橘黄偏偏背景' : 'Yellow Stained Canvas';
      detectedSkin = isZh ? '暗黄无神且深色黑眼圈' : 'Dull skin & dark eye-bags';
      detectedPlace = isZh ? '暖温密闭室内' : 'Dim Yellow Indoor';

    } else if (effectiveScenId === 'warm_restaurant') {
      // Warm Cozy Golden hour or elegant dinner
      presetId = 'sunset';
      labelZh = '慵懒焦糖';
      labelEn = 'Cinematic Sunset';

      pSkinTempZh = '蜜桃金黄，折射出温润柔和肤色';
      pSkinTempEn = 'Stunning honey-peach warm golden undertone';
      pBrightnessZh = '明暗半交碰，高低光对比充满纵深感';
      pBrightnessEn = 'Rich contrast with beautiful shadows';
      pShadowsZh = '鼻侧及骨性曲线过渡饱满柔滑';
      pShadowsEn = 'Soft organic contoured face lines';
      pDullnessZh = '润泽清透，面颊气色良好';
      pDullnessEn = 'Glowing with healthy peach-luster shine';
      p3DZh = '斜向侧逆光将面部立体骨相完美勾勒';
      p3DEn = 'Backlight sculpts detailed facial architecture';
      pEyeShadowZh = '泪沟及青黑眼圈被香槟金暖亮完全淡化';
      pEyeShadowEn = 'Eye bags naturally blended into warm caramel base';

      bgLampZh = '餐厅浪漫吊灯、夕阳余晖斜照或优雅蜡烛';
      bgLampEn = 'Cozy restaurant chandelier or sunset rays';
      bgWallZh = '奢华木饰面或慵懒褐色质感背景';
      bgWallEn = 'Wooden textures or warm premium wall finishes';
      bgNightZh = '属于慢生活的文艺、约会环境';
      bgNightEn = 'Evening relaxing dining lounge background';
      bgInOutZh = '中低度暖意饱满室内';
      bgInOutEn = 'Atmospheric table indoor';
      bgTempZh = '温馨暖煦区 (2800K~3400K)';
      bgTempEn = 'Warm cozy restaurant temp (approx 3000K)';

      baseAdviceZh = '您正处于高级温热的电影感夕阳氛围中。无需强行对冲！Lumi 推荐「日落橘」光环，优雅融合侧翼光影，凸显深邃骨相立体感，定格自带情绪氛围的故事大片！';
      baseAdviceEn = 'Glistening candlelight dining atmosphere detected. Recommends "Sunset Glow" warm aura to gorgeously contour your face, leaving high-fashion cinematic tones with narrative depth.';

      stepsZh = [
        '分析：斜向微暖光源烘托，光影质感极其温煦，对比富有戏剧张力',
        '识别：面部明暗立体过渡饱满，肤色健康富有生气，眼神深邃明亮',
        '决策：智能适配暖调「日落橘」色谱，微补香槟金高光，雕琢电影格调'
      ];
      stepsEn = [
        'Analyzed: Beautiful diagonal warm glow, creating artistic highlights and contours',
        'Identified: Plump warm lip-cheek tone with clear contour lines, minimal fatigue',
        'Action: Fitted peach-orange "Sunset Glow" style to expand modern retro film warmth'
      ];

      detectedBright = isZh ? '温馨明和' : 'Cozy Light';
      detectedWarm = isZh ? '暖棕焦糖' : 'Warm Golden Cast';
      detectedBg = isZh ? '奢雅暖色背景' : 'Ambiance Gold Backdrop';
      detectedSkin = isZh ? '莹润立体' : 'Moisturized & sculpted';
      detectedPlace = isZh ? '格调餐厅' : 'Premium Lounge';

    } else if (effectiveScenId === 'night_cool' || (isNight && ambientStats.bgBrightness < 80)) {
      // Rule: 夜晚 + 深色/黑背景 / Night + Dark Background
      presetId = 'moonlight'; // Moonlight Blue
      labelZh = '眼神流盼';
      labelEn = 'Eye Sparkle';

      pSkinTempZh = '背光处于极冷深邃的蓝灰色底色';
      pSkinTempEn = 'Deep night cobalt blue skin undertone';
      pBrightnessZh = '极暗环境，面容大面积融入黑夜不可见';
      pBrightnessEn = 'Deep night shadows, face severely obscured';
      pShadowsZh = '深重灰黑色遮盖了脸颊两侧与额骨';
      pShadowsEn = 'Massive shadow blocks under brows and chin';
      pDullnessZh = '极度欠缺发光度，眼神无神、皮层干燥发灰';
      pDullnessEn = 'Deprived of skin vitality, gaze looks quiet/dim';
      p3DZh = '面部五官轮廓在黑暗混沌中难以分辨';
      p3DEn = 'Face shapes lack edge definition and contrast';
      pEyeShadowZh = '眼下方带有大范围幽黑熬夜黑眼圈及泪痕影';
      pEyeShadowEn = 'Pronounced dark blue fatigue circles';

      bgLampZh = '深夜幽冷微光，仅远处楼亮有散漫光点';
      bgLampEn = 'Faint twilight or distant window reflections';
      bgWallZh = '幽深窗外天空、露台深夜壁色或漆黑暗角';
      bgWallEn = 'Plain pitch black open-air background';
      bgNightZh = '典型的深夜或处于极低照度的静谧暗夜';
      bgNightEn = 'Midnight hours with zero solar light';
      bgInOutZh = '深夜室外阳台或无灯封闭暗室';
      bgInOutEn = 'Midnight outdoor block or pitch dark bedroom';
      bgTempZh = '清冷冰蓝色段 (7500K色温频)';
      bgTempEn = 'Deep blue cool temperature range (approx 7500K)';

      baseAdviceZh = '当前处于深夜幽静的黑色背景中。强拉耀眼白光会晃眼且易使脸部泛油。Lumi 已自动为您匹配微蓝色温「月光蓝」极简轻柔补光，消减眼周暗斑，瞬间给清暗中闪亮出夺目的澄澈眼神光！';
      baseAdviceEn = 'Midnight darkness and dark backing detected. Lumi avoided stark blinding flash and instantly applied serene "Moonlight Blue" soft ambient aura to eliminate dark shadows and lock sparkling bright eyes.';

      stepsZh = [
        '分析：深夜极暗幽闭冷色底调覆盖，眼神暗淡，照度逼近弱光极限',
        '识别：面面部细节多陷于背景黑暗中，由于微弱照度使双目泪沟黑圈增加',
        '决策：注入温和不晃眼的「月光蓝」浅幽微光，消除疲倦，定格星点闪烁眼神光'
      ];
      stepsEn = [
        'Analyzed: Low ambient night, background fully obscured by deep indigo space',
        'Identified: Facial borders lost in darkness, dark circles exacerbated by high contrast',
        'Action: Overlayed organic soft-blue "Moonlight" gradient to illuminate beautiful eyes'
      ];

      detectedBright = isZh ? '夜幕低能' : 'Midnight Dark';
      detectedWarm = isZh ? '幽凉蓝调' : 'Cool Blue Temp';
      detectedBg = isZh ? '漆黑长空' : 'Pitch Black Background';
      detectedSkin = isZh ? '晦暗失神，色度发黑' : 'Obscured & tired eyes';
      detectedPlace = isZh ? '幽美深夜' : 'Midnight Space';

    } else if (effectiveScenId === 'dull' || (ambientStats.bgBrightness > 140 && ambientStats.faceBrightness < 115)) {
      // Rule: 白墙 + 面部偏灰 / Off-white Wall + Grayish Face
      presetId = 'cold'; // Soft Fill White
      labelZh = '白净去灰';
      labelEn = 'Immaculate White';

      pSkinTempZh = '白皙偏冷灰，底色稍显苍白，无血色';
      pSkinTempEn = 'Pale neutral-cool skin base with flat grey undertone';
      pBrightnessZh = '采光平温，但皮层细胞缺少通透透亮的光华';
      pBrightnessEn = 'Moderate light but skin is plain and dull';
      pShadowsZh = '鼻侧下部分布着少许细散平铺的浅灰色阴影';
      pShadowsEn = 'Minor flat grayish facial shadow traces';
      pDullnessZh = '熬夜微现，面泛青灰，细胞饱满度低下';
      pDullnessEn = 'Slightly fatigued skin with low luster density';
      p3DZh = '白平漫射使五官缺乏雕琢比例，有些扁平';
      p3DEn = 'Flat face under uniform diffusion';
      pEyeShadowZh = '眼下方分布有淡淡的青蓝色疲惫眼袋';
      pEyeShadowEn = 'Slightly bluish tired bags under eyelids';

      bgLampZh = '大面积白色荧光管扩散，无明显投影反光';
      bgLampEn = 'Diffuse standard white ceiling tubelight';
      bgWallZh = '白色亚光漆普通粉刷墙，大范围折射回冷光';
      bgWallEn = 'Plain white drywall background reflecting colder bounce';
      bgNightZh = '中规中矩的平常多云白天或明亮室内角';
      bgNightEn = 'Daytime interior with light gray shadow base';
      bgInOutZh = '常规中等照度的白皙写字楼/客厅';
      bgInOutEn = 'Standard office desk workspace';
      bgTempZh = '中性偏白日光 (5600K~6000K)';
      bgTempEn = 'Standard cool balanced light (approx 5800K)';

      baseAdviceZh = '当前大面积白墙反光导致面部略显疲倦灰涩。已经自动为您调配冰透「冷白皮」补调，智能对冲灰调，提拉面部边缘亮斑，瞬间打造极富通透润泽感的高清瓷白颜！';
      baseAdviceEn = 'Flat off-white background and light gray cast detected. Lumi designed crispy white "Soft Fill White" setup to filter out secondary gray cast and plump cheek highlights, achieving a premium porcelain luster.';

      stepsZh = [
        '分析：四周受大面积纯白墙反射冷感，肤色缺乏自然红润气血色调',
        '识别：面色在室内反平光下微现灰度无神，眼睑下方呈细微泪痕阴影',
        '决策：自适应调入剔透冷感「冷白皮」高柔补光，清除暗灰色素，透射白皙白瓷底光'
      ];
      stepsEn = [
        'Analyzed: Large off-white surface casting monotonic white light, causing flat grey tint',
        'Identified: Complexion is slightly pale with flat cheek structures and minor fatigue',
        'Action: Loaded porcelain blue-white "Ice White" spectrum to erase grayish dust'
      ];

      detectedBright = isZh ? '光影平灰' : 'Grayish Light';
      detectedWarm = isZh ? '中冷淡色' : 'Cool Balanced Temp';
      detectedBg = isZh ? '白净反射背景' : 'White Drywall Backdrop';
      detectedSkin = isZh ? '因熬夜有些许发青发灰' : 'Fatigued & Grayish';
      detectedPlace = isZh ? '常规明亮室内' : 'Standard Workspace';

    } else if (effectiveScenId === 'daylight_bright') {
      // Outdoor Sunlight
      presetId = 'love';
      labelZh = '红润防暴';
      labelEn = 'Rosy Protection';

      pSkinTempZh = '极高饱和日光配比红润肌肤';
      pSkinTempEn = 'Extremely high brightness natural skin frame';
      pBrightnessZh = '正面直射采光明艳过载，接近极值曝光';
      pBrightnessEn = 'Abundant glare near overexposure scale';
      pShadowsZh = '鼻梁骨架及眼窝带有硬朗的烈日硬影';
      pShadowsEn = 'Harsh solar peak spot glare';
      pDullnessZh = '润度通透，但光色因极强天偏平淡';
      pDullnessEn = 'Outstanding clarity with glowing high key skin textures';
      p3DZh = '极硬的大平光会压缩面骨的左右向侧翼，有些扁平';
      p3DEn = 'Strong solar direct light slightly flattens nasal bridge';
      pEyeShadowZh = '泪痕及细小眼圈被暴晒天光完全吞噬消失';
      pEyeShadowEn = 'Eye shadows fully washed out by sunbeams';

      bgLampZh = '户外烈日当天或大空域极亮天光';
      bgLampEn = 'Open air sky sunbeams beaming';
      bgWallZh = '亮色建筑表面或繁茂户外绿植';
      bgWallEn = 'Glistening garden or concrete backdrop';
      bgNightZh = '典型的烈日高照白昼';
      bgNightEn = 'Bright daytime midday hours';
      bgInOutZh = '视野空旷无阻的户外开阔处';
      bgInOutEn = 'Open natural outdoor environment';
      bgTempZh = '纯净室外耀日光度 (5800K太阳光谱格)';
      bgTempEn = 'Natural solar color temp (5800K)';

      baseAdviceZh = '当前户外日光照度极高。猛烈暴晒容易使自拍丧失气血红润。Lumi 自动配对了甜雅「初恋粉」红晕填充，融一层梦幻少女绯红，平顺强光过載，直出桃花气色！';
      baseAdviceEn = 'Extreme solar daylight detected. Heavy sunlight can wash out blush depth. Lumi matched cozy redish "First Love" light profile to absorb wild glitter and outline a beautiful fresh pink flush.';

      stepsZh = [
        '分析：强烈原生日光由外直入，画面光亮饱和度过高，易显扁平',
        '识别：肤质晶透但气血缺失，暴晒日光导致双颊对比单一而没有红润度',
        '决策：自动开启「初恋粉」樱粉补光，中和生硬暴晒，打造柔亮好气色桃花脸'
      ];
      stepsEn = [
        'Analyzed: Abundant sunlight flowing into lens, close to solar over-illumination',
        'Identified: Skin is translucent but flat, losing sweet flush profile properties',
        'Action: Loaded cozy sweet "First Love" schema to blend down harsh glares, depositing a fresh rose glow'
      ];

      detectedBright = isZh ? '光照极硬' : 'Solar Glaring';
      detectedWarm = isZh ? '金煦天光' : 'Sunlight Balanced';
      detectedBg = isZh ? '开阔自然背景' : 'Vibrant Outdoor Backdrop';
      detectedSkin = isZh ? '采光充盈，略干' : 'High sun reflection';
      detectedPlace = isZh ? '野外晴空户外' : 'Sunny Outdoor Arena';

    } else {
      // Normal Comfortable Balanced Room Daylight
      presetId = 'cream';
      labelZh = '天生好感';
      labelEn = 'Natural Smooth';

      pSkinTempZh = '适中温顺，暖白色泽，最衬肤质';
      pSkinTempEn = 'Comfortable neutral-warm peach frame';
      pBrightnessZh = '采光和谐，面庞细节饱满得当';
      pBrightnessEn = 'Perfect skin illumination density';
      pShadowsZh = '鼻侧和咬肌边缘存在柔和过渡的微弱阴影';
      pShadowsEn = 'Soft natural standard facial shadows';
      pDullnessZh = '皮表细节柔顺，携带极薄的室内沉闷感';
      pDullnessEn = 'Slight natural flat gray in standard room';
      p3DZh = '五官比例工整，光影折射均称';
      p3DEn = 'Symmetric facial depth, regular shadow layers';
      pEyeShadowZh = '眼下方带有轻微的生活正常生活阴网影';
      pEyeShadowEn = 'Inconspicuous gentle shadow path under eyes';

      bgLampZh = '室内吸顶LED暖白灯，柔宜宜人';
      bgLampEn = 'Cozy LED ceiling illumination';
      bgWallZh = '干净舒适的米白色普通居家客厅粉刷墙';
      bgWallEn = 'Plain home light-beige interior apartment wallpaper';
      bgNightZh = '和煦光度，百搭居家的自拍场景';
      bgNightEn = 'Gentle home window shade daytime backdrop';
      bgInOutZh = '常规客厅或卧室内写字台';
      bgInOutEn = 'Sober interior house room';
      bgTempZh = '和顺家用色温频 (4500K和润白)';
      bgTempEn = 'Balanced comfortable room temperature (4500K)';

      baseAdviceZh = '当前室内采光均匀协调。Lumi 为您推荐招牌「奶油肌」温润柔光，轻轻拉平您颧骨下方隐隐的微弱阴影。一键拍摄，肤色白润如细腻羊脂，展现毫无粉感的天生好底子！';
      baseAdviceEn = 'Comfortable uniform indoor light detected. Recommends Warm-Soft "Cream Skin" to erase micro nostril lines and cast beautiful warm lusters, rendering healthy natural portrait looks.';

      stepsZh = [
        '分析：捕捉到能量均衡、照度适中的居家LED天窗，光斑偏色正常',
        '识别：面部骨相饱满契合，仅唇下 and 眼睑带有一些轻微的重力软影',
        '决策：极速采用「奶油肌」自适应光辉，温润抚平毛孔，立显软嫩原生肌'
      ];
      stepsEn = [
        'Analyzed: Balanced cozy ceiling lamp captured, color spectrum is clean and normal',
        'Identified: Symmetrical skin contour lines with typical micro face corner creases',
        'Action: Fitted premium "Cream Skin" preset to cast gorgeous velvet pearl luster'
      ];

      detectedBright = isZh ? '照度均衡' : 'Uniform Ambient';
      detectedWarm = isZh ? '温和中润' : 'Neutral Temperature';
      detectedBg = isZh ? '日常居家背景' : 'Cozy Living Backdrop';
      detectedSkin = isZh ? '均衡透水状态' : 'Healthy balanced skin lusters';
      detectedPlace = isZh ? '匀净舒适室内' : 'Cozy Indoor Space';
    }

    // 3. Apply User Design Bias Overlay!
    let memoryEffect = '';
    const favPreset = FILL_LIGHT_PRESETS.find(p => p.id === preferences.favoritePresetId);
    const favName = favPreset ? (isZh ? favPreset.name : favPreset.englishName) : '';

    if (preferences.styleMode === 'cool_tech' && presetId !== 'cold' && presetId !== 'moonlight') {
      presetId = 'cold';
      baseAdviceZh = `【已结合习惯矫正】感应到您近期在 Lumi 偏爱「高级冷色」冷系自拍，AI 已自动将补发光谱向「冷白皮」偏置。咔嚓一瞬间，去除灰黄杂痕，定格极致冷白名媛脸！`;
      baseAdviceEn = `[Aesthetic Bias Applied] Knowing your signature taste is cool-toned, Lumi automatically calibrated recommendation to ice-light "Ice White" active filter, filtering warm environment stains.`;
      memoryEffect = isZh ? '✦ 已结合近期偏好：自动偏置为高级冷白皙补光' : '✦ Balanced for Cold High-Fashion preference';

      stepsZh = [
        stepsZh[0],
        isZh ? '💡 【习惯激活】检测到您高频点击应用「高级冷色」自拍美感习惯' : '💡 [Bias Active] User loves cold high-fashion photo style',
        isZh ? '配方自动向「冷白皮」温润修正，多层叠加浅晶亮瓷蓝光谱对冲昏暗' : 'Shifted target palette to crisp "Ice White" filler to satisfy cool-tone elegance styling'
      ];
      stepsEn = [
        stepsEn[0],
        '💡 [Bias Active] User loves cool modern picture aesthetic',
        'Shifted primary tuning parameters to "Ice White" to emphasize colder premium luxury complexions'
      ];
    } else if (preferences.styleMode === 'glamorous' && presetId !== 'love') {
      presetId = 'love';
      baseAdviceZh = `【已结合习惯矫正】感应到您近期追光习惯为「甜美粉嫩」。AI 已自动为您匹配梦恋「初恋粉」补色环。消解面颊苍白，让脸蛋儿自带腮红微重桃花底妆！`;
      baseAdviceEn = `[Aesthetic Bias Applied] To flatter your personalized sweetness expectation, Lumi has shifted recommendation to soft rose "First Love", erasing pale flat tones with dreamy sweet highlights.`;
      memoryEffect = isZh ? '✦ 已结合近期偏好：自动偏置为梦幻蜜桃腮红补光' : '✦ Style Bias adjusted to sweet First Love Pink';

      stepsZh = [
        stepsZh[0],
        isZh ? '💡 【习惯激活】检测到您习惯使用桃花般红润的「甜系氛围」腮红补色' : '💡 [Bias Active] Preference for romantic blush filters detected',
        isZh ? '配方自动转换为「初恋粉」甜蜜漫射辅照，让脸庞自带甜甜的心动红晕' : 'Translated default suggestion into cherry blossom rosy "First Love" light aura'
      ];
      stepsEn = [
        stepsEn[0],
        '💡 [Bias Active] Knowing your preference for sweet portrait aesthetics',
        'Overrode target schema with pinkish glow "First Love" to outline youthful flush'
      ];
    } else {
      if (preferences.favoritePresetId && favName) {
        memoryEffect = isZh 
          ? `✦ 契合您近期偏爱的「${favName}」补色 (已累计在相同位置应用达 ${preferences.usageCounts[preferences.favoritePresetId] || 1} 次)`
          : `✦ Harmonized with your staple 「${favName}」 preference`;
      } else {
        memoryEffect = isZh ? '✦ Lumi 空气补光镜已自适应就绪，随时按下快门记录美丽！' : '✦ Lumi AI auto-applied, snapshot ready!';
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

    detectedBright: isZh ? 'AI 定制亮度' : 'AI Custom Lux',
    detectedWarm: isZh ? 'AI 定制柔和' : 'AI Custom Soft',
    detectedBg: isZh ? 'AI 视界算法' : 'AI Smart Intel',
    detectedSkin: isZh ? 'AI 人像对冲' : 'AI Alignment',
    detectedTime: isZh ? 'AI 智能配光' : 'AI Spectrum',
    detectedPlace: isZh ? '高级人像环境' : 'Premium Sphere',
    memoryEffect: ''
  } : getRecommendation(ambientStats.brightness, ambientStats.warmth);

  const recommendedPreset = FILL_LIGHT_PRESETS.find(p => p.id === recommendedInfo.presetId) || FILL_LIGHT_PRESETS[0];

  // ⚡ Lumi AI Auto-Tune / 自动追光 effect
  useEffect(() => {
    if (preferences.autoApply) {
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
  }, [recommendedPreset.id, preferences.autoApply, aiReport]);

  const handleApplyAiRecommendation = () => {
    playSound('focus'); // play mechanical cinematic dual-tone sound for magical feeling
    setActivePreset(recommendedPreset);
    setIsLightSelected(true);
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
    handleRecordPresetUsage(preset.id);
    setIsAiPanelExpanded(false);
    setImmersiveMode(true); // Auto-trigger immersive selfie mode on selection
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
    setIsLightSelected(true);
    setIsAiPanelExpanded(false);
    setImmersiveMode(true); // Auto-trigger immersive selfie mode on split choice
    analyticsTracker.track('split_preset_change', {
      side,
      presetId: preset.id,
      presetName: preset.name,
      pairedWith: side === 'left' ? splitPresetRight.id : splitPresetLeft.id,
    });
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

      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData?.error || 'Gemini response code failed');
      }

      const report = await response.json();
      
      // Save report content
      setAiReport(report);
      
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
      showToast(isZh 
        ? `⚠️ AI 追光分析失败: ${err?.message || '网络 or 接口超时'}` 
        : `⚠️ AI Vision Alignment failed: ${err?.message || 'timeout'}`
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
                onAmbientDetected={setAmbientStats}
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
              onAmbientDetected={setAmbientStats}
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
          {/* 💡 Ambient & Operation Gesture Hint - Moved inside the console deck to avoid layout shift */}
          <div className="text-center pointer-events-none flex items-center justify-center gap-1.5 bg-black/15 border border-white/5 py-1 px-3.5 rounded-full text-[9.5px] text-stone-300 font-sans font-medium tracking-wide backdrop-blur-xs mx-auto mb-1 animate-fade-in">
            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
            <span>
              {isZh 
                ? '上下滑动调节补发光亮度 ｜ 左右滑动调节温润肤色' 
                : 'Swipe vertically for light level | Horizontally for warm-softness'}
            </span>
          </div>

          <div className="w-full flex flex-col items-center mb-1 px-3 animate-fade-in">
            {!isAiPanelExpanded ? (
              /* 🌲 COMPACT COLLAPSED SINGLE-LINE LUXURY PILL */
              <div 
                onClick={() => {
                  playSound('click');
                  setIsAiPanelExpanded(true);
                }}
                className="w-full bg-black/25 hover:bg-black/35 border border-white/10 hover:border-indigo-500/35 px-3.5 py-2.5 rounded-2xl shadow-md backdrop-blur-md flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-99 group"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="flex-shrink-0 relative flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 group-hover:scale-105 transition-transform">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  </span>
                  <div className="flex flex-col text-left min-w-0">
                    <p className="text-[10px] text-white/50 font-sans tracking-tight truncate flex items-center gap-1">
                      <span className="font-semibold text-white/80">Lumi AI {isZh ? '智能追光中' : 'AI Autotune'}</span>
                      <span className="opacity-40">•</span>
                      <span className="text-[9px] text-[#A6B5FF] font-medium">
                        {preferences.autoApply ? (isZh ? '已自动补光' : 'Auto-Tuned') : (isZh ? '美学推荐' : 'Aesthetic Advice')}
                      </span>
                    </p>
                    <p className="text-[11px] text-white/95 font-medium leading-tight truncate font-sans">
                      {isZh ? (
                        `推荐「${recommendedPreset.name}」· ${recommendedInfo.labelZh} (点击查看美学分析)`
                      ) : (
                        `Recommended "${recommendedPreset.englishName}" (Vibe: ${recommendedInfo.labelEn})`
                      )}
                    </p>
                  </div>
                </div>

                {/* Action area: Show state + expand trigger */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!preferences.autoApply && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playSound('focus');
                        setActivePreset(recommendedPreset);
                        setIsLightSelected(true);
                        setImmersiveMode(true); // Auto collapse and enter pure light mode
                      }}
                      className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[9.5px] text-white font-sans font-bold shadow-md cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                    >
                      💡 {isZh ? '应用' : 'Apply'}
                    </button>
                  )}
                  <span className="text-[10.5px] text-indigo-300 font-bold hover:text-indigo-200 transition-colors pl-1 flex items-center gap-0.5 whitespace-nowrap">
                    {isZh ? '开启 ∨' : 'Open ∨'}
                  </span>
                </div>
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
                          {isZh ? '收起 ︿' : 'Fold ︿'}
                        </span>
                      </span>
                      <span className="text-[9px] text-[#A6B5FF] font-medium tracking-tight">
                        {isZh ? '美学人脸环境对冲与习惯记忆' : 'Multi-sensor aesthetic tuning'}
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
                    <span>{preferences.autoApply ? (isZh ? '自动追光·开' : 'Auto-Tune On') : (isZh ? '手动追光·关' : 'Manual Tune')}</span>
                  </button>
                </div>

                {/* Premium AI Vision Scanner Trigger */}
                <div className="w-full flex flex-col gap-1 text-left mt-0.5 animate-fade-in">
                  <button
                    onClick={handleAiScan}
                    disabled={isAiScanning}
                    className={`w-full py-2.5 px-4 rounded-xl font-heading text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-lg select-none cursor-pointer border relative overflow-hidden active:scale-98
                      ${isAiScanning 
                        ? 'bg-stone-900 border-white/5 text-[#A6B5FF]' 
                        : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-purple-500 text-white border-indigo-400/20 shadow-[0_0_15px_rgba(99,102,241,0.35)]'
                      }
                    `}
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isAiScanning ? 'animate-spin' : 'animate-bounce'}`} />
                    <span>
                      {isAiScanning 
                        ? (isZh ? 'Lumi AI 正在深度感应面部细节...' : 'Lumi AI is tracking portrait details...') 
                        : (isZh ? '✨ 触发 AI 仿生人脸环境追踪' : '✨ Trigger AI Portrait & Env Scan')
                      }
                    </span>
                  </button>
                  {aiReport && (
                    <div className="flex items-center justify-between text-[8px] text-indigo-300 bg-indigo-950/20 border border-indigo-500/15 py-1 px-2.5 rounded-lg mt-0.5 font-mono">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                        <span>{isZh ? '已应用真实 AI 仿生对冲美学参数' : 'Vibe-aligned by physical Gemini AI Vision engine'}</span>
                      </span>
                      <button 
                        onClick={() => {
                          playSound('click');
                          setAiReport(null);
                          showToast(isZh ? '已还原至实时光感追光传感器' : 'Reset to Live ambient sensor');
                        }} 
                        className="text-[#FFE2EC] font-bold hover:underline"
                      >
                        [{isZh ? '还原传感器' : 'Reset'}]
                      </button>
                    </div>
                  )}
                </div>

                {/* Row 1: The Cozy Aesthetic Response Card (Conversational Prompt Advisor) */}
                <div 
                  onClick={() => {
                    playSound('focus');
                    setActivePreset(recommendedPreset);
                    setIsLightSelected(true);
                    setImmersiveMode(true); // Tapping recommendation card moves user into immersive mode
                    showToast(isZh 
                      ? `✨ Lumi 智能自拍已就绪：已匹配「${recommendedPreset.name}」极简补光！`
                      : `✨ Lumi AI: Custom light matched! Entered immersive selfie mode.`
                    );
                  }}
                  className="bg-black/25 hover:bg-black/35 rounded-xl p-3 border border-indigo-500/15 flex flex-col gap-2 relative overflow-hidden text-left cursor-pointer transition-all active:scale-99 hover:border-indigo-400/30 group/advice"
                >
                  <div className="flex gap-2 items-center text-[10.5px] font-sans font-semibold tracking-wider text-indigo-300">
                    <span>✨</span>
                    <span>{isZh ? 'Lumi AI 补光配方建议' : 'Lumi AI Soft Lighting Advisory'}</span>
                    <span className="ml-auto text-[8.5px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 px-1.5 py-0.5 rounded-md opacity-80 group-hover/advice:opacity-100 transition-opacity">
                      {isZh ? '进入极简发光 ↗' : 'Minimal Light Surface ↗'}
                    </span>
                  </div>

                  <div className="flex gap-2.5 items-start mt-0.5">
                    <span className="text-sm select-none">🤖</span>
                    <div className="flex-1 flex flex-col min-w-0">
                      <p className="text-[11px] text-emerald-200/95 font-medium leading-relaxed font-sans bg-emerald-500/5 border-l-2 border-emerald-400/40 pl-2.5 py-1.5 rounded-r">
                        {isZh ? recommendedInfo.adviceZh : recommendedInfo.adviceEn}
                      </p>
                      {recommendedInfo.memoryEffect && (
                        <p className="text-[10px] text-indigo-300 font-sans font-medium tracking-tight mt-1 pl-0.5 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                          <span>{recommendedInfo.memoryEffect}</span>
                        </p>
                      )}
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
                          ? `✨ 已为您自动应用「${recommendedPreset.name}」自拍补光！` 
                          : `✨ Applied optimized 「${recommendedPreset.englishName}」 lighting!`
                        );
                      }}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[10px] text-white font-sans font-bold tracking-wider cursor-pointer shadow-md transition-all active:scale-98"
                    >
                      💡 {isZh ? `立即一键应用推荐配方` : `Apply Light Profile`}
                    </button>
                  )}
                </div>

                {/* Row 2: Aesthetic Preference Segment (My custom style mode) */}
                <div className="flex flex-col gap-1 text-left bg-black/10 rounded-xl p-2 border border-white/5">
                  <span className="text-[10px] text-white/50 font-sans font-medium tracking-wide flex justify-between pr-1">
                    <span>🎨 {isZh ? '我的自拍美学倾向' : 'My Selfie Taste Profile'}</span>
                    <span className="text-[8.5px] text-indigo-300 font-medium">{isZh ? '自适应微调推荐权重' : 'Alters tuning algorithm'}</span>
                  </span>
                  <div className="grid grid-cols-3 gap-1 grid-rows-1">
                    <button
                      onClick={() => {
                        playSound('click');
                        setPreferences(prev => ({ ...prev, styleMode: 'natural' }));
                      }}
                      className={`py-1 rounded-lg text-[10px] font-sans font-bold flex items-center justify-center border transition-all cursor-pointer ${
                        preferences.styleMode === 'natural'
                          ? 'bg-neutral-100 text-neutral-900 border-white font-extrabold shadow-sm'
                          : 'bg-white/5 text-white/60 border-transparent hover:text-white'
                      }`}
                    >
                      <span>👶 {isZh ? '元气原生' : 'Natural'}</span>
                    </button>
                    <button
                      onClick={() => {
                        playSound('click');
                        setPreferences(prev => ({ ...prev, styleMode: 'cool_tech' }));
                      }}
                      className={`py-1 rounded-lg text-[10px] font-sans font-bold flex items-center justify-center border transition-all cursor-pointer ${
                        preferences.styleMode === 'cool_tech'
                          ? 'bg-neutral-100 text-neutral-900 border-white font-extrabold shadow-sm'
                          : 'bg-white/5 text-white/60 border-transparent hover:text-white'
                      }`}
                    >
                      <span>💎 {isZh ? '高级冷色' : 'Chic Cool'}</span>
                    </button>
                    <button
                      onClick={() => {
                        playSound('click');
                        setPreferences(prev => ({ ...prev, styleMode: 'glamorous' }));
                      }}
                      className={`py-1 rounded-lg text-[10px] font-sans font-bold flex items-center justify-center border transition-all cursor-pointer ${
                        preferences.styleMode === 'glamorous'
                          ? 'bg-neutral-100 text-neutral-900 border-white font-extrabold shadow-sm'
                          : 'bg-white/5 text-white/60 border-transparent hover:text-white'
                      }`}
                    >
                      <span>🌸 {isZh ? '甜系氛围' : 'Sweet Blush'}</span>
                    </button>
                  </div>
                </div>

                {/* Row 4: Expandable Simulation Controls Sub-panel */}
                <div className="flex flex-col gap-1 text-left border-t border-white/5 pt-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40 font-sans font-semibold tracking-wider flex items-center gap-1">
                      🔬 {isZh ? '自拍光感传感器（仿真调试区）' : 'Aesthetic Simulation Sandbox'}
                    </span>
                    <button
                      onClick={() => {
                        playSound('click');
                        setSimulatedScenario(simulatedScenario === 'none' ? 'dull' : 'none');
                      }}
                      className="text-[9.5px] text-[#A6B5FF] hover:text-white font-sans font-bold transition-colors"
                    >
                      {simulatedScenario !== 'none' ? (isZh ? '关闭传感器仿真' : 'Close Demo') : (isZh ? '打开传感器仿真 🔧' : 'Open Demo 🔧')}
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
                        <span className="tracking-tight font-medium text-[8.5px]">{isZh ? '相机自适应' : 'Auto Cam'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Collapse Button at the bottom of the deck */}
                <button
                  onClick={() => {
                    playSound('click');
                    setImmersiveMode(true); // Smooth collapse out of view
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
            Ⅲ. FLOATING SEMI-TRANSPARENT TUNER TAB (右侧半透明外露浮标 / 极简色板入口)
            ========================================================= */}
        {immersiveMode && (
          <button
            id="lumi-floating-tuner-tab"
            onClick={() => {
              playSound('click');
              setImmersiveMode(false); // Unfurls console panel
            }}
            className="fixed right-0 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/55 active:scale-95 border-l border-y border-white/10 pl-3 pr-2 py-4 rounded-l-2xl shadow-[0_0_20px_rgba(0,0,0,0.35)] backdrop-blur-md flex flex-col items-center gap-1.5 cursor-pointer transition-all duration-300 group z-40 animate-fade-in"
            title={isZh ? '打开调色控制台' : 'Open Tuning Console'}
          >
            <Sliders className="w-3.5 h-3.5 text-pink-300 group-hover:rotate-12 transition-transform" />
            
            <div className="flex flex-col items-center gap-0.5 my-1 text-[8px] font-extrabold tracking-normal uppercase text-white/90 select-none leading-none">
              {isZh ? (
                <>
                  <span className="mb-0.5 text-pink-200/90 font-sans">调</span>
                  <span className="text-pink-200/90 font-sans">色</span>
                </>
              ) : (
                <>
                  <span>T</span>
                  <span>U</span>
                  <span>N</span>
                  <span>E</span>
                </>
              )}
            </div>

            {/* Glowing active light color indicator */}
            <span 
              className="w-1.5 h-1.5 rounded-full animate-pulse shadow-md"
              style={{
                backgroundColor: activePreset.color,
                boxShadow: `0 0 8px ${activePreset.color}`
              }}
            />
          </button>
        )}

        {/* =========================================================
            Ⅳ. UNIFIED STABLE SHUTTER & GALLERY CONTROL ROW
            ========================================================= */}
        <div className="w-full flex items-center justify-between px-8 py-2 shrink-0 z-30 select-none">
          
          {/* Gallery Thumbnail (Statically aligned to left) */}
          <button
            onClick={() => {
              playSound('click');
              if (capturedPhotos.length === 0) {
                showToast(isZh ? '📸 拍摄第一张自拍照，即可开启专属胶片册！' : 'Take a photo first!');
                return;
              }
              setShowPhotoViewer(true);
            }}
            className="w-12 h-12 rounded-full bg-black/20 hover:bg-black/35 border border-white/10 flex items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 relative shadow-md backdrop-blur-md"
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
            /* External Softbox modal expansion trigger in Immersive Mode */
            <button
              onClick={() => {
                playSound('focus');
                setPhysicalGlowActive(true);
              }}
              className="w-12 h-12 rounded-full bg-black/20 hover:bg-black/35 text-white border border-white/10 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-md backdrop-blur-md"
              title={isZh ? '全屏外置柔光板' : 'Full Screen Softbox'}
            >
              <Maximize2 className="w-4.5 h-4.5 text-white animate-pulse" />
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

    </div>
  );
}
