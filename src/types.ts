/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FillLightPreset {
  id: string;
  name: string;
  englishName: string;
  description: string;
  color: string; // HEX
  colorRgb: { r: number; g: number; b: number };
  gradientFrom: string;
  gradientTo: string;
  intensity: number; // default soft index
  accentColor: string;
  vibeQuote: string;
  cameraFilterClass: string; // simulated filter look
}

export interface AnalyticsEvent {
  id: string;
  timestamp: string;
  event: string;
  params: Record<string, string | number | boolean>;
}

export type SplitMode = 'none' | 'horizontal' | 'vertical';

export interface AppSettings {
  language: 'zh' | 'en';
  hapticFeedback: boolean;
  guideOverlay: boolean;
  gridEnabled: boolean;
  mirrorCamera: boolean;
  highQualityStream: boolean;
}
