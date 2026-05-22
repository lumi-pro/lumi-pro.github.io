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
                className="flex-shrink-0 w-20 flex flex-col items-center gap-2 snap-center transition-all duration-300 relative focus:outline-none"
              >
                {/* Frosted Glass Floating Swatch Orb with White Halo */}
                <div
                  className={`w-14 h-14 rounded-full p-0.5 transition-all duration-300 relative ${
                    isActive
                      ? 'scale-110 border-2 border-white/95'
                      : 'border border-white/20 opacity-70 hover:opacity-100 scale-95'
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${preset.color} 30%, ${preset.accentColor || preset.color}dd 100%)`,
                    boxShadow: isActive 
                      ? `0 0 16px ${preset.accentColor || preset.color}, 0 0 8px rgba(255,255,255,0.8), inset 0 1px 2px rgba(255,255,255,0.4)`
                      : '0 4px 10px rgba(0,0,0,0.05), inset 0 1px 2px rgba(255,255,255,0.2)',
                  }}
                >
                  <div className="w-full h-full rounded-full bg-white/15 backdrop-blur-[2px] flex items-center justify-center relative">
                    {isActive && (
                      <div 
                        className="w-4.5 h-4.5 rounded-full bg-white text-[#2D2D2D] flex items-center justify-center shadow-lg animate-scale-in"
                        style={{ boxShadow: '0 2px 8px rgba(255,255,255,0.9)' }}
                      >
                        <Check className="w-2.5 h-2.5" strokeWidth={4} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Preset Labels */}
                <div className="text-center">
                  <p
                    className={`text-[11px] tracking-tight font-sans transition-colors font-medium ${
                      isActive ? 'text-[#2D2D2D] font-bold' : 'text-[#2D2D2D]/60'
                    }`}
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
