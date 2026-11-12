import {polyAt, type V3} from '../../utils/presets/scene3dExtra';
import {loadModel, partOf} from './labParts';
import {ORGAN_SCENES, parts} from './Scenes3DOrgans';
import type {Kit, SceneDef} from './Stage3D';
import {swarm} from './Scenes3DMore';

/**
 * Bốn sơ đồ cơ quan dựng bằng Blender (`board_parts4.py` → `board-parts4.glb`): mỗi bộ phận là một lưới tên `<tiền tố>_<id bộ phận>`.
 * Chạm để chọn (tô sáng, các phần khác mờ đi), hạt chuyển động dọc đường đi. Các đường `FLOW_*` lặp lại các điểm trong board_parts4.py.
 */
const LIB = '/models/board-parts4.glb';

const SMALL: V3[] = [[0.6, 3.0, 0.1], [0.65, 2.7, 0.1], [-0.6, 2.5, 0.1], [0.6, 2.2, 0.1], [-0.6, 1.9, 0.1], [0.6, 1.6, 0.1], [-0.5, 1.3, 0.1]];
const LARGE: V3[] = [[-1.15, 1.2, 0], [-1.15, 3.0, 0], [1.15, 3.0, 0], [1.15, 1.0, 0], [0.7, 0.55, 0], [0, 0.45, 0]];
export const FLOW_DIG: V3[] = [[0, 6.6, 0.3], [0, 6.3, 0.2], [0, 5.4, 0], [0, 4.6, 0.05], [0.4, 3.9, 0.1], ...SMALL, ...LARGE, [0, 0.2, 0]];
const BRL: V3[] = [[0, 4.3, 0], [-0.7, 3.7, 0], [-1.3, 3.1, 0], [-1.55, 2.4, 0], [-1.65, 1.9, 0]];
const BRR: V3[] = BRL.map(([x, y, z]) => [-x, y, z] as V3);
export const FLOW_RES: V3[][] = [[[0, 6.5, 0.4], [0, 6, 0.2], ...BRL], [[0, 6.5, 0.4], [0, 6, 0.2], ...BRR]];
export const FLOW_EAR: V3[] = [[-4.7, 0, 0], [-3.9, 0, 0], [-1.6, 0, 0], [-1.1, 0.15, 0], [-0.7, 0.4, 0], [-0.4, 0, 0], [1.6, -0.5, 0]];
const TUB: V3[] = [[-0.9, 4.1, 0], [-0.2, 3.9, 0], [0.4, 3.5, 0], [-0.2, 3.1, 0], [0.5, 2.7, 0], [-0.1, 2.3, 0], [0.3, 1.5, 0], [0, 0.9, 0], [0.7, 0.9, 0], [1.0, 2.0, 0], [1.4, 3.2, 0], [1.8, 3.8, 0], [2.3, 4.2, 0]];
export const FLOW_NEPH: V3[] = [[-1.5, 4.6, 0], ...TUB, [2.3, 3.0, 0], [2.3, 1.2, 0], [1.9, 0.5, 0], [1.4, 0.15, 0], [0.6, -0.7, 0], [0.2, -1.4, 0]];

interface OrganDef {
  prefix: string;
  ids: string[];
  flows: V3[][];
  color: string;
  dots: number;
  /** biên độ dao động ngang của hạt (sóng âm) */
  wave?: number;
  dist: number;
  target: [number, number, number];
  hint: string;
}
function organ(def: OrganDef): SceneDef {
  return {
    noGrid: true,
    dist: def.dist,
    target: def.target,
    orbit: () => [0, 6],
    setup: (k: Kit) => {
      const P = parts(k);
      loadModel(LIB)
        .then((lib) =>
          def.ids.forEach((id) => {
            const sk = partOf(lib, def.prefix + id);
            if (sk) P.add(id, sk.obj);
          }),
        )
        .catch(() => k.caption('Không tải được mô hình 3D — chuyển sang bản 2D'));
      const sw = swarm(def.dots * def.flows.length, 0.1, def.color, {roughness: 0.2, emissive: def.color, emissiveIntensity: 0.6});
      k.scene.add(sw);
      return ({s}) => {
        const now = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
        let n = 0;
        if (s.flow === '1')
          def.flows.forEach((fl) => {
            for (let i = 0; i < def.dots; i++) {
              const u = (now * 0.06 + i / def.dots) % 1;
              const [x, y, z] = polyAt(fl, u);
              sw.at(n++, x, y + (def.wave ? Math.sin(u * 40 - now * 6) * def.wave * (1 - u * 0.6) : 0), z + 0.12);
            }
          });
        sw.flush(n);
        P.paint(s.sel, (id) => s[`L:${id}`] ?? id, def.hint);
      };
    },
  };
}

export const BLENDER_ORGANS: Record<string, SceneDef> = {
  BIO_DIGESTIVE_SYSTEM: organ({prefix: 'dig_', ids: ['mouth', 'esophagus', 'liver', 'gallbladder', 'stomach', 'pancreas', 'small', 'large', 'anus'], flows: [FLOW_DIG], color: '#FFD166', dots: 16, dist: 15, target: [0, 3.4, 0], hint: 'Chạm một cơ quan để xem chi tiết; hạt vàng là thức ăn đi qua ống tiêu hóa'}),
  BIO_RESPIRATORY_SYSTEM: organ({prefix: 'res_', ids: ['nose', 'trachea', 'bronchi', 'lungs', 'alveoli', 'diaphragm'], flows: FLOW_RES, color: '#60A5FA', dots: 10, dist: 15, target: [0, 3.4, 0], hint: 'Chạm một bộ phận để xem chi tiết; hạt xanh là không khí khi hít vào'}),
  BIO_EAR_HEARING: organ({prefix: 'ear_', ids: ['pinna', 'canal', 'drum', 'ossicles', 'cochlea', 'nerve', 'canals'], flows: [FLOW_EAR], color: '#60A5FA', dots: 14, wave: 0.18, dist: 13, target: [0, 0, 0], hint: 'Chạm một bộ phận để xem chi tiết; hạt xanh là sóng âm truyền vào tai'}),
  BIO_NEPHRON: organ({prefix: 'neph_', ids: ['capsule', 'glomerulus', 'arteriole', 'capillary', 'tubule', 'collecting', 'pelvis'], flows: [FLOW_NEPH], color: '#F59E0B', dots: 18, dist: 13, target: [0, 2.6, 0], hint: 'Chạm một bộ phận của nephron để xem chi tiết; hạt cam là dịch lọc'}),
};

/** Tất cả sơ đồ 3D của ANATOMY_FLOW và PROCESS_STEPS (dựng bằng three thuần và bằng Blender). */
export const ALL_ORGAN_SCENES: Record<string, SceneDef> = {...ORGAN_SCENES, ...BLENDER_ORGANS};
