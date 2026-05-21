/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FillLightPreset } from './types';

export const FILL_LIGHT_PRESETS: FillLightPreset[] = [
  {
    id: 'cream',
    name: '奶油肌',
    englishName: 'Cream Skin',
    description: '自然暖光，细腻遮瑕，还原婴儿般温润气色',
    color: '#FFFDF0', // Very soft warm off-white cream
    colorRgb: { r: 255, g: 253, b: 240 },
    gradientFrom: 'from-[#FFFDF2]/60',
    gradientTo: 'to-[#FFEFCF]/30',
    intensity: 0.85,
    accentColor: '#E6C18C',
    vibeQuote: '柔和、微温，拍出通透奶油微光感',
    cameraFilterClass: 'contrast-105 brightness-110 sepia-[0.05] saturate-95',
  },
  {
    id: 'love',
    name: '初恋粉',
    englishName: 'First Love',
    description: '朦胧桃花，少女心动，像被晚风轻抚过脸庞',
    color: '#FFE2EC', // Gorgeous soft warm dusty pastel pink
    colorRgb: { r: 255, g: 226, b: 236 },
    gradientFrom: 'from-[#FFE6EE]/70',
    gradientTo: 'to-[#FFD2E1]/20',
    intensity: 0.70,
    accentColor: '#FF9EBB',
    vibeQuote: '氧气满满、甜美灵动，定格少女娇羞红晕',
    cameraFilterClass: 'contrast-102 brightness-[1.08] saturate-110 hue-rotate-[-5deg]',
  },
  {
    id: 'cold',
    name: '冷白皮',
    englishName: 'Ice White',
    description: '冷清孤傲，高级清冷，日光交碰的冰芒感',
    color: '#EBF4FF', // Crisp light polar blue-white
    colorRgb: { r: 235, g: 244, b: 255 },
    gradientFrom: 'from-[#EAF2FF]/80',
    gradientTo: 'to-[#D9E6FF]/20',
    intensity: 0.90,
    accentColor: '#8E9FFF',
    vibeQuote: '纯净高冷、去黄提亮，立现高级清亮冷感肌',
    cameraFilterClass: 'contrast-108 brightness-112 saturate-[0.88] hue-rotate-[5deg]',
  },
  {
    id: 'sunset',
    name: '日落橘',
    englishName: 'Sunset Glow',
    description: '夕阳熔金，复古胶片，模拟傍晚摄影棚侧逆光',
    color: '#FFF2E6', // Rich tender soft tangerine peach
    colorRgb: { r: 255, g: 242, b: 230 },
    gradientFrom: 'from-[#FFF4E8]/60',
    gradientTo: 'to-[#FFCC99]/30',
    intensity: 0.80,
    accentColor: '#FFA366',
    vibeQuote: '温柔治愈、极具胶片故事感，复刻慵懒午后暖阳',
    cameraFilterClass: 'contrast-102 brightness-[1.05] sepia-[0.12] saturate-[1.12] hue-rotate-[-3deg]',
  },
  {
    id: 'moonlight',
    name: '月光蓝',
    englishName: 'Moonlight',
    description: '微弱深海，朦胧空灵，寂静月夜下的清冷幽蓝',
    color: '#E0F2FE', // Intimate serene icy moonlight water blue
    colorRgb: { r: 224, g: 242, b: 254 },
    gradientFrom: 'from-[#E0F2FE]/60',
    gradientTo: 'to-[#BAE6FD]/20',
    intensity: 0.65,
    accentColor: '#38BDF8',
    vibeQuote: '寂静神秘、提神立体，深邃眼神光专属氛围',
    cameraFilterClass: 'contrast-[1.03] brightness-[1.04] saturate-[0.92] hue-rotate-[15deg] blur-[0.1px]',
  },
];
