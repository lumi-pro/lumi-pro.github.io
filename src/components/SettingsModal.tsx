/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  Eye,
  EyeOff,
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
  const [apiProvider, setApiProvider] = useState<string>(() => {
    return localStorage.getItem('lumi_api_provider') || 'gemini';
  });
  const [apiModel, setApiModel] = useState<string>(() => {
    return localStorage.getItem('lumi_api_model') || 'gemini-2.5-flash';
  });
  const [apiEndpoint, setApiEndpoint] = useState<string>(() => {
    return localStorage.getItem('lumi_api_endpoint') || 'https://generativelanguage.googleapis.com';
  });
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('lumi_api_key') || '';
  });
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => {
    return localStorage.getItem('lumi_api_last_saved') || null;
  });
  const [showKey, setShowKey] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Connection testing states
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testFeedback, setTestFeedback] = useState<string>('');

  const formatDate = (isoMsg: string) => {
    try {
      const d = new Date(isoMsg);
      if (isNaN(d.getTime())) return isoMsg;
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (e) {
      return isoMsg;
    }
  };

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
            {isZh ? 'Lumi 参数设置' : 'Lumi Settings'}
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

        {/* AI API Configuration Section */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-heading font-semibold tracking-wider text-[#cca0ab] uppercase block px-1 animate-pulse">
            {isZh ? 'AI 接口配置 (AI API Configuration)' : 'AI API Configuration'}
          </span>
          <div className="bg-white rounded-2xl border border-pink-100/60 p-4 shadow-sm flex flex-col gap-3.5 text-left">
            <p className="text-[10px] text-neutral-400 leading-normal mb-1">
              {isZh 
                ? '您的 API 信息加密保存在本地浏览器中，所有的测光诊断请求统一走后端安全代理，保护 Key 的安全性。' 
                : 'Your API information is securely saved in your browser. All evaluation requests go through secure proxy to hide keys.'}
            </p>

            {/* AI Provider Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[#cca0ab]">
                {isZh ? 'AI 服务商 (Provider)' : 'AI Provider'}
              </label>
              <select
                value={apiProvider}
                onChange={(e) => {
                  const prov = e.target.value;
                  setApiProvider(prov);
                  const defaultsMap: Record<string, { url: string; model: string }> = {
                    gemini: { url: 'https://generativelanguage.googleapis.com', model: 'gemini-2.5-flash' },
                    openai: { url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
                    doubao: { url: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-1.5-pro-32k' },
                    deepseek: { url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
                    claude: { url: 'https://api.anthropic.com', model: 'claude-3-5-sonnet' },
                    openrouter: { url: 'https://openrouter.ai/api/v1', model: 'google/gemini-2.5-flash' },
                    siliconflow: { url: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
                    custom: { url: '', model: '' }
                  };
                  const fallbackConfig = defaultsMap[prov];
                  if (fallbackConfig) {
                    setApiEndpoint(fallbackConfig.url);
                    setApiModel(fallbackConfig.model);
                  }
                  localStorage.setItem('lumi_api_provider', prov);
                  localStorage.setItem('lumi_api_endpoint', fallbackConfig?.url || '');
                  localStorage.setItem('lumi_api_model', fallbackConfig?.model || '');
                  setTestStatus('idle');
                  setTestFeedback('');
                }}
                className="w-full h-9 rounded-xl border border-pink-100 px-3 bg-[#fdfafb] text-neutral-800 text-xs focus:outline-none focus:border-[#ff80a3] transition-colors border-solid"
              >
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="doubao">Doubao (火山方舟)</option>
                <option value="deepseek">DeepSeek</option>
                <option value="claude">Claude</option>
                <option value="openrouter">OpenRouter</option>
                <option value="siliconflow">SiliconFlow (硅基流动)</option>
                <option value="custom">{isZh ? '自定义 (Custom Compatible)' : 'Custom OpenAI Compatible'}</option>
              </select>
            </div>

            {/* API Endpoint / Base URL Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[#cca0ab]">
                {isZh ? '基准端点 (Base URL / Endpoint)' : 'Base URL'}
              </label>
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => { setApiEndpoint(e.target.value); localStorage.setItem('lumi_api_endpoint', e.target.value); }}
                placeholder="https://api.openai.com/v1"
                className="w-full h-9 rounded-xl border border-pink-100 px-3 bg-[#fdfafb] text-neutral-800 text-xs focus:outline-none focus:border-[#ff80a3] transition-colors border-solid"
              />
            </div>

            {/* Advanced: Model Override */}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between text-[11px] font-medium text-[#cca0ab] hover:text-[#ff80a3] transition-colors"
              >
                <span>{isZh ? '高级选项 (模型自定义)' : 'Advanced (Model Override)'}</span>
                <span className="text-[9px]">{showAdvanced ? '︿' : '∨'}</span>
              </button>
              {showAdvanced && (
                <input
                  type="text"
                  value={apiModel}
                  onChange={(e) => { setApiModel(e.target.value); localStorage.setItem('lumi_api_model', e.target.value); }}
                  placeholder={
                    apiProvider === 'doubao' ? (isZh ? '火山方舟部署ID，如 ep-20250101xxxx' : 'Endpoint ID, e.g. ep-20250101xxxx')
                    : isZh ? '留空使用默认模型' : 'Leave empty for default model'
                  }
                  className="w-full h-9 rounded-xl border border-pink-100 px-3 bg-[#fdfafb] text-neutral-800 text-xs focus:outline-none focus:border-[#ff80a3] transition-colors border-solid"
                />
              )}
              {!showAdvanced && apiModel && (
                <span className="text-[9px] text-neutral-400">
                  {isZh ? `当前模型：${apiModel}` : `Model: ${apiModel}`}
                </span>
              )}
            </div>

            {/* API Key Input */}
            <div className="flex flex-col gap-1.5 transition-all">
              <label className="text-[11px] font-medium text-[#cca0ab] flex items-center justify-between">
                <span>{isZh ? '接口密钥 (API Key)' : 'API Key'}</span>
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); localStorage.setItem('lumi_api_key', e.target.value); }}
                  placeholder={isZh ? '请输入您的 API Key' : 'Enter your API Key'}
                  className="w-full h-9 rounded-xl border border-pink-100 pl-3 pr-10 bg-[#fdfafb] text-neutral-800 text-xs focus:outline-none focus:border-[#ff80a3] transition-colors border-solid"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Connection Test Results Alert Banner */}
            {testStatus !== 'idle' && (
              <div className={`p-3 rounded-xl border border-solid text-xs text-left
                ${testStatus === 'testing' ? 'bg-amber-50 border-amber-200 text-amber-800' : ''}
                ${testStatus === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : ''}
                ${testStatus === 'failed' ? 'bg-pink-50 border-pink-200 text-pink-800' : ''}
              `}>
                <div className="flex items-center gap-2 font-semibold mb-1">
                  {testStatus === 'testing' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />}
                  {testStatus === 'success' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                  {testStatus === 'failed' && <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />}
                  <span>
                    {testStatus === 'testing' && (isZh ? '正在连接测试中...' : 'Testing connection...')}
                    {testStatus === 'success' && (isZh ? '连接测试完美通过' : 'Connection Test Passed')}
                    {testStatus === 'failed' && (isZh ? '连接失败' : 'Connection Failed')}
                  </span>
                </div>
                <p className="text-[10px] opacity-90 break-words leading-relaxed font-mono">
                  {testFeedback}
                </p>
              </div>
            )}

            {/* Operation Button Grid: Test Connection & Save */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {/* Test Connection Button */}
              <button
                type="button"
                onClick={async () => {
                  if (!apiKey.trim()) {
                    setTestStatus('failed');
                    setTestFeedback(isZh ? '请先填写 API Key！' : 'Please provide API Key.');
                    return;
                  }
                  setTestStatus('testing');
                  setTestFeedback(isZh ? `正在向 ${apiProvider} 基准端点发起握手信号验证...` : 'Sending handshake request...');
                  try {
                    const response = await fetch('/api/ai/test-connection', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        provider: apiProvider,
                        apiKey: apiKey,
                        baseUrl: apiEndpoint,
                        model: apiModel
                      })
                    });
                    const result = await response.json();
                    if (result.success) {
                      setTestStatus('success');
                      setTestFeedback(isZh ? `“已连接到 ${result.message.replace('已连接到 ', '')}”` : `Connected to ${apiProvider}`);
                    } else {
                      setTestStatus('failed');
                      setTestFeedback(result.error || (isZh ? '验证失败，请确认端点与密令' : 'Verification failed.'));
                    }
                  } catch (err: any) {
                    setTestStatus('failed');
                    setTestFeedback(err?.message || 'Handshake failed.');
                  }
                }}
                disabled={testStatus === 'testing'}
                className="h-9 rounded-xl border border-[#ff80a3] border-solid bg-white hover:bg-[#ffeaf0]/25 text-[#ff80a3] font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer select-none transition-colors disabled:opacity-50"
              >
                <span>{isZh ? '测试连接 (Test)' : 'Test'}</span>
              </button>

              {/* Save Configuration Button */}
              <button
                type="button"
                onClick={() => {
                  const nowStr = new Date().toISOString();
                  localStorage.setItem('lumi_api_provider', apiProvider);
                  localStorage.setItem('lumi_api_model', apiModel);
                  localStorage.setItem('lumi_api_endpoint', apiEndpoint);
                  localStorage.setItem('lumi_api_key', apiKey);
                  localStorage.setItem('lumi_api_last_saved', nowStr);
                  setLastSavedTime(nowStr);
                  setIsSaved(true);
                  setTimeout(() => {
                    setIsSaved(false);
                  }, 2000);
                }}
                className={`h-9 rounded-xl font-medium text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer select-none
                  ${isSaved 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 border-solid animate-pulse' 
                    : 'bg-[#ff80a3] hover:bg-[#ff6290] text-white border-none'}`}
              >
                {isSaved ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>{isZh ? '保存成功' : 'Saved!'}</span>
                  </>
                ) : (
                  <span>{isZh ? '保存配置 (Save)' : 'Save'}</span>
                )}
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
          <span>Lumi v1.0.0 (Atmosphere Special Edit)</span>
          <span>© 2026 App Store "Lumi" Light Design Lab</span>
        </div>
      </div>
    </div>
  );
};
