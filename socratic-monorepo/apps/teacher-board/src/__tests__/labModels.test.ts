import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

/** tên các nút trong một tệp GLB (đọc khối JSON ở đầu tệp, không cần three.js) */
function nodeNames(file: string): string[] {
  const buf = readFileSync(join(__dirname, '../../public/models', file));
  expect(buf.readUInt32LE(0)).toBe(0x46546c67); // 'glTF'
  const len = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8')) as {nodes: {name?: string}[]};
  return json.nodes.map((n) => n.name ?? '');
}

describe('mô hình Blender của phòng thực hành: tên nút là hợp đồng giữa kịch bản Blender và cảnh three.js', () => {
  it('cân dòng điện có đủ các bộ phận chuyển động mà HandsBalance3D tìm theo tên', () => {
    const names = nodeNames('current-balance.glb');
    for (const n of ['Beam', 'Frame', 'NeedleM', 'NeedleI', 'KnobM', 'KnobI', 'SwK', 'SwI', 'SwB', 'Marker', 'Spring', 'PoleA', 'PoleB', 'LampK', 'Arrow0', 'Arrow1', 'Arrow2', 'Edge', 'BookPage']) expect(names, n).toContain(n);
  });

  it('dụng cụ hóa học có đủ các tên mà HandsChem3D mặc lên hình khối', () => {
    const names = nodeNames('chem-parts.glb');
    for (const n of ['TestTube', 'Beaker', 'Rack', 'Bottle', 'Lamp', 'Bin', 'Erlenmeyer', 'Burette', 'Stopcock', 'RetortStand', 'GasJar', 'WashBottle', 'Trough', 'SyringeBarrel', 'SyringePlunger', 'Tank', 'Generator', 'Cloth']) expect(names, n).toContain(n);
  });

  it('dụng cụ Vật lí có đủ các tên mà các cảnh va chạm, ống tia catot, hãm từ, quang điện dùng', () => {
    const names = nodeNames('phys-parts.glb');
    for (const n of ['AirTrack', 'Glider', 'Disc', 'CrtTube', 'Helmholtz', 'EddyStand', 'Magnet', 'PhotoCell', 'LampHouse', 'Spring', 'Bumper', 'PhotoGate', 'WeightStand']) expect(names, n).toContain(n);
  });

  it('bộ phận thao tác dùng chung có đủ các tên mà handsOps mặc lên vật thay thế', () => {
    const names = nodeNames('lab-parts.glb');
    for (const n of ['KnobCap', 'KnobDial', 'Socket', 'Token', 'SwitchBase', 'SwitchLever', 'PullRail', 'PullHandle']) expect(names, n).toContain(n);
  });

  it('cấu tạo máy nhóm Kĩ thuật có đủ các tên mà HandsEngOps3D lắp vào cảnh', () => {
    const names = nodeNames('eng-parts.glb');
    for (const n of ['Wheel', 'HalfShaft', 'DiffCage', 'Spider', 'DrivePinion', 'AxleStand', 'SteeringWheel', 'SteeringColumn', 'LockLever', 'LockBase', 'JetCasing', 'Impeller', 'TurbineWheel', 'JetShaft', 'Combustor', 'ThrottleBase', 'ThrottleLever', 'FuelValve', 'ValveWheel', 'StirCyl', 'StirHotCap', 'StirFins', 'StirPiston', 'Flywheel', 'StirFrame', 'CrankDisc', 'HandPump', 'PumpHandle', 'GasBottle', 'Gauge', 'GaugeNeedle']) expect(names, n).toContain(n);
  });

  it('thiết bị chính của chín bài còn lại có đủ các tên mà cảnh đấu 3 pha, THPT và đỉnh cao lắp vào', () => {
    const names = nodeNames('sims-parts.glb');
    for (const n of ['Motor3', 'Motor3Rotor', 'Breaker3', 'BreakerHandle', 'TermBoard', 'BotBody', 'BotWheel', 'PmsmStator', 'PmsmRotor', 'HarmonicRing', 'WaveGen', 'Clevis', 'Stirrer', 'GelTank', 'GelPSU', 'FlyTray', 'FlyVial', 'AlphaSource', 'ScintScreen']) expect(names, n).toContain(n);
  });
  it('chi tiết năm máy tháo lắp: mọi tên mà HandsMachines mặc lên có trong machines-parts.glb', async () => {
    const {NODE_OF} = await import('../engines/families/HandsMachines');
    const names = nodeNames('machines-parts.glb');
    for (const kind of Object.keys(NODE_OF) as (keyof typeof NODE_OF)[]) for (const n of Object.values(NODE_OF[kind])) expect(names, `${kind}:${n}`).toContain(n);
    for (const n of ['MotorStator', 'EngineFrame', 'RobotBase', 'DronePad', 'PcCase', 'PcFan', 'DroneProp']) expect(names, n).toContain(n);
  });
});
