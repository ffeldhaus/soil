import { Injectable, PLATFORM_ID, inject, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type PerformanceTier = 1 | 2 | 3; // 1: Low (Opaque), 2: Med (Transparent), 3: High (Blur)

@Injectable({
  providedIn: 'root',
})
export class PerformanceService {
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private tierKey = 'soil_perf_tier';
  private currentTier: PerformanceTier = 3;
  private isBrowser = isPlatformBrowser(this.platformId);

  constructor() {
    if (this.isBrowser) {
      this.init();
    }
  }

  private init() {
    // Load persisted tier or default to 3
    const saved = localStorage.getItem(this.tierKey);
    this.currentTier = saved ? (parseInt(saved, 10) as PerformanceTier) : 3;
    this.applyTier();

    // Start monitoring only if we haven't already downgraded to the lowest tier
    if (this.currentTier > 1) {
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => this.monitorPerformance(), 5000);
      });
    }
  }

  private applyTier() {
    if (!this.isBrowser) return;
    
    const body = document.body;
    body.classList.remove('perf-tier-1', 'perf-tier-2', 'perf-tier-3');
    body.classList.add(`perf-tier-${this.currentTier}`);
    
    localStorage.setItem(this.tierKey, this.currentTier.toString());
    console.log(`[Performance] Applied Tier ${this.currentTier}`);
  }

  private isMonitoring = false;

  private monitorPerformance() {
    if (this.isMonitoring || !this.isBrowser) return;
    this.isMonitoring = true;

    this.ngZone.runOutsideAngular(() => {
      let frameCount = 0;
      let lastTime = performance.now();
      let lowFpsCount = 0; // For < 30 FPS
      let midFpsCount = 0; // For < 50 FPS
      const checkInterval = 1000;

      const check = () => {
        if (!this.isMonitoring) return;

        const now = performance.now();
        frameCount++;

        if (now >= lastTime + checkInterval) {
          const delta = now - lastTime;
          const fps = Math.round((frameCount * 1000) / delta);
          const timestamp = new Date().toLocaleTimeString();
          
          let shouldDowngrade = false;

          if (fps < 30) {
            lowFpsCount++;
            midFpsCount++; // < 30 is also < 50
            console.warn(`[${timestamp}] [Performance] Low FPS (< 30): ${fps} (${lowFpsCount}/2)`);
          } else if (fps < 50) {
            lowFpsCount = 0; // Reset < 30 counter
            midFpsCount++;
            console.warn(`[${timestamp}] [Performance] Mid FPS (< 50): ${fps} (${midFpsCount}/3)`);
          } else {
            // Healthy FPS (> 50)
            lowFpsCount = 0;
            midFpsCount = 0;
          }

          if (lowFpsCount >= 2 || midFpsCount >= 3) {
            console.warn(`[${timestamp}] [Performance] Consistently low performance. Downgrading tier.`);
            shouldDowngrade = true;
          }

          if (shouldDowngrade) {
            this.isMonitoring = false;
            this.downgrade();
            return;
          }

          frameCount = 0;
          lastTime = now;
        }

        if (this.currentTier > 1) {
          requestAnimationFrame(check);
        } else {
          this.isMonitoring = false;
        }
      };

      requestAnimationFrame(check);
    });
  }

  private downgrade() {
    if (this.currentTier > 1) {
      this.currentTier--;
      this.applyTier();
      
      if (this.currentTier > 1) {
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => this.monitorPerformance(), 5000);
        });
      }
    }
  }

  getTier(): PerformanceTier {
    return this.currentTier;
  }

  reset() {
    this.currentTier = 3;
    this.isMonitoring = false;
    this.applyTier();
    this.ngZone.runOutsideAngular(() => {
      this.monitorPerformance();
    });
  }
}
