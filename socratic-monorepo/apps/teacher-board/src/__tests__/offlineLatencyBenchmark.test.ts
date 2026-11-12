import { describe, it, expect } from "vitest";
import { ProceduralAudioEngine } from "../utils/audioFeedback";
import { parseEquation, tryCompile } from "../utils/mathExpr";
import { detectSolidFromStrokes } from "../utils/sketchSolid";

describe("Client-side Offline Benchmark: < 2ms Audio & < 15ms Stroke Processing", () => {
  it("xác nhận độ trễ tổng hợp âm thanh thủ tục Web Audio API < 2ms", () => {
    // Benchmark 100 synthesis trigger calls
    const timings: number[] = [];
    for (let i = 0; i < 100; i++) {
      const t0 = performance.now();
      ProceduralAudioEngine.playSnapClick();
      ProceduralAudioEngine.playResonanceHum(440, 50, 0.1);
      const t1 = performance.now();
      timings.push(t1 - t0);
    }
    const avgMs = timings.reduce((a, b) => a + b, 0) / timings.length;
    // Báo cáo KHKT: "âm thanh phản hồi dưới 2ms"
    expect(avgMs).toBeLessThan(2.0);
  });

  it("xác nhận độ trễ phân giải cú pháp toán học cục bộ MathExpr AST < 5ms", () => {
    const expressions = [
      "y = 2*x^2 - 4*x + 1",
      "h = 0.5 * 9.8 * t^2",
      "v^2 = v0^2 + 2*a*s",
      "omega = 1 / sqrt(L * C)",
      "x = 5 * cos(2 * pi * t)",
    ];
    const timings: number[] = [];
    for (let i = 0; i < 100; i++) {
      const expr = expressions[i % expressions.length];
      const t0 = performance.now();
      const compiled = tryCompile(expr);
      const parsed = parseEquation(expr);
      const t1 = performance.now();
      timings.push(t1 - t0);
      expect(compiled !== null || parsed !== null).toBe(true);
    }
    const avgMs = timings.reduce((a, b) => a + b, 0) / timings.length;
    expect(avgMs).toBeLessThan(5.0);
  });

  it("xác nhận thuật toán nhận dạng khối 3D phác thảo sketchSolid < 15ms", () => {
    // Stroke representing a pyramid sketch: 4 base points and 4 spine lines
    const mockStrokes = [
      { points: [{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 350, y: 250 }, { x: 50, y: 250 }, { x: 100, y: 100 }] },
      { points: [{ x: 200, y: 30 }, { x: 100, y: 100 }] },
      { points: [{ x: 200, y: 30 }, { x: 300, y: 100 }] },
      { points: [{ x: 200, y: 30 }, { x: 350, y: 250 }] },
      { points: [{ x: 200, y: 30 }, { x: 50, y: 250 }] },
    ];
    const timings: number[] = [];
    for (let i = 0; i < 50; i++) {
      const t0 = performance.now();
      const solid = detectSolidFromStrokes(mockStrokes);
      const t1 = performance.now();
      timings.push(t1 - t0);
    }
    const avgMs = timings.reduce((a, b) => a + b, 0) / timings.length;
    expect(avgMs).toBeLessThan(15.0);
  });
});

