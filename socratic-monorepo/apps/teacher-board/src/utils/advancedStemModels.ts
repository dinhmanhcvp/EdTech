/** Mô hình thuần cho 6 template bổ sung; đơn vị hình học tùy chọn, năng lượng CFT theo P.
 * CFT: chemed.chem.purdue.edu/genchem/topicreview/bp/ch12/crystal.php
 * SN2: iverson.cm.utexas.edu/courses/310M/ReactMoviesFl05%20/SN2text.html
 * Ô mạng: openstax.org/books/chemistry-2e/pages/10-6-lattice-structures-in-crystalline-solids
 */
import { compileExpr, type Node } from "./mathExpr";

export type Vec3 = [number, number, number];
export type Point2 = [number, number];
export const dot3 = (a: Vec3, b: Vec3) =>
  a.reduce((s, v, i) => s + v * b[i], 0);
export const add3 = (a: Vec3, b: Vec3): Vec3 =>
  a.map((v, i) => v + b[i]) as Vec3;
export const mul3 = (a: Vec3, k: number): Vec3 => a.map((v) => v * k) as Vec3;
export const cross3 = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const finite = (...values: number[]) => values.every(Number.isFinite);

/** Phân tích mặt phẳng tuyến tính bằng AST; không suy hệ số từ vài điểm mẫu. */
export function parsePlane(expression: string): {
  normal: Vec3;
  offset: number;
} {
  type Linear = [number, number, number, number];
  const linear = (node: Node): Linear => {
    if (node.t === "num") return [0, 0, 0, node.v];
    if (node.t === "var") {
      const index = "xyz".indexOf(node.n);
      if (node.n.length !== 1 || index < 0)
        throw new Error("Mặt phẳng chỉ dùng x, y, z và hệ số số.");
      return [0, 1, 2, 3].map((i) => (i === index ? 1 : 0)) as Linear;
    }
    if (node.t === "neg") return linear(node.a).map((n) => -n) as Linear;
    if (node.t === "bin") {
      const a = linear(node.a),
        b = linear(node.b);
      const constant = (p: Linear) => p.slice(0, 3).every((n) => n === 0);
      if (node.op === "+" || node.op === "-")
        return a.map((n, i) => n + (node.op === "+" ? b[i] : -b[i])) as Linear;
      if (node.op === "*" && (constant(a) || constant(b))) {
        const factor = constant(a) ? a[3] : b[3],
          v = constant(a) ? b : a;
        return v.map((n) => n * factor) as Linear;
      }
      if (node.op === "/" && constant(b) && b[3] !== 0)
        return a.map((n) => n / b[3]) as Linear;
      if (node.op === "^" && constant(b) && b[3] === 1) return a;
    }
    throw new Error("Phương trình mặt phẳng phải bậc nhất theo x, y, z.");
  };
  const sides = expression.split("=");
  if (sides.length !== 2)
    throw new Error("Nhập phương trình dạng Ax + By + Cz + D = 0.");
  const a = linear(compileExpr(sides[0]).ast),
    b = linear(compileExpr(sides[1]).ast);
  const coefficients = a.map((n, i) => n - b[i]);
  const normal = coefficients.slice(0, 3) as Vec3;
  planeBasis(normal);
  if (!finite(...coefficients))
    throw new Error("Hệ số mặt phẳng phải hữu hạn.");
  return { normal, offset: coefficients[3] };
}
export function planeBasis(normal: Vec3): [Vec3, Vec3] {
  const length = Math.hypot(...normal);
  if (!finite(...normal) || length < 1e-10)
    throw new Error("Vectơ pháp tuyến phải khác 0.");
  const n = mul3(normal, 1 / length);
  const u0 = cross3(n, Math.abs(n[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0]);
  const u = mul3(u0, 1 / Math.hypot(...u0));
  return [u, cross3(n, u)];
}

export function spherePlane(
  center: Vec3,
  radius: number,
  normal: Vec3,
  offset: number,
) {
  if (!finite(...center, radius, ...normal, offset) || radius <= 0)
    throw new Error("Tâm và bán kính mặt cầu không hợp lệ.");
  const [u, v] = planeBasis(normal);
  const norm = Math.hypot(...normal);
  const signed = (dot3(normal, center) + offset) / norm;
  const foot = add3(center, mul3(normal, -signed / norm));
  const distance = Math.abs(signed);
  const tolerance = 1e-8 * Math.max(1, radius, distance);
  const relation: "disjoint" | "tangent" | "circle" =
    distance > radius + tolerance
      ? "disjoint"
      : Math.abs(distance - radius) <= tolerance
        ? "tangent"
        : "circle";
  const sectionRadius =
    relation === "circle"
      ? Math.sqrt(Math.max(0, radius * radius - signed * signed))
      : 0;
  return { distance, foot, sectionRadius, relation, u, v };
}

/** Tổng đĩa trung điểm, đối chiếu Simpson ở hai lưới. Từ chối khoảng không xác định;
 * đây là tích phân số cho hàm liên tục, không phải bộ giải tích phân suy rộng. */
export function revolution(
  expression: string,
  a: number,
  b: number,
  slices: number,
) {
  if (
    !finite(a, b, slices) ||
    b <= a ||
    slices < 1 ||
    slices > 200 ||
    !Number.isInteger(slices)
  )
    throw new Error("Cần a < b và 1–200 lát cắt.");
  const compiled = compileExpr(expression);
  if (compiled.params.length || compiled.variables.some((v) => v !== "x"))
    throw new Error("Chỉ dùng hàm theo biến x.");
  const f = (x: number) => {
    const y = compiled.eval(x);
    if (!Number.isFinite(y) || Math.abs(y) > 1e5)
      throw new Error(
        "Hàm không xác định hoặc vượt miền hiển thị. Hãy chọn khoảng liên tục hữu hạn.",
      );
    return y;
  };
  const dx = (b - a) / slices;
  const disks = Array.from({ length: slices }, (_, i) => {
    const x = a + (i + 0.5) * dx;
    return { x, radius: Math.abs(f(x)), dx };
  });
  const simpson = (n: number) => {
    const h = (b - a) / n;
    let sum = f(a) ** 2 + f(b) ** 2;
    for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * f(a + i * h) ** 2;
    return (Math.PI * h * sum) / 3;
  };
  const coarse = simpson(1024);
  const reference = simpson(2048);
  if (Math.abs(reference - coarse) > 1e-4 * Math.max(1, Math.abs(reference)))
    throw new Error(
      "Tích phân số chưa hội tụ. Hãy kiểm tra điểm gián đoạn hoặc thu hẹp khoảng.",
    );
  const volume = Math.PI * disks.reduce((s, d) => s + d.radius ** 2 * dx, 0);
  const profile = Array.from({ length: 101 }, (_, i): Vec3 => {
    const x = a + ((b - a) * i) / 100;
    return [x, Math.abs(f(x)), 0];
  });
  return {
    disks,
    profile,
    volume,
    reference,
    error: Math.abs(volume - reference),
  };
}

export function triangleCenters(a: Point2, b: Point2, c: Point2) {
  if (!finite(...a, ...b, ...c)) return null;
  const d =
    2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  const sq = (p: Point2) => p[0] ** 2 + p[1] ** 2;
  const dist = (p: Point2, q: Point2) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const scale = Math.max(dist(a, b), dist(b, c), dist(c, a));
  if (scale < 1e-9 || Math.abs(d) < 1e-8 * scale * scale) return null;
  const o: Point2 = [
    (sq(a) * (b[1] - c[1]) + sq(b) * (c[1] - a[1]) + sq(c) * (a[1] - b[1])) / d,
    (sq(a) * (c[0] - b[0]) + sq(b) * (a[0] - c[0]) + sq(c) * (b[0] - a[0])) / d,
  ];
  const h: Point2 = [
    a[0] + b[0] + c[0] - 2 * o[0],
    a[1] + b[1] + c[1] - 2 * o[1],
  ];
  const g: Point2 = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
  const sides = [dist(b, c), dist(c, a), dist(a, b)];
  const perimeter = sides.reduce((s, v) => s + v, 0);
  const inc: Point2 = [0, 1].map(
    (j) => (a[j] * sides[0] + b[j] * sides[1] + c[j] * sides[2]) / perimeter,
  ) as Point2;
  return {
    o,
    h,
    g,
    inc,
    radius: dist(o, a),
    inradius: Math.abs(d) / 2 / perimeter,
  };
}

export function inversePoint(p: Point2, k: number): Point2 | null {
  const d = p[0] ** 2 + p[1] ** 2;
  return finite(...p, k) && k > 0 && d > 1e-12
    ? [(k * p[0]) / d, (k * p[1]) / d]
    : null;
}
/** Đối cực với đường tròn tâm gốc, bán kính R: p.x * x + p.y * y = R². */
export function polarLine(p: Point2, radius: number) {
  const foot = inversePoint(p, radius * radius);
  return foot ? { foot, direction: [-p[1], p[0]] as Point2 } : null;
}

export type LatticeKind = "SC" | "BCC" | "FCC";
export function lattice(kind: LatticeKind, radius: number) {
  if (!finite(radius) || radius <= 0)
    throw new Error("Bán kính nguyên tử phải dương.");
  const corners: Vec3[] = [];
  for (const x of [0, 1])
    for (const y of [0, 1]) for (const z of [0, 1]) corners.push([x, y, z]);
  const extras: Vec3[] =
    kind === "BCC"
      ? [[0.5, 0.5, 0.5]]
      : kind === "FCC"
        ? [
            [0, 0.5, 0.5],
            [1, 0.5, 0.5],
            [0.5, 0, 0.5],
            [0.5, 1, 0.5],
            [0.5, 0.5, 0],
            [0.5, 0.5, 1],
          ]
        : [];
  const atoms = kind === "FCC" ? 4 : kind === "BCC" ? 2 : 1;
  const edge =
    radius *
    (kind === "FCC" ? 2 * Math.sqrt(2) : kind === "BCC" ? 4 / Math.sqrt(3) : 2);
  return {
    sites: [...corners, ...extras],
    atoms,
    edge,
    packing: (atoms * 4 * Math.PI * radius ** 3) / (3 * edge ** 3),
    coordination: kind === "FCC" ? 12 : kind === "BCC" ? 8 : 6,
  };
}
export type MillerPlane = "100" | "110" | "111";
export const MILLER_VERTICES: Record<MillerPlane, Vec3[]> = {
  "100": [
    [1, 0, 0],
    [1, 1, 0],
    [1, 1, 1],
    [1, 0, 1],
  ],
  "110": [
    [1, 0, 0],
    [0, 1, 0],
    [0, 1, 1],
    [1, 0, 1],
  ],
  "111": [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
};

/** Điền orbital bát diện theo Hund, Pauli và so sánh Δ với P (mô hình một P).
 * Ở Δ=P có suy biến; trả cả hai cấu hình để không gán tùy tiện một spin duy nhất. */
export function crystalField(d: number, delta: number, pairing: number) {
  if (
    !Number.isInteger(d) ||
    d < 0 ||
    d > 10 ||
    !finite(delta, pairing) ||
    delta <= 0 ||
    pairing <= 0
  )
    throw new Error("Cần d⁰–d¹⁰, Δ và P dương.");
  const fill = (n: number, slots: number) =>
    Array.from(
      { length: slots },
      (_, i) =>
        (i < Math.min(n, slots) ? 1 : 0) + (i < Math.max(0, n - slots) ? 1 : 0),
    );
  const highT = Math.min(d, 3) + Math.min(Math.max(d - 5, 0), 3);
  const config = (t: number) => {
    const occupancy = [...fill(t, 3), ...fill(d - t, 2)];
    const pairs = occupancy.filter((n) => n === 2).length;
    const unpaired = occupancy.filter((n) => n === 1).length;
    const cfse = (-0.4 * t + 0.6 * (d - t)) * delta;
    return {
      occupancy,
      t,
      e: d - t,
      pairs,
      unpaired,
      cfse,
      energy: cfse + pairs * pairing,
      moment: Math.sqrt(unpaired * (unpaired + 2)),
    };
  };
  const high = config(highT);
  const low = config(Math.min(d, 6));
  const variableSpin = d >= 4 && d <= 7;
  const crossover = variableSpin && Math.abs(delta - pairing) < 1e-9;
  const spin: "fixed" | "crossover" | "low" | "high" = !variableSpin
    ? "fixed"
    : crossover
      ? "crossover"
      : delta > pairing
        ? "low"
        : "high";
  const ground = !crossover && delta > pairing ? low : high;
  return { ...ground, spin, high, low, crossover };
}

/** Tọa độ minh họa cơ chế, không phải quỹ đạo động lực học phân tử.
 * Cơ chất CH3Cl: lật hình học, không gán R/S vì không có tâm bất đối. */
export function sn2(progress: number, barrier = 60) {
  if (!finite(progress, barrier) || barrier <= 0)
    throw new Error("Progression et barrière invalides.");
  const p = Math.max(0, Math.min(1, progress));
  const incoming: Vec3 = [-3.4 + 2 * p, 0, 0];
  const leaving: Vec3 = [1.4 + 2 * p, 0, 0];
  const umbrella = (2 * p - 1) / 3;
  const hydrogens: Vec3[] = [0, 1, 2].map((i) => [
    umbrella,
    Math.sqrt(1 - umbrella ** 2) * Math.cos((i * 2 * Math.PI) / 3),
    Math.sqrt(1 - umbrella ** 2) * Math.sin((i * 2 * Math.PI) / 3),
  ]);
  const stage: "reactants" | "products" | "transition" =
    p < 0.45 ? "reactants" : p > 0.55 ? "products" : "transition";
  return {
    p,
    incoming,
    leaving,
    hydrogens,
    forming: p,
    breaking: 1 - p,
    energy: barrier * Math.sin(Math.PI * p) ** 2,
    stage,
  };
}

export type CycloForm = "chair" | "boat" | "twist" | "inverted";
export interface CyclohexaneResult {
  form: CycloForm;
  energyKj: number;
  carbons: Point2[];
  axialBonds: [Point2, Point2][];
  equatorialBonds: [Point2, Point2][];
  stabilityNote: string;
}

export function cyclohexaneConformation(form: CycloForm = "chair"): CyclohexaneResult {
  let carbons: Point2[];
  let energyKj = 0;
  let stabilityNote = "Cấu dạng bền nhất (0 kJ/mol), không có sức căng góc hay che khuất.";

  if (form === "chair") {
    carbons = [
      [-60, 20],
      [-30, -25],
      [30, -25],
      [60, 20],
      [25, 45],
      [-35, 45],
    ];
    energyKj = 0;
  } else if (form === "boat") {
    carbons = [
      [-60, -20],
      [-30, 25],
      [30, 25],
      [60, -20],
      [25, 45],
      [-35, 45],
    ];
    energyKj = 29.5;
    stabilityNote = "Kém bền (+29.5 kJ/mol) do tương tác cờ chóp flagpole H1-H4 và sức căng che khuất.";
  } else if (form === "twist") {
    carbons = [
      [-55, -5],
      [-25, 20],
      [35, 10],
      [55, -15],
      [20, 38],
      [-40, 35],
    ];
    energyKj = 23.0;
    stabilityNote = "Cấu dạng xoắn thuyền (+23 kJ/mol), giảm nhẹ sức căng flagpole so với thuyền.";
  } else {
    carbons = [
      [-60, -20],
      [-30, 25],
      [30, 25],
      [60, -20],
      [25, -45],
      [-35, -45],
    ];
    energyKj = 0;
    stabilityNote = "Cấu dạng ghế lật (Ring-flip), nhóm thế trục và xích đạo hoán đổi vị trí cho nhau.";
  }

  const axialBonds: [Point2, Point2][] = [
    [carbons[0], [carbons[0][0], carbons[0][1] + (form === "chair" ? 28 : -28)]],
    [carbons[1], [carbons[1][0], carbons[1][1] - 28]],
    [carbons[2], [carbons[2][0], carbons[2][1] + 28]],
    [carbons[3], [carbons[3][0], carbons[3][1] - 28]],
    [carbons[4], [carbons[4][0], carbons[4][1] + 28]],
    [carbons[5], [carbons[5][0], carbons[5][1] - 28]],
  ];

  const equatorialBonds: [Point2, Point2][] = [
    [carbons[0], [carbons[0][0] - 22, carbons[0][1] - 12]],
    [carbons[1], [carbons[1][0] - 20, carbons[1][1] + 16]],
    [carbons[2], [carbons[2][0] + 20, carbons[2][1] - 16]],
    [carbons[3], [carbons[3][0] + 22, carbons[3][1] + 12]],
    [carbons[4], [carbons[4][0] + 18, carbons[4][1] + 18]],
    [carbons[5], [carbons[5][0] - 18, carbons[5][1] - 18]],
  ];

  return { form, energyKj, carbons, axialBonds, equatorialBonds, stabilityNote };
}

export interface EtcResult {
  pmfMv: number;
  atpRate: number;
  matrixPh: number;
  imsPh: number;
  rotorSpeed: number;
  statusMessage: string;
}

export function etcRespiration(cyanide = false, dnp = false, o2Level = 100): EtcResult {
  const o2Factor = Math.max(0, Math.min(100, o2Level)) / 100;

  if (cyanide) {
    return {
      pmfMv: 15,
      atpRate: 0,
      matrixPh: 7.4,
      imsPh: 7.4,
      rotorSpeed: 0,
      statusMessage: "Ngộ độc Cyanide (CN⁻): Phức hệ IV bị ức chế, chuỗi truyền e tắc nghẽn, gradient H⁺ tiêu biến, ATP = 0.",
    };
  }

  if (dnp) {
    return {
      pmfMv: 45,
      atpRate: 8,
      matrixPh: 7.3,
      imsPh: 7.2,
      rotorSpeed: 0.1,
      statusMessage: "Chất dỡ cặp DNP: Màng bị rò rỉ proton, năng lượng hóa điện tiêu tán thành nhiệt, tổng hợp ATP sụt giảm.",
    };
  }

  const pmf = Math.round(220 * o2Factor);
  const atpRate = Math.round(100 * o2Factor);
  const deltaPh = 0.8 * o2Factor;
  const rotorSpeed = 2.5 * o2Factor;

  return {
    pmfMv: pmf,
    atpRate,
    matrixPh: Number((7.4 + deltaPh / 2).toFixed(2)),
    imsPh: Number((7.4 - deltaPh / 2).toFixed(2)),
    rotorSpeed,
    statusMessage: o2Factor > 0.5 ? "Hô hấp tế bào bình thường: Dòng proton quay ATP Synthase tổng hợp ATP dồi dào." : "Thiếu oxy: Tốc độ chuỗi ETC suy giảm.",
  };
}

export interface LotkaVolterraResult {
  timeline: { t: number; prey: number; predator: number }[];
  phasePoints: Point2[];
  equilibrium: Point2;
  currentPrey: number;
  currentPredator: number;
  periodApprox: number;
}

export function lotkaVolterraRun(
  alpha = 1.0,
  beta = 0.1,
  gamma = 1.0,
  delta = 0.05,
  x0 = 15,
  y0 = 8,
  steps = 100,
  dt = 0.1
): LotkaVolterraResult {
  const safeAlpha = Math.max(0.1, alpha);
  const safeBeta = Math.max(0.01, beta);
  const safeGamma = Math.max(0.1, gamma);
  const safeDelta = Math.max(0.01, delta);

  const eqPrey = safeGamma / safeDelta;
  const eqPred = safeAlpha / safeBeta;

  const timeline: { t: number; prey: number; predator: number }[] = [];
  const phasePoints: Point2[] = [];

  let x = Math.max(0.5, x0);
  let y = Math.max(0.5, y0);

  for (let i = 0; i < steps; i++) {
    const t = Number((i * dt).toFixed(2));
    timeline.push({ t, prey: Number(x.toFixed(2)), predator: Number(y.toFixed(2)) });
    phasePoints.push([Number(x.toFixed(2)), Number(y.toFixed(2))]);

    const f = (px: number, py: number): [number, number] => [
      safeAlpha * px - safeBeta * px * py,
      safeDelta * px * py - safeGamma * py,
    ];

    const [k1x, k1y] = f(x, y);
    const [k2x, k2y] = f(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y);
    const [k3x, k3y] = f(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y);
    const [k4x, k4y] = f(x + dt * k3x, y + dt * k3y);

    x = Math.max(0.1, x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x));
    y = Math.max(0.1, y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y));
  }

  const periodApprox = Number(((2 * Math.PI) / Math.sqrt(safeAlpha * safeGamma)).toFixed(2));

  return {
    timeline,
    phasePoints,
    equilibrium: [Number(eqPrey.toFixed(2)), Number(eqPred.toFixed(2))],
    currentPrey: timeline[timeline.length - 1].prey,
    currentPredator: timeline[timeline.length - 1].predator,
    periodApprox,
  };
}

export interface SignalResult {
  gpcrActive: boolean;
  gAlphaActive: boolean;
  campLevel: number;
  pkaActive: boolean;
  caspaseCascade: boolean;
  cellFate: "GLYCOGEN_BREAKDOWN" | "APOPTOSIS_DEATH" | "BASAL_HOMEOSTASIS";
  message: string;
}

export function signalTransductionRun(ligand = false, apoptosisTrigger = false): SignalResult {
  if (apoptosisTrigger) {
    return {
      gpcrActive: false,
      gAlphaActive: false,
      campLevel: 2,
      pkaActive: false,
      caspaseCascade: true,
      cellFate: "APOPTOSIS_DEATH",
      message: "Con đường Apoptosis: Thụ thể Fas kích hoạt Caspase-8 và Caspase-3, tế bào tự phân hủy có trật tự.",
    };
  }

  if (ligand) {
    return {
      gpcrActive: true,
      gAlphaActive: true,
      campLevel: 95,
      pkaActive: true,
      caspaseCascade: false,
      cellFate: "GLYCOGEN_BREAKDOWN",
      message: "Kích hoạt GPCR: Gα đổi GDP sang GTP, Adenylate Cyclase tăng vọt cAMP kích hoạt PKA phân giải glycogen.",
    };
  }

  return {
    gpcrActive: false,
    gAlphaActive: false,
    campLevel: 8,
    pkaActive: false,
    caspaseCascade: false,
    cellFate: "BASAL_HOMEOSTASIS",
    message: "Trạng thái nghỉ cơ bản: Thụ thể GPCR không liên kết phối tử, G-protein ở dạng phức hệ Gαβγ-GDP.",
  };
}

export const ADVANCED_TEMPLATES = {
  MATH_3D_OXYZ: {
    engine: "MATH",
    title: "Mặt cầu và mặt phẳng Oxyz",
    question:
      "Khi khoảng cách từ tâm đến mặt phẳng bằng bán kính, thiết diện thay đổi thế nào?",
  },
  MATH_INTEGRAL_3D_REVOLVE: {
    engine: "MATH",
    title: "Thể tích khối tròn xoay",
    question:
      "Tăng số lát cắt có làm tổng thể tích các đĩa tiến gần tích phân không?",
  },
  MATH_DYNAMIC_GEOMETRY: {
    engine: "MATH",
    title: "Hình học động, đối cực và nghịch đảo",
    question:
      "Khi kéo các đỉnh tam giác, ba điểm O, G, H có còn thẳng hàng không?",
  },
  CHEM_SN2_MECHANISM: {
    engine: "CHEMISTRY",
    title: "Cơ chế SN2 và nghịch đảo Walden",
    question:
      "Vì sao nhóm tấn công phải đến từ phía đối diện nhóm rời đi? CH₃Cl có tâm bất đối không?",
  },
  CHEM_CRYSTAL_LATTICE: {
    engine: "CHEMISTRY",
    title: "Ô mạng tinh thể SC, BCC và FCC",
    question:
      "Vì sao 14 vị trí tâm nguyên tử trong hình FCC chỉ đóng góp 4 nguyên tử cho một ô mạng?",
  },
  CHEM_CFT_COMPLEX_3D: {
    engine: "CHEMISTRY",
    title: "Trường tinh thể bát diện",
    question:
      "Với d⁶, điều gì xảy ra với số electron độc thân khi Δ vượt năng lượng ghép đôi P?",
  },
  CHEM_ORGANIC_SKELETAL: {
    engine: "CHEMISTRY",
    title: "Cấu dạng ghế và thuyền Cyclohexane",
    question:
      "Tại sao cấu dạng ghế lại bền hơn cấu dạng thuyền 29.5 kJ/mol? Khi lật vòng (ring-flip), các liên kết trục biến đổi thế nào?",
  },
  BIO_CELL_RESPIRATION: {
    engine: "BIOLOGY",
    title: "Chuỗi truyền electron và ATP Synthase",
    question:
      "Ion nào tạo ra động lực quay rotor của ATP Synthase? Vì sao chất độc Cyanide lại làm ngừng trệ toàn bộ quá trình tạo năng lượng?",
  },
  BIO_LOTKA_VOLTERRA: {
    engine: "BIOLOGY",
    title: "Động thái quần thể Lotka–Volterra",
    question:
      "Tại sao đỉnh số lượng thú săn mồi luôn đi sau đỉnh số lượng con mồi? Điều kiện để hai loài cùng tồn tại chu kỳ là gì?",
  },
  BIO_CELL_SIGNALING: {
    engine: "BIOLOGY",
    title: "Truyền tin tế bào GPCR và Apoptosis",
    question:
      "Phân tử truyền tin thứ hai cAMP được tạo ra từ chất nào? Khi nào tế bào chuyển từ tín hiệu sinh trưởng sang chết theo chương trình?",
  },
} as const;

export type AdvancedId = keyof typeof ADVANCED_TEMPLATES;

export function matchAdvancedKeywords(
  text: string,
): { templateId: AdvancedId; meta: Record<string, string | number> } | null {
  const t = text.normalize("NFKC").replace(/S_?\{?N\}?\s*_?\{?2\}?/gi, "SN2");
  if (/\bsn2\b|nghịch đảo walden|walden inversion/i.test(t))
    return { templateId: "CHEM_SN2_MECHANISM", meta: {} };
  if (
    /\bcft\b|trường tinh thể|tách mức.*(?:orbital|phức)|\[Fe\((?:CN|H2O)\)6\]/i.test(
      t,
    )
  ) {
    const d = /\bd\s*\^?\{?(10|[0-9])\}?\b/i.exec(t);
    return {
      templateId: "CHEM_CFT_COMPLEX_3D",
      meta: { d: d ? Number(d[1]) : 6, delta: /CN/i.test(t) ? 1.8 : 0.7 },
    };
  }
  if (
    /\b(?:bcc|fcc)\b|mạng tinh thể|ô mạng|crystal lattice|lập phương (?:tâm|đơn)/i.test(
      t,
    )
  )
    return {
      templateId: "CHEM_CRYSTAL_LATTICE",
      meta: {
        kind: /\bfcc\b|tâm diện/i.test(t)
          ? "FCC"
          : /\bsc\b|đơn giản/i.test(t)
            ? "SC"
            : "BCC",
      },
    };
  if (/tròn xoay|riemann|solid of revolution/i.test(t)) {
    const f = /(?:f\(x\)|y)\s*=\s*([^;\n]+)/i.exec(t);
    const a = /\ba\s*=\s*(-?\d+(?:[.,]\d+)?)/i.exec(t);
    const b = /\bb\s*=\s*(-?\d+(?:[.,]\d+)?)/i.exec(t);
    return {
      templateId: "MATH_INTEGRAL_3D_REVOLVE",
      meta: {
        expression: f?.[1]?.trim() ?? "x",
        a: a ? Number(a[1].replace(",", ".")) : 0,
        b: b ? Number(b[1].replace(",", ".")) : 2,
      },
    };
  }
  if (/\boxyz\b|mặt cầu.*mặt phẳng|mặt phẳng.*mặt cầu/i.test(t)) {
    const plane = /(?:\(P\)|\bP|mặt phẳng)\s*:\s*([^;\n]+=[^;\n]+)/i.exec(t);
    return {
      templateId: "MATH_3D_OXYZ",
      meta: plane ? { plane: plane[1].trim() } : {},
    };
  }
  if (
    /hình học động|đường euler|đối cực|phép nghịch đảo|dynamic geometry/i.test(
      t,
    )
  )
    return { templateId: "MATH_DYNAMIC_GEOMETRY", meta: {} };

  if (/cyclohexane|cấu dạng|ghế|thuyền|ring.*flip|chair|boat|đồng phân cấu dạng/i.test(t)) {
    return {
      templateId: "CHEM_ORGANIC_SKELETAL",
      meta: { form: /thuyền|boat/i.test(t) ? "boat" : /xoắn|twist/i.test(t) ? "twist" : "chair" },
    };
  }

  if (/ti thể|etc|chuỗi truyền electron|atp synthase|hô hấp tế bào|respiration|cyanide/i.test(t)) {
    return {
      templateId: "BIO_CELL_RESPIRATION",
      meta: { cyanide: /cyanide|ngộ độc/i.test(t) ? 1 : 0 },
    };
  }

  if (/lotka|volterra|con mồi|săn mồi|quần thể 2 loài|thỏ.*sói|mặt phẳng pha/i.test(t)) {
    return {
      templateId: "BIO_LOTKA_VOLTERRA",
      meta: {},
    };
  }

  if (/gpcr|g-protein|camp|adenylate|truyền tin|apoptosis|caspase/i.test(t)) {
    return {
      templateId: "BIO_CELL_SIGNALING",
      meta: { apoptosis: /apoptosis|chết|caspase/i.test(t) ? 1 : 0 },
    };
  }

  return null;
}
