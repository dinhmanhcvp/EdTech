import { describe, it, expect, vi } from "vitest";
import {
  StemProRenderer,
  SpringDamper,
  darkenColor,
  type Point2D,
} from "../utils/proRenderer";

describe("SpringDamper - Bộ giảm chấn lò xo bậc 2", () => {
  it("hội tụ mượt mà về target từ vị trí ban đầu", () => {
    const spring = new SpringDamper(0, 200, 15);
    spring.setTarget(100);

    for (let i = 0; i < 120; i++) {
      spring.update(1 / 60);
    }

    expect(spring.current).toBeCloseTo(100, 1);
    expect(spring.isSettled(0.5)).toBe(true);
  });

  it("thay đổi target liên tục không gây gián đoạn vận tốc", () => {
    const spring = new SpringDamper(10, 180, 14);
    spring.update(1 / 60);
    spring.setTarget(50);
    spring.update(1 / 60);

    expect(Number.isFinite(spring.current)).toBe(true);
    expect(Number.isFinite(spring.velocity)).toBe(true);
  });
});

describe("darkenColor - Tạo màu đổ bóng PBR", () => {
  it("làm tối màu hex 6 ký tự", () => {
    const darkBlue = darkenColor("#38BDF8", 0.5);
    expect(darkBlue).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
  });

  it("giữ nguyên nếu chuỗi không phải hex", () => {
    expect(darkenColor("rgba(0,0,0,1)", 0.3)).toBe("rgba(0,0,0,1)");
  });
});

describe("StemProRenderer - Đồ họa STEM Chuyên nghiệp", () => {
  const createMockContext = () => {
    const calls: string[] = [];
    const gradientMock = {
      addColorStop: vi.fn(),
    };

    return {
      calls,
      save: vi.fn(() => calls.push("save")),
      restore: vi.fn(() => calls.push("restore")),
      beginPath: vi.fn(() => calls.push("beginPath")),
      moveTo: vi.fn((x: number, y: number) => calls.push(`moveTo(${x},${y})`)),
      lineTo: vi.fn((x: number, y: number) => calls.push(`lineTo(${x},${y})`)),
      arc: vi.fn(() => calls.push("arc")),
      ellipse: vi.fn(() => calls.push("ellipse")),
      fill: vi.fn(() => calls.push("fill")),
      stroke: vi.fn(() => calls.push("stroke")),
      closePath: vi.fn(() => calls.push("closePath")),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      bezierCurveTo: vi.fn(() => calls.push("bezierCurveTo")),
      roundRect: vi.fn(() => calls.push("roundRect")),
      fillText: vi.fn(() => calls.push("fillText")),
      measureText: vi.fn(() => ({ width: 80 })),
      createRadialGradient: vi.fn(() => gradientMock),
      createLinearGradient: vi.fn(() => gradientMock),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      lineCap: "butt",
      lineJoin: "miter",
      shadowColor: "",
      shadowBlur: 0,
      shadowOffsetY: 0,
      font: "",
    } as unknown as CanvasRenderingContext2D;
  };

  it("drawPbrSphere thực hiện các lớp đổ bóng, gradient khối cầu và đốm sáng", () => {
    const ctx = createMockContext();
    StemProRenderer.drawPbrSphere(ctx, 100, 100, 25, "#38BDF8", "#FFFFFF");

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalledTimes(3); // Contact shadow + sphere + specular
    expect(ctx.createRadialGradient).toHaveBeenCalledTimes(2);
  });

  it("drawGlowingLine vẽ 2 lớp huỳnh quang neon bloom và lõi sáng trắng", () => {
    const ctx = createMockContext();
    const points: Point2D[] = [
      { x: 0, y: 100 },
      { x: 50, y: 50 },
      { x: 100, y: 120 },
    ];
    StemProRenderer.drawGlowingLine(ctx, points, "#38BDF8", "rgba(56,189,248,0.5)", 4);

    expect(ctx.stroke).toHaveBeenCalledTimes(2); // Lớp bloom + lớp lõi trắng
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it("drawCosmicFunctionCurve tô vùng gradient vũ trụ và vẽ đường hàm số phát sáng", () => {
    const ctx = createMockContext();
    const points: Point2D[] = [
      { x: 10, y: 80 },
      { x: 50, y: 30 },
      { x: 90, y: 90 },
    ];
    StemProRenderer.drawCosmicFunctionCurve(ctx, points, 150, "DARK_SLATE");

    expect(ctx.createLinearGradient).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled(); // Diện tích tích phân
    expect(ctx.stroke).toHaveBeenCalledTimes(2); // Đường glowing
  });

  it("drawMetallicSpring3D dùng chuỗi đường cong Bézier ánh kim thay ziczac", () => {
    const ctx = createMockContext();
    StemProRenderer.drawMetallicSpring3D(ctx, 0, 50, 200, 50, 8, 12);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.bezierCurveTo).toHaveBeenCalled();
    expect(ctx.createLinearGradient).toHaveBeenCalled();
  });

  it("drawGlassBadge vẽ huy hiệu kính mờ bo tròn và chấm đèn tín hiệu", () => {
    const ctx = createMockContext();
    StemProRenderer.drawGlassBadge(ctx, "v = 15.2 m/s", 50, 50, "#10B981");

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.roundRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith("v = 15.2 m/s", 74, 54);
  });
});
