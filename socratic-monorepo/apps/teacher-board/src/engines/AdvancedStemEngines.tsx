"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import type { SimulationBlueprint } from "@socratic/types";
import { fmtNum } from "../utils/mathExpr";
import {
  add3,
  mul3,
  spherePlane,
  parsePlane,
  revolution,
  triangleCenters,
  inversePoint,
  polarLine,
  lattice,
  MILLER_VERTICES,
  crystalField,
  sn2,
  cyclohexaneConformation,
  etcRespiration,
  lotkaVolterraRun,
  signalTransductionRun,
  type Vec3,
  type Point2,
  type LatticeKind,
  type MillerPlane,
  type CycloForm,
  type CyclohexaneResult,
  type EtcResult,
  type LotkaVolterraResult,
  type SignalResult,
} from "../utils/advancedStemModels";

interface Props {
  blueprint: SimulationBlueprint;
}
const button =
  "min-h-[44px] px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm text-stone-800 hover:bg-blue-50";
const panel = "rounded-xl border border-stone-200 bg-stone-50 p-3";
const num = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
const F = (v: number) => fmtNum(v, 4);
const Control: React.FC<{
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  set: (n: number) => void;
}> = ({ id, label, value, min, max, step = 0.1, set }) => (
  <label className="flex flex-wrap items-center gap-2 min-h-[48px] text-sm text-stone-700">
    <span className="w-32 shrink-0">{label}</span>
    <input
      aria-label={label}
      data-testid={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => set(Number(e.target.value))}
      className="flex-1 min-w-20 h-8 accent-blue-600"
    />
    <output className="w-16 text-right font-mono text-blue-700">
      {F(value)}
    </output>
  </label>
);
const Facts: React.FC<{ items: [string, string][] }> = ({ items }) => (
  <dl className="grid grid-cols-2 gap-2 text-sm">
    {items.map(([k, v]) => (
      <div key={k} className={`${panel} text-center`}>
        <dt className="text-stone-500">{k}</dt>
        <dd className="font-mono font-semibold text-stone-900">{v}</dd>
      </div>
    ))}
  </dl>
);
const ErrorBox: React.FC<{ message: string }> = ({ message }) => (
  <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
    {message}
  </p>
);

type Project = (v: Vec3) => Vec3;
/** SVG vector và phép chiếu trực giao; xoay cục bộ, không phủ toàn màn hình.
 * Tọa độ độc lập với DPR, xử lý capture và hủy con trỏ. */
const Scene: React.FC<{
  label: string;
  extent?: number;
  children: (p: Project, gradient: string) => React.ReactNode;
}> = ({ label, extent = 4, children }) => {
  const [angles, setAngles] = useState([-0.3, 0.6]);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const id = useId().replace(/:/g, "");
  const project: Project = ([x, y, z]) => {
    const cy = Math.cos(angles[1]),
      sy = Math.sin(angles[1]),
      cx = Math.cos(angles[0]),
      sx = Math.sin(angles[0]);
    const xx = x * cy + z * sy,
      zz = -x * sy + z * cy;
    const yy = y * cx - zz * sx,
      depth = y * sx + zz * cx;
    const scale = 110 / extent;
    return [260 + xx * scale, 150 - yy * scale, depth];
  };
  const end = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };
  return (
    <div className="flex flex-col gap-1">
      <svg
        role="img"
        aria-label={label}
        viewBox="0 0 520 300"
        className="w-full rounded-xl border border-stone-200/50 bg-white/95 dark:bg-stone-900/90 shadow-sm"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          if (drag.current || e.button !== 0) return;
          e.stopPropagation();
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          e.stopPropagation();
          const dx = e.clientX - d.x,
            dy = e.clientY - d.y;
          setAngles(([x, y]) => [
            Math.max(-1.5, Math.min(1.5, x + dy * 0.009)),
            y + dx * 0.009,
          ]);
          d.x = e.clientX;
          d.y = e.clientY;
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      >
        <defs>
          <radialGradient id={id} cx="30%" cy="25%" r="80%">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.25" stopColor="#93C5FD" />
            <stop offset="0.7" stopColor="#2563EB" />
            <stop offset="1" stopColor="#172554" />
          </radialGradient>
        </defs>
        {children(project, id)}
      </svg>
      <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
        <span>Kéo hình để xoay bằng chuột, bút hoặc ngón tay.</span>
        <button className={button} onClick={() => setAngles([-0.3, 0.6])}>
          Góc nhìn gốc
        </button>
      </div>
    </div>
  );
};
const line3 = (
  p: Project,
  a: Vec3,
  b: Vec3,
  color: string,
  key?: React.Key,
  dash?: string,
) => {
  const u = p(a),
    v = p(b);
  return (
    <line
      key={key}
      x1={u[0]}
      y1={u[1]}
      x2={v[0]}
      y2={v[1]}
      stroke={color}
      strokeWidth="2"
      strokeDasharray={dash}
    />
  );
};
const points3 = (p: Project, points: Vec3[]) =>
  points.map((v) => p(v).slice(0, 2).join(",")).join(" ");
const ring = (center: Vec3, u: Vec3, v: Vec3, r: number, n = 96): Vec3[] =>
  Array.from({ length: n + 1 }, (_, i) =>
    add3(
      center,
      add3(
        mul3(u, r * Math.cos((i * 2 * Math.PI) / n)),
        mul3(v, r * Math.sin((i * 2 * Math.PI) / n)),
      ),
    ),
  );

export const OxyzEngine: React.FC<Props> = ({ blueprint }) => {
  const [planeDraft, setPlaneDraft] = useState(
    typeof blueprint.meta?.plane === "string" ? blueprint.meta.plane : "z-1=0",
  );
  const [initial] = useState(() => {
    try {
      return { ...parsePlane(planeDraft), error: "" };
    } catch (e) {
      return {
        normal: [0, 0, 1] as Vec3,
        offset: -1,
        error: (e as Error).message,
      };
    }
  });
  const [parseError, setParseError] = useState(initial.error);
  const [center, setCenter] = useState<Vec3>([0, 0, 0]);
  const [radius, setRadius] = useState<number>(() => {
    if (typeof blueprint.meta?.radius === "number" && blueprint.meta.radius > 0) {
      return Math.round(blueprint.meta.radius * 100) / 100;
    }
    return 2;
  });
  const [normal, setNormal] = useState<Vec3>(initial.normal);
  const [offset, setOffset] = useState(initial.offset);
  let result: ReturnType<typeof spherePlane> | null = null,
    error = parseError;
  try {
    if (!parseError) result = spherePlane(center, radius, normal, offset);
  } catch (e) {
    error = (e as Error).message;
  }
  const r = result;
  const extent = Math.max(
    3.5,
    Math.hypot(...center) + radius + 0.6,
    r ? Math.hypot(...r.foot) + 0.6 : 0,
  );
  const relation = {
    circle: "Cắt theo đường tròn",
    tangent: "Tiếp xúc tại một điểm",
    disjoint: "Không giao nhau",
  };
  const setCoord = (i: number, v: number) =>
    setCenter((c) => c.map((x, j) => (j === i ? v : x)) as Vec3);
  return (
    <div
      className="p-4 flex flex-col gap-3"
      data-testid="oxyz-engine"
      data-relation={r?.relation}
    >
      <p className="text-sm font-mono text-stone-700">
        (P): {normal.map((n, i) => `${F(n)}${"xyz"[i]}`).join(" + ")} + (
        {F(offset)}) = 0
      </p>
      {error && <ErrorBox message={error} />}
      {r && (
        <>
          <Scene
            label="Mặt cầu, mặt phẳng và đường tròn thiết diện"
            extent={extent}
          >
            {(p) => (
              <>
                {(
                  [
                    [1, 0, 0],
                    [0, 1, 0],
                    [0, 0, 1],
                  ] as Vec3[]
                ).map((axis, i) => (
                  <g key={i}>
                    {line3(
                      p,
                      mul3(axis, -extent),
                      mul3(axis, extent),
                      "#A8A29E",
                    )}
                    <text
                      x={p(mul3(axis, extent))[0] + 4}
                      y={p(mul3(axis, extent))[1]}
                      fontSize="14"
                    >
                      {"xyz"[i]}
                    </text>
                  </g>
                ))}
                <polygon
                  points={points3(
                    p,
                    [
                      [-1, -1],
                      [1, -1],
                      [1, 1],
                      [-1, 1],
                    ].map(([a, b]) =>
                      add3(
                        r.foot,
                        add3(
                          mul3(r.u, a * radius * 1.4),
                          mul3(r.v, b * radius * 1.4),
                        ),
                      ),
                    ),
                  )}
                  fill="#F59E0B"
                  fillOpacity="0.12"
                  stroke="#D97706"
                />
                {(
                  [
                    [1, 0, 0],
                    [0, 1, 0],
                    [0, 0, 1],
                  ] as Vec3[]
                ).map((u, i, axes) => (
                  <polyline
                    key={i}
                    points={points3(
                      p,
                      ring(center, u, axes[(i + 1) % 3], radius),
                    )}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2"
                  />
                ))}
                {line3(p, center, r.foot, "#DC2626", undefined, "5 4")}
                {r.relation === "circle" && (
                  <polyline
                    points={points3(p, ring(r.foot, r.u, r.v, r.sectionRadius))}
                    fill="#10B981"
                    fillOpacity="0.13"
                    stroke="#059669"
                    strokeWidth="3"
                  />
                )}
                {[
                  { point: center, label: "I", color: "#2563EB" },
                  { point: r.foot, label: "H", color: "#DC2626" },
                ].map(({ point, label, color }) => (
                  <g key={label}>
                    <circle
                      cx={p(point)[0]}
                      cy={p(point)[1]}
                      r="5"
                      fill={color}
                    />
                    <text
                      x={p(point)[0] + 8}
                      y={p(point)[1] - 7}
                      fontSize="15"
                      fill={color}
                    >
                      {label}
                    </text>
                  </g>
                ))}
              </>
            )}
          </Scene>
          <Facts
            items={[
              ["Vị trí tương đối", relation[r.relation]],
              ["d(I, P)", F(r.distance)],
              ["Bán kính thiết diện", F(r.sectionRadius)],
              ["Hình chiếu H", r.foot.map(F).join("; ")],
            ]}
          />
        </>
      )}
      <div className={panel}>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">
            Phương trình (P){" "}
            <input
              aria-label="Phương trình mặt phẳng"
              value={planeDraft}
              onChange={(e) => setPlaneDraft(e.target.value)}
              className="max-w-full border border-stone-300 rounded-lg px-3 py-2"
            />
          </label>
          <button
            className={button}
            onClick={() => {
              try {
                const p = parsePlane(planeDraft);
                setNormal(p.normal);
                setOffset(p.offset);
                setParseError("");
              } catch (e) {
                setParseError((e as Error).message);
              }
            }}
          >
            Áp dụng mặt phẳng
          </button>
        </div>
        <Control
          id="ox-r"
          label="Bán kính R"
          value={radius}
          min={0.3}
          max={4}
          set={setRadius}
        />
        <Control
          id="ox-d"
          label="Hệ số D"
          value={offset}
          min={-6}
          max={6}
          set={setOffset}
        />
        {center.map((v, i) => (
          <Control
            key={i}
            id={`ox-center-${i}`}
            label={`Tâm I: ${"xyz"[i]}`}
            value={v}
            min={-3}
            max={3}
            set={(n) => setCoord(i, n)}
          />
        ))}
        {normal.map((v, i) => (
          <Control
            key={i}
            id={`ox-normal-${i}`}
            label={`Pháp tuyến ${"ABC"[i]}`}
            value={v}
            min={-3}
            max={3}
            set={(n) =>
              setNormal((a) => a.map((x, j) => (j === i ? n : x)) as Vec3)
            }
          />
        ))}
        <div className="flex flex-wrap gap-2">
          {[
            ["Cắt", 0],
            ["Tiếp xúc", -radius],
            ["Không giao", -radius - 1],
          ].map(([label, d]) => (
            <button
              key={label}
              className={button}
              onClick={() => {
                setCenter([0, 0, 0]);
                setNormal([0, 0, 1]);
                setOffset(Number(d));
                setPlaneDraft(`z+(${d})=0`);
                setParseError("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-stone-500">
        IH vuông góc (P); r² = R² − IH² khi mặt phẳng cắt mặt cầu. Các đường
        tròn xanh là khung dây mặt cầu.
      </p>
    </div>
  );
};

export const RevolutionEngine: React.FC<Props> = ({ blueprint }) => {
  const meta = blueprint.meta ?? {};
  const [expression, setExpression] = useState(
    typeof meta.expression === "string" ? meta.expression : "x",
  );
  const [a, setA] = useState(num(meta.a, 0, -5, 4));
  const [b, setB] = useState(num(meta.b, 2, -4, 5));
  const [n, setN] = useState(12);
  const [angle, setAngle] = useState(360);
  const state = useMemo(() => {
    try {
      return { result: revolution(expression, a, b, n), error: "" };
    } catch (e) {
      return { result: null, error: (e as Error).message };
    }
  }, [expression, a, b, n]);
  const r = state.result;
  const extent = r
    ? Math.max(2, Math.abs(a), Math.abs(b), ...r.disks.map((d) => d.radius)) *
      1.15
    : 3;
  const rmax = r
    ? Math.max(
        0.01,
        ...r.profile.map((p) => p[1]),
        ...r.disks.map((p) => p.radius),
      )
    : 1;
  return (
    <div
      className="p-4 flex flex-col gap-3"
      data-testid="revolution-engine"
      data-volume={r?.volume}
      data-error={r?.error}
    >
      <label className="text-sm text-stone-700">
        f(x) ={" "}
        <input
          aria-label="Hàm tròn xoay"
          className="border border-stone-300 rounded-lg px-3 py-2 max-w-full"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
        />
      </label>
      {state.error && <ErrorBox message={state.error} />}
      {r && (
        <>
          <Scene
            label="Các đĩa Riemann tạo khối tròn xoay quanh Ox"
            extent={extent}
          >
            {(p) => (
              <>
                {line3(p, [a - 0.3, 0, 0], [b + 0.3, 0, 0], "#78716C")}
                {[...r.disks].reverse().map((d, i) => {
                  const arc = Array.from({ length: 49 }, (_, k): Vec3 => [
                    d.x,
                    d.radius * Math.cos((k * angle * Math.PI) / 8640),
                    d.radius * Math.sin((k * angle * Math.PI) / 8640),
                  ]);
                  return (
                    <polygon
                      key={i}
                      points={points3(p, [[d.x, 0, 0], ...arc])}
                      fill="#2563EB"
                      fillOpacity="0.06"
                      stroke="#3B82F6"
                      strokeOpacity="0.65"
                      strokeWidth="1.2"
                    />
                  );
                })}
                <polyline
                  points={points3(p, r.profile)}
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="3"
                />
              </>
            )}
          </Scene>
          <svg
            role="img"
            aria-label="Các hình chữ nhật Riemann dưới bán kính |f(x)|"
            viewBox="0 0 520 155"
            className="w-full border border-stone-200 rounded-xl bg-white"
          >
            {r.disks.map((disk, i) => (
              <rect
                key={i}
                x={35 + (i * 450) / n}
                y={125 - (disk.radius / rmax) * 90}
                width={450 / n}
                height={(disk.radius / rmax) * 90}
                fill="#93C5FD"
                fillOpacity="0.3"
                stroke="#60A5FA"
                strokeWidth="0.8"
              />
            ))}
            <polyline
              points={r.profile
                .map(
                  ([x, y]) =>
                    `${35 + ((x - a) / (b - a)) * 450},${125 - (y / rmax) * 90}`,
                )
                .join(" ")}
              fill="none"
              stroke="#D97706"
              strokeWidth="2.5"
            />
            <line x1="35" y1="125" x2="490" y2="125" stroke="#78716C" />
            <text x="8" y="20" fontSize="13">
              |f(x)|
            </text>
            <text x="35" y="146" fontSize="13">
              a = {F(a)}
            </text>
            <text x="420" y="146" fontSize="13">
              b = {F(b)}
            </text>
          </svg>
          <Facts
            items={[
              ["Tổng đĩa trung điểm", F(r.volume)],
              ["π∫ f(x)² dx (số)", F(r.reference)],
              ["Sai lệch tổng đĩa", F(r.error)],
              ["Phần quét góc θ", F((r.volume * angle) / 360)],
            ]}
          />
        </>
      )}
      <div className={panel}>
        <Control
          id="rev-a"
          label="Cận a"
          value={a}
          min={-5}
          max={4}
          set={setA}
        />
        <Control
          id="rev-b"
          label="Cận b"
          value={b}
          min={-4}
          max={5}
          set={setB}
        />
        <Control
          id="rev-n"
          label="Số lát cắt n"
          value={n}
          min={5}
          max={100}
          step={1}
          set={setN}
        />
        <Control
          id="rev-angle"
          label="Góc quay (độ)"
          value={angle}
          min={0}
          max={360}
          step={5}
          set={setAngle}
        />
        <div className="flex flex-wrap gap-2">
          {[
            ["Nón", "x"],
            ["Trụ", "2"],
            ["Paraboloid", "sqrt(x)"],
            ["Bình lượn", "2+sin(x)"],
          ].map(([label, f]) => (
            <button
              key={f}
              className={button}
              onClick={() => {
                setExpression(f);
                setA(0);
                setB(2);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-stone-500">
        Bán kính là |f(x)|. Tổng đĩa tính cho vòng quay đủ 360°; θ chỉ thay đổi
        phần quét hiển thị. Tích phân tham chiếu là xấp xỉ số cho hàm liên tục.
      </p>
    </div>
  );
};

export const DynamicGeometryEngine: React.FC<Props> = ({ blueprint }) => {
  const initialVertices = useMemo<Point2[]>(() => {
    const raw = blueprint?.meta?.vertices2D;
    if (Array.isArray(raw) && raw.length >= 3) {
      return raw.slice(0, 3).map((pt: unknown) => {
        if (Array.isArray(pt) && pt.length >= 2) {
          return [
            num(pt[0], 0, -4.5, 4.5),
            num(pt[1], 0, -2.6, 2.6),
          ] as Point2;
        }
        return [0, 0] as Point2;
      });
    }
    return [
      [-2, -1],
      [2, -1],
      [0, 2],
    ];
  }, [blueprint?.meta?.vertices2D]);

  const [vertices, setVertices] = useState<Point2[]>(initialVertices);
  useEffect(() => {
    setVertices(initialVertices);
  }, [initialVertices]);

  const [point, setPoint] = useState<Point2>([2.5, 1]);
  const [k, setK] = useState(4);
  const [layers, setLayers] = useState({
    centers: true,
    polar: true,
    inverse: false,
    altitudes: false,
    medians: false,
    ninePoint: false,
  });
  const clipId = useId().replace(/:/g, "");
  const drag = useRef<{ id: number; index: number } | null>(null);
  const centers = triangleCenters(vertices[0], vertices[1], vertices[2]);
  const polar = polarLine(point, 2),
    inv = inversePoint(point, k);
  const xy = (v: Point2): Point2 => [260 + v[0] * 42, 160 - v[1] * 42];
  const screenPoints = (p: Point2[]) => p.map((v) => xy(v).join(",")).join(" ");
  const end = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  // Trung điểm 3 cạnh BC, CA, AB và chân 3 đường cao
  const midpoints = useMemo<Point2[]>(
    () => [
      [(vertices[1][0] + vertices[2][0]) / 2, (vertices[1][1] + vertices[2][1]) / 2],
      [(vertices[2][0] + vertices[0][0]) / 2, (vertices[2][1] + vertices[0][1]) / 2],
      [(vertices[0][0] + vertices[1][0]) / 2, (vertices[0][1] + vertices[1][1]) / 2],
    ],
    [vertices],
  );

  const altitudeFeet = useMemo<Point2[]>(() => {
    const footOnLine = (p: Point2, a: Point2, b: Point2): Point2 => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy;
      if (l2 < 1e-12) return a;
      const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
      return [a[0] + t * dx, a[1] + t * dy];
    };
    return [
      footOnLine(vertices[0], vertices[1], vertices[2]),
      footOnLine(vertices[1], vertices[2], vertices[0]),
      footOnLine(vertices[2], vertices[0], vertices[1]),
    ];
  }, [vertices]);

  // Số đo 3 cạnh và 3 góc (độ) của tam giác ABC
  const triMetrics = useMemo(() => {
    const d2 = (a: Point2, b: Point2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const cLen = d2(vertices[0], vertices[1]);
    const aLen = d2(vertices[1], vertices[2]);
    const bLen = d2(vertices[2], vertices[0]);
    const angAt = (p: Point2, q: Point2, r: Point2) => {
      const ux = q[0] - p[0],
        uy = q[1] - p[1];
      const vx = r[0] - p[0],
        vy = r[1] - p[1];
      const l = Math.hypot(ux, uy) * Math.hypot(vx, vy);
      if (l < 1e-9) return 0;
      return (Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / l))) * 180) / Math.PI;
    };
    const area =
      0.5 *
      Math.abs(
        vertices[0][0] * (vertices[1][1] - vertices[2][1]) +
          vertices[1][0] * (vertices[2][1] - vertices[0][1]) +
          vertices[2][0] * (vertices[0][1] - vertices[1][1]),
      );
    return {
      aLen,
      bLen,
      cLen,
      angA: angAt(vertices[0], vertices[1], vertices[2]),
      angB: angAt(vertices[1], vertices[2], vertices[0]),
      angC: angAt(vertices[2], vertices[0], vertices[1]),
      area,
    };
  }, [vertices]);
  return (
    <div
      className="p-4 flex flex-col gap-3"
      data-testid="dynamic-engine"
      data-degenerate={!centers}
    >
      <svg
        role="img"
        aria-label="Tam giác kéo đỉnh, đường Euler, đối cực và nghịch đảo"
        viewBox="0 0 520 320"
        className="w-full rounded-xl border border-stone-200/50 bg-white/95 dark:bg-stone-900/90 shadow-sm"
        style={{ touchAction: "none" }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          e.stopPropagation();
          const ctm = e.currentTarget.getScreenCTM();
          if (!ctm) return;
          const p = e.currentTarget.createSVGPoint();
          p.x = e.clientX;
          p.y = e.clientY;
          const q = p.matrixTransform(ctm.inverse());
          const v: Point2 = [
            Math.max(-5, Math.min(5, (q.x - 260) / 42)),
            Math.max(-3, Math.min(3, (160 - q.y) / 42)),
          ];
          if (d.index === 3) setPoint(v);
          else setVertices((a) => a.map((p, i) => (i === d.index ? v : p)));
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      >
        <defs>
          <clipPath id={clipId}>
            <rect width="520" height="320" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <line x1="0" y1="160" x2="520" y2="160" stroke="#E7E5E4" />
          <line x1="260" y1="0" x2="260" y2="320" stroke="#E7E5E4" />
          <polygon
            points={screenPoints(vertices)}
            fill="#2563EB"
            fillOpacity="0.08"
            stroke="#2563EB"
            strokeWidth="2.5"
          />
          {centers && layers.altitudes && (
            <>
              {vertices.map((v, i) => (
                <g key={`alt-${i}`}>
                  <line
                    x1={xy(v)[0]}
                    y1={xy(v)[1]}
                    x2={xy(altitudeFeet[i])[0]}
                    y2={xy(altitudeFeet[i])[1]}
                    stroke="#E11D48"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  <circle
                    cx={xy(altitudeFeet[i])[0]}
                    cy={xy(altitudeFeet[i])[1]}
                    r="3.2"
                    fill="#E11D48"
                  />
                </g>
              ))}
            </>
          )}
          {centers && layers.medians && (
            <>
              {vertices.map((v, i) => (
                <g key={`med-${i}`}>
                  <line
                    x1={xy(v)[0]}
                    y1={xy(v)[1]}
                    x2={xy(midpoints[i])[0]}
                    y2={xy(midpoints[i])[1]}
                    stroke="#8B5CF6"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={xy(midpoints[i])[0]}
                    cy={xy(midpoints[i])[1]}
                    r="3.2"
                    fill="#8B5CF6"
                  />
                  <text
                    x={xy(midpoints[i])[0] + 5}
                    y={xy(midpoints[i])[1] - 4}
                    fontSize="11"
                    fill="#6D28D9"
                  >
                    {["M", "N", "E"][i]}
                  </text>
                </g>
              ))}
            </>
          )}
          {centers && layers.ninePoint && (
            <>
              <circle
                cx={xy([(centers.o[0] + centers.h[0]) / 2, (centers.o[1] + centers.h[1]) / 2])[0]}
                cy={xy([(centers.o[0] + centers.h[0]) / 2, (centers.o[1] + centers.h[1]) / 2])[1]}
                r={(centers.radius * 42) / 2}
                fill="none"
                stroke="#0891B2"
                strokeWidth="1.8"
                strokeDasharray="6 3"
              />
              <circle
                cx={xy([(centers.o[0] + centers.h[0]) / 2, (centers.o[1] + centers.h[1]) / 2])[0]}
                cy={xy([(centers.o[0] + centers.h[0]) / 2, (centers.o[1] + centers.h[1]) / 2])[1]}
                r="3.5"
                fill="#0891B2"
              />
            </>
          )}
          {centers && layers.centers && (
            <>
              <circle
                cx={xy(centers.o)[0]}
                cy={xy(centers.o)[1]}
                r={centers.radius * 42}
                fill="none"
                stroke="#3B82F6"
                strokeDasharray="5 4"
              />
              <circle
                cx={xy(centers.inc)[0]}
                cy={xy(centers.inc)[1]}
                r={centers.inradius * 42}
                fill="none"
                stroke="#10B981"
              />
              <line
                x1={xy(centers.o)[0]}
                y1={xy(centers.o)[1]}
                x2={xy(centers.h)[0]}
                y2={xy(centers.h)[1]}
                stroke="#DC2626"
                strokeWidth="2"
              />
              {(
                [
                  ["O", centers.o],
                  ["G", centers.g],
                  ["H", centers.h],
                  ["I", centers.inc],
                ] as [string, Point2][]
              ).map(([label, p]) => (
                <g key={label}>
                  <circle cx={xy(p)[0]} cy={xy(p)[1]} r="4" fill="#DC2626" />
                  <text x={xy(p)[0] + 6} y={xy(p)[1] - 6} fontSize="14">
                    {label}
                  </text>
                </g>
              ))}
            </>
          )}
          {(layers.polar || layers.inverse) && (
            <circle
              cx="260"
              cy="160"
              r="84"
              fill="none"
              stroke="#D97706"
              strokeWidth="2"
            />
          )}
          {layers.polar && polar && (
            <line
              x1={
                xy([
                  polar.foot[0] + 10 * polar.direction[0],
                  polar.foot[1] + 10 * polar.direction[1],
                ])[0]
              }
              y1={
                xy([
                  polar.foot[0] + 10 * polar.direction[0],
                  polar.foot[1] + 10 * polar.direction[1],
                ])[1]
              }
              x2={
                xy([
                  polar.foot[0] - 10 * polar.direction[0],
                  polar.foot[1] - 10 * polar.direction[1],
                ])[0]
              }
              y2={
                xy([
                  polar.foot[0] - 10 * polar.direction[0],
                  polar.foot[1] - 10 * polar.direction[1],
                ])[1]
              }
              stroke="#D97706"
              strokeWidth="2"
            />
          )}
          {layers.inverse && inv && (
            <>
              <line
                x1="260"
                y1="160"
                x2={xy(inv)[0]}
                y2={xy(inv)[1]}
                stroke="#7C3AED"
                strokeDasharray="4 4"
              />
              <circle cx={xy(inv)[0]} cy={xy(inv)[1]} r="6" fill="#7C3AED" />
              <text x={xy(inv)[0] + 8} y={xy(inv)[1]} fontSize="14">
                P′
              </text>
            </>
          )}
        </g>
        {[...vertices, point].map((v, i) => (
          <g
            key={i}
            style={{ cursor: "grab" }}
            onPointerDown={(e) => {
              if (drag.current || e.button !== 0) return;
              e.stopPropagation();
              drag.current = { id: e.pointerId, index: i };
              e.currentTarget.ownerSVGElement?.setPointerCapture?.(e.pointerId);
            }}
          >
            <circle
              data-testid={`geo-point-${i}`}
              cx={xy(v)[0]}
              cy={xy(v)[1]}
              r="17"
              fill="transparent"
            />
            <circle
              cx={xy(v)[0]}
              cy={xy(v)[1]}
              r="6"
              fill={i === 3 ? "#D97706" : "#2563EB"}
              pointerEvents="none"
            />
            <text
              x={xy(v)[0] + 10}
              y={xy(v)[1] - 10}
              fontSize="15"
              pointerEvents="none"
            >
              {"ABCP"[i]}
            </text>
          </g>
        ))}
      </svg>
      {!centers && (
        <ErrorBox message="Ba đỉnh trùng nhau hoặc thẳng hàng: tâm ngoại tiếp và đường Euler không xác định." />
      )}
      {layers.polar && !polar && (
        <ErrorBox message="P ở tâm đường tròn: không có đường đối cực hữu hạn." />
      )}
      {layers.inverse && !inv && (
        <ErrorBox message="Không thể nghịch đảo điểm P tại gốc tọa độ." />
      )}
      {centers && (
        <div
          data-testid="dynamic-geo-metrics"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-50/70 border border-blue-200 px-3 py-2 text-xs font-mono text-blue-950"
        >
          <span>
            Cạnh: a={fmtNum(triMetrics.aLen, 2)} · b={fmtNum(triMetrics.bLen, 2)} · c={fmtNum(triMetrics.cLen, 2)}
          </span>
          <span>
            Góc: A={Math.round(triMetrics.angA)}° · B={Math.round(triMetrics.angB)}° · C={Math.round(triMetrics.angC)}°
          </span>
          <span>
            S={fmtNum(triMetrics.area, 2)} · R={fmtNum(centers.radius, 2)} · r={fmtNum(centers.inradius, 2)}
          </span>
        </div>
      )}
      <div className={`${panel} flex flex-wrap gap-3`}>
        {(["centers", "altitudes", "medians", "ninePoint", "polar", "inverse"] as const).map((key, i) => (
          <label
            key={key}
            className="min-h-[44px] flex items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              data-testid={`geo-layer-${key}`}
              checked={layers[key]}
              onChange={() => setLayers({ ...layers, [key]: !layers[key] })}
            />
            {[
              "Tâm và đường Euler",
              "3 Đường cao (AH)",
              "3 Trung tuyến (AM)",
              "Đường tròn 9 điểm Euler",
              "Đối cực (R = 2)",
              "Nghịch đảo P′",
            ][i]}
          </label>
        ))}
      </div>
      <div className={panel}>
        <Control
          id="geo-k"
          label="Phương tích k"
          value={k}
          min={0.5}
          max={8}
          set={setK}
        />
        <Control
          id="geo-px"
          label="Điểm P: x"
          value={point[0]}
          min={-5}
          max={5}
          set={(n) => setPoint([n, point[1]])}
        />
        <Control
          id="geo-py"
          label="Điểm P: y"
          value={point[1]}
          min={-3}
          max={3}
          set={(n) => setPoint([point[0], n])}
        />
        <div className="flex flex-wrap gap-2">
          <button
            className={button}
            data-testid="geo-preset-equilateral"
            onClick={() =>
              setVertices([
                [-2, -1.15],
                [2, -1.15],
                [0, 2.31],
              ])
            }
          >
            Tam giác đều
          </button>
          <button
            className={button}
            data-testid="geo-preset-right"
            onClick={() =>
              setVertices([
                [-2, -1.2],
                [2.2, -1.2],
                [-2, 1.8],
              ])
            }
          >
            Tam giác vuông
          </button>
          <button
            className={button}
            data-testid="geo-preset-isosceles"
            onClick={() =>
              setVertices([
                [-1.6, -1.3],
                [1.6, -1.3],
                [0, 2.1],
              ])
            }
          >
            Tam giác cân
          </button>
          <button
            className={button}
            onClick={() =>
              setVertices([
                [-2, 0],
                [0, 0],
                [2, 0],
              ])
            }
          >
            Ba đỉnh thẳng hàng
          </button>
          <button
            className={button}
            onClick={() => {
              setVertices([
                [-2, -1],
                [2, -1],
                [0, 2],
              ]);
              setPoint([2.5, 1]);
            }}
          >
            Đặt lại
          </button>
        </div>
      </div>
      <p className="text-xs text-stone-500">
        Kéo A, B, C và P. O: ngoại tâm; I: nội tâm; G: trọng tâm; H: trực tâm.
        Đối cực: Pₓx + Pᵧy = 4; nghịch đảo: OP·OP′ = k (độc lập với R).
      </p>
    </div>
  );
};

export const CrystalLatticeEngine: React.FC<Props> = ({ blueprint }) => {
  const initial = blueprint.meta?.kind;
  const [kind, setKind] = useState<LatticeKind>(
    initial === "SC" || initial === "FCC" ? initial : "BCC",
  );
  const [radius, setRadius] = useState(0.15);
  const [space, setSpace] = useState(false);
  const [plane, setPlane] = useState<MillerPlane | "none">("none");
  const [hole, setHole] = useState(false);
  const r = lattice(kind, radius);
  return (
    <div
      className="p-4 flex flex-col gap-3"
      data-testid="lattice-engine"
      data-kind={kind}
      data-packing={r.packing}
      data-atoms={r.atoms}
    >
      <Scene label={`Ô mạng ${kind} và mặt Miller`} extent={0.95}>
        {(p, gradient) => {
          const center = (v: Vec3): Vec3 => v.map((x) => x - 0.5) as Vec3;
          const sites = r.sites
            .map((v) => ({ raw: v, screen: p(center(v)) }))
            .sort((a, b) => a.screen[2] - b.screen[2]);
          return (
            <>
              {r.sites.slice(0, 8).flatMap((a, i) =>
                r.sites
                  .slice(i + 1, 8)
                  .filter((b) => a.filter((v, k) => v !== b[k]).length === 1)
                  .map((b, j) =>
                    line3(p, center(a), center(b), "#A8A29E", `${i}-${j}`),
                  ),
              )}
              {plane !== "none" && (
                <polygon
                  points={points3(p, MILLER_VERTICES[plane].map(center))}
                  fill="#F59E0B"
                  fillOpacity="0.22"
                  stroke="#D97706"
                  strokeWidth="2"
                />
              )}
              {sites.map(({ raw, screen }, i) => (
                <circle
                  key={i}
                  cx={screen[0]}
                  cy={screen[1]}
                  r={space ? ((radius / r.edge) * 110) / 0.95 : 9}
                  fill={`url(#${gradient})`}
                  opacity={space ? 0.73 : 1}
                  stroke="#1D4ED8"
                >
                  <title>{raw.join("; ")}</title>
                </circle>
              ))}
              {hole && kind === "FCC" && (
                <g>
                  <circle
                    cx={p([0, 0, 0])[0]}
                    cy={p([0, 0, 0])[1]}
                    r={(((0.414 * radius) / r.edge) * 110) / 0.95}
                    fill="#F59E0B"
                    stroke="#92400E"
                  />
                  <text
                    x={p([0, 0, 0])[0] + 10}
                    y={p([0, 0, 0])[1] + 18}
                    fontSize="13"
                    fill="#92400E"
                  >
                    Hốc bát diện
                  </text>
                </g>
              )}
            </>
          );
        }}
      </Scene>
      <Facts
        items={[
          ["Nguyên tử / ô mạng", String(r.atoms)],
          ["Độ đặc khít", `${F(r.packing * 100)} %`],
          ["Số phối trí", String(r.coordination)],
          ["Cạnh ô a", `${F(r.edge)} nm`],
        ]}
      />
      <div className={panel}>
        <div className="flex flex-wrap gap-2">
          {(["SC", "BCC", "FCC"] as const).map((k) => (
            <button
              key={k}
              className={button}
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              {k}
            </button>
          ))}
          <button
            className={button}
            aria-pressed={space}
            onClick={() => setSpace(!space)}
          >
            {space ? "Hiện tâm nguyên tử" : "Quả cầu sát nhau"}
          </button>
        </div>
        <Control
          id="lattice-r"
          label="Bán kính (nm)"
          value={radius}
          min={0.08}
          max={0.3}
          step={0.01}
          set={setRadius}
        />
        <label className="flex items-center gap-2 min-h-[44px] text-sm">
          Mặt Miller{" "}
          <select
            aria-label="Mặt Miller"
            value={plane}
            onChange={(e) => setPlane(e.target.value as MillerPlane | "none")}
            className={button}
          >
            {["none", "100", "110", "111"].map((v) => (
              <option key={v} value={v}>
                {v === "none" ? "Ẩn" : `(${v})`}
              </option>
            ))}
          </select>
        </label>
        {kind === "FCC" && (
          <label className="min-h-[44px] flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hole}
              onChange={() => setHole(!hole)}
            />
            Hiện hốc bát diện FCC (r ≈ 0,414 R)
          </label>
        )}
      </div>
      <p className="text-xs text-stone-500">
        Đỉnh góp 1/8; tâm mặt góp 1/2; tâm khối góp 1.{" "}
        {kind === "SC" ? "a = 2R" : kind === "BCC" ? "√3 a = 4R" : "√2 a = 4R"}.
        Hình hiển thị toàn quả cầu tại các tâm; phần nằm ngoài ô thuộc ô lân
        cận. Mặt Miller là mặt hình học, không phải hình cắt bỏ nguyên tử.
      </p>
    </div>
  );
};

export const CrystalFieldEngine: React.FC<Props> = ({ blueprint }) => {
  const [d, setD] = useState(Math.round(num(blueprint.meta?.d, 6, 0, 10)));
  const [delta, setDelta] = useState(num(blueprint.meta?.delta, 0.7, 0.2, 2.5));
  const [pairing, setPairing] = useState(1);
  const r = crystalField(d, delta, pairing);
  const label = {
    fixed: "Không có lựa chọn spin cao/thấp",
    high: "Spin cao",
    low: "Spin thấp",
    crossover: "Δ = P: hai cấu hình đồng năng lượng",
  }[r.spin];
  const y = (energy: number) => 150 - energy * 48;
  return (
    <div
      className="p-4 flex flex-col gap-3"
      data-testid="cft-engine"
      data-spin={r.spin}
      data-unpaired={r.unpaired}
    >
      <div className="grid md:grid-cols-2 gap-3">
        <Scene label="Sáu phối tử trong phức bát diện" extent={2}>
          {(p, gradient) => (
            <>
              {(
                [
                  [1.5, 0, 0],
                  [-1.5, 0, 0],
                  [0, 1.5, 0],
                  [0, -1.5, 0],
                  [0, 0, 1.5],
                  [0, 0, -1.5],
                ] as Vec3[]
              ).map((v, i) => (
                <g key={i}>
                  {line3(p, [0, 0, 0], v, "#94A3B8")}
                  <circle cx={p(v)[0]} cy={p(v)[1]} r="13" fill="#10B981" />
                  <text
                    x={p(v)[0] - 4}
                    y={p(v)[1] + 5}
                    fontSize="14"
                    fill="white"
                  >
                    L
                  </text>
                </g>
              ))}
              <circle cx="260" cy="150" r="19" fill={`url(#${gradient})`} />
              <text x="254" y="155" fill="white" fontSize="14">
                M
              </text>
            </>
          )}
        </Scene>
        <svg
          role="img"
          aria-label="Tách mức orbital d bát diện và electron"
          viewBox="0 0 300 300"
          className="w-full rounded-xl bg-white border border-stone-200"
        >
          <line
            x1="25"
            y1="150"
            x2="280"
            y2="150"
            stroke="#A8A29E"
            strokeDasharray="4 4"
          />
          <text x="12" y={y(0.6 * delta) - 23} fontSize="13" fill="#DC2626">
            e_g (+0,6Δ)
          </text>
          <text x="12" y={y(-0.4 * delta) + 27} fontSize="13" fill="#2563EB">
            t₂g (−0,4Δ)
          </text>
          {r.occupancy.map((n, i) => {
            const upper = i >= 3;
            const x = upper ? 112 + (i - 3) * 60 : 80 + i * 60;
            const yy = y((upper ? 0.6 : -0.4) * delta);
            return (
              <g key={i}>
                <line
                  x1={x - 15}
                  y1={yy}
                  x2={x + 20}
                  y2={yy}
                  stroke={upper ? "#DC2626" : "#2563EB"}
                  strokeWidth="3"
                />
                <text x={x - 10} y={yy - 7} fontSize="22" fill="#1C1917">
                  {n === 2 ? "↑↓" : n === 1 ? "↑" : ""}
                </text>
              </g>
            );
          })}
          <line
            x1="275"
            y1={y(0.6 * delta)}
            x2="275"
            y2={y(-0.4 * delta)}
            stroke="#D97706"
            strokeWidth="2"
          />
          <text x="12" y="280" fontSize="13" fill="#57534E">
            d{d}: t₂g {r.t} e⁻; e_g {r.e} e⁻
          </text>
        </svg>
      </div>
      <p className="font-semibold text-sm text-blue-800" data-testid="cft-spin">
        {label}
      </p>
      {r.crossover && (
        <p className="text-sm text-amber-800">
          Hai cấu hình có thể có: {r.high.unpaired} hoặc {r.low.unpaired}{" "}
          electron độc thân. Giản đồ đang hiển thị cấu hình spin cao.
        </p>
      )}
      <Facts
        items={[
          [
            "Electron độc thân",
            r.crossover
              ? `${r.high.unpaired} / ${r.low.unpaired}`
              : String(r.unpaired),
          ],
          [
            "Từ tính",
            r.crossover
              ? "Hai cấu hình đồng năng lượng"
              : r.unpaired
                ? "Thuận từ"
                : "Nghịch từ",
          ],
          ["CFSE (chưa gồm ghép đôi)", F(r.cfse)],
          [
            "μ (spin-only, μB)",
            r.crossover
              ? `${F(r.high.moment)} / ${F(r.low.moment)}`
              : F(r.moment),
          ],
        ]}
      />
      <div className={panel}>
        <Control
          id="cft-d"
          label="Số electron d"
          value={d}
          min={0}
          max={10}
          step={1}
          set={setD}
        />
        <Control
          id="cft-delta"
          label="Tách mức Δ"
          value={delta}
          min={0.2}
          max={2.5}
          step={0.05}
          set={setDelta}
        />
        <Control
          id="cft-p"
          label="Ghép đôi P"
          value={pairing}
          min={0.3}
          max={2}
          step={0.05}
          set={setPairing}
        />
        <div className="flex flex-wrap gap-2">
          <button
            className={button}
            onClick={() => {
              setD(6);
              setDelta(0.7);
              setPairing(1);
            }}
          >
            [Fe(H₂O)₆]²⁺
          </button>
          <button
            className={button}
            onClick={() => {
              setD(6);
              setDelta(1.8);
              setPairing(1);
            }}
          >
            [Fe(CN)₆]⁴⁻
          </button>
        </div>
      </div>
      <p className="text-xs text-stone-500">
        Mô hình bát diện với một năng lượng ghép đôi P; Δ và P dùng cùng đơn vị
        tương đối. Các giá trị mẫu minh họa trường yếu/mạnh, không phải phổ thực
        nghiệm. Không suy màu dung dịch chỉ từ Δ.
      </p>
    </div>
  );
};

export const Sn2Engine: React.FC<Props> = () => {
  const [progress, setProgress] = useState(0);
  const [barrier, setBarrier] = useState(60);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    let raf = 0,
      last = 0;
    const tick = (now: number) => {
      if (last) {
        const dt = Math.min(0.1, (now - last) / 1000);
        setProgress((p) => Math.min(1, p + dt / 6));
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  useEffect(() => {
    if (progress >= 1) setPlaying(false);
  }, [progress]);
  const r = sn2(progress, barrier);
  return (
    <div
      className="p-4 flex flex-col gap-3"
      data-testid="sn2-engine"
      data-stage={r.stage}
      data-energy={r.energy}
    >
      <p className="text-sm font-mono text-stone-800">
        HO⁻ + CH₃Cl → CH₃OH + Cl⁻
      </p>
      <Scene
        label="SN2: tấn công mặt sau, tạo và bẻ liên kết đồng thời"
        extent={3.8}
      >
        {(p, gradient) => (
          <>
            {r.hydrogens.map((v, i) => (
              <g key={i}>
                {line3(p, [0, 0, 0], v, "#78716C")}
                <circle
                  cx={p(v)[0]}
                  cy={p(v)[1]}
                  r="9"
                  fill="#F5F5F4"
                  stroke="#78716C"
                />
                <text x={p(v)[0] + 10} y={p(v)[1]} fontSize="13">
                  H
                </text>
              </g>
            ))}
            {r.forming > 0 && (
              <g opacity={r.forming}>
                {line3(
                  p,
                  [0, 0, 0],
                  r.incoming,
                  "#DC2626",
                  undefined,
                  r.forming < 0.95 ? "5 4" : undefined,
                )}
              </g>
            )}
            {r.breaking > 0 && (
              <g opacity={r.breaking}>
                {line3(
                  p,
                  [0, 0, 0],
                  r.leaving,
                  "#059669",
                  undefined,
                  r.breaking < 0.95 ? "5 4" : undefined,
                )}
              </g>
            )}
            <circle cx="260" cy="150" r="15" fill={`url(#${gradient})`} />
            <text x="255" y="155" fontSize="14" fill="white">
              C
            </text>
            {[
              {
                v: r.incoming,
                label: progress === 1 ? "OH" : "HO⁻",
                color: "#E11D48",
              },
              {
                v: r.leaving,
                label: progress === 0 ? "Cl" : "Cl⁻",
                color: "#059669",
              },
            ].map(({ v, label, color }) => (
              <g key={color}>
                <circle cx={p(v)[0]} cy={p(v)[1]} r="17" fill={color} />
                <text
                  x={p(v)[0]}
                  y={p(v)[1] + 32}
                  fontSize="15"
                  fill={color}
                  textAnchor="middle"
                >
                  {label}
                </text>
              </g>
            ))}
            <path
              d="M110 115 Q170 55 230 128"
              fill="none"
              stroke="#D97706"
              strokeWidth="2.5"
            />
            <path
              d="M219 117 L230 128 L215 126"
              fill="none"
              stroke="#D97706"
              strokeWidth="2.5"
            />
            <text x="135" y="62" fontSize="13" fill="#92400E">
              Cặp e⁻ tấn công mặt sau
            </text>
          </>
        )}
      </Scene>
      <svg
        role="img"
        aria-label="Giản đồ năng lượng phản ứng một trạng thái chuyển tiếp"
        viewBox="0 0 520 155"
        className="w-full rounded-xl border border-stone-200/50 bg-white/95 dark:bg-stone-900/90 shadow-sm"
      >
        <line x1="35" y1="125" x2="490" y2="125" stroke="#78716C" />
        <path
          d={Array.from(
            { length: 101 },
            (_, i) =>
              `${i ? "L" : "M"}${35 + i * 4.5},${125 - Math.sin((Math.PI * i) / 100) ** 2 * 95}`,
          ).join(" ")}
          fill="none"
          stroke="#2563EB"
          strokeWidth="2.5"
        />
        <circle
          cx={35 + progress * 450}
          cy={125 - (r.energy / barrier) * 95}
          r="6"
          fill="#D97706"
        />
        <text x="20" y="18" fontSize="12">
          E / Eₐ
        </text>
        <text x="241" y="20" fontSize="13">
          TS‡
        </text>
        <text x="310" y="147" fontSize="12">
          Tọa độ phản ứng (không phải thời gian)
        </text>
      </svg>
      <Facts
        items={[
          [
            "Giai đoạn",
            {
              reactants: "Chất đầu",
              transition: "Vùng trạng thái chuyển tiếp",
              products: "Sản phẩm",
            }[r.stage],
          ],
          ["E minh họa (kJ/mol)", F(r.energy)],
        ]}
      />
      <div className={panel}>
        <Control
          id="sn2-progress"
          label="Tiến trình (%)"
          value={progress * 100}
          min={0}
          max={100}
          step={1}
          set={(n) => {
            setPlaying(false);
            setProgress(n / 100);
          }}
        />
        <Control
          id="sn2-ea"
          label="Eₐ (kJ/mol)"
          value={barrier}
          min={20}
          max={120}
          step={1}
          set={setBarrier}
        />
        <div className="flex flex-wrap gap-2">
          <button
            className={button}
            onClick={() => {
              if (progress >= 1) setProgress(0);
              setPlaying(!playing);
            }}
          >
            {playing ? "Tạm dừng" : "Chạy phản ứng"}
          </button>
          <button
            className={button}
            onClick={() => {
              setPlaying(false);
              setProgress(0);
            }}
          >
            Đặt lại
          </button>
          <button
            className={button}
            onClick={() => {
              setPlaying(false);
              setProgress(0.5);
            }}
          >
            Trạng thái chuyển tiếp
          </button>
        </div>
      </div>
      <p className="text-xs text-stone-500">
        Mô hình hình học và giản đồ năng lượng đối xứng dùng để giảng cơ chế một
        bước, không phải động học hay năng lượng đo thực tế. Ba liên kết C–H lật
        như chiếc ô; CH₃Cl không có tâm bất đối nên không gán R/S. Chỉ tâm bất
        đối mới có nghịch đảo cấu hình lập thể.
      </p>
    </div>
  );
};

export const CyclohexaneEngine: React.FC<Props> = ({ blueprint }) => {
  const meta = blueprint.meta ?? {};
  const [form, setForm] = useState<CycloForm>(
    (meta.form as CycloForm) || "chair"
  );
  const [showAxial, setShowAxial] = useState(true);
  const [showEquatorial, setShowEquatorial] = useState(true);

  const res = useMemo(() => cyclohexaneConformation(form), [form]);

  const ox = 260;
  const oy = 140;
  const scale = 1.8;

  const cPoints = res.carbons.map(([x, y]) => [ox + x * scale, oy + y * scale]);
  const polyPoints = cPoints.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <div
      className="p-4 flex flex-col gap-3"
      data-testid="cyclohexane-engine"
      data-form={form}
      data-energy={res.energyKj}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-stone-800">
          Cấu dạng Cyclohexane:{" "}
          {form === "chair"
            ? "Ghế (Chair)"
            : form === "boat"
            ? "Thuyền (Boat)"
            : form === "twist"
            ? "Xoắn thuyền (Twist)"
            : "Ghế lật (Inverted)"}
        </h4>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-mono font-medium ${
            res.energyKj === 0
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          ΔE = {res.energyKj} kJ/mol
        </span>
      </div>

      <svg
        role="img"
        aria-label="Mô hình cấu dạng cyclohexane với liên kết trục và xích đạo"
        viewBox="0 0 520 280"
        className="w-full rounded-xl border border-stone-200 bg-white select-none"
      >
        <defs>
          <radialGradient id="carbonGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#1E293B" />
          </radialGradient>
          <radialGradient id="axialHGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#D97706" />
          </radialGradient>
          <radialGradient id="eqHGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#A5F3FC" />
            <stop offset="100%" stopColor="#0284C7" />
          </radialGradient>
        </defs>

        {/* Thang đo thế năng quay bên trái */}
        <g transform="translate(20, 20)">
          <rect
            x="0"
            y="0"
            width="12"
            height="180"
            rx="6"
            fill="#F1F5F9"
            stroke="#CBD5E1"
          />
          <rect
            x="0"
            y={180 - (res.energyKj / 32) * 180}
            width="12"
            height={(res.energyKj / 32) * 180}
            rx="6"
            fill={res.energyKj === 0 ? "#10B981" : "#F59E0B"}
          />
          <text x="18" y="15" fontSize="10" fill="#64748B">
            30 kJ
          </text>
          <text x="18" y="95" fontSize="10" fill="#64748B">
            15 kJ
          </text>
          <text x="18" y="180" fontSize="10" fill="#64748B">
            0 kJ
          </text>
          <text x="0" y="200" fontSize="10" fontWeight="bold" fill="#475569">
            E(kJ/mol)
          </text>
        </g>

        {/* Liên kết xích đạo (Equatorial - Màu lam) */}
        {showEquatorial &&
          res.equatorialBonds.map(([c, h], i) => {
            const x1 = ox + c[0] * scale;
            const y1 = oy + c[1] * scale;
            const x2 = ox + h[0] * scale;
            const y2 = oy + h[1] * scale;
            return (
              <g key={`eq-${i}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#0284C7"
                  strokeWidth="2.5"
                />
                <circle
                  cx={x2}
                  cy={y2}
                  r="7"
                  fill="url(#eqHGrad)"
                  stroke="#0369A1"
                  strokeWidth="1.5"
                />
                <text
                  x={x2}
                  y={y2 + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#0C4A6E"
                >
                  e
                </text>
              </g>
            );
          })}

        {/* Khung vòng Carbon */}
        <polygon
          points={polyPoints}
          fill="#3B82F6"
          fillOpacity="0.08"
          stroke="#1E293B"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Liên kết trục (Axial - Màu hổ phách) */}
        {showAxial &&
          res.axialBonds.map(([c, h], i) => {
            const x1 = ox + c[0] * scale;
            const y1 = oy + c[1] * scale;
            const x2 = ox + h[0] * scale;
            const y2 = oy + h[1] * scale;
            return (
              <g key={`ax-${i}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#D97706"
                  strokeWidth="2.5"
                />
                <circle
                  cx={x2}
                  cy={y2}
                  r="7"
                  fill="url(#axialHGrad)"
                  stroke="#B45309"
                  strokeWidth="1.5"
                />
                <text
                  x={x2}
                  y={y2 + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#78350F"
                >
                  a
                </text>
              </g>
            );
          })}

        {/* Các nguyên tử Carbon */}
        {cPoints.map(([x, y], i) => (
          <g key={`c-${i}`}>
            <circle
              cx={x}
              cy={y}
              r="11"
              fill="url(#carbonGrad)"
              stroke="#0F172A"
              strokeWidth="1.5"
            />
            <text
              x={x}
              y={y + 3.5}
              textAnchor="middle"
              fontSize="10"
              fontWeight="bold"
              fill="#FFFFFF"
            >
              C{i + 1}
            </text>
          </g>
        ))}

        {/* Chú giải */}
        <g transform="translate(340, 20)">
          <rect
            x="0"
            y="0"
            width="165"
            height="65"
            rx="8"
            fill="#F8FAFC"
            stroke="#E2E8F0"
          />
          <circle cx="15" cy="18" r="6" fill="#D97706" />
          <text x="28" y="22" fontSize="11" fill="#334155">
            Liên kết trục (axial - a)
          </text>
          <circle cx="15" cy="42" r="6" fill="#0284C7" />
          <text x="28" y="46" fontSize="11" fill="#334155">
            Xích đạo (equatorial - e)
          </text>
        </g>
      </svg>

      <p className="text-sm text-stone-700 bg-stone-100 p-2.5 rounded-lg border border-stone-200">
        💡 {res.stabilityNote}
      </p>

      <Facts
        items={[
          ["Cấu dạng", form.toUpperCase()],
          ["Thế năng tương đối", `${res.energyKj} kJ/mol`],
          ["Số liên kết trục (a)", "6 liên kết song song"],
          ["Số liên kết xích đạo (e)", "6 liên kết nghiêng"],
        ]}
      />

      <div className={panel}>
        <div className="flex flex-wrap gap-2">
          <button
            className={`${button} ${
              form === "chair"
                ? "bg-blue-100 font-semibold border-blue-500"
                : ""
            }`}
            onClick={() => setForm("chair")}
          >
            🪑 Ghế (Chair) - Bền nhất
          </button>
          <button
            className={`${button} ${
              form === "boat"
                ? "bg-blue-100 font-semibold border-blue-500"
                : ""
            }`}
            onClick={() => setForm("boat")}
          >
            ⛵ Thuyền (Boat) (+29.5)
          </button>
          <button
            className={`${button} ${
              form === "twist"
                ? "bg-blue-100 font-semibold border-blue-500"
                : ""
            }`}
            onClick={() => setForm("twist")}
          >
            🌀 Xoắn thuyền (Twist) (+23)
          </button>
          <button
            className={`${button} ${
              form === "inverted"
                ? "bg-blue-100 font-semibold border-blue-500"
                : ""
            }`}
            onClick={() => setForm("inverted")}
          >
            🔄 Lật vòng (Ring-flip)
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-stone-200 text-sm">
          <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={showAxial}
              onChange={(e) => setShowAxial(e.target.checked)}
              className="w-5 h-5 accent-amber-600 rounded"
            />
            <span>Hiển thị liên kết trục (Axial)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={showEquatorial}
              onChange={(e) => setShowEquatorial(e.target.checked)}
              className="w-5 h-5 accent-cyan-600 rounded"
            />
            <span>Hiển thị liên kết xích đạo (Equatorial)</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export const CellRespirationEngine: React.FC<Props> = ({ blueprint }) => {
  const meta = blueprint.meta ?? {};
  const [cyanide, setCyanide] = useState(meta.cyanide === 1);
  const [dnp, setDnp] = useState(false);
  const [o2Level, setO2Level] = useState(100);
  const [rotorAngle, setRotorAngle] = useState(0);

  const res = useMemo(
    () => etcRespiration(cyanide, dnp, o2Level),
    [cyanide, dnp, o2Level]
  );

  useEffect(() => {
    if (res.rotorSpeed <= 0) return;
    const interval = setInterval(() => {
      setRotorAngle((a) => (a + res.rotorSpeed * 10) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [res.rotorSpeed]);

  return (
    <div
      className="p-4 flex flex-col gap-3"
      data-testid="cell-respiration-engine"
      data-cyanide={cyanide}
      data-dnp={dnp}
      data-atp-rate={res.atpRate}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-stone-800">
          Chuỗi truyền electron (ETC) & Động cơ ATP Synthase
        </h4>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-mono font-medium ${
            res.atpRate > 50
              ? "bg-emerald-100 text-emerald-800"
              : res.atpRate > 0
              ? "bg-amber-100 text-amber-800"
              : "bg-rose-100 text-rose-800"
          }`}
        >
          ATP Sinh: {res.atpRate}% | PMF: {res.pmfMv} mV
        </span>
      </div>

      <svg
        role="img"
        aria-label="Sơ đồ chuỗi truyền electron ti thể, gradient proton H+ và ATP Synthase"
        viewBox="0 0 520 280"
        className="w-full rounded-xl border border-stone-200 bg-white select-none"
      >
        <defs>
          <linearGradient id="imsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EFF6FF" />
            <stop offset="100%" stopColor="#DBEAFE" />
          </linearGradient>
          <linearGradient id="matrixGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="membraneGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>

        {/* Khoang gian màng (IMS) */}
        <rect x="0" y="0" width="520" height="90" fill="url(#imsGrad)" />
        <text x="12" y="24" fontSize="12" fontWeight="bold" fill="#1E40AF">
          Khoang gian màng (IMS) — pH {res.imsPh} (Nồng độ H⁺ cao)
        </text>

        {/* Các ion H+ trong IMS */}
        {Array.from({ length: cyanide ? 3 : dnp ? 5 : 16 }).map((_, i) => (
          <g
            key={`h-ims-${i}`}
            transform={`translate(${(i * 31 + 25) % 500}, ${
              (i * 13 + 35) % 45
            })`}
          >
            <circle
              cx="0"
              cy="0"
              r="4.5"
              fill="#38BDF8"
              stroke="#0284C7"
              strokeWidth="1"
            />
            <text
              x="0"
              y="2.5"
              textAnchor="middle"
              fontSize="7"
              fontWeight="bold"
              fill="#0C4A6E"
            >
              +
            </text>
          </g>
        ))}

        {/* Màng trong ti thể (IMM) */}
        <rect
          x="0"
          y="90"
          width="520"
          height="40"
          fill="url(#membraneGrad)"
          opacity="0.85"
        />
        <text x="12" y="114" fontSize="10" fill="#FFFFFF" opacity="0.9">
          Màng trong ti thể (Lớp kép phospholipid)
        </text>

        {/* Chất nền ti thể (Matrix) */}
        <rect x="0" y="130" width="520" height="150" fill="url(#matrixGrad)" />
        <text x="12" y="268" fontSize="12" fontWeight="bold" fill="#92400E">
          Chất nền ti thể (Matrix) — pH {res.matrixPh} (Nồng độ H⁺ thấp)
        </text>

        {/* Phức hệ I */}
        <rect
          x="50"
          y="75"
          width="48"
          height="70"
          rx="8"
          fill="#6366F1"
          stroke="#4338CA"
          strokeWidth="2"
        />
        <text
          x="74"
          y="112"
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="#FFFFFF"
        >
          I
        </text>
        {!cyanide && (
          <path
            d="M 74 150 L 74 65"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeDasharray="4 2"
          />
        )}
        <text
          x="74"
          y="60"
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill="#0284C7"
        >
          4H⁺ ↑
        </text>

        {/* Phức hệ III */}
        <rect
          x="135"
          y="80"
          width="45"
          height="60"
          rx="8"
          fill="#10B981"
          stroke="#047857"
          strokeWidth="2"
        />
        <text
          x="157"
          y="112"
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="#FFFFFF"
        >
          III
        </text>
        {!cyanide && (
          <path
            d="M 157 145 L 157 70"
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeDasharray="4 2"
          />
        )}
        <text
          x="157"
          y="65"
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill="#0284C7"
        >
          4H⁺ ↑
        </text>

        {/* Phức hệ IV */}
        <rect
          x="215"
          y="75"
          width="48"
          height="70"
          rx="8"
          fill={cyanide ? "#991B1B" : "#F43F5E"}
          stroke={cyanide ? "#7F1D1D" : "#BE123C"}
          strokeWidth="2"
        />
        <text
          x="239"
          y="112"
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill="#FFFFFF"
        >
          IV
        </text>
        {cyanide ? (
          <g transform="translate(239, 105)">
            <text
              x="0"
              y="24"
              textAnchor="middle"
              fontSize="9"
              fontWeight="bold"
              fill="#FECDD3"
            >
              CN⁻ BLOCKED
            </text>
          </g>
        ) : (
          <>
            <path
              d="M 239 150 L 239 65"
              stroke="#38BDF8"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
            <text
              x="239"
              y="60"
              textAnchor="middle"
              fontSize="9"
              fontWeight="bold"
              fill="#0284C7"
            >
              2H⁺ ↑
            </text>
            <text x="239" y="165" textAnchor="middle" fontSize="9" fill="#E11D48">
              ½O₂ + 2H⁺ → H₂O
            </text>
          </>
        )}

        {/* Kênh rò rỉ DNP */}
        {dnp && (
          <g transform="translate(310, 80)">
            <rect
              x="0"
              y="0"
              width="30"
              height="60"
              rx="4"
              fill="#A855F7"
              stroke="#7E22CE"
              strokeWidth="2"
            />
            <text
              x="15"
              y="32"
              textAnchor="middle"
              fontSize="9"
              fontWeight="bold"
              fill="#FFFFFF"
            >
              DNP
            </text>
            <path
              d="M 15 5 L 15 70"
              stroke="#EF4444"
              strokeWidth="3"
              strokeDasharray="3 3"
            />
            <text
              x="15"
              y="-6"
              textAnchor="middle"
              fontSize="9"
              fontWeight="bold"
              fill="#DC2626"
            >
              Rò rỉ H⁺ ↓
            </text>
            <text
              x="15"
              y="85"
              textAnchor="middle"
              fontSize="8"
              fill="#7E22CE"
            >
              Tỏa nhiệt (tiêu tán)
            </text>
          </g>
        )}

        {/* Phức hệ V: Động cơ ATP Synthase */}
        <g transform="translate(420, 75)">
          {/* Kênh F0 */}
          <rect
            x="-16"
            y="10"
            width="32"
            height="45"
            rx="6"
            fill="#0284C7"
            stroke="#0369A1"
            strokeWidth="2"
          />
          <text
            x="0"
            y="36"
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#FFFFFF"
          >
            F₀
          </text>

          {/* Rotor F1 */}
          <g transform={`translate(0, 85) rotate(${rotorAngle})`}>
            <circle
              cx="0"
              cy="0"
              r="28"
              fill="#38BDF8"
              stroke="#0284C7"
              strokeWidth="2"
            />
            <line
              x1="-24"
              y1="0"
              x2="24"
              y2="0"
              stroke="#FFFFFF"
              strokeWidth="3"
            />
            <line
              x1="0"
              y1="-24"
              x2="0"
              y2="24"
              stroke="#FFFFFF"
              strokeWidth="3"
            />
            <circle cx="0" cy="0" r="8" fill="#0284C7" />
          </g>
          <text
            x="0"
            y="125"
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#0369A1"
          >
            F₁ Rotor
          </text>

          {res.atpRate > 0 && (
            <path
              d="M 0 0 L 0 55"
              stroke="#38BDF8"
              strokeWidth="3"
              strokeDasharray="3 2"
            />
          )}

          <text
            x="0"
            y="152"
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill={res.atpRate > 0 ? "#15803D" : "#94A3B8"}
          >
            ADP + Pi → ATP ⚡
          </text>
        </g>
      </svg>

      <p className="text-sm text-stone-700 bg-stone-100 p-2.5 rounded-lg border border-stone-200">
        💡 {res.statusMessage}
      </p>

      <Facts
        items={[
          ["Thế điện hóa (PMF)", `${res.pmfMv} mV`],
          ["Tốc độ tổng hợp ATP", `${res.atpRate}%`],
          ["pH IMS / Matrix", `${res.imsPh} / ${res.matrixPh}`],
          ["Tốc độ quay rotor F₁", `${res.rotorSpeed.toFixed(1)} vòng/đv`],
        ]}
      />

      <div className={panel}>
        <Control
          id="etc-o2"
          label="Nồng độ Oxy (O₂)"
          value={o2Level}
          min={0}
          max={100}
          step={5}
          set={setO2Level}
        />

        <div className="flex flex-wrap gap-2 mt-2">
          <button
            className={`${button} ${
              cyanide
                ? "bg-rose-100 font-semibold border-rose-500 text-rose-900"
                : ""
            }`}
            onClick={() => setCyanide(!cyanide)}
          >
            ☠️ {cyanide ? "Giải độc Cyanide" : "Đầu độc Cyanide (CN⁻)"}
          </button>
          <button
            className={`${button} ${
              dnp
                ? "bg-purple-100 font-semibold border-purple-500 text-purple-900"
                : ""
            }`}
            onClick={() => setDnp(!dnp)}
          >
            🧪 {dnp ? "Loại bỏ chất dỡ cặp DNP" : "Thêm chất dỡ cặp DNP"}
          </button>
          <button
            className={button}
            onClick={() => {
              setCyanide(false);
              setDnp(false);
              setO2Level(100);
            }}
          >
            🔄 Trạng thái bình thường
          </button>
        </div>
      </div>
    </div>
  );
};

export const LotkaVolterraEngine: React.FC<Props> = ({ blueprint }) => {
  const meta = blueprint.meta ?? {};
  const [alpha, setAlpha] = useState(num(meta.alpha, 1.0, 0.2, 3.0));
  const [beta, setBeta] = useState(num(meta.beta, 0.1, 0.01, 0.5));
  const [gamma, setGamma] = useState(num(meta.gamma, 1.0, 0.2, 3.0));
  const [delta, setDelta] = useState(num(meta.delta, 0.05, 0.01, 0.2));
  const [x0, setX0] = useState(num(meta.x0, 15, 2, 40));
  const [y0, setY0] = useState(num(meta.y0, 8, 2, 30));
  const [viewMode, setViewMode] = useState<"both" | "time" | "phase">("both");

  const res = useMemo(
    () => lotkaVolterraRun(alpha, beta, gamma, delta, x0, y0, 100, 0.08),
    [alpha, beta, gamma, delta, x0, y0]
  );

  const maxPrey = Math.max(30, ...res.timeline.map((d) => d.prey));
  const maxPred = Math.max(20, ...res.timeline.map((d) => d.predator));
  const maxY = Math.max(maxPrey, maxPred) * 1.15;
  const maxT = res.timeline[res.timeline.length - 1]?.t || 8;

  const timeW = viewMode === "both" ? 230 : 460;
  const timeH = 200;
  const timeBottom = 235;

  const tToX = (t: number) => 35 + (t / maxT) * timeW;
  const valToY = (val: number) => timeBottom - (val / maxY) * timeH;

  const phaseMaxX = Math.max(
    res.equilibrium[0] * 1.8,
    ...res.phasePoints.map((p) => p[0]),
    30
  );
  const phaseMaxY = Math.max(
    res.equilibrium[1] * 1.8,
    ...res.phasePoints.map((p) => p[1]),
    20
  );

  const phaseOriginX = 25;
  const phaseOriginY = 215;
  const phaseW = viewMode === "both" ? 190 : 440;
  const phaseH = 200;

  const pToScreen = (p: Point2): [number, number] => [
    phaseOriginX + (p[0] / phaseMaxX) * phaseW,
    phaseOriginY - (p[1] / phaseMaxY) * phaseH,
  ];

  const eqPos = pToScreen(res.equilibrium);
  const initPos = pToScreen([x0, y0]);

  return (
    <div
      className="p-4 flex flex-col gap-3"
      data-testid="lotka-volterra-engine"
      data-period={res.periodApprox}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-stone-800">
          Động thái Quần thể 2 Loài Lotka–Volterra
        </h4>
        <span className="text-xs px-2.5 py-1 rounded-full font-mono font-medium bg-blue-100 text-blue-800">
          Cân bằng: ({res.equilibrium[0]}; {res.equilibrium[1]}) | Chu kỳ: ~
          {res.periodApprox}s
        </span>
      </div>

      <svg
        role="img"
        aria-label="Đồ thị thời gian và chân dung mặt phẳng pha Lotka-Volterra"
        viewBox="0 0 520 280"
        className="w-full rounded-xl border border-stone-200 bg-white select-none"
      >
        {viewMode !== "phase" && (
          <g>
            <line
              x1={35}
              y1={235}
              x2={viewMode === "both" ? 270 : 500}
              y2={235}
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            <line x1={35} y1={25} x2={35} y2={235} stroke="#CBD5E1" strokeWidth="1.5" />
            <text x={35} y={18} fontSize="10" fill="#64748B">
              Số lượng N(t)
            </text>
            <text
              x={viewMode === "both" ? 250 : 485}
              y={250}
              fontSize="10"
              fill="#64748B"
            >
              t
            </text>

            {/* Đường con mồi (Màu xanh lục) */}
            <polyline
              points={res.timeline
                .map((d) => `${tToX(d.t)},${valToY(d.prey)}`)
                .join(" ")}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
            />

            {/* Đường thú săn (Màu đỏ cam) */}
            <polyline
              points={res.timeline
                .map((d) => `${tToX(d.t)},${valToY(d.predator)}`)
                .join(" ")}
              fill="none"
              stroke="#EF4444"
              strokeWidth="2.5"
            />

            <g transform="translate(45, 30)">
              <rect
                x="0"
                y="0"
                width="125"
                height="38"
                rx="6"
                fill="#F8FAFC"
                fillOpacity="0.8"
                stroke="#E2E8F0"
              />
              <line
                x1="8"
                y1="12"
                x2="24"
                y2="12"
                stroke="#10B981"
                strokeWidth="2.5"
              />
              <text x="28" y="15" fontSize="10" fill="#065F46">
                Con mồi (Prey)
              </text>
              <line
                x1="8"
                y1="26"
                x2="24"
                y2="26"
                stroke="#EF4444"
                strokeWidth="2.5"
              />
              <text x="28" y="29" fontSize="10" fill="#991B1B">
                Thú săn (Predator)
              </text>
            </g>
          </g>
        )}

        {viewMode !== "time" && (
          <g transform={`translate(${viewMode === "both" ? 290 : 30}, 20)`}>
            <line
              x1="25"
              y1="215"
              x2={viewMode === "both" ? 225 : 485}
              y2="215"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            <line x1="25" y1="5" x2="25" y2="215" stroke="#CBD5E1" strokeWidth="1.5" />
            <text x="25" y="0" fontSize="10" fill="#64748B">
              Thú săn (y)
            </text>
            <text
              x={viewMode === "both" ? 205 : 465}
              y="230"
              fontSize="10"
              fill="#64748B"
            >
              Con mồi (x)
            </text>

            <polygon
              points={res.phasePoints
                .map((p) => pToScreen(p).join(","))
                .join(" ")}
              fill="#3B82F6"
              fillOpacity="0.08"
              stroke="#2563EB"
              strokeWidth="2"
            />

            <g>
              <circle
                cx={eqPos[0]}
                cy={eqPos[1]}
                r="5"
                fill="#F59E0B"
                stroke="#D97706"
                strokeWidth="1.5"
              />
              <text
                x={eqPos[0] + 7}
                y={eqPos[1] - 5}
                fontSize="9"
                fontWeight="bold"
                fill="#B45309"
              >
                Cân bằng ({res.equilibrium[0]}; {res.equilibrium[1]})
              </text>
            </g>

            <g>
              <circle cx={initPos[0]} cy={initPos[1]} r="4" fill="#10B981" />
              <text
                x={initPos[0] + 6}
                y={initPos[1] + 10}
                fontSize="8"
                fill="#047857"
              >
                (x₀, y₀)
              </text>
            </g>
          </g>
        )}
      </svg>

      <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
        📌 <strong>Quy luật trễ pha:</strong> Khi con mồi tăng dẫn đến thú săn dồi
        dào thức ăn, đỉnh thú săn xuất hiện sau đỉnh con mồi. Quỹ đạo mặt phẳng pha
        (x, y) là đường cong khép kín bảo toàn.
      </p>

      <Facts
        items={[
          [
            "Điểm cân bằng (x̄; ȳ)",
            `(${res.equilibrium[0]}; ${res.equilibrium[1]})`,
          ],
          ["Chu kỳ dao động T", `~${res.periodApprox}s`],
          ["Con mồi hiện tại (x)", `${res.currentPrey}`],
          ["Thú săn hiện tại (y)", `${res.currentPredator}`],
        ]}
      />

      <div className={panel}>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            className={`${button} ${
              viewMode === "both"
                ? "bg-blue-100 font-semibold border-blue-500"
                : ""
            }`}
            onClick={() => setViewMode("both")}
          >
            📊 Hiển thị song song (N(t) & Pha)
          </button>
          <button
            className={`${button} ${
              viewMode === "time"
                ? "bg-blue-100 font-semibold border-blue-500"
                : ""
            }`}
            onClick={() => setViewMode("time")}
          >
            📈 Đồ thị thời gian N(t)
          </button>
          <button
            className={`${button} ${
              viewMode === "phase"
                ? "bg-blue-100 font-semibold border-blue-500"
                : ""
            }`}
            onClick={() => setViewMode("phase")}
          >
            🔄 Mặt phẳng pha (x, y)
          </button>
        </div>

        <Control
          id="lv-alpha"
          label="Tốc độ sinh mồi (α)"
          value={alpha}
          min={0.2}
          max={2.5}
          step={0.1}
          set={setAlpha}
        />
        <Control
          id="lv-beta"
          label="Hiệu suất săn mồi (β)"
          value={beta}
          min={0.02}
          max={0.3}
          step={0.01}
          set={setBeta}
        />
        <Control
          id="lv-gamma"
          label="Tử vong thú săn (γ)"
          value={gamma}
          min={0.2}
          max={2.5}
          step={0.1}
          set={setGamma}
        />
        <Control
          id="lv-x0"
          label="Con mồi ban đầu (x₀)"
          value={x0}
          min={5}
          max={35}
          step={1}
          set={setX0}
        />
        <Control
          id="lv-y0"
          label="Thú săn ban đầu (y₀)"
          value={y0}
          min={3}
          max={25}
          step={1}
          set={setY0}
        />

        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-stone-200">
          <button
            className={button}
            onClick={() => {
              setAlpha(1.0);
              setBeta(0.1);
              setGamma(1.0);
              setDelta(0.05);
              setX0(15);
              setY0(8);
            }}
          >
            🌿 Cân bằng tự nhiên
          </button>
          <button
            className={button}
            onClick={() => {
              setAlpha(2.0);
              setBeta(0.08);
              setX0(30);
              setY0(4);
            }}
          >
            🐰 Bùng nổ con mồi
          </button>
          <button
            className={button}
            onClick={() => {
              setAlpha(0.8);
              setBeta(0.15);
              setX0(10);
              setY0(15);
            }}
          >
            🐺 Thú săn áp đảo
          </button>
        </div>
      </div>
    </div>
  );
};

export const CellSignalingEngine: React.FC<Props> = ({ blueprint }) => {
  const meta = blueprint.meta ?? {};
  const [ligand, setLigand] = useState(false);
  const [apoptosis, setApoptosis] = useState(meta.apoptosis === 1);

  const res = useMemo(
    () => signalTransductionRun(ligand, apoptosis),
    [ligand, apoptosis]
  );

  return (
    <div
      className="p-4 flex flex-col gap-3"
      data-testid="cell-signaling-engine"
      data-fate={res.cellFate}
      data-camp={res.campLevel}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-stone-800">
          Truyền tin tế bào qua GPCR & Con đường Apoptosis
        </h4>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-mono font-medium ${
            res.cellFate === "APOPTOSIS_DEATH"
              ? "bg-rose-100 text-rose-800"
              : res.cellFate === "GLYCOGEN_BREAKDOWN"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {res.cellFate === "APOPTOSIS_DEATH"
            ? "💀 APOPTOSIS (Tế bào chết)"
            : res.cellFate === "GLYCOGEN_BREAKDOWN"
            ? "⚡ HOẠT HÓA PKA (Phân giải Glycogen)"
            : "💤 TRẠNG THÁI NGHỈ (Basal)"}
        </span>
      </div>

      <svg
        role="img"
        aria-label="Sơ đồ con đường truyền tin qua thụ thể GPCR, G-protein, cAMP và thụ thể chết Fas"
        viewBox="0 0 520 280"
        className="w-full rounded-xl border border-stone-200 bg-white select-none"
      >
        <defs>
          <linearGradient id="cytoGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#F1F5F9" />
          </linearGradient>
        </defs>

        {/* Khoang ngoại bào */}
        <rect x="0" y="0" width="520" height="70" fill="#EFF6FF" />
        <text x="12" y="20" fontSize="11" fontWeight="bold" fill="#1E40AF">
          Khoang ngoại bào (Extracellular Space)
        </text>

        {/* Màng sinh chất */}
        <rect
          x="0"
          y="70"
          width="520"
          height="35"
          fill="#94A3B8"
          opacity="0.6"
        />
        <text x="12" y="92" fontSize="10" fill="#334155" fontWeight="bold">
          Màng sinh chất (Plasma Membrane)
        </text>

        {/* Bào tương */}
        <rect x="0" y="105" width="520" height="175" fill="url(#cytoGrad)" />
        <text x="12" y="265" fontSize="11" fontWeight="bold" fill="#475569">
          Bào tương (Cytoplasm)
        </text>

        {/* Nhánh 1: Con đường GPCR */}
        {ligand && !apoptosis && (
          <g transform="translate(68, 48)">
            <circle
              cx="0"
              cy="0"
              r="8"
              fill="#F59E0B"
              stroke="#D97706"
              strokeWidth="2"
            />
            <text
              x="0"
              y="3"
              textAnchor="middle"
              fontSize="8"
              fontWeight="bold"
              fill="#FFFFFF"
            >
              L
            </text>
            <text x="14" y="3" fontSize="9" fontWeight="bold" fill="#D97706">
              Ligand (Epinephrine)
            </text>
          </g>
        )}

        {/* Thụ thể 7TM GPCR */}
        <g transform="translate(50, 60)">
          <path
            d="M 10 0 C 10 30, 20 50, 25 15 C 30 -10, 40 45, 45 10"
            fill="none"
            stroke={res.gpcrActive ? "#2563EB" : "#64748B"}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <text
            x="28"
            y="55"
            textAnchor="middle"
            fontSize="9"
            fontWeight="bold"
            fill="#1E293B"
          >
            GPCR
          </text>
        </g>

        {/* Phức hệ G-protein */}
        <g transform={`translate(${res.gAlphaActive ? "165" : "105"}, 115)`}>
          <rect
            x="0"
            y="0"
            width="34"
            height="24"
            rx="6"
            fill={res.gAlphaActive ? "#10B981" : "#F43F5E"}
            stroke="#0F172A"
            strokeWidth="1.5"
          />
          <text
            x="17"
            y="15"
            textAnchor="middle"
            fontSize="9"
            fontWeight="bold"
            fill="#FFFFFF"
          >
            Gα
          </text>
          <text
            x="17"
            y="-5"
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill={res.gAlphaActive ? "#059669" : "#64748B"}
          >
            {res.gAlphaActive ? "GTP" : "GDP"}
          </text>
        </g>

        {!res.gAlphaActive && (
          <g transform="translate(100, 142)">
            <circle cx="10" cy="8" r="8" fill="#8B5CF6" />
            <circle cx="24" cy="8" r="7" fill="#A855F7" />
            <text x="17" y="11" textAnchor="middle" fontSize="8" fill="#FFFFFF">
              βγ
            </text>
          </g>
        )}

        {/* Adenylate Cyclase */}
        <g transform="translate(210, 65)">
          <rect
            x="0"
            y="0"
            width="38"
            height="45"
            rx="8"
            fill={res.gAlphaActive ? "#0284C7" : "#CBD5E1"}
            stroke="#0369A1"
            strokeWidth="2"
          />
          <text
            x="19"
            y="26"
            textAnchor="middle"
            fontSize="9"
            fontWeight="bold"
            fill="#FFFFFF"
          >
            AC
          </text>
          <text x="19" y="55" textAnchor="middle" fontSize="8" fill="#0369A1">
            Adenylate Cyclase
          </text>
        </g>

        {/* Tạo cAMP */}
        {res.campLevel > 20 && (
          <g transform="translate(230, 135)">
            <path
              d="M 0 0 L 15 35"
              stroke="#06B6D4"
              strokeWidth="2.5"
              strokeDasharray="3 2"
            />
            <text x="25" y="40" fontSize="10" fontWeight="bold" fill="#0891B2">
              cAMP (Chất truyền tin thứ 2)
            </text>
          </g>
        )}

        {/* PKA hoạt hóa */}
        <g transform="translate(270, 180)">
          <rect
            x="0"
            y="0"
            width="85"
            height="35"
            rx="8"
            fill={res.pkaActive ? "#F59E0B" : "#E2E8F0"}
            stroke={res.pkaActive ? "#D97706" : "#94A3B8"}
            strokeWidth="2"
          />
          <text
            x="42"
            y="16"
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill={res.pkaActive ? "#FFFFFF" : "#64748B"}
          >
            Protein Kinase A
          </text>
          <text
            x="42"
            y="28"
            textAnchor="middle"
            fontSize="8"
            fill={res.pkaActive ? "#78350F" : "#94A3B8"}
          >
            {res.pkaActive ? "Phân giải Glycogen ⚡" : "Bất hoạt"}
          </text>
        </g>

        {/* Nhánh 2: Apoptosis */}
        <g transform="translate(410, 50)">
          <rect
            x="0"
            y="15"
            width="25"
            height="45"
            rx="4"
            fill={apoptosis ? "#BE123C" : "#94A3B8"}
            stroke="#881337"
            strokeWidth="1.5"
          />
          <text
            x="12"
            y="42"
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill="#FFFFFF"
          >
            Fas
          </text>
          {apoptosis && (
            <text
              x="12"
              y="8"
              textAnchor="middle"
              fontSize="8"
              fontWeight="bold"
              fill="#E11D48"
            >
              FasL
            </text>
          )}

          {res.caspaseCascade && (
            <g transform="translate(0, 75)">
              <rect x="-10" y="0" width="45" height="24" rx="4" fill="#E11D48" />
              <text
                x="12"
                y="15"
                textAnchor="middle"
                fontSize="8"
                fontWeight="bold"
                fill="#FFFFFF"
              >
                Casp-8
              </text>
              <path
                d="M 12 25 L 12 45"
                stroke="#E11D48"
                strokeWidth="2"
                strokeDasharray="2 2"
              />
              <rect
                x="-15"
                y="48"
                width="55"
                height="26"
                rx="4"
                fill="#9F1239"
              />
              <text
                x="12"
                y="64"
                textAnchor="middle"
                fontSize="9"
                fontWeight="bold"
                fill="#FFFFFF"
              >
                Casp-3 ☠️
              </text>
              <text
                x="12"
                y="86"
                textAnchor="middle"
                fontSize="8"
                fontWeight="bold"
                fill="#9F1239"
              >
                Phân mảnh ADN
              </text>
            </g>
          )}
        </g>
      </svg>

      <p className="text-sm text-stone-700 bg-stone-100 p-2.5 rounded-lg border border-stone-200">
        💡 {res.message}
      </p>

      <Facts
        items={[
          ["Thụ thể GPCR", res.gpcrActive ? "Đang kích hoạt" : "Nghỉ"],
          [
            "Gα-Protein",
            res.gAlphaActive ? "Gα-GTP (Tách rời)" : "Gα-GDP (Bất hoạt)",
          ],
          ["Nồng độ cAMP", `${res.campLevel} pmol/L`],
          ["Protein Kinase A", res.pkaActive ? "Hoạt hóa ⚡" : "Bất hoạt"],
        ]}
      />

      <div className={panel}>
        <div className="flex flex-wrap gap-2">
          <button
            className={`${button} ${
              ligand && !apoptosis
                ? "bg-amber-100 font-semibold border-amber-500 text-amber-900"
                : ""
            }`}
            onClick={() => {
              setApoptosis(false);
              setLigand(!ligand);
            }}
          >
            🧪{" "}
            {ligand && !apoptosis
              ? "Tách phối tử Ligand"
              : "Gắn phối tử Ligand (Epinephrine)"}
          </button>
          <button
            className={`${button} ${
              apoptosis
                ? "bg-rose-100 font-semibold border-rose-500 text-rose-900"
                : ""
            }`}
            onClick={() => {
              setLigand(false);
              setApoptosis(!apoptosis);
            }}
          >
            💀 {apoptosis ? "Hủy tín hiệu Fas" : "Kích hoạt thụ thể Fas (Apoptosis)"}
          </button>
          <button
            className={button}
            onClick={() => {
              setLigand(false);
              setApoptosis(false);
            }}
          >
            🔄 Trạng thái nghỉ (Basal)
          </button>
        </div>
      </div>
    </div>
  );
};

export const ADVANCED_ENGINES: Record<string, React.FC<Props> | undefined> = {
  MATH_3D_OXYZ: OxyzEngine,
  MATH_INTEGRAL_3D_REVOLVE: RevolutionEngine,
  MATH_DYNAMIC_GEOMETRY: DynamicGeometryEngine,
  CHEM_CRYSTAL_LATTICE: CrystalLatticeEngine,
  CHEM_CFT_COMPLEX_3D: CrystalFieldEngine,
  CHEM_SN2_MECHANISM: Sn2Engine,
  CHEM_ORGANIC_SKELETAL: CyclohexaneEngine,
  BIO_CELL_RESPIRATION: CellRespirationEngine,
  BIO_LOTKA_VOLTERRA: LotkaVolterraEngine,
  BIO_CELL_SIGNALING: CellSignalingEngine,
};
