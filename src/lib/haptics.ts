import { triggerHaptic } from "tactus";

/**
 * One haptic pulse via tactus: native Taptic "tick" on iOS 12+ (hidden
 * switch trick), Vibration API on Android, silent no-op elsewhere.
 * Haptics are decorative; they must never break the UI.
 */
export function haptic(duration = 10): void {
  try {
    triggerHaptic(duration);
  } catch {
    // unsupported platform / blocked API; ignore
  }
}

/**
 * Vibration-API-style pattern [pulse, gap, pulse, ...] as a setTimeout
 * chain of single pulses (tactus only fires one pulse at a time; on iOS
 * each pulse is a fixed tick and the durations act as spacing).
 */
function hapticPattern(pattern: number[]): void {
  let offset = 0;
  for (let i = 0; i < pattern.length; i += 1) {
    if (i % 2 === 0) {
      const duration = pattern[i];
      if (offset === 0) haptic(duration);
      else setTimeout(() => haptic(duration), offset);
    }
    offset += pattern[i];
  }
}

/** Light tick for taps (day cells, tab bar). */
export function hapticTap(): void {
  haptic(10);
}

/** Double pulse for successful mutations. */
export function hapticSuccess(): void {
  hapticPattern([10, 40, 20]);
}

/** Heavier double pulse for errors / destructive outcomes. */
export function hapticWarning(): void {
  hapticPattern([30, 50, 30]);
}
