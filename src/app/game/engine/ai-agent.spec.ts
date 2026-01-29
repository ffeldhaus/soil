import { describe, expect, it } from 'vitest';
import { AiAgent } from './ai-agent';

describe('AiAgent', () => {
  it('should make an elementary level decision', () => {
    const decision = AiAgent.makeDecision('elementary', undefined);
    expect(decision).toBeDefined();
    expect(decision.machines).toBe(0);
    expect(Object.keys(decision.parcels).length).toBe(40);
  });

  it('should make a middle level decision', () => {
    const decision = AiAgent.makeDecision('middle', undefined);
    expect(decision).toBeDefined();
    expect(decision.machines).toBeLessThanOrEqual(1);
    expect(Object.keys(decision.parcels).length).toBe(40);
  });

  it('should make a high level decision', () => {
    const decision = AiAgent.makeDecision('high', undefined);
    expect(decision).toBeDefined();
    expect(Object.keys(decision.parcels).length).toBe(40);
  });

  it('should follow rotation logic in middle level', () => {
    const mockRound: any = {
      parcelsSnapshot: Array(40)
        .fill(null)
        .map((_, i) => ({
          index: i,
          crop: 'Wheat',
          soil: 100,
          nutrition: 100,
        })),
    };

    const decision = AiAgent.makeDecision('middle', mockRound);
    // Wheat -> Barley is good rotation in many matrix configurations
    // The agent picks the first 'good' rotation it finds
    expect(decision.parcels[0]).toBeDefined();
    expect(decision.parcels[0]).not.toBe('Wheat'); // Should rotate
  });
});
