/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { FillLightPreset } from '../types';
import { Check } from 'lucide-react';

interface PresetSelectorProps {
  presets: FillLightPreset[];
  activePreset: FillLightPreset;
  onSelect: (preset: FillLightPreset) => void;
  splitMode: 'none' | 'horizontal' | 'vertical';
  splitPresetLeft: FillLightPreset;
  splitPresetRight: FillLightPreset;
  onSelectSplitSide?: (preset: FillLightPreset, side: 'left' | 'right') => void;
  selectedSplitSide?: 'left' | 'right';
  isZh?: boolean;
  intensityLevel: 'soft' | 'normal' | 'rich' | 'studio';
  onIntensityChange: (level: 'soft' | 'normal' | 'rich' | 'studio') => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  presets,
  activePreset,
  onSelect,
  splitMode,
  splitPresetLeft,
  splitPresetRight,
  onSelectSplitSide,
  selectedSplitSide = 'left',
  isZh = true,
  intensityLevel,
  onIntensityChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'classic' | 'ambient' | 'studio'>('classic');

  // Synchronize category tab when preset changes
  useEffect(() => {
    const currentActive = splitMode === 'none'
      ? activePreset
      : (selectedSplitSide === 'left' ? splitPresetLeft : splitPresetRight);

    if (currentActive && currentActive.category) {
      setSelectedCategory(currentActive.category);
    }
  }, [activePreset.id, splitPresetLeft.id, splitPresetRight.id, splitMode, selectedSplitSide]);

  // Center active element on change
  useEffect(() => {
    if (containerRef.current) {
      const activeId = splitMode === 'none'
        ? activePreset.id
        : (selectedSplitSide === 'left' ? splitPresetLeft.id : splitPresetRight.id);

      const activeEl = containerRef.current.querySelector(`[data-preset-id="${activeId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activePreset.id, splitPresetLeft.id, splitPresetRight.id, splitMode, selectedSplitSide, selectedCategory]);

  const categories = [
    { id: 'classic', labelZh: '经典', labelEn: 'Classic', icon: '✨' },
    { id: 'ambient', labelZh: '高级', labelEn: 'Ambient', icon: '🔮' },
    { id: 'studio', labelZh: '专业', labelEn: 'Studio', icon: '📸' },
  ] as const;

  const intensities = [
    { id: 'soft', labelZh: '微柔', labelEn: 'Soft' },
    { id: 'normal', labelZh: '标准', labelEn: 'Normal' },
    { id: 'rich', labelZh: '浓郁', labelEn: 'Rich' },
    { id: 'studio', labelZh: '影棚', labelEn: 'Studio' },
  ] as const;

  const filteredPresets = presets.filter(preset => {
    const cat = preset.category || 'classic';
    return cat === selectedCategory;
  });

  const activeVibeText = splitMode !== 'none'
    ? `${isZh ? '左右分屏配方' : 'Split Light'} : ${splitPresetLeft.name} ✕ ${splitPresetRight.name}`
    : activePreset.vibeQuote;

  return (
    <div className="w-full flex flex-col gap-1.5 px-2 py-2 select-none text-left">
      
      {/* ⚡ COMBINED DUAL CONTROLLER HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-white/5 pb-1.5 mb-1">
        
        {/* Left Part: Intensity Controller */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-white/40 pl-0.5 select-none uppercase tracking-wide font-mono font-bold">
            {isZh ? '光感:' : 'LEVEL:'}
          </span>
          <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded-lg border border-white/5">
            {intensities.map((lvl) => {
              const isActive = intensityLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  onClick={() => onIntensityChange(lvl.id)}
                  className={`px-3 py-0.5 rounded-md text-[9.5px] font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'bg-indigo-600/90 text-white font-bold shadow-sm border border-indigo-400/25 scale-[1.02]'
                      : 'text-neutral-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <span>{isZh ? lvl.labelZh : lvl.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Part: Style Category Selector */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-white/40 select-none uppercase tracking-wide font-mono font-bold">
            {isZh ? '系列:' : 'STYLE:'}
          </span>
          <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded-lg border border-white/5">
            {categories.map((cat) => {
              const isCatActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-0.5 rounded-md text-[9.5px] font-semibold transition-all duration-200 cursor-pointer ${
                    isCatActive
                      ? 'bg-white/10 text-white border border-white/10 shadow-sm font-bold scale-[1.02]'
                      : 'text-neutral-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <span>{isZh ? cat.labelZh : cat.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Preset Swatches Core Container */}
      <div
        ref={containerRef}
        className="flex items-center gap-2 overflow-x-auto py-1 px-1 snap-x scrollbar-none no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {filteredPresets.map((preset) => {
          let isActive = false;
          if (splitMode === 'none') {
            isActive = preset.id === activePreset.id;
          } else {
            isActive =
              selectedSplitSide === 'left'
                ? preset.id === splitPresetLeft.id
                : preset.id === splitPresetRight.id;
          }

          return (
            <button
              key={preset.id}
              data-preset-id={preset.id}
              onClick={() => onSelect(preset)}
              className="flex-shrink-0 w-13 flex flex-col items-center gap-1 snap-center transition-all duration-300 relative focus:outline-none"
            >
              {/* Luxury Floating Swatch Orb */}
              <div
                className={`w-9 h-9 rounded-full p-0.5 transition-all duration-300 relative ${
                  isActive
                    ? 'scale-110 border-1.5 border-white'
                    : 'border border-white/15 opacity-70 hover:opacity-100 scale-95'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${preset.color} 30%, ${preset.accentColor || preset.color}dd 100%)`,
                  boxShadow: isActive 
                    ? `0 0 12px ${preset.accentColor || preset.color}, 0 0 6px rgba(255,255,255,0.85), inset 0 1px 1.5px rgba(255,255,255,0.4)`
                    : '0 3px 8px rgba(0,0,0,0.05), inset 0 1px 1.5px rgba(255,255,255,0.2)',
                }}
              >
                <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-[2px] flex items-center justify-center relative">
                  {isActive && (
                    <div 
                      className="w-3.5 h-3.5 rounded-full bg-white text-neutral-800 flex items-center justify-center shadow-lg"
                      style={{ boxShadow: '0 1px 5px rgba(255,255,255,0.9)' }}
                    >
                      <Check className="w-2.5 h-2.5" strokeWidth={4} />
                    </div>
                  )}
                </div>
              </div>

              {/* Minimalist Swatch Tag */}
              <div className="text-center w-full truncate">
                <p
                  className={`text-[9px] tracking-tight font-sans transition-colors font-medium truncate ${
                    isActive ? 'text-white font-semibold' : 'text-stone-400 hover:text-white'
                  }`}
                  title={preset.description}
                >
                  {preset.name}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tiny Status Indicator line at the bottom */}
      <div className="flex items-center justify-between px-1 pt-0.5 text-stone-200/40 text-[8px] font-mono select-none tracking-tight border-t border-white/[0.03]">
        <span>
          {splitMode !== 'none'
            ? `${isZh ? '分屏校准 · [双源微调]' : 'SPLIT MODE · CALIBRATED'}`
            : (isZh ? '高级人像漫反射 · LUMI AI' : 'PORTRAIT DIFFUSION // LUMI AI')}
        </span>
        <span className="font-serif italic text-right max-w-[65%] truncate">
          {activeVibeText}
        </span>
      </div>

    </div>
  );
};
