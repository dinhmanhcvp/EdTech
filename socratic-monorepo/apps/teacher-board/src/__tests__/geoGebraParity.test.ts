import {describe, it, expect} from 'vitest';
import {GEO_CURVES, GEO_LINES, GEO_MEASURE, GEO_OBJECTS, GEO_SHAPES, GEO_TOOLS, GEO_TRANSFORM} from '../components/canvas/GeometryProblemPanel';
import {GGROUPS} from '../components/canvas/SmartboardDock';
import {buildScene} from '../utils/geometryProblem';
import {addRegularPolygon} from '../utils/geoTools';

// bộ công cụ của GeoGebra (Basic / Edit / Construct / Lines / Circles / Polygons / Transform) ↔ id dụng cụ của ta
const GEOGEBRA: Record<string, string> = {
  'Điểm mới': 'point', 'Đoạn thẳng': 'segment', 'Đường thẳng qua 2 điểm': 'line', 'Đa giác': 'polygon', 'Đường tròn tâm–điểm': 'circle',
  'Hiện/ẩn tên': 'label', 'Hiện/ẩn đối tượng': 'hide', 'Xóa': 'delete',
  'Trung điểm': 'midpoint', 'Đường vuông góc': 'perpline', 'Đường trung trực': 'perpbis', 'Đường song song': 'parallel', 'Đường phân giác': 'bisector', 'Các tiếp tuyến': 'tangents',
  'Đoạn thẳng với độ dài cố định': 'seglen', 'Tia': 'ray', 'Véc tơ': 'vector',
  'Đường tròn tâm–bán kính': 'circlecr', 'Compa': 'compass', 'Bán nguyệt': 'semi', 'Hình quạt': 'sector',
  'Đa giác đều': 'regn',
  'Tịnh tiến': 'translate', 'Quay quanh điểm': 'rotate', 'Đối xứng qua đường thẳng': 'reflline', 'Đối xứng qua điểm': 'reflpt', 'Vị tự': 'dilate',
};

describe('bộ công cụ vẽ hình có đủ công cụ của GeoGebra (hình phẳng)', () => {
  it('mọi công cụ của GeoGebra đều có trong các nhóm của AI hub', () => {
    const inHub = new Set(GGROUPS.flatMap((g) => g.tools.map((t) => t.id as string)));
    for (const [name, id] of Object.entries(GEOGEBRA)) expect(inHub.has(id), name).toBe(true);
  });
  it('mỗi dụng cụ chỉ thuộc một nhóm; dụng cụ riêng của khối 3D (thiết diện) không lẫn vào hình phẳng', () => {
    const all = GGROUPS.flatMap((g) => g.tools.map((t) => t.id as string));
    expect(new Set(all).size).toBe(all.length);
    expect(all).not.toContain('section');
    const known = new Set([...GEO_TOOLS, ...GEO_LINES, ...GEO_SHAPES, ...GEO_CURVES, ...GEO_TRANSFORM, ...GEO_OBJECTS, ...GEO_MEASURE].map((t) => t.id as string));
    for (const id of all) expect(known.has(id), id).toBe(true);
  });
  it('Đa giác đều nhập số cạnh bất kỳ dựng được trên hình', () => {
    const sc = buildScene('hình vuông ABCD').scene!;
    const out = addRegularPolygon(sc, 'A', 'B', 7, 0);
    expect(out).not.toBeNull();
    expect(Object.keys(out!.pts).length).toBe(Object.keys(sc.pts).length + 5);
  });
});
