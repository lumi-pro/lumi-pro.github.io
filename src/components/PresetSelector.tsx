/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { FillLightPreset } from '../types';
import { Check } from 'lucide-react';

interface PresetSelectorProps {
  presets: FillLightPreset[];
  activePreset: FillLightPreset;
  onSelect: (preset: FillLightPreset) => void;
  // If in Split Mode, active choices can be highlighted
  splitMode: 'none' | 'horizontal' | 'vertical';
  splitPresetLeft: FillLightPreset;
  splitPresetRight: FillLightPreset;
  onSelectSplitSide?: (preset: FillLightPreset, side: 'left' | 'right') => void;
  selectedSplitSide?: 'left' | 'right';
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
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Center active element on mount or change
  useEffect(() => {
    if (splitMode === 'none' && containerRef.current) {
      const activeEl = containerRef.current.querySelector(`[data-preset-id="${activePreset.id}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activePreset.id, splitMode]);

  return (
    <div className="w-full flex flex-col gap-2.5 px-1 py-1 select-none">
      {/* Mini Title & Active Vibe Quote Indicator */}
      <div className="flex items-center justify-between px-3">
        <span className="text-[11px] font-heading font-semibold tracking-widest text-[#9d8d8f] uppercase">
          {splitMode !== 'none'
            ? `分屏光源配置 · 正在调节 [${selectedSplitSide === 'left' ? '左侧 / 上侧' : '右侧 / 下侧'}]`
            : '单源补光预设 · Fill Presets'}
        </span>
        <span className="text-[10px] text-[#cca0ab] font-serif italic max-w-[65%] text-right truncate">
          {splitMode !== 'none'
            ? `左: ${splitPresetLeft.name} ✕ 右: ${splitPresetRight.name}`
            : activePreset.vibeQuote}
        </span>
      </div>

      {/* Preset Cards Container */}
      <div
        ref={containerRef}
        className="flex items-center gap-3 overflow-x-auto py-1 px-3 snap-x scrollbar-none no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {presets.map((preset) => {
          // Determine highlight depending on current mode configuration
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
              onClick={() => {
                if (splitMode === 'none') {
                  onSelect(preset);
                } else if (onSelectSplitSide) {
                  onSelectSplitSide(preset, selectedSplitSide);
                }
              }}
              className={`flex-shrink-0 w-20 flex flex-col items-center gap-2 snap-center transition-all duration-300 relative focus:outline-none`}
            >
              {/* Outer Aspect Box */}
              <div
                className={`w-full aspect-square rounded-[24px] p-1 shadow-sm transition-all duration-300 ${
                  isActive
                    ? 'border-2 scale-105'
                    : 'border-2 border-transparent opacity-65 hover:opacity-100 scale-95'
                }`}
                style={{
                  background: `linear-gradient(to bottom, ${preset.color}, ${preset.accentColor}dd)`,
                  borderColor: isActive ? '#2D2D2D' : 'transparent',
                }}
              >
                <div className="w-full h-full rounded-[18px] bg-white/40 flex items-center justify-center relative">
                  {isActive && (
                    <div className="w-5 h-5 rounded-full bg-[#2D2D2D] text-white flex items-center justify-center shadow-md animate-scale-in">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
                    </div>
                  )}
                </div>
              </div>

              {/* Preset Labels */}
              <div className="text-center">
                <p
                  className={`text-[11px] tracking-tight font-sans transition-colors font-medium ${
                    isActive ? 'text-[#2D2D2D] font-semibold' : 'text-[#2D2D2D]/60'
                  }`}
                >
                  {preset.name}
                </p>
                <span className="text-[8px] tracking-widest font-heading text-[#2D2D2D]/40 uppercase block">
                  {preset.englishName}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
