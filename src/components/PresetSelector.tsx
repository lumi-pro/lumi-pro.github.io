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
  const [selectedCategory, setSelectedCategory] = useState<'classic' | 'master' | 'special'>('classic');

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
    { id: 'master', labelZh: '氛围', labelEn: 'Ambient', icon: '🔮' },
    { id: 'special', labelZh: '特调', labelEn: 'Special', icon: '💄' },
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

  return (
    <div className="w-full flex flex-col gap-1.5 px-2 py-2 select-none text-left">
      
      {/* ⚡ COMBINED DUAL CONTROLLER HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-1.5 pb-1.5 mb-1.5">
        
        {/* Right Part: Style Category Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-300 select-none uppercase tracking-wide font-sans font-bold">
            {isZh ? '系列:' : 'STYLE:'}
          </span>
          <div className="flex items-center gap-0.5 bg-black/45 p-0.5 rounded-lg border border-white/10">
            {categories.map((cat) => {
              const isCatActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all duration-200 cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none ${
                    isCatActive
                      ? 'bg-white text-zinc-950 shadow-md scale-[1.02]'
                      : 'text-zinc-200 bg-white/10 hover:text-white hover:bg-white/20'
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
              className="flex-shrink-0 w-13 flex flex-col items-center gap-1 snap-center transition-all duration-300 relative outline-none focus:outline-none focus:ring-0 active:outline-none active:ring-0 hover:outline-none"
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
                    ? 'inset 0 1px 1.5px rgba(255,255,255,0.4)'
                    : '0 3px 8px rgba(0,0,0,0.05), inset 0 1px 1.5px rgba(255,255,255,0.2)',
                }}
              >
                <div className="w-full h-full rounded-full bg-white/10 backdrop-blur-[2px] flex items-center justify-center relative">
                  {isActive && (
                    <div 
                      className="w-3.5 h-3.5 rounded-full bg-white text-neutral-800 flex items-center justify-center shadow-sm"
                      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
                    >
                      <Check className="w-2.5 h-2.5" strokeWidth={4} />
                    </div>
                  )}
                </div>
              </div>

              {/* Minimalist Swatch Tag */}
              <div className="text-center w-full truncate">
                <p
                  className={`text-[11.5px] font-bold tracking-wide font-sans transition-colors truncate ${
                    isActive ? 'text-white' : 'text-zinc-300 hover:text-white'
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



    </div>
  );
};
