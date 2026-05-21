/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { analyticsTracker } from '../utils/analytics';
import { AnalyticsEvent } from '../types';
import {
  Activity,
  BarChart3,
  Trash2,
  X,
  FileJson,
  CheckCircle,
  Database,
  ArrowDownToLine,
  TrendingUp,
} from 'lucide-react';

interface AnalyticsPanelProps {
  onClose: () => void;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ onClose }) => {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Poll for analytics events reactive updates
  const loadData = () => {
    setEvents(analyticsTracker.getEvents());
    setMetrics(analyticsTracker.calculateMetrics());
  };

  useEffect(() => {
    loadData();

    // Event listener for updates
    window.addEventListener('lumi_analytics_updated', loadData);

    // Track session timing live inside stats view
    const timer = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      window.removeEventListener('lumi_analytics_updated', loadData);
      clearInterval(timer);
    };
  }, []);

  const handleClear = () => {
    analyticsTracker.clearEvents();
    analyticsTracker.track('analytics_cleared');
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `lumi_glow_telemetry_${Date.now()}.json`);
    dlAnchorElem.click();
    analyticsTracker.track('analytics_exported');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Safe color mapper for analytics charts
  const getPresetColor = (id: string) => {
    switch (id) {
      case 'cream':
        return '#e6c18c';
      case 'love':
        return '#ff9ebb';
      case 'cold':
        return '#8e9fff';
      case 'sunset':
        return '#ffa366';
      case 'moonlight':
        return '#38bdf8';
      default:
        return '#cca0ab';
    }
  };

  const getEventNameZh = (name: string) => {
    switch (name) {
      case 'app_launch':
        return '🚀 启动应用程序';
      case 'camera_start':
        return '🎥 前置相机初始化';
      case 'preset_change':
        return '🎨 切换柔光模式';
      case 'brightness_change':
        return '☀️ 调节光照亮度';
      case 'softness_change':
        return '🔮 调节面部柔和度';
      case 'split_toggle':
        return '🌗 开启双分屏辅光';
      case 'split_preset_change':
        return '🎭 分侧色彩搭配';
      case 'full_screen_glow':
        return '🖥️ 开启全屏辅光灯';
      case 'settings_update':
        return '⚙️ 修改原生设置';
      case 'snapshot_captured':
        return '📸 触发快门拍摄';
      default:
        return `📊 ${name}`;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#fcf9fa] text-neutral-800 font-sans select-none">
      {/* Premium Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#ffd9e2] bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#ff80a3] animate-pulse" />
          <div>
            <h2 className="text-[15px] font-heading font-semibold text-neutral-800 tracking-wide">
              Lumi Glow 数据分析埋点控制台
            </h2>
            <p className="text-[9px] text-neutral-400 font-sans tracking-wider uppercase block mt-0.5">
              Firebase Analytics Pre-install Simulation
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full bg-neutral-100 hover:bg-[#ffeaf0] text-[#ff80a3] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {/* 1. Statistics Cards Grid */}
        <div>
          <h3 className="text-[11px] font-heading font-bold text-[#b09ba0] tracking-widest uppercase mb-2.5 px-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            核心埋点事件洞察 · Vibe Insights
          </h3>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-white rounded-2xl p-3.5 border border-[#ffd2df] shadow-sm flex flex-col justify-between">
              <span className="text-[10px] text-neutral-400 font-sans font-medium">应用运行时长</span>
              <span className="text-xl font-heading font-medium text-neutral-800 mt-2 block">
                {formatTime(sessionDuration)}
              </span>
              <p className="text-[9px] text-neutral-400 mt-1">
                实时模拟埋点会话保活 duration_pings
              </p>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-[#ffd2df] shadow-sm flex flex-col justify-between">
              <span className="text-[10px] text-neutral-400 font-sans font-medium">触发交互总数</span>
              <span className="text-xl font-heading font-medium text-neutral-800 mt-2 block">
                {events.length} 次
              </span>
              <p className="text-[9px] text-cyan-700/80 mt-1">
                已实时接入 Firebase 代理流水线
              </p>
            </div>
          </div>
        </div>

        {/* 2. Advanced Interactive Metric Indicators */}
        {metrics && (
          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-white rounded-2xl p-3.5 border border-[#ffd2df] shadow-sm">
              <span className="text-[10px] text-neutral-400 font-sans font-medium block mb-2">
                平均补光亮度
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-heading font-medium text-[#ffd193]">
                  {metrics.averageBrightness}%
                </span>
                <span className="text-[10px] text-neutral-400">Avg</span>
              </div>
              <p className="text-[9px] text-[#cca0ab] mt-1.5 leading-tight">
                分析显示，女生自拍更爱 80% 左右的极简自然柔和光效。
              </p>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-[#ffd2df] shadow-sm">
              <span className="text-[10px] text-neutral-400 font-sans font-medium block mb-2">
                平均面部柔和度
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-heading font-medium text-[#c0e39b]">
                  {metrics.averageSoftness}%
                </span>
                <span className="text-[10px] text-neutral-400">Avg</span>
              </div>
              <p className="text-[9px] text-[#cca0ab] mt-1.5 leading-tight">
                随着色度和饱和度降低，漫反射效果会更为柔美通透。
              </p>
            </div>
          </div>
        )}

        {/* 3. Favorite Light modes distribution chart */}
        {metrics && Object.keys(metrics.presetUsage).length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-[#ffd2df] shadow-sm">
            <h4 className="text-[11px] font-heading font-bold text-neutral-500 tracking-wider uppercase mb-3 border-b border-pink-50/50 pb-1.5 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-neutral-400" />
              最受自拍喜爱光色占比 · Popular Presets
            </h4>
            <div className="flex flex-col gap-2.5">
              {Object.entries(metrics.presetUsage)
                .sort((a: any, b: any) => b[1] - a[1])
                .map(([id, count]: any) => {
                  const percent = Math.round((count / events.length) * 100);
                  const color = getPresetColor(id);
                  const labels: Record<string, string> = {
                    cream: '奶油肌 Cream Skin',
                    love: '初恋粉 First Love',
                    cold: '冷白皮 Ice White',
                    sunset: '日落橘 Sunset Glow',
                    moonlight: '月光蓝 Moonlight',
                  };
                  return (
                    <div key={id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-neutral-700">{labels[id] || id}</span>
                        <span className="text-neutral-500 font-mono">
                          {count} 次 ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-neutral-50 rounded-full overflow-hidden border border-neutral-100/50">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 4. Operation Bar (Real-Time Export / Mock Flush) */}
        <div className="flex gap-2.5">
          <button
            onClick={handleExport}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#ffecef] hover:bg-[#ffdce4] text-[#ff80a3] text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 border border-[#ffbccf]"
          >
            <ArrowDownToLine className="w-4 h-4" /> Export Analytics SDK
          </button>
          <button
            onClick={handleClear}
            className="py-2.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-500 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 border border-neutral-200"
          >
            <Trash2 className="w-4 h-4" /> 清空记录
          </button>
        </div>

        {/* 5. Live Events JSON Stream Feed */}
        <div className="flex-1 flex flex-col gap-2 mini-json-feed max-h-[350px]">
          <h4 className="text-[11px] font-heading font-bold text-[#b09ba0] tracking-widest uppercase px-1 flex items-center gap-1.5 mt-1.5">
            <Database className="w-3.5 h-3.5" />
            Firebase 虚拟数据上报日志流 (实时)
          </h4>
          <div className="flex-1 overflow-y-auto bg-neutral-900 rounded-2xl p-3 border border-neutral-800 text-[11px] font-mono select-text flex flex-col gap-2.5 scrollbar-thin shadow-inner">
            {events.length === 0 ? (
              <div className="text-neutral-500 text-center py-10 flex flex-col items-center gap-2">
                <Activity className="w-6 h-6 text-neutral-600 animate-spin" />
                <span>等待用户手势操作触发埋点发送...</span>
              </div>
            ) : (
              events.map((evt) => (
                <div
                  key={evt.id}
                  className="border-b border-neutral-800 pb-2.5 last:border-0 last:pb-0 flex flex-col gap-1 transition-all"
                >
                  <div className="flex justify-between items-start text-[10px]">
                    <span className="text-[#aacf8e] font-sans font-medium">
                      {getEventNameZh(evt.event)}
                    </span>
                    <button
                      onClick={() => handleCopy(JSON.stringify(evt, null, 2), evt.id)}
                      className="text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
                    >
                      {copiedId === evt.id ? (
                        <span className="text-neutral-400 font-sans text-[9px] flex items-center gap-0.5">
                          <CheckCircle className="w-3 h-3 text-emerald-400" /> 已复制 JSON
                        </span>
                      ) : (
                        <FileJson className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="text-neutral-500 text-[9px] mt-0.5">
                    时间: {new Date(evt.timestamp).toLocaleTimeString()} · 事件ID: {evt.id}
                  </div>
                  <pre className="text-[#ffdf9e] overflow-x-auto bg-neutral-950 p-2 rounded-lg border border-neutral-900/50 mt-1 max-w-full text-[9px] leading-relaxed">
                    {JSON.stringify(evt.params, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
