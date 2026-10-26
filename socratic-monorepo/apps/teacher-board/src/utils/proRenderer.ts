/**
 * socratic-monorepo/apps/teacher-board/src/utils/proRenderer.ts
 * Bộ công cụ kết xuất đồ họa STEM Chuyên nghiệp 4K Retina, PBR Depth & Huỳnh quang Neon
 * Chuẩn hóa giao diện High-Tech loại bỏ hoàn toàn nét vẽ kỹ thuật thô sơ (Matplotlib/Python)
 */

export interface Point2D {
  x: number;
  y: number;
}

export type ProTheme = "DARK_SLATE" | "WARM_IVORY" | "CHALK_BOARD";

/**
 * 1. Thuật toán làm mịn lò xo bậc 2 (Second-Order Spring Damper)
 * Triệt tiêu hiện tượng giật cục khi kéo thanh trượt / thay đổi tham số
 */
export class SpringDamper {
  public current: number;
  public target: number;
  public velocity: number = 0;
  public tension: number;
  public friction: number;

  constructor(initialValue: number, tension: number = 180, friction: number = 14) {
    this.current = initialValue;
    this.target = initialValue;
    this.tension = tension;
    this.friction = friction;
  }

  public setTarget(newTarget: number) {
    this.target = newTarget;
  }

  public update(dt: number = 1 / 60): number {
    const springForce = -this.tension * (this.current - this.target);
    const dampingForce = -this.friction * this.velocity;
    const acceleration = springForce + dampingForce;

    this.velocity += acceleration * dt;
    this.current += this.velocity * dt;
    return this.current;
  }

  public isSettled(threshold: number = 0.001): boolean {
    return Math.abs(this.current - this.target) < threshold && Math.abs(this.velocity) < threshold;
  }
}

/**
 * Hàm hỗ trợ làm tối màu hex/rgb
 */
export function darkenColor(color: string, factor: number = 0.3): string {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const num = parseInt(hex.length === 3 ? hex.split("").map(c => c + c).join("") : hex, 16);
    const r = Math.max(0, Math.floor(((num >> 16) & 255) * (1 - factor)));
    const g = Math.max(0, Math.floor(((num >> 8) & 255) * (1 - factor)));
    const b = Math.max(0, Math.floor((num & 255) * (1 - factor)));
    return `rgb(${r}, ${g}, ${b})`;
  }
  return color;
}

/**
 * Bộ công cụ Pro Renderer cho đồ họa Smartboard
 */
export class StemProRenderer {
  /**
   * 1. Chuẩn hóa Canvas Hi-DPI sắc nét 4K Retina cho màn hình Smartboard 75"-86"
   */
  public static setupCrispCanvas(
    canvas: HTMLCanvasElement,
    cssWidth: number,
    cssHeight: number
  ): CanvasRenderingContext2D {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2;

    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const ctx = canvas.getContext("2d", { alpha: true })!;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    return ctx;
  }

  /**
   * 2. Vẽ quả cầu 3D PBR (Contact Shadow + Ambient/Diffuse Gradient + Specular Glint)
   * Thay thế hình tròn 2D dẹt đơn điệu
   */
  public static drawPbrSphere(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    baseColor: string = "#38BDF8",
    highlightColor: string = "#E0F2FE"
  ) {
    ctx.save();

    // a. Bóng tiếp xúc phía dưới (Ambient Contact Shadow)
    const shadowGrad = ctx.createRadialGradient(
      x,
      y + radius * 0.9,
      radius * 0.1,
      x,
      y + radius * 0.9,
      radius * 1.15
    );
    shadowGrad.addColorStop(0, "rgba(15, 23, 42, 0.45)");
    shadowGrad.addColorStop(1, "rgba(15, 23, 42, 0)");

    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.9, radius * 1.05, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // b. Gradient Cầu 3D Đa tầng
    const sphereGrad = ctx.createRadialGradient(
      x - radius * 0.38,
      y - radius * 0.38,
      radius * 0.05,
      x,
      y,
      radius
    );
    sphereGrad.addColorStop(0, highlightColor);
    sphereGrad.addColorStop(0.2, baseColor);
    sphereGrad.addColorStop(0.85, darkenColor(baseColor, 0.45));
    sphereGrad.addColorStop(1, "#0F172A");

    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // c. Đốm sáng sắc nét (Specular Glint)
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.beginPath();
    ctx.arc(x - radius * 0.36, y - radius * 0.36, radius * 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 3. Đường cong phát quang huỳnh quang Neon Bloom (với lõi trắng)
   */
  public static drawGlowingLine(
    ctx: CanvasRenderingContext2D,
    points: Point2D[],
    strokeColor: string = "#38BDF8",
    glowColor: string = "rgba(56, 189, 248, 0.55)",
    lineWidth: number = 3.5
  ) {
    if (points.length < 2) return;
    ctx.save();

    // Lớp 1: Quầng sáng huỳnh quang (Bloom)
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // Lớp 2: Lõi sáng trắng mảnh ở trung tâm
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = Math.max(1, lineWidth * 0.35);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 4. Vẽ đồ thị hàm số Gradient vũ trụ (Cosmic Function Shading)
   */
  public static drawCosmicFunctionCurve(
    ctx: CanvasRenderingContext2D,
    points: Point2D[],
    baselineY: number,
    theme: ProTheme = "DARK_SLATE"
  ) {
    if (points.length < 2) return;
    ctx.save();

    const minX = points[0].x;
    const maxX = points[points.length - 1].x;
    const minY = Math.min(...points.map((p) => p.y));

    // Vùng tô diện tích dưới đường cong
    const areaGrad = ctx.createLinearGradient(0, minY, 0, baselineY);
    if (theme === "DARK_SLATE") {
      areaGrad.addColorStop(0, "rgba(56, 189, 248, 0.38)");
      areaGrad.addColorStop(0.6, "rgba(124, 58, 237, 0.15)");
      areaGrad.addColorStop(1, "rgba(15, 23, 42, 0)");
    } else if (theme === "CHALK_BOARD") {
      areaGrad.addColorStop(0, "rgba(52, 211, 153, 0.35)");
      areaGrad.addColorStop(0.7, "rgba(6, 78, 59, 0.12)");
      areaGrad.addColorStop(1, "rgba(6, 78, 59, 0)");
    } else {
      areaGrad.addColorStop(0, "rgba(37, 99, 235, 0.28)");
      areaGrad.addColorStop(1, "rgba(37, 99, 235, 0.02)");
    }

    ctx.fillStyle = areaGrad;
    ctx.beginPath();
    ctx.moveTo(minX, baselineY);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.lineTo(maxX, baselineY);
    ctx.closePath();
    ctx.fill();

    // Đường cong phát quang
    this.drawGlowingLine(
      ctx,
      points,
      theme === "CHALK_BOARD" ? "#34D399" : "#38BDF8",
      theme === "CHALK_BOARD" ? "rgba(52, 211, 153, 0.6)" : "rgba(56, 189, 248, 0.65)",
      3.5
    );

    ctx.restore();
  }

  /**
   * 5. Vẽ Lò xo kim loại 3D bằng đường cong Bézier ánh thép
   * Thay thế hoàn toàn đường vẽ ziczac Python thô sơ
   */
  public static drawMetallicSpring3D(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    coils: number = 10,
    radius: number = 14
  ) {
    ctx.save();
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    ctx.translate(x1, y1);
    ctx.rotate(angle);

    const step = dist / coils;
    ctx.lineWidth = 3.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i < coils; i++) {
      const cx = i * step + step / 2;

      // Nửa vòng sau: khuất ánh sáng, màu sẫm
      ctx.strokeStyle = "#475569";
      ctx.beginPath();
      ctx.bezierCurveTo(i * step, -radius * 0.8, cx, -radius, cx, 0);
      ctx.stroke();

      // Nửa vòng trước: ánh thép kim loại phản chiếu ánh sáng
      const metallicGrad = ctx.createLinearGradient(cx, 0, (i + 1) * step, radius);
      metallicGrad.addColorStop(0, "#CBD5E1");
      metallicGrad.addColorStop(0.5, "#FFFFFF");
      metallicGrad.addColorStop(1, "#64748B");

      ctx.strokeStyle = metallicGrad;
      ctx.beginPath();
      ctx.bezierCurveTo(cx, 0, cx, radius, (i + 1) * step, radius * 0.8);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 6. Huy hiệu thông số Kính mờ (Glassmorphism Pill Badge)
   */
  public static drawGlassBadge(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    accentColor: string = "#D97706"
  ) {
    ctx.save();
    ctx.font = 'bold 12px "Inter", "Aptos", sans-serif';
    const textMetrics = ctx.measureText(text);
    const paddingX = 14;
    const height = 28;
    const width = textMetrics.width + paddingX * 2 + 12;

    // Nền kính mờ bán trong suốt
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.strokeStyle = "rgba(226, 232, 240, 0.9)";
    ctx.lineWidth = 1.2;
    ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    ctx.beginPath();
    ctx.roundRect(x, y - height / 2, width, height, height / 2);
    ctx.fill();
    ctx.stroke();

    // Chấm đèn tín hiệu phát quang
    ctx.shadowBlur = 6;
    ctx.shadowColor = accentColor;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(x + 12, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Chữ số hiển thị sắc nét
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0F172A";
    ctx.fillText(text, x + 24, y + 4);

    ctx.restore();
  }
}
