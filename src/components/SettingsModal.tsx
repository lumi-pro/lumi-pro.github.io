/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppSettings } from '../types';
import {
  X,
  Languages,
  ToggleLeft,
  Grid,
  Sparkles,
  HelpCircle,
  Activity,
  User,
  Heart,
  Vibrate,
  Camera,
} from 'lucide-react';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onClose: () => void;
  onOpenAnalytics: () => void;
  useSimulatedPortrait: boolean;
  onToggleSimulatedPortrait: (val: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onOpenAnalytics,
  useSimulatedPortrait,
  onToggleSimulatedPortrait,
}) => {
  const toggleSetting = (key: keyof AppSettings) => {
    onUpdateSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  const setLanguage = (lang: 'zh' | 'en') => {
    onUpdateSettings({
      ...settings,
      language: lang,
    });
  };

  const isZh = settings.language === 'zh';

  return (
    <div className="flex flex-col h-full bg-[#fdfafb] text-[#332a2c] font-sans overflow-hidden">
      {/* Settings Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-pink-100 bg-white shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#ff80a3]" />
          <h2 className="text-[15px] font-heading font-semibold text-neutral-800">
            {isZh ? 'Lumi Glow 参数设置' : 'Lumi Glow Settings'}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full bg-neutral-100 hover:bg-[#ffeaf0] text-[#ff80a3] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {/* Profile Card Mock */}
        <div className="bg-white rounded-2xl p-4 border border-[#ffd2df] shadow-sm flex items-center gap-3.5 relative overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-15px] text-pink-50 opacity-50 z-0">
            <Heart className="w-24 h-24 fill-current stroke-none" />
          </div>
          <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-[#ff80a3] font-serif font-semibold text-lg border border-pink-200 z-10 shrink-0">
            L
          </div>
          <div className="z-10">
            <h3 className="text-sm font-semibold text-neutral-800">Lumi VIP 会员 · 永久启用</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {isZh ? '“让普通环境，拍出满分氛围美”' : '“Aesthetic portraits in any light”'}
            </p>
          </div>
        </div>

        {/* 1. Camera Input Source Selection */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-heading font-semibold tracking-wider text-[#cca0ab] uppercase block px-1">
            {isZh ? '相机预览源设置' : 'Camera Input Mode'}
          </span>
          <div className="bg-white rounded-2xl border border-pink-100/60 overflow-hidden shadow-sm">
            <button
              onClick={() => onToggleSimulatedPortrait(false)}
              className={`w-full px-4 py-3 flex items-center justify-between border-b border-pink-50 transition-colors text-left ${
                !useSimulatedPortrait ? 'bg-[#ffeaf0]/25' : 'hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Camera className="w-4 h-4 text-neutral-500" />
                <div>
                  <p className="text-xs font-medium text-neutral-800">
                    {isZh ? '真实前置镜头' : 'Real Front-Facing Camera'}
                  </p>
                  <p className="text-[10px] text-neutral-400">调用系统硬件获取最真实光影状态</p>
                </div>
              </div>
              {!useSimulatedPortrait && <span className="w-2 h-2 rounded-full bg-[#ff80a3]" />}
            </button>

            <button
              onClick={() => onToggleSimulatedPortrait(true)}
              className={`w-full px-4 py-3 flex items-center justify-between transition-colors text-left ${
                useSimulatedPortrait ? 'bg-[#ffeaf0]/25' : 'hover:bg-neutral-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-neutral-500" />
                <div>
                  <p className="text-xs font-medium text-neutral-800">
                    {isZh ? '高保真自拍照模拟器' : 'High-Fidelity Simulated Model'}
                  </p>
                  <p className="text-[10px] text-neutral-400">使用专业 SODA 级自拍照作为柔光样片</p>
                </div>
              </div>
              {useSimulatedPortrait && <span className="w-2 h-2 rounded-full bg-[#ff80a3]" />}
            </button>
          </div>
        </div>

        {/* 2. Toggle Settings Section */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-heading font-semibold tracking-wider text-[#cca0ab] uppercase block px-1">
            {isZh ? '自拍相机功能' : 'Selfie Features'}
          </span>
          <div className="bg-white rounded-2xl border border-pink-100/60 divide-y divide-pink-50 overflow-hidden shadow-sm">
            {/* Mirror Camera */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-neutral-800">
                  {isZh ? '前置镜头镜像' : 'Mirror Selfie Stream'}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {isZh ? '还原镜子里的左右自然角度' : 'Flip rendering to natural mirror perspective'}
                </span>
              </div>
              <button
                onClick={() => toggleSetting('mirrorCamera')}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center focus:outline-none ${
                  settings.mirrorCamera ? 'bg-[#ff80a3]' : 'bg-neutral-200'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute ${
                    settings.mirrorCamera ? 'translate-x-[22px]' : 'translate-x-[2px]'
                  }`}
                />
              </button>
            </div>

            {/* Grid Helper lines */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-neutral-800">
                  {isZh ? '黄金九宫格辅助线' : 'Rule of Thirds Grid'}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {isZh ? '帮助女生自拍画面完美构图' : 'Compose professional selfie with lines'}
                </span>
              </div>
              <button
                onClick={() => toggleSetting('gridEnabled')}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center focus:outline-none ${
                  settings.gridEnabled ? 'bg-[#ff80a3]' : 'bg-neutral-200'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute ${
                    settings.gridEnabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
                  }`}
                />
              </button>
            </div>

            {/* Simulated Haptic */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-neutral-800">
                  {isZh ? 'Apple 系统音效与触感' : 'System Sound & Touch'}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {isZh ? '滑动调节或快门时提供清脆回响' : 'Sound response and vibration-pulse clicks'}
                </span>
              </div>
              <button
                onClick={() => toggleSetting('hapticFeedback')}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center focus:outline-none ${
                  settings.hapticFeedback ? 'bg-[#ff80a3]' : 'bg-neutral-200'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute ${
                    settings.hapticFeedback ? 'translate-x-[22px]' : 'translate-x-[2px]'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Internationalization Section */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-heading font-semibold tracking-wider text-[#cca0ab] uppercase block px-1">
            {isZh ? '通用设置' : 'General Options'}
          </span>
          <div className="bg-white rounded-2xl border border-pink-100/60 p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-800 flex items-center gap-2">
                <Languages className="w-4 h-4 text-neutral-400" />
                {isZh ? '界面语言' : 'App Language'}
              </span>
              <div className="flex rounded-lg bg-neutral-100 p-0.5 border border-neutral-200">
                <button
                  onClick={() => setLanguage('zh')}
                  className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                    isZh ? 'bg-white text-[#ff80a3] shadow-sm' : 'text-neutral-500'
                  }`}
                >
                  简体中文
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                    !isZh ? 'bg-white text-[#ff80a3] shadow-sm' : 'text-neutral-500'
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Minimal footer credits */}
        <div className="text-center py-4 border-t border-pink-50 text-[10px] text-neutral-400 flex flex-col items-center gap-1 mt-4">
          <span>Lumi Glow v1.0.0 (Atmosphere Special Edit)</span>
          <span>© 2026 App Store "Lumi Glow" Light Design Lab</span>
        </div>
      </div>
    </div>
  );
};
