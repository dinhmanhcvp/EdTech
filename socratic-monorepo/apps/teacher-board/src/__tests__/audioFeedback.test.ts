import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProceduralAudioEngine } from "../utils/audioFeedback";

describe("ProceduralAudioEngine - Web Audio Micro-Acoustics", () => {
  const originalAudioContext = window.AudioContext;

  beforeEach(() => {
    ProceduralAudioEngine.setEnabled(true);
    ProceduralAudioEngine.resetContextForTesting();
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    ProceduralAudioEngine.resetContextForTesting();
    vi.restoreAllMocks();
  });

  it("cho phép bật và tắt âm thanh thủ tục", () => {
    expect(ProceduralAudioEngine.isEnabled()).toBe(true);
    ProceduralAudioEngine.setEnabled(false);
    expect(ProceduralAudioEngine.isEnabled()).toBe(false);
    ProceduralAudioEngine.setEnabled(true);
  });

  it("hoạt động an toàn trong môi trường không có AudioContext (headless/SSR)", () => {
    (window as any).AudioContext = undefined;
    (window as any).webkitAudioContext = undefined;

    expect(() => ProceduralAudioEngine.playSnapClick()).not.toThrow();
    expect(() => ProceduralAudioEngine.playResonanceHum(440, 100, 0.2)).not.toThrow();
    expect(() => ProceduralAudioEngine.playBubbleBurst()).not.toThrow();
    expect(() => ProceduralAudioEngine.playEurekaChime()).not.toThrow();
  });

  it("khởi tạo node và phát âm thanh khi có AudioContext", () => {
    const mockOscillator = {
      type: "sine",
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    class MockAudioContext {
      currentTime = 1.0;
      state = "running";
      destination = {};
      createOscillator = vi.fn(() => mockOscillator);
      createGain = vi.fn(() => mockGain);
      resume = vi.fn().mockResolvedValue(undefined);
    }

    (window as any).AudioContext = MockAudioContext;

    // Test snap click
    ProceduralAudioEngine.playSnapClick(0.3);
    expect(mockOscillator.start).toHaveBeenCalled();
    expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0.3, expect.any(Number));

    // Test resonance hum
    ProceduralAudioEngine.playResonanceHum(500, 150, 0.25);
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(500, expect.any(Number));

    // Test bubble burst
    ProceduralAudioEngine.playBubbleBurst(0.2);
    expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0.2, expect.any(Number));

    // Test eureka chime
    ProceduralAudioEngine.playEurekaChime(0.15);
    expect(mockOscillator.start).toHaveBeenCalled();
  });

  it("không phát âm thanh khi đã setEnabled(false)", () => {
    const createOscillatorMock = vi.fn();
    class MockAudioContext {
      currentTime = 0;
      state = "running";
      destination = {};
      createOscillator = createOscillatorMock;
      createGain = vi.fn();
    }
    (window as any).AudioContext = MockAudioContext;

    ProceduralAudioEngine.setEnabled(false);
    ProceduralAudioEngine.playSnapClick();
    expect(createOscillatorMock).not.toHaveBeenCalled();
  });
});
