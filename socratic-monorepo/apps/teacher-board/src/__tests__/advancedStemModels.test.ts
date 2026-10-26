import { describe, it, expect } from "vitest";
import {
  spherePlane,
  parsePlane,
  planeBasis,
  dot3,
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
  matchAdvancedKeywords,
  type LatticeKind,
} from "../utils/advancedStemModels";

describe("Mặt cầu / mặt phẳng", () => {
  it("đọc phương trình tuyến tính bằng AST, kể cả ngoặc và vế phải", () => {
    expect(parsePlane("2(x+y)-3z=4")).toEqual({
      normal: [2, 2, -3],
      offset: -4,
    });
    expect(parsePlane("x/2+y=2-z")).toEqual({
      normal: [0.5, 1, 1],
      offset: -2,
    });
  });
  it.each([
    "x*y+z=0",
    "x^2+y=0",
    "sin(x)+z=0",
    "x/(y+1)=0",
    "a*x+y=0",
    "0x+0y+0z=0",
  ])("bác mặt phẳng sai %s", (s) => expect(() => parsePlane(s)).toThrow());
  it("thiết diện, tiếp xúc và không giao", () => {
    const cut = spherePlane([1, 2, 3], 5, [0, 0, 2], -12);
    expect(cut.distance).toBe(3);
    expect(cut.foot).toEqual([1, 2, 6]);
    expect(cut.sectionRadius).toBe(4);
    expect(spherePlane([0, 0, 0], 2, [0, 0, 1], -2).relation).toBe("tangent");
    expect(spherePlane([0, 0, 0], 2, [0, 0, 1], -3).relation).toBe("disjoint");
  });
  it("bất biến khi đổi dấu / nhân hệ số phương trình", () => {
    const a = spherePlane([1, -2, 3], 4, [1, 2, 3], -4),
      b = spherePlane([1, -2, 3], 4, [-2, -4, -6], 8);
    expect(a.distance).toBeCloseTo(b.distance, 12);
    expect(a.foot).toEqual(b.foot);
  });
  it("cơ sở mặt phẳng trực chuẩn", () => {
    const n: [number, number, number] = [2, 3, -4];
    const [u, v] = planeBasis(n);
    expect(dot3(u, n)).toBeCloseTo(0, 12);
    expect(dot3(v, n)).toBeCloseTo(0, 12);
    expect(dot3(u, v)).toBeCloseTo(0, 12);
    expect(dot3(u, u)).toBeCloseTo(1, 12);
  });
  it("bác pháp tuyến 0, bán kính âm và NaN", () => {
    expect(() => spherePlane([0, 0, 0], 2, [0, 0, 0], 1)).toThrow();
    expect(() => spherePlane([0, 0, 0], -1, [0, 0, 1], 1)).toThrow();
    expect(() => spherePlane([NaN, 0, 0], 2, [0, 0, 1], 1)).toThrow();
  });
});

describe("Tích phân tròn xoay", () => {
  it("hình trụ đúng cả tổng đĩa lẫn tham chiếu", () => {
    const r = revolution("2", 0, 3, 10);
    expect(r.volume).toBeCloseTo(12 * Math.PI, 10);
    expect(r.reference).toBeCloseTo(12 * Math.PI, 10);
  });
  it("hình nón hội tụ về πb³/3 khi tăng n", () => {
    const a = revolution("x", 0, 2, 5),
      b = revolution("x", 0, 2, 100);
    expect(a.reference).toBeCloseTo((8 * Math.PI) / 3, 10);
    expect(b.error).toBeLessThan(a.error / 100);
  });
  it("hàm âm cho cùng thể tích; sqrt(x) cho paraboloid", () => {
    expect(revolution("-x", 0, 2, 10).volume).toBeCloseTo(
      revolution("x", 0, 2, 10).volume,
      12,
    );
    expect(revolution("sqrt(x)", 0, 2, 10).reference).toBeCloseTo(
      2 * Math.PI,
      10,
    );
  });
  it.each([
    ["x", 2, 0, 10],
    ["sqrt(x)", -1, 1, 10],
    ["1/x", -1, 1, 10],
    ["y", 0, 1, 10],
    ["a*x", 0, 1, 10],
    ["x", 0, 1, 0],
    ["x", 0, 1, 2.5],
  ] as [string, number, number, number][])(
    "bác dữ liệu sai %s %s %s %s",
    (f, a, b, n) => expect(() => revolution(f, a, b, n)).toThrow(),
  );
});

describe("Hình học động", () => {
  it("tam giác vuông có ngoại tâm ở trung điểm cạnh huyền, trực tâm ở đỉnh vuông", () => {
    const r = triangleCenters([0, 0], [4, 0], [0, 3])!;
    expect(r.o).toEqual([2, 1.5]);
    expect(r.h).toEqual([0, 0]);
    expect(r.inc).toEqual([1, 1]);
    expect(r.radius).toBe(2.5);
    expect(r.inradius).toBe(1);
  });
  it("đường Euler thỏa H + 2O = 3G", () => {
    const r = triangleCenters([-2, 1], [3, -1], [1, 4])!;
    for (const i of [0, 1])
      expect(r.h[i] + 2 * r.o[i]).toBeCloseTo(3 * r.g[i], 12);
  });
  it("thẳng hàng và trùng đỉnh không tạo tâm giả", () => {
    expect(triangleCenters([0, 0], [1, 1], [2, 2])).toBeNull();
    expect(triangleCenters([1, 1], [1, 1], [2, 3])).toBeNull();
  });
  it("nghịch đảo hai lần trở về điểm ban đầu, OP.OP′=k", () => {
    const p: [number, number] = [3, 4],
      q = inversePoint(p, 9)!;
    expect(Math.hypot(...p) * Math.hypot(...q)).toBeCloseTo(9, 12);
    const pp = inversePoint(q, 9)!;
    expect(pp[0]).toBeCloseTo(3, 12);
    expect(pp[1]).toBeCloseTo(4, 12);
    expect(inversePoint([0, 0], 4)).toBeNull();
  });
  it("đối cực thỏa phương trình và định lý La Hire", () => {
    const p: [number, number] = [2, 1],
      q: [number, number] = [1, 2];
    const l = polarLine(p, 2)!;
    expect(p[0] * l.foot[0] + p[1] * l.foot[1]).toBeCloseTo(4, 12);
    const lp = polarLine(p, 2)!,
      lq = polarLine(q, 2)!;
    // Q thuộc đối cực P và P thuộc đối cực Q: vectơ từ chân đến điểm song song đường.
    expect(
      (q[0] - lp.foot[0]) * lp.direction[1] -
        (q[1] - lp.foot[1]) * lp.direction[0],
    ).toBeCloseTo(0, 12);
    expect(
      (p[0] - lq.foot[0]) * lq.direction[1] -
        (p[1] - lq.foot[1]) * lq.direction[0],
    ).toBeCloseTo(0, 12);
    expect(polarLine([0, 0], 2)).toBeNull();
  });
});

describe("Ô mạng tinh thể", () => {
  it.each([
    ["SC", 1, 6, Math.PI / 6],
    ["BCC", 2, 8, (Math.sqrt(3) * Math.PI) / 8],
    ["FCC", 4, 12, Math.PI / (3 * Math.sqrt(2))],
  ] as [LatticeKind, number, number, number][])(
    "%s: đóng góp và độ đặc khít",
    (kind, atoms, coord, packing) => {
      const r = lattice(kind, 0.15);
      expect(r.atoms).toBe(atoms);
      expect(r.coordination).toBe(coord);
      expect(r.packing).toBeCloseTo(packing, 12);
      expect(lattice(kind, 0.3).packing).toBeCloseTo(packing, 12);
      expect(lattice(kind, 0.3).edge).toBeCloseTo(2 * r.edge, 12);
    },
  );
  it("tổng đóng góp tâm nguyên tử đúng, không đếm toàn cầu ngoài ô", () => {
    for (const kind of ["SC", "BCC", "FCC"] as const) {
      const r = lattice(kind, 1);
      expect(
        r.sites.reduce(
          (sum, p) => sum + 1 / 2 ** p.filter((v) => v === 0 || v === 1).length,
          0,
        ),
      ).toBe(r.atoms);
    }
  });
  it("đỉnh mặt Miller thỏa hx+ky+lz=1", () => {
    for (const [key, points] of Object.entries(MILLER_VERTICES)) {
      const [h, k, l] = key.split("").map(Number);
      for (const p of points) expect(h * p[0] + k * p[1] + l * p[2]).toBe(1);
    }
  });
});

describe("Trường tinh thể bát diện", () => {
  it("d6 trường yếu 4 độc thân, trường mạnh nghịch từ", () => {
    const h = crystalField(6, 0.7, 1),
      l = crystalField(6, 1.8, 1);
    expect(h.unpaired).toBe(4);
    expect(h.t).toBe(4);
    expect(h.e).toBe(2);
    expect(l.unpaired).toBe(0);
    expect(l.t).toBe(6);
    expect(l.cfse).toBeCloseTo(-2.4 * 1.8, 12);
  });
  it("d4–d7 đúng cấu hình cả hai trường", () => {
    for (const [d, high, low] of [
      [4, 4, 2],
      [5, 5, 1],
      [6, 4, 0],
      [7, 3, 1],
    ]) {
      expect(crystalField(d, 0.5, 1).unpaired).toBe(high);
      expect(crystalField(d, 2, 1).unpaired).toBe(low);
    }
  });
  it("mọi d0–d10 bảo toàn electron và Pauli", () => {
    for (let d = 0; d <= 10; d++)
      for (const delta of [0.5, 2]) {
        const r = crystalField(d, delta, 1);
        expect(r.occupancy.reduce((s, n) => s + n, 0)).toBe(d);
        expect(r.occupancy.every((n) => n >= 0 && n <= 2)).toBe(true);
        expect(r.energy).toBeLessThanOrEqual(
          Math.min(r.high.energy, r.low.energy) + 1e-10,
        );
        if (d < 4 || d > 7) expect(r.spin).toBe("fixed");
      }
  });
  it("Δ=P thừa nhận hai cấu hình đồng năng lượng", () => {
    const r = crystalField(6, 1, 1);
    expect(r.spin).toBe("crossover");
    expect(r.high.energy).toBeCloseTo(r.low.energy, 12);
  });
  it.each([-1, 11, 2.5])("bác d sai %s", (d) =>
    expect(() => crystalField(d, 1, 1)).toThrow(),
  );
});

describe("SN2", () => {
  it("liên kết tạo và bẻ đồng thời, nucleophile ở mặt sau", () => {
    const r = sn2(0.5);
    expect(r.forming).toBe(0.5);
    expect(r.breaking).toBe(0.5);
    expect(r.incoming[0]).toBeLessThan(0);
    expect(r.leaving[0]).toBeGreaterThan(0);
    expect(r.hydrogens.every((p) => p[0] === 0)).toBe(true);
    expect(r.energy).toBe(60);
  });
  it("đảo ô và giới hạn tiến trình", () => {
    expect(sn2(0).hydrogens[0][0]).toBeLessThan(0);
    expect(sn2(1).hydrogens[0][0]).toBeGreaterThan(0);
    expect(sn2(-1).p).toBe(0);
    expect(sn2(2).p).toBe(1);
    expect(sn2(1).energy).toBeCloseTo(0, 12);
  });
});

describe("Cấu dạng Cyclohexane", () => {
  it("dạng ghế bền nhất có ΔE = 0 và 6 liên kết trục / xích đạo", () => {
    const chair = cyclohexaneConformation("chair");
    expect(chair.energyKj).toBe(0);
    expect(chair.carbons).toHaveLength(6);
    expect(chair.axialBonds).toHaveLength(6);
    expect(chair.equatorialBonds).toHaveLength(6);
  });

  it("dạng thuyền có sức căng flagpole và năng lượng 29.5 kJ/mol", () => {
    const boat = cyclohexaneConformation("boat");
    expect(boat.energyKj).toBe(29.5);
    expect(boat.stabilityNote).toContain("flagpole");
  });

  it("dạng xoắn thuyền có năng lượng 23.0 kJ/mol", () => {
    const twist = cyclohexaneConformation("twist");
    expect(twist.energyKj).toBe(23.0);
  });

  it("dạng lật vòng hoán đổi trục và xích đạo", () => {
    const inv = cyclohexaneConformation("inverted");
    expect(inv.energyKj).toBe(0);
    expect(inv.stabilityNote).toContain("Ring-flip");
  });
});

describe("Chuỗi truyền electron (ETC) và ATP Synthase", () => {
  it("trạng thái bình thường tạo gradient proton và quay rotor tổng hợp ATP", () => {
    const res = etcRespiration(false, false, 100);
    expect(res.pmfMv).toBe(220);
    expect(res.atpRate).toBe(100);
    expect(res.rotorSpeed).toBeGreaterThan(0);
    expect(res.matrixPh).toBeGreaterThan(res.imsPh);
  });

  it("ngộ độc Cyanide khóa phức hệ IV, làm sụt hoàn toàn ATP", () => {
    const res = etcRespiration(true, false, 100);
    expect(res.atpRate).toBe(0);
    expect(res.pmfMv).toBe(15);
    expect(res.rotorSpeed).toBe(0);
    expect(res.statusMessage).toContain("Cyanide");
  });

  it("chất dỡ cặp DNP gây rò rỉ proton, tiêu tán năng lượng thành nhiệt", () => {
    const res = etcRespiration(false, true, 100);
    expect(res.atpRate).toBeLessThan(15);
    expect(res.statusMessage).toContain("DNP");
  });

  it("nồng độ oxy giảm làm giảm tốc độ tổng hợp ATP", () => {
    const highO2 = etcRespiration(false, false, 100);
    const lowO2 = etcRespiration(false, false, 30);
    expect(lowO2.atpRate).toBeLessThan(highO2.atpRate);
  });
});

describe("Mô hình Lotka-Volterra 2 loài", () => {
  it("tạo chuỗi thời gian RK4 và quỹ đạo mặt phẳng pha khép kín", () => {
    const res = lotkaVolterraRun(1.0, 0.1, 1.0, 0.05, 15, 8, 50, 0.1);
    expect(res.timeline).toHaveLength(50);
    expect(res.phasePoints).toHaveLength(50);
    expect(res.equilibrium).toEqual([20, 10]);
    expect(res.periodApprox).toBeCloseTo((2 * Math.PI) / Math.sqrt(1.0 * 1.0), 2);
  });

  it("giữ giá trị sinh học dương cho quần thể", () => {
    const res = lotkaVolterraRun(1.5, 0.2, 0.8, 0.1, 5, 20, 40, 0.1);
    for (const pt of res.timeline) {
      expect(pt.prey).toBeGreaterThan(0);
      expect(pt.predator).toBeGreaterThan(0);
    }
  });
});

describe("Truyền tin tế bào GPCR và Apoptosis", () => {
  it("gắn Ligand kích hoạt Gα-GTP, bùng nổ cAMP và hoạt hóa PKA", () => {
    const res = signalTransductionRun(true, false);
    expect(res.gpcrActive).toBe(true);
    expect(res.gAlphaActive).toBe(true);
    expect(res.campLevel).toBeGreaterThan(50);
    expect(res.pkaActive).toBe(true);
    expect(res.cellFate).toBe("GLYCOGEN_BREAKDOWN");
  });

  it("kích hoạt thụ thể Fas dẫn đến dòng thác Caspase và Apoptosis", () => {
    const res = signalTransductionRun(false, true);
    expect(res.caspaseCascade).toBe(true);
    expect(res.cellFate).toBe("APOPTOSIS_DEATH");
    expect(res.message).toContain("Apoptosis");
  });

  it("trạng thái nghỉ duy trì cân bằng nội môi", () => {
    const res = signalTransductionRun(false, false);
    expect(res.gpcrActive).toBe(false);
    expect(res.gAlphaActive).toBe(false);
    expect(res.cellFate).toBe("BASAL_HOMEOSTASIS");
  });
});

describe("Từ khóa đủ ngữ cảnh", () => {
  it.each([
    ["hình học Oxyz", "MATH_3D_OXYZ"],
    ["x^2 + y^2 + z^2 = 10", "MATH_3D_OXYZ"],
    ["x^2 + y^2 + 2^2 = 10", "MATH_3D_OXYZ"],
    ["tròn xoay f(x)=x^2; a=0; b=3", "MATH_INTEGRAL_3D_REVOLVE"],
    ["đường Euler", "MATH_DYNAMIC_GEOMETRY"],
    ["S_N2", "CHEM_SN2_MECHANISM"],
    ["ô mạng FCC", "CHEM_CRYSTAL_LATTICE"],
    ["[Fe(CN)₆]⁴⁻", "CHEM_CFT_COMPLEX_3D"],
    ["cấu dạng ghế cyclohexane", "CHEM_ORGANIC_SKELETAL"],
    ["chuỗi truyền electron ti thể", "BIO_CELL_RESPIRATION"],
    ["mô hình con mồi và thú săn Lotka-Volterra", "BIO_LOTKA_VOLTERRA"],
    ["truyền tin thụ thể GPCR", "BIO_CELL_SIGNALING"],
  ])("%s", (s, id) => expect(matchAdvancedKeywords(s)?.templateId).toBe(id));
  it("không cướp các công thức thường hoặc pin điện", () => {
    for (const s of ["x^2+y^2=1", "F=ma", "H2O", "Zn-Cu", "SC", "tam giác ABC"])
      expect(matchAdvancedKeywords(s)).toBeNull();
  });
  it("đọc meta thay vì bỏ qua hàm, cận và kiểu mạng", () => {
    expect(
      matchAdvancedKeywords("tròn xoay f(x)=x^2; a=-1; b=3")?.meta,
    ).toEqual({ expression: "x^2", a: -1, b: 3 });
    expect(matchAdvancedKeywords("ô mạng FCC")?.meta.kind).toBe("FCC");
    expect(matchAdvancedKeywords("cấu dạng thuyền")?.meta.form).toBe("boat");
    expect(matchAdvancedKeywords("ngộ độc cyanide")?.meta.cyanide).toBe(1);
    expect(matchAdvancedKeywords("chết tế bào apoptosis")?.meta.apoptosis).toBe(1);
  });
});

