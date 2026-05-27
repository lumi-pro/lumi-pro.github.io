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
  const [splitMode, setSplitMode] = useState<SplitMode>('none');
  const [splitPresetLeft, setSplitPresetLeft] = useState<FillLightPreset>(FILL_LIGHT_PRESETS[1]); // 初恋粉
  const [splitPresetRight, setSplitPresetRight] = useState<FillLightPreset>(FILL_LIGHT_PRESETS[2]); // 冷白皮
  const [selectedSplitSide, setSelectedSplitSide] = useState<'left' | 'right'>('left');

  const [brightness, setBrightness] = useState<number>(0.85); // 15% to 100%
  const [softness, setSoftness] = useState<number>(0.65); // Color saturation/dilution
  const [intensityLevel, setIntensityLevel] = useState<'soft' | 'normal' | 'rich' | 'studio'>('normal');

  // AI Ambient Light Recommendation Engine States
  const [ambientStats, setAmbientStats] = useState<{ brightness: number; warmth: number }>({
    brightness: 110,
    warmth: 1.0,
  });
  const [simulatedScenario, setSimulatedScenario] = useState<string>('none');
  const [isAiPanelExpanded, setIsAiPanelExpanded] = useState<boolean>(false);

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

  const getRecommendation = (bright: number, warm: number) => {
    // 1. Determine if it is night time
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 18 || currentHour < 6;

    // Day/Night
    const detectedTime = isNight 
      ? (isZh ? '深夜夜色 🌌' : 'Late Night 🌌') 
      : (isZh ? '明净日光 ☀️' : 'Daylight Hour ☀️');

    // Resolve the simulated active scenario or fallback to physical camera sliders:
    let effectiveScenId = simulatedScenario;
    if (effectiveScenId === 'none') {
      if (bright > 165) {
        effectiveScenId = 'daylight_bright';
      } else if (warm > 1.35) {
        effectiveScenId = bright < 90 ? 'dark_warm' : 'warm_restaurant';
      } else if (warm < 0.85 && bright < 95) {
        effectiveScenId = 'night_cool';
      } else {
        effectiveScenId = 'normal';
      }
    }

    let presetId = 'cream';
    let labelZh = '原生亮肤';
    let labelEn = 'Original Luster';

    // Human characteristic dimensions
    let pSkinTempZh = '';
    let pSkinTempEn = '';
    let pBrightnessZh = '';
    let pBrightnessEn = '';
    let pShadowsZh = '';
    let pShadowsEn = '';
    let pDullnessZh = '';
    let pDullnessEn = '';
    let pMakeupZh = '';
    let pMakeupEn = '';
    let p3DZh = '';
    let p3DEn = '';
    let pEyeShadowZh = '';
    let pEyeShadowEn = '';

    // Background characteristic dimensions
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

    // Real-time Neural Process Logs (Steps)
    let stepsZh: string[] = [];
    let stepsEn: string[] = [];

    let baseAdviceZh = '';
    let baseAdviceEn = '';

    // Legacy parameters for backward-compatibility support
    let detectedBright = '';
    let detectedWarm = '';
    let detectedBg = '';
    let detectedSkin = '';
    let detectedPlace = '';

    // Determine current makeup style based on aesthetic preferences chosen
    const makeupStyleZh = preferences.styleMode === 'glamorous' 
      ? '精致蜜桃腮红浓妆' 
      : preferences.styleMode === 'cool_tech' 
      ? '高级裸感冷调御姐妆' 
      : '裸肌感日常元气淡妆';
    const makeupStyleEn = preferences.styleMode === 'glamorous' 
      ? 'Glamorous peach blush' 
      : preferences.styleMode === 'cool_tech' 
      ? 'Premium nude cool makeup' 
      : 'Fresh natural light makeup';

    // Core rule matrix targeting "how to make the user look gorgeous!"
    if (effectiveScenId === 'dark_warm') {
      presetId = 'cold';
      labelZh = '智能消黄';
      labelEn = 'Tack Amber';

      pSkinTempZh = '面色受射灯黄色杂光溢出影响，显著泛黄暗沉';
      pSkinTempEn = 'Complexion warm yellowed by warm reflections';
      pBrightnessZh = '微弱光线，面容整体处于暗影欠曝区间';
      pBrightnessEn = 'Severely underexposed and dim overall';
      pShadowsZh = '鼻侧、下巴区伴随较重的暖色侧向投影';
      pShadowsEn = 'Heavy yellow side shadows detected';
      pDullnessZh = '大量暖黄杂色堆积，引起皮肤通透度丧失，显暗沉';
      pDullnessEn = 'Low transparency, heavy yellow pigment dullness';
      pMakeupZh = makeupStyleZh;
      pMakeupEn = makeupStyleEn;
      p3DZh = '高对比度杂色阴影破坏面部骨相匀称度';
      p3DEn = 'Irregular color tone compromises symmetry';
      pEyeShadowZh = '眼周伴随发黄发暗的面颊大面积阴影及泪沟';
      pEyeShadowEn = 'Strong under-eye shadow circles & crease line';

      bgLampZh = '检测到大瓦数高热度暖黄顶灯投射';
      bgLampEn = 'Cozy warm yellow high-noon spotlight spill';
      bgWallZh = '白色反光墙面已被杂光污染折射为金黄色';
      bgWallEn = 'Plain drywall stained by gold background glow';
      bgNightZh = '属于低能见度暗室或夜里暖光环境';
      bgNightEn = 'Lowlight nighttime warm indoor setting';
      bgInOutZh = '中低照度室内封闭空间';
      bgInOutEn = 'Enclosed interior lounge room';
      bgTempZh = '重度暖黄色温 (3200K高暖色频段)';
      bgTempEn = 'Extreme warm amber shift (approx 3200K)';

      baseAdviceZh = '检测到您正处于低亮暖黄光线中，肤色因偏黄而显得黯淡。已为您一键注入冷色调「冷白皮」补光源，完美对冲消暗，抚平因顶光产生的眼袋阴影，重塑白皙高级清冷脸！';
      baseAdviceEn = 'Dim warm lighting detected causing dull skin. Formulized crisp "Ice White" active correction to offset yellow tint and blend under-eye bags, granting clean, premium cool-toned elegance.';

      stepsZh = [
        '检测到强烈的室内硬光及高功率暖黄顶灯反射',
        '肤色泛黄气色差，双眼眶下落微弱黑眼圈与眼睑阴影',
        '自动应用「冷白皮」补水白光谱，中和暗黄杂色，立现高级清冷肌'
      ];
      stepsEn = [
        'Harsh indoor warm yellow ceiling spotlight spill detected',
        'Complexion yellowed and flat, fatigue shadow bags cast under eyes',
        'Formulated custom "Ice White" spectrum to neutralize amber, locking pristine clean cool complexion'
      ];

      detectedBright = isZh ? '环境过暖' : 'Ambient Too Warm';
      detectedWarm = isZh ? '高热暖黄' : 'High Warm Amber';
      detectedBg = isZh ? '橘黄偏色背景' : 'Yellow Stained Canvas';
      detectedSkin = isZh ? '暗黄无神且深色黑眼圈' : 'Dull skin & dark eye-bags';
      detectedPlace = isZh ? '暖黄密闭室内' : 'Dim Yellow Indoor';

    } else if (effectiveScenId === 'dull' || (simulatedScenario === 'dull' && effectiveScenId === 'none')) {
      presetId = 'cream';
      labelZh = '元气提亮';
      labelEn = 'Skin Energizer';

      pSkinTempZh = '中性偏温冷，脸部稍微苍白，欠缺血色';
      pSkinTempEn = 'Neutral cool pale tone, lacks healthy flush';
      pBrightnessZh = '常态照度均匀，但皮肤表面缺乏珠光光泽';
      pBrightnessEn = 'Uniform light level but lacks skin lusters';
      pShadowsZh = '鼻唇区、唇周等轻质细小灰暗阴影';
      pShadowsEn = 'Minor downward flat crease lines';
      pDullnessZh = '因熬夜略显暗沉，面泛青灰无光';
      pDullnessEn = 'Slightly fatigued & tired grayish shade';
      pMakeupZh = makeupStyleZh;
      pMakeupEn = makeupStyleEn;
      p3DZh = '面部明暗立体过渡偏于扁平';
      p3DEn = 'Flat features, lacks spatial dimension';
      pEyeShadowZh = '眼角有少许青色疲累感黑眼圈';
      pEyeShadowEn = 'Minor fatigued bluish eye bags';

      bgLampZh = '普通荧光灯散漫辐射，无刺眼集中点光源';
      bgLampEn = 'No harsh point lights, generic diffusion';
      bgWallZh = '白色亚光墙面，大范围反白折射冷光';
      bgWallEn = 'Off-white wall reflections causing cold cast';
      bgNightZh = '中规中矩的平常室内白昼';
      bgNightEn = 'Normal daytime indoor shadow backdrop';
      bgInOutZh = '常规中照度平稳室内空间';
      bgInOutEn = 'Standard indoor workspace suite';
      bgTempZh = '温和中冷色温 (5600K标准自然色)';
      bgTempEn = 'Neutral comfortable natural point (5600K)';

      baseAdviceZh = '当前大面积白墙反射导致面容略显灰涩疲惫。已为您推荐温润「奶油肌」填充光源，新增 15% 散光漫反射，轻轻抹平脸上细微阴影，恢复婴儿般白里透红的生机气色！';
      baseAdviceEn = 'Flat off-white background detected making face pale. Customized cohesive "Cream Skin" light preset with 15% expanded diffusion to fill flat shadows for a plump, organic and bouncy fresh look.';

      stepsZh = [
        '大范围白墙漫反射大块冷光，肤色因灰白而显得没精神',
        '面部稍微暗沉发灰，眼眶下方呈疲沉状态，阴影轮廓偏弱',
        '极速注入细腻暖白「奶油肌」色彩填充，亮化腮红弧度，恢复饱满原生元气'
      ];
      stepsEn = [
        'White walls reflecting flat cold cast, skin appears pale and grayish',
        'Complexion shows minor skin fatigue with flattened face structures',
        'Adjusted soft warm "Cream Skin" diffuse level, filling face with bouncy light'
      ];

      detectedBright = isZh ? '光影偏灰' : 'Grayish Light';
      detectedWarm = isZh ? '中冷淡色' : 'Cool Gray Cast';
      detectedBg = isZh ? '素雅白墙背景' : 'Plain Off-white Wall';
      detectedSkin = isZh ? '因疲态略显暗沉' : 'Fatigued & Slightly Dull';
      detectedPlace = isZh ? '平稳室内空间' : 'Standard Indoor';

    } else if (effectiveScenId === 'warm_restaurant') {
      presetId = 'sunset';
      labelZh = '慵懒大片';
      labelEn = 'Cinema Vibe';

      pSkinTempZh = '莹润剔透的黄金蜜桃暖色温';
      pSkinTempEn = 'Beautiful honey-peach warm golden tone';
      pBrightnessZh = '画面黄金明暗半交碰，高低对比分明';
      pBrightnessEn = 'Stunning golden division highlight';
      pShadowsZh = '颧骨下凹部、鼻旁影区呈立体骨感过渡';
      pShadowsEn = 'Beautiful smooth organic sculpted warm shadows';
      pDullnessZh = '精神格外饱满，折射温润柔和质感';
      pDullnessEn = 'Glowing with organic clear reflections';
      pMakeupZh = makeupStyleZh;
      pMakeupEn = makeupStyleEn;
      p3DZh = '极佳的自来逆侧射影，面部骨相饱满鲜活';
      p3DEn = 'Side golden beams highlight deep facial lines';
      pEyeShadowZh = '眼下泪沟被香槟金色暖光柔美隐去';
      pEyeShadowEn = 'Eye shadows well-blended with soft bronze hue';

      bgLampZh = '检测到餐厅温馨氛围吊灯或下午茶斜晖暖光';
      bgLampEn = 'Cozy dining ambient or lazy sunset sunset beams';
      bgWallZh = '质感暖褐色奢华装饰面或木纹墙底';
      bgWallEn = 'Wooden textures or decorative luxury backdrop';
      bgNightZh = '属于慢生活的晚歇约会格调背景';
      bgNightEn = 'Evening relaxing dining lounge background';
      bgInOutZh = '高质素浪漫室内场所';
      bgInOutEn = 'Atmospheric lounge table indoor';
      bgTempZh = '温馨暖色温段 (2800K~3400K香槟度)';
      bgTempEn = 'Warm cozy temperature range (approx 3000K)';

      baseAdviceZh = '您宛如置身电影般的浪漫夕阳和煦暖辉中。无需用滤镜遮掩自然阴影！推荐偏暖粉橙调「日落橘」光晕，完美融合骨相轮廓，打造充满高级胶片质感与故事张力的艺术自拍！';
      baseAdviceEn = 'Golden hour cozy dinner ambiance spotted. Recommends customized peach-orange "Sunset Glow" fill light to organically contour eyes and cheek shadow lines, capturing slow-sunset editorial films.';

      stepsZh = [
        '周围笼罩在温馨蜡烛与温馨射灯伴随的奢华金橙暖调里',
        '骨相由于夕阳侧逆光富有绝佳明暗度，润泽无暗沉瑕疵',
        '交叠融合「日落橘」暖调补光，复刻经典斜阳，尽显慵懒迷人意境'
      ];
      stepsEn = [
        'Surroundings bathed in warm candle light and golden background glow',
        'Portrait lines are extremely clear with elegant smooth nose reflections',
        'Decorated with nostalgic sepia "Sunset Glow" to expand cinematic narrative warmth'
      ];

      detectedBright = isZh ? '温馨明和' : 'Cozy Light';
      detectedWarm = isZh ? '暖黄色调' : 'Warm Orange/Yellow';
      detectedBg = isZh ? '温馨暖色背景' : 'Ambiance Gold Backdrop';
      detectedSkin = isZh ? '健康高红润，立体分明' : 'Moisturized & clear contours';
      detectedPlace = isZh ? '格调雅致餐室' : 'Atmospheric Lounge';

    } else if (effectiveScenId === 'night_cool') {
      presetId = 'moonlight';
      labelZh = '眼神点亮';
      labelEn = 'Eye Sparkle';

      pSkinTempZh = '偏向深暗幽冷、灰黑带蓝的清冷肤色';
      pSkinTempEn = 'Cobalt deep night gray skin undertone';
      pBrightnessZh = '画面超低能见度，轮廓细节严重丧失';
      pBrightnessEn = 'Deep darkness, details severely shadowed';
      pShadowsZh = '暗区遮盖了大范围额骨与颌下三角翼线';
      pShadowsEn = 'Massive dark area under-chin and eyebrows';
      pDullnessZh = '低质光影使整个人像丧失光彩，眼神无神';
      pDullnessEn = 'Deprived of skin shine, eyes lack energy';
      pMakeupZh = makeupStyleZh;
      pMakeupEn = makeupStyleEn;
      p3DZh = '面容深陷进墨黑背景中，被整体虚焦压缩';
      p3DEn = 'Face elements blend in deep shadows';
      pEyeShadowZh = '眼下方大范围泛青发青的熬夜疲惫黑眼圈';
      pEyeShadowEn = 'Pronounced dark circles with cool blue color cast';

      bgLampZh = '远处微弱霓虹闪烁或窗外少许深夜光斑';
      bgLampEn = 'Faint twinkling urban city blue glow';
      bgWallZh = '黑漆寂夜、阳台墨空或深冷幽蓝色背景';
      bgWallEn = 'Plain deep pitch black night outdoors';
      bgNightZh = '属于典型的深夜，四周低漫射空间';
      bgNightEn = 'Late midnight silent environment';
      bgInOutZh = '深夜室外露空或静谧暗卧房';
      bgInOutEn = 'Deep night outdoor street or dim dark room';
      bgTempZh = '清冷冰凉冷温段 (7500K极高色温)';
      bgTempEn = 'Ice blue cobalt temperature cast (7500K)';

      baseAdviceZh = '当前处于深夜幽静的黑夜冷光中。调高硬白强光会刺眼且显脸油，已为您定制微蓝色温「月光蓝」贴片，温柔消除发青眼圈，给清幽冷暗里在双眼皮点亮纯净夺目的眼神光！';
      baseAdviceEn = 'Deep night cold darkness detected. Lumi avoided stark blinding flare and selected serene "Moonlight" cool halo to blur dark bags and reflect a glowing, romantic spark in your eyes.';

      stepsZh = [
        '身处深夜冰凉幽暗深色环境，被墨色幽青底调覆盖',
        '面部晦暗无神，眼尾泪沟由于低照度显现出沉闷青灰色黑眼圈',
        '注入不晃眼的「月光蓝」浅幽微弱光束，聚焦清朗视线，让双眼流盼神采'
      ];
      stepsEn = [
        'Detected deep quiet midnight environment with extremely low illumination',
        'Complexion dry and underexposed, accompanied by bluish under-eye circles',
        'Fitted precise cozy "Moonlight" light overlay to melt eye bags, locking gorgeous eye sparkles'
      ];

      detectedBright = isZh ? '夜暮低能' : 'Midnight Dark';
      detectedWarm = isZh ? '冷色蓝调' : 'Cool Blue Temp';
      detectedBg = isZh ? '深邃冷灰背景' : 'Icy Deep Cobalt Background';
      detectedSkin = isZh ? '低光导致脸色无神' : 'Lacks glow & pale dark shadow';
      detectedPlace = isZh ? '幽美深夜环境' : 'Deep Night Outdoor';

    } else if (effectiveScenId === 'daylight_bright') {
      presetId = 'love';
      labelZh = '红润防暴';
      labelEn = 'Rosy Balance';

      pSkinTempZh = '高明度中性清亮红润底质';
      pSkinTempEn = 'High brightness natural neutral clean skin tone';
      pBrightnessZh = '光通量极其饱满，正面主光直射较强';
      pBrightnessEn = 'Abundant sunshine, near overexposure range';
      pShadowsZh = '局部硬光反射，多见于颧骨、鼻尖顶光面';
      pShadowsEn = 'Harsh solar peak spot glare';
      pDullnessZh = '润透无暇，面颊表皮细胞质感极其剔透';
      pDullnessEn = 'Squeaky clean, outstanding clarity';
      pMakeupZh = makeupStyleZh;
      pMakeupEn = makeupStyleEn;
      p3DZh = '主光源垂直照度过大，使得五官少许向平面压缩';
      p3DEn = 'Sunlight glare slightly compresses facial depth';
      pEyeShadowZh = '眼袋及泪沟区域被太阳光完全透反消除';
      pEyeShadowEn = 'Eye circles perfectly vaporized by sunshine';

      bgLampZh = '大红外日光极昼投射，采光面积充盈';
      bgLampEn = 'Full sunshine beam coverage';
      bgWallZh = '室外绿植林木、湛蓝晴天或亮色建筑物外立面';
      bgWallEn = 'Glistening outdoor garden or sky background';
      bgNightZh = '典型的明亮充沛白天';
      bgNightEn = 'Vibrant daylight midday hours';
      bgInOutZh = '视野开阔的户外场景';
      bgInOutEn = 'Open-air clear outdoor area';
      bgTempZh = '充溢原生日光温段 (5800K阳光原生态)';
      bgTempEn = 'Natural daylight balanced status (approx 5800K)';

      baseAdviceZh = '户外日光极其充溢白哲。但猛烈直射容易使面相缺乏气色红润、五官偏扁平。特意为您调配自带心动红晕「初恋粉」辅色漫反射，精妙收拢过曝高亮，由内而外透显初恋般的粉嫩绯红！';
      baseAdviceEn = 'Glistening daylight detected. High intensity daylight can wash out contours, hence Lumi recommended warm peach "First Love" schema to soft-focus solar highlights and deposit a gorgeous natural pink blush.';

      stepsZh = [
        '大面积室外强烈自然天光投射，整体呈现超强饱满照度环境',
        '皮肤通透亮白，但由于大平光五官骨相缺乏过渡梯度、粉嫩红润感较少',
        '自适应调入「初恋粉」梦幻红润辅照，中高亮压平并红润飞颊，定格初恋少女感'
      ];
      stepsEn = [
        'Excessive daylight beams detected with open-air sunlit background',
        'Complexion clear and radiant but slightly flat, missing soft color life',
        'Applied dreamy rose "First Love" light profile to absorb wild glare, yielding fresh sweet blush'
      ];

      detectedBright = isZh ? '光照爆满' : 'Ultra Bright';
      detectedWarm = isZh ? '均衡日光' : 'Daylight Balanced';
      detectedBg = isZh ? '野外自然光背景' : 'Natural Open Background';
      detectedSkin = isZh ? '日光饱润，局部过曝' : 'Highly exposed under sunlight';
      detectedPlace = isZh ? '明朗晴空户外' : 'Sunny Outdoor Arena';

    } else {
      // Normal Uniform Cozy Indoor
      presetId = 'cream';
      labelZh = '原生亮嫩';
      labelEn = 'Natural Soft';

      pSkinTempZh = '适中均衡，暖白偏米黄色感';
      pSkinTempEn = 'Balanced comfortable warm-neutral skin frame';
      pBrightnessZh = '各区域采光十分和谐匀称，细节极为丰满';
      pBrightnessEn = 'Cohesive perfect skin illuminance density';
      pShadowsZh = '仅侧翼骨线及嘴部下凹区带有轻微柔和软影';
      pShadowsEn = 'Soft gradient standard shadow traces';
      pDullnessZh = '中等净透，面颊有些微普通灰调累积';
      pDullnessEn = 'Normal smooth layer with minor flat gray';
      pMakeupZh = makeupStyleZh;
      pMakeupEn = makeupStyleEn;
      p3DZh = '面部五官过渡舒缓、左右两侧骨骼匀对称';
      p3DEn = 'Symmetric profile, normal clear face lines';
      pEyeShadowZh = '眼角下方有非常隐蔽的常规轻薄暗网影';
      pEyeShadowEn = 'Barely visible normal natural eye line shadow';

      bgLampZh = '室内LED天花灯漫漫反光，柔和宜人';
      bgLampEn = 'Cozy LED ceiling illumination';
      bgWallZh = '温馨舒适的室内居室白粉墙面';
      bgWallEn = 'Minimalist light gray interior apartment drywall';
      bgNightZh = '日光通过纱帘射入的安静百搭生活场景';
      bgNightEn = 'Gentle home window shade daytime backdrop';
      bgInOutZh = '常规明亮平柔的室内客厅/卧室';
      bgInOutEn = 'Sober light-balanced interior';
      bgTempZh = '和润中性浅白色温频 (4500K标准家政光)';
      bgTempEn = 'Balanced normal cozy temp (approx 4500K)';

      baseAdviceZh = '当前室内光照温和常态。已为您选配舒适柔亮「奶油肌」自适应温光，配合微弱漫光削平脸中部不平伏的细小泪沟。轻松按下它，皮肤宛若无瑕婴儿，直出温润天生好气色！';
      baseAdviceEn = 'Balanced indoor lighting detected. Recommended iconic Warm Soft "Cream Skin" to erase micro nose folds and supply smooth velvet lusters, granting an effortless healthy and natural portrait look.';

      stepsZh = [
        '检测到温和协调的标准室内环境光影，反射纯色亚光灰墙面',
        '面部气色均匀挺括，但神态稍微有一丝常规单调，脸颊弧度较平淡',
        '搭载最温顺的经典「奶油肌」补色彩，微补温光高亮，磨砂淡化毛孔粗糙'
      ];
      stepsEn = [
        'Standard uniform stable light detected, bouncing on light gray studio back',
        'Face contours look normal, skin is symmetric but slightly plain',
        'Embedded "Cream Skin" preset to enrich cheeks with fine warm-glow pearl highlights'
      ];

      detectedBright = isZh ? '照度均衡' : 'Uniform Ambient';
      detectedWarm = isZh ? '中性温顺' : 'Neutral Temperature';
      detectedBg = isZh ? '低饱和素雅灰' : 'Neutral Pastel Gray';
      detectedSkin = isZh ? '肤色相对润泽' : 'Skin state hydrated';
      detectedPlace = isZh ? '普通舒适室内' : 'Cozy Indoor Space';
    }

    // 3. User Aesthetic Preference Adjustment Overlay!
    let memoryEffect = '';
    const favPreset = FILL_LIGHT_PRESETS.find(p => p.id === preferences.favoritePresetId);
    const favName = favPreset ? (isZh ? favPreset.name : favPreset.englishName) : '';

    if (preferences.styleMode === 'cool_tech' && presetId !== 'cold' && presetId !== 'moonlight') {
      presetId = 'cold';
      baseAdviceZh = `【已结合自拍习惯调校】感应到您近期在 Lumi 中高频喜好「高级冷色」美学偏爱。传感器已自动将策略偏移为「冷白皮」，直接拍照，已过滤多余繁杂橘黄杂光，立现高冷白皙御姐肤！`;
      baseAdviceEn = `[Aesthetic Bias Applied] Knowing your signature taste is cool-toned, Lumi automatically calibrated recommendation to ice-light "Ice White" active filter, filtering warm environment stains.`;
      memoryEffect = isZh ? '✦ 已依偏好转换为高级冷感自拍对冲配方' : '✦ Balanced for Cold High-Fashion preference';

      stepsZh = [
        stepsZh[0],
        isZh ? '💡 【用户偏向激活】捕获到您近期热爱「高级冷色」自拍偏好色彩' : '💡 [Bias Active] User loves cold high-fashion photo style',
        isZh ? '已特别转换为冷感「冷白皮」补调，多层溢增蓝白补光以呈现极致高冷感' : 'Shifted target palette to crisp "Ice White" filler to satisfy cool-tone elegance styling'
      ];
      stepsEn = [
        stepsEn[0],
        '💡 [Bias Active] User loves cool modern picture aesthetic',
        'Shifted primary tuning parameters to "Ice White" to emphasize colder premium luxury complexions'
      ];
    } else if (preferences.styleMode === 'glamorous' && presetId !== 'love') {
      presetId = 'love';
      baseAdviceZh = `【已结合自拍习惯调校】感应到您当前追光偏好「甜美粉嫩」。AI 已自动倾斜至梦幻暖甜的「初恋粉」补发光谱，消解平淡苍白，让脸颊自带粉润微醺妆底！`;
      baseAdviceEn = `[Aesthetic Bias Applied] To flatter your personalized sweetness expectation, Lumi has shifted recommendation to soft rose "First Love", erasing pale flat tones with dreamy sweet highlights.`;
      memoryEffect = isZh ? '✦ 已结合自拍习惯：浪漫粉嫩红脸自适应美学算法' : '✦ Style Bias adjusted to sweet First Love Pink';

      stepsZh = [
        stepsZh[0],
        isZh ? '💡 【用户偏向激活】检测到您的近期追光偏向「甜系氛围」美感习惯' : '💡 [Bias Active] Preference for romantic blush filters detected',
        isZh ? '已专门转换为「初恋粉」补光方案，温润漫射桃花微红，立现桃花粉嫩心动颜' : 'Translated default suggestion into cherry blossom rosy "First Love" light aura'
      ];
      stepsEn = [
        stepsEn[0],
        '💡 [Bias Active] Knowing your preference for sweet portrait aesthetics',
        'Overrode target schema with pinkish glow "First Love" to outline youthful flush'
      ];
    } else {
      if (preferences.favoritePresetId && favName) {
        memoryEffect = isZh 
          ? `✦ 契合您偏爱的「${favName}」补色 (近期已累计累计应用度达 ${preferences.usageCounts[preferences.favoritePresetId] || 1} 次)`
          : `✦ Harmonized with your staple 「${favName}」 preference`;
      } else {
        memoryEffect = isZh ? '✦ Lumi 已经为您感应完毕。点按快门即可，瞬间变好看！' : '✦ Lumi AI auto-applied, snapshot ready!';
      }
    }

    return {
      presetId,
      adviceZh: baseAdviceZh,
      adviceEn: baseAdviceEn,
      labelZh,
      labelEn,
      
      // Human characteristics
      portraitSkinTempZh: pSkinTempZh,
      portraitSkinTempEn: pSkinTempEn,
      portraitBrightnessZh: pBrightnessZh,
      portraitBrightnessEn: pBrightnessEn,
      portraitShadowsZh: pShadowsZh,
      portraitShadowsEn: pShadowsEn,
      portraitDullnessZh: pDullnessZh,
      portraitDullnessEn: pDullnessEn,
      portraitMakeupZh: pMakeupZh,
      portraitMakeupEn: pMakeupEn,
      portrait3DZh: p3DZh,
      portrait3DEn: p3DEn,
      portraitEyeShadowZh: pEyeShadowZh,
      portraitEyeShadowEn: pEyeShadowEn,

      // Background characteristics
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

      // Neural Step Log
      stepsZh,
      stepsEn,

      // Legacy compatibility tags
      detectedBright,
      detectedWarm,
      detectedBg,
      detectedSkin,
      detectedTime,
      detectedPlace,
      memoryEffect
    };
  };

  const recommendedInfo = getRecommendation(ambientStats.brightness, ambientStats.warmth);
  const recommendedPreset = FILL_LIGHT_PRESETS.find(p => p.id === recommendedInfo.presetId) || FILL_LIGHT_PRESETS[0];

  // ⚡ Lumi AI Auto-Tune / 自动追光 effect
  useEffect(() => {
    if (preferences.autoApply) {
      setActivePreset(recommendedPreset);
      
      // Personalize default intensity: blend preset's default with user's average!
      let targetB = recommendedPreset.intensity;
      targetB = parseFloat(((targetB * 0.35) + (preferences.averageBrightness * 0.65)).toFixed(2));
      
      // clamp targetB
      if (targetB < 0.25) targetB = 0.25;
      if (targetB > 1.0) targetB = 1.0;

      // Personalize default softness: blend user preference average softmax with default 0.65
      let targetS = 0.65;
      targetS = parseFloat(((targetS * 0.4) + (preferences.averageSoftness * 0.6)).toFixed(2));
      if (targetS < 0.15) targetS = 0.15;
      if (targetS > 0.95) targetS = 0.95;

      setBrightness(targetB);
      setSoftness(targetS);
    }
  }, [recommendedPreset.id, preferences.autoApply]);

  const handleApplyAiRecommendation = () => {
    playSound('focus'); // play mechanical cinematic dual-tone sound for magical feeling
    setActivePreset(recommendedPreset);
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
    handleRecordPresetUsage(preset.id);
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

    const baseShadow = `0 24px 60px -15px rgba(0,0,0,0.6), 0 0 ${shadowBlurRadius} ${15 * shadowIntensityMultiplier}px ${splitMode === 'none' ? activePreset.color : splitPresetLeft.color}a4`;
    
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
        <div className="w-full flex items-center justify-between mb-2 select-none">
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
            />

            {/* Split controls overlay */}
            {splitMode !== 'none' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-35 flex gap-1 bg-black/20 border border-white/10 backdrop-blur-md p-1 rounded-full shadow-xl scale-95">
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

          {/* 💡 Ambient & Operation Gesture Hint - Placed safely OUTSIDE the viewport frame */}
          <div className="mt-2.5 text-center pointer-events-none flex items-center gap-1.5 bg-black/15 border border-white/5 py-1 px-3.5 rounded-full text-[9.5px] text-stone-300 font-sans font-medium tracking-wide backdrop-blur-xs">
            <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
            <span>
              {isZh 
                ? '上下滑动调节补发光亮度 ｜ 左右滑动调节温润肤色' 
                : 'Swipe vertically for light level | Horizontally for warm-softness'}
            </span>
          </div>
        </div>

        {/* =========================================================
            Ⅱ. LUMI AI SELFIE AMBIANCE COMPANION CONTROL DECK
            ========================================================= */}
        <div className="w-full flex flex-col items-center mb-1.5 px-3 z-20">
          {!isAiPanelExpanded ? (
            /* 🌲 COMPACT COLLAPSED SINGLE-LINE LUXURY PILL */
            <div 
              onClick={() => {
                playSound('click');
                setIsAiPanelExpanded(true);
              }}
              className="w-full bg-black/20 hover:bg-black/30 border border-white/10 hover:border-indigo-500/35 px-3.5 py-2 rounded-2xl shadow-md backdrop-blur-md flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-99 group animate-fade-in"
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
                    }}
                    className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[9.5px] text-white font-sans font-bold shadow-md cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                  >
                    💡 {isZh ? '应用' : 'Apply'}
                  </button>
                )}
                <span className="text-[10.5px] text-indigo-300 font-bold hover:text-indigo-200 transition-colors pl-1 flex items-center gap-0.5 whitespace-nowrap">
                  {isZh ? '分析 ∨' : 'Analyses ∨'}
                </span>
              </div>
            </div>
          ) : (
            /* 🎨 EXPANDED HIGH-FIDELITY ANALYTICAL DASHBOARD */
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
                      {isZh ? 'Lumi AI 氛围美学伴侣' : 'Lumi AI Ambiance Companion'}
                      <span className="text-[9.5px] bg-white/5 text-white/40 group-hover/hdr:text-indigo-300 group-hover/hdr:bg-indigo-500/10 transition-all font-sans px-1.5 py-0.5 rounded-md">
                        {isZh ? '收起 ︿' : 'Fold ︿'}
                      </span>
                    </span>
                    <span className="text-[9px] text-[#A6B5FF] font-medium tracking-tight">
                      {isZh ? '自适应多准则美学感应与习惯记忆' : 'Multi-sensor aesthetic tuning'}
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

              {/* Row 1: Real-time Multi-Dimensional AI Aesthetic Radar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left mt-0.5">
                {/* Column 1: Portrait Dimensions */}
                <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 border-b border-white/5 pb-1">
                    <span className="text-indigo-300 text-[10px]">👤</span>
                    <span className="text-[9.5px] font-semibold text-white/95 uppercase tracking-wider">{isZh ? '人像特征诊断' : 'Portrait Metrics'}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-[9px] text-white/70">
                    <div className="flex justify-between items-center gap-1.5 bg-black/10 px-1.5 py-0.5 rounded">
                      <span className="text-white/45">{isZh ? '肤色温感' : 'Skin Temperature'}</span>
                      <span className="font-medium text-[#A6B5FF] truncate max-w-[130px]">{isZh ? recommendedInfo.portraitSkinTempZh : recommendedInfo.portraitSkinTempEn}</span>
                    </div>
                    <div className="flex justify-between items-center gap-1.5 bg-black/10 px-1.5 py-0.5 rounded">
                      <span className="text-white/45">{isZh ? '面部照度' : 'Face Brightness'}</span>
                      <span className="font-medium text-[#A6B5FF] truncate max-w-[130px]">{isZh ? recommendedInfo.portraitBrightnessZh : recommendedInfo.portraitBrightnessEn}</span>
                    </div>
                    <div className="flex justify-between items-center gap-1.5 bg-black/10 px-1.5 py-0.5 rounded">
                      <span className="text-white/45">{isZh ? '下颌阴影' : 'Contour Shadows'}</span>
                      <span className="font-medium text-[#A6B5FF] truncate max-w-[130px]">{isZh ? recommendedInfo.portraitShadowsZh : recommendedInfo.portraitShadowsEn}</span>
                    </div>
                    <div className="flex justify-between items-center gap-1.5 bg-black/10 px-1.5 py-0.5 rounded border-l border-amber-500/35">
                      <span className="text-white/45">{isZh ? '疲劳暗沉' : 'Skin Fatigue'}</span>
                      <span className="font-medium text-amber-300 truncate max-w-[130px]">{isZh ? recommendedInfo.portraitDullnessZh : recommendedInfo.portraitDullnessEn}</span>
                    </div>
                    <div className="flex justify-between items-center gap-1.5 bg-black/10 px-1.5 py-0.5 rounded">
                      <span className="text-white/45">{isZh ? '自定妆容' : 'Selfie Makeup'}</span>
                      <span className="font-medium text-[#A6B5FF] truncate max-w-[130px]">{isZh ? recommendedInfo.portraitMakeupZh : recommendedInfo.portraitMakeupEn}</span>
                    </div>
                    <div className="flex justify-between items-center gap-1.5 bg-black/10 px-1.5 py-0.5 rounded">
                      <span className="text-white/45">{isZh ? '五官立体' : 'Facial 3D'}</span>
                      <span className="font-medium text-[#A6B5FF] truncate max-w-[130px]">{isZh ? recommendedInfo.portrait3DZh : recommendedInfo.portrait3DEn}</span>
                    </div>
                    <div className="flex justify-between items-center gap-1.5 bg-black/10 px-1.5 py-0.5 rounded">
                      <span className="text-white/45">{isZh ? '黑眼圈重影' : 'Under-eye Shading'}</span>
                      <span className="font-medium text-[#A6B5FF] truncate max-w-[130px]">{isZh ? recommendedInfo.portraitEyeShadowZh : recommendedInfo.portraitEyeShadowEn}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Ambient / Background Dimensions */}
                <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 border-b border-white/5 pb-1">
                    <span className="text-indigo-300 text-[10px]">🌍</span>
                    <span className="text-[9.5px] font-semibold text-white/95 uppercase tracking-wider">{isZh ? '背景特征维度' : 'Spatial Backdrop'}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-[9px] text-white/70">
                    <div className="flex justify-between items-center gap-1.5 bg-black/10 px-1.5 py-0.5 rounded">
                      <span className="text-white/45">{isZh ? '暖黄顶灯' : 'Warm Spotlight'}</span>
                      <span className="font-medium text-indigo-200 truncate max-w-[130px]">{isZh ? recommendedInfo.bgLampZh : recommendedInfo.bgLampEn}</span>
                    </div>
                    <div className="flex justify-between items-center gap-1.5 bg-black/10 px-1.5 py-0.5 rounded">
                      <span className="text-white/45">{isZh ? '白墙反射' : 'Wall Reflection'}</span>
                      <span className="font-medium text-indigo-200 truncate max-w-[130px]">{isZh ? recommendedInfo.bgWallZh : recommendedInfo.bgWallEn}</span>
                    </div>
                    <div className="flex justify-between items-center gap-1.5 bg-black/10 px-1.5 py-0.5 rounded">
                      <span className="text-white/45">{isZh ? '夜景暗区' : 'Nocturnal Background'}</span>
                      <span className="font-medium text-indigo-200 truncate max-w-[130px]">{isZh ? recommendedInfo.bgNightZh : recommendedInfo.bgNightEn}</span>
                    </div>
                    <div className="flex justify-between items-center gap-1.5 bg-black/10 px-1.5 py-0.5 rounded">
                      <span className="text-white/45">{isZh ? '环境场所' : 'Location Zone'}</span>
                      <span className="font-medium text-indigo-400 truncate max-w-[130px]">{recommendedInfo.detectedPlace}</span>
                    </div>
                    <div className="flex justify-between items-center gap-1.5 bg-black/10 px-1.5 py-0.5 rounded">
                      <span className="text-white/45">{isZh ? '时间安排' : 'Time Dimension'}</span>
                      <span className="font-medium text-indigo-400 truncate max-w-[130px]">{recommendedInfo.detectedTime}</span>
                    </div>
                    <div className="flex justify-between items-center px-1.5 py-0.5 rounded">
                      <span className="text-white/45">{isZh ? '总体照度' : 'Illumination'}</span>
                      <span className="font-medium text-indigo-400 truncate max-w-[130px]">{recommendedInfo.detectedBright}</span>
                    </div>
                    <div className="flex justify-between items-center gap-1.5 bg-black/10 px-1.5 py-0.5 rounded">
                      <span className="text-white/45">{isZh ? '色温区间' : 'Color Temp'}</span>
                      <span className="font-medium text-indigo-400 truncate max-w-[130px]">{isZh ? recommendedInfo.bgTempZh : recommendedInfo.bgTempEn}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Aesthetic Preference Segment (My custom style mode) */}
              <div className="flex flex-col gap-1 text-left bg-black/10 rounded-xl p-2 border border-white/5">
                <span className="text-[10px] text-white/50 font-sans font-medium tracking-wide flex justify-between">
                  <span>🎨 {isZh ? '自拍美学倾向' : 'Selfie Taste Style'}</span>
                  <span className="text-[9px] text-indigo-300">{isZh ? '直接调校分析规则' : 'Alters tuning algorithm'}</span>
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

              {/* Row 3: Conversational Prompt Advice Bubble + Big action button */}
              <div className="bg-black/25 rounded-xl p-2.5 border border-indigo-500/10 flex flex-col gap-1.5 relative overflow-hidden text-left">
                <div className="absolute right-2 top-2 bg-indigo-500/5 text-[30px] leading-none select-none text-indigo-400 pointer-events-none opacity-20">
                  ✍️
                </div>

                {/* ⚡ REAL-TIME STEP-BY-STEP PROCESS DIAGNOSTIC LOGS */}
                <div className="flex flex-col gap-1 border-b border-white/5 pb-2 mb-1.5">
                  <span className="text-[8.5px] font-mono tracking-widest text-[#A6B5FF]/70 uppercase font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    Lumi AI Real-time Cognitive Diagnostics · 氛围美学追光过程诊断
                  </span>
                  <div className="flex flex-col gap-1 mt-1">
                    {(recommendedInfo.stepsZh || []).map((step, idx) => (
                      <div key={idx} className="flex gap-1.5 items-start text-[10.5px] text-stone-200/90 leading-tight animate-fade-in" style={{ animationDelay: `${idx * 120}ms` }}>
                        <span className="text-indigo-400 font-extrabold select-none">•</span>
                        <span>{isZh ? step : (recommendedInfo.stepsEn?.[idx] || step)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2 items-start pt-1">
                  <span className="text-xs select-none pt-0.5">🤖</span>
                  <div className="flex-1 flex flex-col min-w-0">
                    <p className="text-[10.5px] text-emerald-200/95 font-medium leading-relaxed font-sans bg-emerald-500/5 border-l-2 border-emerald-400/40 pl-2 rounded-r py-1">
                      {isZh ? recommendedInfo.adviceZh : recommendedInfo.adviceEn}
                    </p>
                    <p className="text-[9.5px] text-[#A6B5FF] font-sans font-semibold tracking-wide mt-1.5">
                      {recommendedInfo.memoryEffect}
                    </p>
                  </div>
                </div>

                {/* If Auto Apply is off, show the manual apply button */}
                {!preferences.autoApply && (
                  <button
                    onClick={() => {
                      playSound('focus');
                      setActivePreset(recommendedPreset);
                      showToast(isZh 
                        ? `✨ 已一键同步应用「${recommendedPreset.name}」极速补光色彩！` 
                        : `✨ Synchronized AI recommended 「${recommendedPreset.englishName}」!`
                      );
                    }}
                    className="w-full mt-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[10px] text-white font-sans font-bold tracking-wider cursor-pointer shadow-md transition-all active:scale-98"
                  >
                    💡 一键应用 AI 补光配方 ({isZh ? recommendedPreset.name : recommendedPreset.englishName})
                  </button>
                )}
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
                  setIsAiPanelExpanded(false);
                }}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] text-white/60 hover:text-white font-sans font-semibold border border-white/5 hover:border-white/10 transition-all cursor-pointer flex items-center justify-center gap-1 mt-1"
              >
                <span>{isZh ? '收起美学分析面板' : 'Collapse Analysis Panel'}</span>
                <span className="text-[8px] opacity-60">▲</span>
              </button>

            </div>
          )}
        </div>

        {/* Viewfinder Size Switcher (Gives back maximum screen glow) */}
        <div className="w-full flex justify-center mb-1 mt-1 z-20">
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

        {/* BOTTOM CONTROLS & COLOR SWATCHES */}
        <div className="w-full flex flex-col gap-1.5 mt-1">
          
          <div className="bg-black/25 backdrop-blur-md rounded-[20px] p-0.5 border border-white/10 shadow-lg">
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
              className="w-12 h-12 rounded-full bg-black/20 hover:bg-black/35 text-white border border-white/10 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-md backdrop-blur-md"
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
