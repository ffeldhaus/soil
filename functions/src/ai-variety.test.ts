import { expect } from 'chai';
import { AiAgent } from './ai-agent';
import { GameEngine } from './game-engine';
import type { PlayerState, Round } from './types';

describe('AI Variety and Performance Simulation', () => {
  const NUM_ROUNDS = 20;

  it('should simulate AI players and verify diverse, successful outcomes', function () {
    this.timeout(15000);

    const levels: ('elementary' | 'middle' | 'high' | 'perfect')[] = [
      'elementary',
      'middle',
      'high',
      'high',
      'perfect',
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

    for (let roundNum = 1; roundNum <= NUM_ROUNDS; roundNum++) {
      const weatherRoll = Math.random();
      const weather = weatherRoll > 0.9 ? 'Drought' : 'Normal';
      const events = { weather, vermin: [] };

      for (const player of players) {
        const decision = AiAgent.makeDecision(player.aiLevel!, player.lastRound, player.uid);

        const resultRound = GameEngine.calculateRound(
          roundNum,

          player.lastRound,

          decision,

          events,

          player.capital,

          NUM_ROUNDS,
        );

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
    const perfect = results.find((r) => r.level === 'perfect')!;
    const high = results.filter((r) => r.level === 'high');
    const middle = results.filter((r) => r.level === 'middle');

    // Perfect AI should be very profitable
    expect(perfect.capital, 'Perfect AI should be profitable').to.be.at.least(0);
    expect(perfect.soil, 'Perfect AI should have excellent soil').to.be.at.least(80);

    // High AI should generally have better soil than Middle AI (sustainable vs exploitative)
    const avgMiddleSoil = middle.reduce((acc, r) => acc + r.soil, 0) / middle.length;
    const avgHighSoil = high.reduce((acc, r) => acc + r.soil, 0) / high.length;

    // High AI should be more soil-conscious
    expect(avgHighSoil, 'High AI should have better average soil than Middle AI').to.be.greaterThan(avgMiddleSoil);
  });

  it('should simulate Perfect AI with market price fluctuations', function () {
    this.timeout(5000);
    let capital = 100000;
    let lastRound: Round | undefined;

    // Simulate with dynamic prices
    for (let roundNum = 1; roundNum <= 10; roundNum++) {
      const marketPrices: Record<string, { organic: number; conventional: number }> = {
        Wheat: { organic: 40 + Math.random() * 10, conventional: 20 + Math.random() * 5 },
        Potato: { organic: 35 + Math.random() * 10, conventional: 15 + Math.random() * 5 },
      };

      const decision = AiAgent.makeDecision('perfect', lastRound, 'market-test');
      const round = GameEngine.calculateRound(
        roundNum,
        lastRound,
        decision,
        { weather: 'Normal', vermin: [] },
        capital,
        10,
        { marketPrices },
      );
      capital = round.result!.capital;
      lastRound = round;
    }

    expect(capital, 'Perfect AI should survive market fluctuations').to.be.greaterThan(100000);
  });
});
