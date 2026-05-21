/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnalyticsEvent } from '../types';

// In-memory cache of events for visual evaluation in the simulator developer panel.
// We also backup to local storage so the session insights are preserved.
const ANALYTICS_STORAGE_KEY = 'lumi_glow_analytics_v1';

const getStoredEvents = (): AnalyticsEvent[] => {
  try {
    const data = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveEvents = (events: AnalyticsEvent[]) => {
  try {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    // Fail-safe
  }
};

export const analyticsTracker = {
  getEvents(): AnalyticsEvent[] {
    return getStoredEvents();
  },

  clearEvents() {
    saveEvents([]);
    this.dispatchEvent();
  },

  track(event: string, params: Record<string, string | number | boolean> = {}) {
    // Generate UUID or simple random string for trace
    const id = 'evt_' + Math.random().toString(36).substr(2, 9);
    const newEvent: AnalyticsEvent = {
      id,
      timestamp: new Date().toISOString(),
      event,
      params,
    };

    const currentEvents = getStoredEvents();
    // Keep last 150 events to avoid bloating local storage while providing rich visualization
    const updatedEvents = [newEvent, ...currentEvents].slice(0, 150);
    saveEvents(updatedEvents);

    // Dynamic console styled logs mimicking custom telemetry output
    console.log(
      `%c[Lumi Analytics: ${event.toUpperCase()}]`,
      'color: #ff85a2; font-weight: bold; font-family: system-ui; background: rgba(255,133,162,0.1); padding: 2px 6px; border-radius: 4px;',
      JSON.stringify(params)
    );

    this.dispatchEvent();
  },

  // Notify listeners (UI reactive analytics window)
  dispatchEvent() {
    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent('lumi_analytics_updated');
      window.dispatchEvent(customEvent);
    }
  },

  // Helper function for quick metrics on user presets preferences
  calculateMetrics() {
    const events = getStoredEvents();
    const metricsResult = {
      totalLaunches: 0,
      presetUsage: {} as Record<string, number>,
      averageBrightness: 0,
      averageSoftness: 0,
      splitModeToggles: 0,
      totalInteractions: events.length,
      averageDurationMinutes: 0,
    };

    let brightnessSum = 0;
    let brightnessCount = 0;
    let softnessSum = 0;
    let softnessCount = 0;

    events.forEach((evt) => {
      if (evt.event === 'app_launch') {
        metricsResult.totalLaunches++;
      }
      if (evt.event === 'preset_change' && typeof evt.params.presetId === 'string') {
        const id = evt.params.presetId;
        metricsResult.presetUsage[id] = (metricsResult.presetUsage[id] || 0) + 1;
      }
      if (evt.event === 'brightness_change' && typeof evt.params.value === 'number') {
        brightnessSum += evt.params.value;
        brightnessCount++;
      }
      if (evt.event === 'softness_change' && typeof evt.params.value === 'number') {
        softnessSum += evt.params.value;
        softnessCount++;
      }
      if (evt.event === 'split_toggle') {
        metricsResult.splitModeToggles++;
      }
    });

    metricsResult.averageBrightness = brightnessCount
      ? Math.round((brightnessSum / brightnessCount) * 100)
      : 80; // default simulation is 80%
    metricsResult.averageSoftness = softnessCount
      ? Math.round((softnessSum / softnessCount) * 100)
      : 50;

    return metricsResult;
  },
};
