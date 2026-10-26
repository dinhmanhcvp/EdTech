// apps/teacher-board/src/__tests__/socraticTriggers.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  evaluateDynamicSocraticCue,
  triggerSocraticAcousticFeedback,
  DynamicSocraticCue,
} from '../utils/socraticTriggers';
import { ProceduralAudioEngine } from '../utils/audioFeedback';

describe('Dynamic Socratic Triggers & Holographic Cues (Section 8)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('evaluates RLC short-circuit and resonance thresholds', () => {
    // 1. Short-circuit: R = 0.5 Ohm -> ALERT
    const shortCircuitCue = evaluateDynamicSocraticCue('PHYS_RLC_PHASOR', { R: 0.5, L: 0.1, C: 0.0001, omega: 314 });
    expect(shortCircuitCue).not.toBeNull();
    expect(shortCircuitCue?.title).toContain('Đoản mạch');
    expect(shortCircuitCue?.urgency).toBe('ALERT');

    // 2. Resonance: omega = 316.2 rad/s with L=0.1, C=0.0001 -> omega*L = 31.62, 1/(omega*C) = 31.62 -> ZL ≈ ZC
    const resonanceCue = evaluateDynamicSocraticCue('PHYS_RLC_PHASOR', { R: 20, L: 0.1, C: 0.0001, omega: 316.2 });
    expect(resonanceCue).not.toBeNull();
    expect(resonanceCue?.title).toContain('Cộng hưởng');
    expect(resonanceCue?.urgency).toBe('EUREKA');

    // 3. Normal non-resonance, non-short circuit
    const normalCue = evaluateDynamicSocraticCue('PHYS_RLC_PHASOR', { R: 20, L: 0.1, C: 0.0001, omega: 100 });
    expect(normalCue).toBeNull();
  });

  it('evaluates Stomata heat denaturation and drought thresholds', () => {
    // 1. High heat: T = 46°C -> Denaturation
    const heatCue = evaluateDynamicSocraticCue('BIO_STOMATA_GAS', { temp: 46, soilMoisture: 50 });
    expect(heatCue).not.toBeNull();
    expect(heatCue?.title).toContain('Nhiệt độ Cao');
    expect(heatCue?.urgency).toBe('ALERT');

    // 2. Drought: soilMoisture = 8% -> ABA closure
    const droughtCue = evaluateDynamicSocraticCue('BIO_STOMATA_GAS', { temp: 25, soilMoisture: 8 });
    expect(droughtCue).not.toBeNull();
    expect(droughtCue?.title).toContain('Cơ chế Đóng Khí khổng');
    expect(droughtCue?.urgency).toBe('INFO');
  });

  it('evaluates Cell Osmosis hypertonic and hypotonic thresholds', () => {
    // 1. Hypertonic: C = 2.5% -> Plasmolysis
    const hyperCue = evaluateDynamicSocraticCue('BIO_OSMOSIS_CELL', { cOut: 2.5 });
    expect(hyperCue).not.toBeNull();
    expect(hyperCue?.title).toContain('Co Nguyên sinh');
    expect(hyperCue?.urgency).toBe('ALERT');

    // 2. Hypotonic: C = 0.1% -> Turgor pressure
    const hypoCue = evaluateDynamicSocraticCue('BIO_OSMOSIS_CELL', { cOut: 0.1 });
    expect(hypoCue).not.toBeNull();
    expect(hypoCue?.title).toContain('Trương nước');
    expect(hypoCue?.urgency).toBe('INFO');
  });

  it('evaluates Projectile optimal 45 deg and supergravity thresholds', () => {
    // 1. Optimal angle: 45°
    const angleCue = evaluateDynamicSocraticCue('PHYS_PROJECTILE', { alpha: 45, g: 9.8 });
    expect(angleCue).not.toBeNull();
    expect(angleCue?.title).toContain('Tầm Bắn Xa Cực Đại');
    expect(angleCue?.urgency).toBe('EUREKA');

    // 2. Jupiter gravity: g = 24.8 m/s²
    const jupiterCue = evaluateDynamicSocraticCue('PHYS_PROJECTILE', { alpha: 30, g: 24.8 });
    expect(jupiterCue).not.toBeNull();
    expect(jupiterCue?.title).toContain('Siêu Trọng lực');
    expect(jupiterCue?.urgency).toBe('INFO');
  });

  it('evaluates Le Chatelier, Daniell battery, and Math extremum thresholds', () => {
    // 1. Le Chatelier compression: V = 0.4
    const leChatelierCue = evaluateDynamicSocraticCue('CHEM_LE_CHATELIER_GAS', { V: 0.4 });
    expect(leChatelierCue).not.toBeNull();
    expect(leChatelierCue?.title).toContain('Chuyển dịch Cân bằng');

    // 2. Daniell battery depleted: Cu = 0.01 M
    const daniellCue = evaluateDynamicSocraticCue('CHEM_GALVANIC_DANIELL', { cuConc: 0.01 });
    expect(daniellCue).not.toBeNull();
    expect(daniellCue?.title).toContain('Phóng Hết Điện');

    // 3. Math extremum: x0 = 1.0
    const mathCue = evaluateDynamicSocraticCue('MATH_GRAPH', { x0: 1.0 });
    expect(mathCue).not.toBeNull();
    expect(mathCue?.title).toContain('Tiếp tuyến Điểm Cực trị');
  });

  it('triggers procedural acoustic feedback according to urgency without duplicates', () => {
    const playEurekaSpy = vi.spyOn(ProceduralAudioEngine, 'playEurekaChime').mockImplementation(() => {});
    const playResonanceSpy = vi.spyOn(ProceduralAudioEngine, 'playResonanceHum').mockImplementation(() => {});
    const playSnapSpy = vi.spyOn(ProceduralAudioEngine, 'playSnapClick').mockImplementation(() => {});

    // 1. Eureka Cue
    const eurekaCue: DynamicSocraticCue = {
      id: 'test-1',
      templateId: 'TEST',
      title: 'Eureka Test',
      question: 'Test question?',
      scientificInsight: 'Test insight',
      urgency: 'EUREKA',
      thresholdStateKey: 'key_1',
    };
    triggerSocraticAcousticFeedback(eurekaCue);
    expect(playEurekaSpy).toHaveBeenCalledTimes(1);

    // Same state key -> should not re-trigger
    triggerSocraticAcousticFeedback(eurekaCue);
    expect(playEurekaSpy).toHaveBeenCalledTimes(1);

    // 2. Alert Cue with new key
    const alertCue: DynamicSocraticCue = {
      id: 'test-2',
      templateId: 'TEST',
      title: 'Alert Test',
      question: 'Alert question?',
      scientificInsight: 'Alert insight',
      urgency: 'ALERT',
      thresholdStateKey: 'key_2',
    };
    triggerSocraticAcousticFeedback(alertCue);
    expect(playResonanceSpy).toHaveBeenCalledTimes(1);

    // 3. Info Cue with new key
    const infoCue: DynamicSocraticCue = {
      id: 'test-3',
      templateId: 'TEST',
      title: 'Info Test',
      question: 'Info question?',
      scientificInsight: 'Info insight',
      urgency: 'INFO',
      thresholdStateKey: 'key_3',
    };
    triggerSocraticAcousticFeedback(infoCue);
    expect(playSnapSpy).toHaveBeenCalledTimes(1);
  });
});
