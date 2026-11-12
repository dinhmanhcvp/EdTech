import * as THREE from 'three';
import type {AssemblyKind} from '../../utils/lab/hands/assembly';
import {glassify, loadModel, partOf} from './labParts';

/**
 * Mặc mô hình Blender (`machines-parts.glb`, kịch bản `tools/lab-models/machines_parts.py`) lên năm máy của bài tháo lắp.
 * Cảnh vẫn dựng sẵn bằng hình khối three.js (để tương tác chạy ngay khi mô hình chưa về); khi mô hình về thì ẩn hình khối của từng chi tiết
 * và thêm lưới thật. Các phần ĐANG CHUYỂN ĐỘNG do mã cảnh điều khiển (van xu-páp, quạt, cánh drone, dải LED) mang `userData.keep`
 * nên không bị ẩn; quạt và cánh được thay bằng mô hình thật nhưng vẫn là chính nhóm đang quay. Chi tiết không có tên trong bảng dưới
 * (cụm xu-páp) giữ nguyên hình khối.
 */
const SCENERY: Record<AssemblyKind, {node: string; at: [number, number, number]}> = {
  motor: {node: 'MotorStator', at: [-0.3, 0.58, -1.0]},
  engine: {node: 'EngineFrame', at: [-0.3, 0, -1.0]},
  robot: {node: 'RobotBase', at: [-0.3, 0, -1.0]},
  drone: {node: 'DronePad', at: [-0.3, 0, -1.0]},
  pc: {node: 'PcCase', at: [-0.3, 0, -1.0]},
};
export const NODE_OF: Record<AssemblyKind, Record<string, string>> = {
  motor: {cowl: 'MotorCowl', fan: 'MotorFan', rear_shield: 'MotorRearShield', rear_bearing: 'MotorBearing', front_bearing: 'MotorBearing', front_shield: 'MotorFrontShield', pulley: 'MotorPulley', box_cover: 'MotorBoxCover', rotor: 'MotorRotor'},
  engine: {head_cover: 'EngineHeadCover', spark: 'EngineSparkPlug', camshaft: 'EngineCamshaft', head: 'EngineHead', cylinder: 'EngineCylinder', piston: 'EnginePiston', conrod: 'EngineConRod', flywheel: 'EngineFlywheel', crank: 'EngineCrankshaft'},
  robot: {base_servo: 'RobotBaseServo', turntable: 'RobotTurntable', shoulder_servo: 'RobotShoulderServo', lower_arm: 'RobotLowerArm', elbow_servo: 'RobotElbowServo', forearm: 'RobotForearm', gripper: 'RobotGripper', board: 'RobotBoard', battery: 'RobotBattery'},
  drone: {frame: 'DroneFrame', motors_a: 'DroneMotorsCW', motors_b: 'DroneMotorsCCW', esc: 'DroneEsc', fc: 'DroneFlightController', rx: 'DroneReceiver', battery: 'DroneLiPo'},
  pc: {mainboard: 'PcMainboard', cpu: 'PcCpu', cooler: 'PcCooler', ram: 'PcRam', ssd: 'PcSsd', gpu: 'PcGpu', psu: 'PcPsu', cable: 'PcPowerCable', panel: 'PcSidePanel'},
};
const SKIN = '/models/machines-parts.glb';
export interface DressPart {
  id: string;
  obj: THREE.Group;
  /** vật liệu của chi tiết (để làm sáng khi cầm / trỏ vào): mô hình mới thêm vật liệu của nó vào đây */
  mats: THREE.MeshStandardMaterial[];
}

/** `scenery`: các vật đứng yên của máy (đế, khung, thùng máy) dựng bằng hình khối; `onSkin`: gọi sau khi một chi tiết đã có mô hình (để đặt lại vít). */
export function dressMachine(kind: AssemblyKind, scene: THREE.Object3D, parts: DressPart[], scenery: THREE.Object3D[], onSkin: (id: string, root: THREE.Object3D) => void): Promise<void> {
  return loadModel(SKIN)
    .then((lib) => {
      const sc = SCENERY[kind];
      const base = partOf(lib, sc.node);
      if (base) {
        scenery.forEach((o) => (o.visible = false));
        base.obj.position.set(...sc.at);
        scene.add(base.obj);
      }
      for (const p of parts) {
        const node = NODE_OF[kind][p.id];
        const skin = node ? partOf(lib, node) : null;
        if (skin) {
          glassify(skin.obj, 0.28);
          // ẩn hình khối cũ của chi tiết, trừ phần đang chuyển động và vít dụng cụ (đánh dấu `keep`)
          for (const c of [...p.obj.children]) if (!c.userData.keep) c.visible = false;
          p.obj.add(skin.obj);
          p.mats.push(...skin.mats);
          onSkin(p.id, skin.obj);
        }
        // quạt (PC) và cánh (drone): nhóm đang quay được giữ, chỉ đổi hình bên trong
        p.obj.traverse((o) => {
          const g = o as THREE.Group;
          if (!g.isGroup) return;
          if (g.userData.fanR) {
            const fan = partOf(lib, 'PcFan');
            if (!fan) return;
            g.clear();
            fan.obj.scale.setScalar(g.userData.fanR as number);
            g.add(fan.obj);
          } else if (g.userData.prop) {
            const prop = partOf(lib, 'DroneProp');
            if (!prop) return;
            g.clear();
            for (const m of prop.mats) if (m.name === 'tint') m.color.set((g.userData.prop as number) > 0 ? '#F2B49F' : '#A9C6F2');
            g.add(prop.obj);
          }
        });
      }
    })
    .catch(() => undefined);
}
