import { Injectable } from '@nestjs/common';

/** XP required to advance one level (decision S1). */
export const XP_PER_LEVEL = 100;

/** A user's level standing derived purely from total XP. */
export interface LevelProgress {
  currentLevel: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpIntoLevel: number;
  completionPercent: number;
}

/**
 * Level calculations (decision S1). Deliberately pure and free of I/O so the
 * linear MVP curve (100 XP per level) can be swapped for another progression
 * later without touching the API or services.
 */
@Injectable()
export class LevelService {
  /** Derives the full level standing from a non-negative total XP. */
  progressFor(totalXp: number): LevelProgress {
    const xp = Math.max(0, Math.floor(totalXp));
    const currentLevel = Math.floor(xp / XP_PER_LEVEL) + 1;
    const xpForCurrentLevel = (currentLevel - 1) * XP_PER_LEVEL;
    const xpForNextLevel = currentLevel * XP_PER_LEVEL;
    const xpIntoLevel = xp - xpForCurrentLevel;
    const completionPercent = (xpIntoLevel / XP_PER_LEVEL) * 100;

    return {
      currentLevel,
      xpForCurrentLevel,
      xpForNextLevel,
      xpIntoLevel,
      completionPercent,
    };
  }
}
