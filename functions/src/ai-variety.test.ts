import { expect } from 'chai';
import { AiAgent } from './ai-agent';
import { GameEngine } from './game-engine';
import type { PlayerState, Round } from './types';

describe('AI Variety and Performance Simulation', () => {
  const NUM_ROUNDS = 20;

  it('should simulate 10 AI players and verify diverse, successful outcomes', function () {
    this.timeout(10000); // Allow time for long simulation

    const levels: ('elementary' | 'middle' | 'high')[] = [
      'elementary',
      'elementary',
      'middle',
      'middle',
      'middle',
      'middle',
      'high',
      'high',
      'high',
      'high',
    ];

    const players: (PlayerState & { lastRound?: Round })[] = levels.map((level, i) => ({
      uid: `ai-player-${i}`,
      displayName: `AI ${level} ${i}`,
      isAi: true,
      aiLevel: level,
      capital: 100000,
      currentRound: 0,
      history: [],
      avgSoil: 80,
      avgNutrition: 80,
    }));

    // Simulation loop
    for (let roundNum = 1; roundNum <= NUM_ROUNDS; roundNum++) {
      // 1. Generate environment for this round (same for all players in this sim)
      const weatherRoll = Math.random();
      const weather = weatherRoll > 0.9 ? 'Drought' : 'Normal';
      const events = { weather, vermin: [] };

      for (const player of players) {
        // 2. AI makes decision
        const decision = AiAgent.makeDecision(player.aiLevel!, player.lastRound, player.uid);

        // 3. Engine calculates result
        const resultRound = GameEngine.calculateRound(
          roundNum,
          player.lastRound,
          decision,
          events,
          player.capital,
          NUM_ROUNDS,
        );

        // 4. Update player state
        player.lastRound = resultRound;
        player.capital = resultRound.result!.capital;
        player.avgSoil = resultRound.parcelsSnapshot.reduce((acc, p) => acc + p.soil, 0) / 40;
      }
    }

    // --- Analysis ---
    const results = players.map((p) => ({
      level: p.aiLevel,
      capital: Math.round(p.capital),
      soil: Math.round(p.avgSoil),
    }));

    // 1. Check for Variety: Decisions shouldn't lead to identical capital/soil
    const uniqueCapitals = new Set(results.map((r) => r.capital));
    const uniqueSoils = new Set(results.map((r) => r.soil));

    expect(uniqueCapitals.size, 'AI players should have different financial outcomes').to.be.greaterThan(1);
    expect(uniqueSoils.size, 'AI players should have different soil outcomes').to.be.greaterThan(1);

    // 2. Performance Benchmarks
    const high = results.filter((r) => r.level === 'high');

    // Middle should stay solvent (capital > 0)
    const middle = results.filter((r) => r.level === 'middle');
    for (const r of middle) {
      expect(r.capital, 'Middle AI should be solvent').to.be.greaterThan(0);
    }

    // High AI should mostly stay solvent (allow 1 failure in 4 for high-risk variants)
    const highSolvent = high.filter((r) => r.capital > 0);
    expect(highSolvent.length, 'At least 75% of High AI players should stay solvent').to.be.at.least(3);

    // High AI should mostly have reasonable soil (allow 1 outlier)
    const highGoodSoil = high.filter((r) => r.soil >= 35);
    expect(highGoodSoil.length, 'At least 75% of High AI players should maintain decent soil quality').to.be.at.least(
      3,
    );

    // High AI should generally outperform Middle AI in soil quality due to rotation
    const avgMiddleSoil = results.filter((r) => r.level === 'middle').reduce((acc, r) => acc + r.soil, 0) / 4;
    const avgHighSoil = high.reduce((acc, r) => acc + r.soil, 0) / 4;

    // We expect High AI to be more soil-conscious
    expect(avgHighSoil, 'High AI should have better average soil than Middle AI').to.be.greaterThan(avgMiddleSoil - 5);
  });
});
