import React from "react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { SimulationBlueprint } from "@socratic/types";
import { routeLocally } from "../utils/localRouter";
import { SimulationWidget } from "../components/canvas/SimulationWidget";
import {
  OxyzEngine,
  RevolutionEngine,
  DynamicGeometryEngine,
  CrystalLatticeEngine,
  CrystalFieldEngine,
  Sn2Engine,
  CyclohexaneEngine,
  CellRespirationEngine,
  LotkaVolterraEngine,
  CellSignalingEngine,
} from "../engines/AdvancedStemEngines";

const bp = (text: string) => routeLocally(text) as SimulationBlueprint;
describe("Định tuyến và tích hợp mười engine", () => {
  it.each([
    ["Oxyz", "oxyz-engine"],
    ["khối tròn xoay", "revolution-engine"],
    ["hình học động", "dynamic-engine"],
    ["SN2", "sn2-engine"],
    ["mạng tinh thể FCC", "lattice-engine"],
    ["CFT", "cft-engine"],
    ["cấu dạng ghế cyclohexane", "cyclohexane-engine"],
    ["chuỗi truyền electron ti thể", "cell-respiration-engine"],
    ["mô hình con mồi Lotka-Volterra", "lotka-volterra-engine"],
    ["truyền tin tế bào GPCR", "cell-signaling-engine"],
  ])("%s mở đúng một engine, ẩn slider chung", (text, id) => {
    const blueprint = bp(text);
    expect(blueprint.socraticQuestion.length).toBeGreaterThan(20);
    const { container } = render(<SimulationWidget blueprint={blueprint} />);
    expect(screen.getAllByTestId(id)).toHaveLength(1);
    expect(screen.getByTestId("macro-sliders-container")).toHaveClass("hidden");
    expect(container.textContent).not.toContain("\\text{");
  });
});

describe("Điều khiển và trạng thái biên", () => {
  const pointer = (target: Element, type: string, x: number, y: number) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      button: 0,
      clientX: x,
      clientY: y,
    });
    Object.defineProperty(event, "pointerId", { value: 5 });
    fireEvent(target, event);
  };
  it("xoay scene bằng con trỏ, pointercancel dừng thao tác", () => {
    render(<CrystalLatticeEngine blueprint={bp("ô mạng FCC")} />);
    const svg = screen.getByRole("img", { name: "Ô mạng FCC và mặt Miller" });
    const capture = vi.fn();
    Object.defineProperty(svg, "setPointerCapture", { value: capture });
    const before = svg.innerHTML;
    pointer(svg, "pointerdown", 100, 100);
    pointer(svg, "pointermove", 160, 125);
    expect(capture).toHaveBeenCalledWith(5);
    expect(svg.innerHTML).not.toBe(before);
    pointer(svg, "pointercancel", 160, 125);
    const cancelled = svg.innerHTML;
    pointer(svg, "pointermove", 200, 150);
    expect(svg.innerHTML).toBe(cancelled);
  });
  it("kéo đỉnh đổi tọa độ qua CTM của SVG và dừng khi hủy", () => {
    render(<DynamicGeometryEngine blueprint={bp("hình học động")} />);
    const svg = screen.getByRole("img", {
      name: "Tam giác kéo đỉnh, đường Euler, đối cực và nghịch đảo",
    });
    Object.defineProperty(svg, "getScreenCTM", {
      value: () => ({ inverse: () => ({}) }),
    });
    Object.defineProperty(svg, "createSVGPoint", {
      value: () => ({
        x: 0,
        y: 0,
        matrixTransform() {
          return { x: (this.x - 100) / 2, y: (this.y - 50) / 2 };
        },
      }),
    });
    const a = screen.getByTestId("geo-point-0");
    pointer(a, "pointerdown", 452, 454);
    pointer(svg, "pointermove", 620, 286);
    expect(a).toHaveAttribute("cx", "260");
    expect(a).toHaveAttribute("cy", "118");
    pointer(svg, "pointercancel", 620, 286);
    pointer(svg, "pointermove", 704, 370);
    expect(a).toHaveAttribute("cx", "260");
    expect(a).toHaveAttribute("cy", "118");
  });
  it("Oxyz nhận phương trình từ đầu vào và bác phi tuyến mà không crash", () => {
    render(<OxyzEngine blueprint={bp("Oxyz; P: z=2")} />);
    expect(screen.getByTestId("oxyz-engine")).toHaveAttribute(
      "data-relation",
      "tangent",
    );
    fireEvent.change(screen.getByLabelText("Phương trình mặt phẳng"), {
      target: { value: "x*y+z=0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng mặt phẳng" }));
    expect(screen.getByRole("alert")).toHaveTextContent("bậc nhất");
  });
  it("nút đặt lại của widget khôi phục trạng thái riêng của engine", () => {
    render(<SimulationWidget blueprint={bp("SN2")} />);
    fireEvent.change(screen.getByTestId("sn2-progress"), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByTestId("reset-btn"));
    expect(screen.getByTestId("sn2-engine")).toHaveAttribute(
      "data-stage",
      "reactants",
    );
    expect(screen.queryByTestId("ocr-swap-btn")).toBeNull();
  });
  it("Oxyz đổi cắt / tiếp xúc / không giao, báo pháp tuyến 0", () => {
    render(<OxyzEngine blueprint={bp("Oxyz")} />);
    expect(screen.getByTestId("oxyz-engine")).toHaveAttribute(
      "data-relation",
      "circle",
    );
    fireEvent.click(screen.getByRole("button", { name: "Tiếp xúc" }));
    expect(screen.getByTestId("oxyz-engine")).toHaveAttribute(
      "data-relation",
      "tangent",
    );
    fireEvent.click(screen.getByRole("button", { name: "Không giao" }));
    expect(screen.getByTestId("oxyz-engine")).toHaveAttribute(
      "data-relation",
      "disjoint",
    );
    fireEvent.change(screen.getByTestId("ox-normal-2"), {
      target: { value: "0" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("pháp tuyến");
  });
  it("tròn xoay nhận đúng hàm/cận, tăng n giảm sai lệch, bác khoảng sai", () => {
    render(<RevolutionEngine blueprint={bp("tròn xoay f(x)=x; a=0; b=2")} />);
    const error = () =>
      Number(screen.getByTestId("revolution-engine").dataset.error);
    const before = error();
    fireEvent.change(screen.getByTestId("rev-n"), { target: { value: "100" } });
    expect(error()).toBeLessThan(before);
    fireEvent.change(screen.getByLabelText("Hàm tròn xoay"), {
      target: { value: "1/x" },
    });
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Trụ" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      Number(screen.getByTestId("revolution-engine").dataset.volume),
    ).toBeCloseTo(8 * Math.PI, 8);
    fireEvent.change(screen.getByTestId("rev-a"), { target: { value: "3" } });
    expect(screen.getByRole("alert")).toHaveTextContent("a < b");
  });
  it("hình học động báo thẳng hàng và tâm nghịch đảo không xác định, đặt lại được", () => {
    render(<DynamicGeometryEngine blueprint={bp("hình học động")} />);
    fireEvent.click(screen.getByRole("button", { name: "Ba đỉnh thẳng hàng" }));
    expect(screen.getByTestId("dynamic-engine")).toHaveAttribute(
      "data-degenerate",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại" }));
    expect(screen.getByTestId("dynamic-engine")).toHaveAttribute(
      "data-degenerate",
      "false",
    );
    fireEvent.change(screen.getByTestId("geo-px"), { target: { value: "0" } });
    fireEvent.change(screen.getByTestId("geo-py"), { target: { value: "0" } });
    expect(screen.getByRole("alert")).toHaveTextContent("đối cực hữu hạn");
  });
  it("FCC cho 4 nguyên tử, chuyển BCC đúng độ đặc khít; bán kính không đổi packing", () => {
    render(<CrystalLatticeEngine blueprint={bp("ô mạng FCC")} />);
    const root = () => screen.getByTestId("lattice-engine");
    expect(root()).toHaveAttribute("data-atoms", "4");
    const packing = root().dataset.packing;
    fireEvent.change(screen.getByTestId("lattice-r"), {
      target: { value: "0.3" },
    });
    expect(Number(root().dataset.packing)).toBeCloseTo(Number(packing), 12);
    fireEvent.change(screen.getByLabelText("Mặt Miller"), {
      target: { value: "111" },
    });
    fireEvent.click(screen.getByRole("button", { name: "BCC" }));
    expect(root()).toHaveAttribute("data-atoms", "2");
    expect(Number(root().dataset.packing)).toBeCloseTo(0.68017476, 6);
  });
  it("CFT chuyển trường mạnh d6 và không gán spin thấp tùy tiện cho d3", () => {
    render(<CrystalFieldEngine blueprint={bp("CFT")} />);
    const root = () => screen.getByTestId("cft-engine");
    expect(root()).toHaveAttribute("data-unpaired", "4");
    fireEvent.click(screen.getByRole("button", { name: "[Fe(CN)₆]⁴⁻" }));
    expect(root()).toHaveAttribute("data-unpaired", "0");
    expect(root()).toHaveAttribute("data-spin", "low");
    fireEvent.change(screen.getByTestId("cft-delta"), {
      target: { value: "1" },
    });
    expect(root()).toHaveAttribute("data-spin", "crossover");
    fireEvent.change(screen.getByTestId("cft-d"), { target: { value: "3" } });
    expect(root()).toHaveAttribute("data-spin", "fixed");
    expect(root()).toHaveAttribute("data-unpaired", "3");
  });
  it("SN2 tới TS, sản phẩm và đặt lại", () => {
    render(<Sn2Engine blueprint={bp("SN2")} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Trạng thái chuyển tiếp" }),
    );
    expect(screen.getByTestId("sn2-engine")).toHaveAttribute(
      "data-stage",
      "transition",
    );
    fireEvent.change(screen.getByTestId("sn2-progress"), {
      target: { value: "100" },
    });
    expect(screen.getByTestId("sn2-engine")).toHaveAttribute(
      "data-stage",
      "products",
    );
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại" }));
    expect(screen.getByTestId("sn2-engine")).toHaveAttribute(
      "data-stage",
      "reactants",
    );
  });
  it("SN2 chạy, tạm dừng và hủy RAF khi unmount", () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(<Sn2Engine blueprint={bp("SN2")} />);
      fireEvent.click(screen.getByRole("button", { name: "Chạy phản ứng" }));
      act(() => vi.advanceTimersByTime(1500));
      expect(
        Number((screen.getByTestId("sn2-progress") as HTMLInputElement).value),
      ).toBeGreaterThan(0);
      fireEvent.click(screen.getByRole("button", { name: "Tạm dừng" }));
      const value = (screen.getByTestId("sn2-progress") as HTMLInputElement)
        .value;
      act(() => vi.advanceTimersByTime(1000));
      expect(
        (screen.getByTestId("sn2-progress") as HTMLInputElement).value,
      ).toBe(value);
      fireEvent.click(screen.getByRole("button", { name: "Chạy phản ứng" }));
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
  it("mỗi scene có gradient riêng khi mở nhiều widget", () => {
    const { container } = render(
      <>
        <OxyzEngine blueprint={bp("Oxyz")} />
        <CrystalLatticeEngine blueprint={bp("FCC")} />
      </>,
    );
    const ids = Array.from(container.querySelectorAll("radialGradient")).map(
      (e) => e.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("CyclohexaneEngine chuyển đổi giữa các cấu dạng và hiển thị đúng thế năng", () => {
    render(<CyclohexaneEngine blueprint={bp("cấu dạng ghế cyclohexane")} />);
    const root = () => screen.getByTestId("cyclohexane-engine");
    expect(root()).toHaveAttribute("data-form", "chair");
    expect(root()).toHaveAttribute("data-energy", "0");

    fireEvent.click(screen.getByRole("button", { name: /Thuyền \(Boat\)/ }));
    expect(root()).toHaveAttribute("data-form", "boat");
    expect(root()).toHaveAttribute("data-energy", "29.5");

    fireEvent.click(screen.getByRole("button", { name: /Xoắn thuyền \(Twist\)/ }));
    expect(root()).toHaveAttribute("data-form", "twist");
    expect(root()).toHaveAttribute("data-energy", "23");

    fireEvent.click(screen.getByRole("button", { name: /Lật vòng/ }));
    expect(root()).toHaveAttribute("data-form", "inverted");
    expect(root()).toHaveAttribute("data-energy", "0");
  });

  it("CellRespirationEngine điều khiển độc tố Cyanide và chất dỡ cặp DNP", () => {
    render(<CellRespirationEngine blueprint={bp("chuỗi truyền electron ti thể")} />);
    const root = () => screen.getByTestId("cell-respiration-engine");
    expect(root()).toHaveAttribute("data-cyanide", "false");
    expect(root()).toHaveAttribute("data-atp-rate", "100");

    fireEvent.click(screen.getByRole("button", { name: /Đầu độc Cyanide/ }));
    expect(root()).toHaveAttribute("data-cyanide", "true");
    expect(root()).toHaveAttribute("data-atp-rate", "0");

    fireEvent.click(screen.getByRole("button", { name: /Giải độc Cyanide/ }));
    expect(root()).toHaveAttribute("data-cyanide", "false");

    fireEvent.click(screen.getByRole("button", { name: /Thêm chất dỡ cặp DNP/ }));
    expect(root()).toHaveAttribute("data-dnp", "true");
    expect(Number(root().dataset.atpRate)).toBeLessThan(15);
  });

  it("LotkaVolterraEngine chuyển đổi các chế độ xem và phản hồi thay đổi tham số", () => {
    render(<LotkaVolterraEngine blueprint={bp("mô hình con mồi Lotka-Volterra")} />);
    const root = () => screen.getByTestId("lotka-volterra-engine");
    expect(root()).toBeInTheDocument();
    expect(Number(root().dataset.period)).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Đồ thị thời gian N\(t\)/ }));
    fireEvent.click(screen.getByRole("button", { name: /Mặt phẳng pha \(x, y\)/ }));
    fireEvent.click(screen.getByRole("button", { name: /Bùng nổ con mồi/ }));

    fireEvent.change(screen.getByTestId("lv-alpha"), { target: { value: "1.5" } });
    expect(screen.getByTestId("lv-alpha")).toHaveValue("1.5");
  });

  it("CellSignalingEngine phản hồi kích hoạt thụ thể GPCR và Apoptosis", () => {
    render(<CellSignalingEngine blueprint={bp("truyền tin tế bào GPCR")} />);
    const root = () => screen.getByTestId("cell-signaling-engine");
    expect(root()).toHaveAttribute("data-fate", "BASAL_HOMEOSTASIS");

    fireEvent.click(screen.getByRole("button", { name: /Gắn phối tử Ligand/ }));
    expect(root()).toHaveAttribute("data-fate", "GLYCOGEN_BREAKDOWN");
    expect(Number(root().dataset.camp)).toBeGreaterThan(50);

    fireEvent.click(screen.getByRole("button", { name: /Kích hoạt thụ thể Fas/ }));
    expect(root()).toHaveAttribute("data-fate", "APOPTOSIS_DEATH");

    fireEvent.click(screen.getByRole("button", { name: /Trạng thái nghỉ/ }));
    expect(root()).toHaveAttribute("data-fate", "BASAL_HOMEOSTASIS");
  });

  it("định tuyến gán đúng cấp độ OLYMPIAD_ADVANCED cho các chủ đề chuyên sâu", () => {
    expect(bp("mô hình con mồi Lotka-Volterra").curriculumLevel).toBe("OLYMPIAD_ADVANCED");
    expect(bp("truyền tin tế bào GPCR").curriculumLevel).toBe("OLYMPIAD_ADVANCED");
    expect(bp("hình học động").curriculumLevel).toBe("OLYMPIAD_ADVANCED");
    expect(bp("CFT").curriculumLevel).toBe("OLYMPIAD_ADVANCED");
    expect(bp("SN2").curriculumLevel).toBe("OLYMPIAD_ADVANCED");
    expect(bp("mạng tinh thể bcc").curriculumLevel).toBe("OLYMPIAD_ADVANCED");
    expect(bp("cyclohexane").curriculumLevel).toBe("THPT_STANDARD");
    expect(bp("hô hấp tế bào ti thể").curriculumLevel).toBe("THPT_STANDARD");
  });
});
