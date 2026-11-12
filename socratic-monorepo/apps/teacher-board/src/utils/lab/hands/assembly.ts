/** Bài thực hành tay kiểu tháo lắp: thứ tự chi tiết và động học tay máy. Logic thuần, không phụ thuộc hiển thị. */

export interface PartSpec {
  id: string;
  name: string;
  /** vai trò của chi tiết, hiện khi học sinh cầm nó */
  info: string;
  /** các chi tiết che hoặc gá lên chi tiết này: phải tháo chúng trước; ngược lại, chúng chỉ lắp được sau chi tiết này */
  needs: string[];
}

export interface AssemblySpec {
  title: string;
  /** trạng thái ban đầu: 'apart' = mọi chi tiết nằm trên khay (bài lắp); 'built' = đã lắp hoàn chỉnh (bài tháo) */
  start: 'apart' | 'built';
  task: string;
  done: string;
  parts: PartSpec[];
}

export const MOTOR: AssemblySpec = {
  title: 'Tháo lắp động cơ không đồng bộ 3 pha',
  start: 'built',
  task: 'Tháo rời động cơ đúng trình tự (rôto ra sau cùng), rồi lắp lại hoàn chỉnh để chạy thử.',
  done: 'Đã lắp lại hoàn chỉnh: rôto, quạt và puli quay trơn.',
  parts: [
    {id: 'cowl', name: 'Nắp che quạt', info: 'Lưới thép che cánh quạt, dẫn gió dọc theo các cánh tản nhiệt trên thân. Tháo đầu tiên ở phía sau.', needs: []},
    {id: 'fan', name: 'Quạt làm mát', info: 'Gắn trên đuôi trục, quay cùng rôto để thổi gió làm mát vỏ máy. Phải tháo nắp che mới rút được.', needs: ['cowl']},
    {id: 'rear_shield', name: 'Nắp máy sau', info: 'Nắp gang đỡ ổ bi sau, giữ rôto đồng tâm với stato. Khe hở không khí giữa rôto và stato chỉ khoảng 0,3–1 mm.', needs: ['fan']},
    {id: 'rear_bearing', name: 'Ổ bi sau', info: 'Vòng bi đỡ đuôi trục. Dùng cảo để tháo, không gõ búa vào vòng ngoài.', needs: ['rear_shield']},
    {id: 'pulley', name: 'Puli', info: 'Truyền mô-men từ trục sang dây đai. Tháo bằng cảo ba chấu trước khi mở nắp máy trước.', needs: []},
    {id: 'front_shield', name: 'Nắp máy trước', info: 'Nắp gang đỡ ổ bi phía đầu trục. Đánh dấu vị trí trước khi tháo để lắp lại đúng chiều.', needs: ['pulley']},
    {id: 'front_bearing', name: 'Ổ bi trước', info: 'Vòng bi chịu lực hướng kính của dây đai. Ổ bi mòn làm rôto sát cốt (chạm stato).', needs: ['front_shield']},
    {id: 'rotor', name: 'Rôto lồng sóc', info: 'Lõi thép có các thanh nhôm nối tắt hai đầu như chiếc lồng. Từ trường quay của stato cảm ứng dòng điện trong lồng, sinh mô-men quay; rôto luôn quay chậm hơn từ trường (trượt).', needs: ['front_bearing', 'rear_bearing']},
    {id: 'box_cover', name: 'Nắp hộp đấu dây', info: 'Che sáu đầu dây U1 V1 W1 / W2 U2 V2 của ba cuộn stato. Mở ra để đấu sao hoặc tam giác.', needs: []},
  ],
};

export const ROBOT: AssemblySpec = {
  title: 'Lắp ráp cánh tay robot 3 bậc tự do',
  start: 'apart',
  task: 'Lắp cánh tay robot từ đế lên tới tay kẹp theo đúng thứ tự, gắn bo mạch và pin, rồi điều khiển tay kẹp.',
  done: 'Đã lắp xong. Chụm tay rồi kéo trên mặt bàn: tay kẹp đi theo, ba khớp tự tính góc (động học ngược).',
  parts: [
    {id: 'base_servo', name: 'Servo đế', info: 'Động cơ servo quay cả cánh tay quanh trục thẳng đứng (khớp 1, góc xoay θ₀).', needs: ['turntable']},
    {id: 'turntable', name: 'Mâm xoay', info: 'Đĩa gắn lên trục servo đế, đỡ toàn bộ phần phía trên và phân tải lên ổ đỡ.', needs: ['shoulder_servo']},
    {id: 'shoulder_servo', name: 'Servo vai', info: 'Nâng hạ cánh tay dưới (khớp 2). Chịu mô-men lớn nhất vì phải đỡ cả cánh tay.', needs: ['lower_arm']},
    {id: 'lower_arm', name: 'Cánh tay dưới', info: 'Thanh nhôm nối vai với khuỷu, dài L₁. Càng dài thì với càng xa nhưng servo vai càng nặng tải.', needs: ['elbow_servo']},
    {id: 'elbow_servo', name: 'Servo khuỷu', info: 'Gập duỗi cánh tay trên (khớp 3). Cùng với servo vai quyết định tầm với và độ cao tay kẹp.', needs: ['forearm']},
    {id: 'forearm', name: 'Cánh tay trên', info: 'Thanh nối khuỷu với tay kẹp, dài L₂.', needs: ['gripper']},
    {id: 'gripper', name: 'Tay kẹp', info: 'Cơ cấu chấp hành cuối: một servo nhỏ đóng mở hai ngón kẹp.', needs: []},
    {id: 'board', name: 'Bo mạch điều khiển', info: 'Vi điều khiển phát xung PWM cho từng servo: độ rộng xung 1–2 ms ứng với góc 0–180°.', needs: []},
    {id: 'battery', name: 'Pin', info: 'Nguồn 6 V cấp riêng cho servo. Không lấy nguồn servo từ chân 5 V của bo mạch vì dòng khởi động lớn làm sụt áp.', needs: []},
  ],
};

export const ENGINE: AssemblySpec = {
  title: 'Tháo lắp động cơ đốt trong 4 kì',
  start: 'built',
  task: 'Tháo rời động cơ xăng một xi-lanh (kiểu xe máy) từ nắp máy xuống trục khuỷu, rồi lắp lại hoàn chỉnh để nổ máy và xem bốn kì.',
  done: 'Đã lắp lại hoàn chỉnh, máy nổ: quan sát pít-tông, xu-páp và tia lửa bugi theo từng kì.',
  parts: [
    {id: 'head_cover', name: 'Nắp dàn cò', info: 'Che trục cam và giữ dầu bôi trơn. Mô hình dạy học làm bằng nhựa trong để nhìn thấy trục cam.', needs: []},
    {id: 'spark', name: 'Bugi', info: 'Phóng tia lửa điện ở cuối kì nén để đốt hỗn hợp xăng–không khí. Khe hở điện cực khoảng 0,6–0,8 mm.', needs: []},
    {id: 'camshaft', name: 'Trục cam', info: 'Hai vấu cam đẩy mở xu-páp nạp và xả. Quay bằng nửa tốc độ trục khuỷu: 2 vòng trục khuỷu mới hết một chu trình.', needs: ['head_cover']},
    {id: 'valves', name: 'Cụm xu-páp', info: 'Xu-páp nạp mở ở kì nạp, xu-páp xả mở ở kì xả; lò xo kéo chúng đóng kín trong kì nén và kì nổ.', needs: ['camshaft']},
    {id: 'head', name: 'Nắp máy', info: 'Cùng đỉnh pít-tông và xi-lanh tạo thành buồng cháy. Siết bu-lông nắp máy theo đường chéo, đúng lực, để gioăng kín đều.', needs: ['valves', 'spark']},
    {id: 'cylinder', name: 'Xi-lanh', info: 'Ống dẫn hướng cho pít-tông. Thành xi-lanh mòn làm tụt áp suất nén và lọt dầu lên buồng cháy (khói xanh).', needs: ['head']},
    {id: 'piston', name: 'Pít-tông', info: 'Nhận áp lực khí cháy và truyền xuống thanh truyền. Xéc-măng trên pít-tông làm kín khí và gạt dầu.', needs: ['cylinder']},
    {id: 'conrod', name: 'Thanh truyền', info: 'Nối chốt pít-tông với chốt khuỷu, biến chuyển động tịnh tiến thành chuyển động quay.', needs: ['piston']},
    {id: 'flywheel', name: 'Bánh đà', info: 'Tích trữ động năng ở kì nổ và trả lại ở ba kì còn lại để trục khuỷu quay đều.', needs: []},
    {id: 'crank', name: 'Trục khuỷu', info: 'Bán kính quay của chốt khuỷu bằng nửa hành trình pít-tông: S = 2r.', needs: ['conrod', 'flywheel']},
  ],
};

export const DRONE: AssemblySpec = {
  title: 'Lắp ráp drone 4 cánh',
  start: 'apart',
  task: 'Lắp drone từ khung: động cơ, mạch điều tốc, mạch điều khiển bay, bộ thu, pin, cuối cùng mới gắn cánh. Lắp xong thì cho bay thử.',
  done: 'Đã lắp xong, drone cất cánh. Chụm tay rồi kéo: drone nghiêng về hướng cần bay.',
  parts: [
    {id: 'frame', name: 'Khung chữ X', info: 'Khung sợi carbon: nhẹ, cứng. Bốn tay đòn dài bằng nhau để lực đẩy cân quanh trọng tâm.', needs: ['motors_a', 'motors_b', 'esc', 'battery']},
    {id: 'motors_a', name: 'Động cơ quay thuận', info: 'Hai động cơ không chổi than đặt chéo nhau, quay thuận chiều kim đồng hồ.', needs: ['props_a']},
    {id: 'motors_b', name: 'Động cơ quay ngược', info: 'Hai động cơ còn lại quay ngược chiều: mô-men phản lực của hai cặp triệt tiêu nên thân không tự xoay.', needs: ['props_b']},
    {id: 'esc', name: 'Mạch điều tốc (ESC)', info: 'Đổi điện một chiều của pin thành ba pha cho từng động cơ, tốc độ theo lệnh của mạch điều khiển bay.', needs: ['fc']},
    {id: 'fc', name: 'Mạch điều khiển bay', info: 'Con quay hồi chuyển và gia tốc kế đo độ nghiêng hàng nghìn lần mỗi giây; bộ điều khiển PID chỉnh tốc độ bốn động cơ để giữ thăng bằng.', needs: ['rx']},
    {id: 'rx', name: 'Bộ thu sóng', info: 'Nhận lệnh ga, nghiêng, xoay từ tay điều khiển 2,4 GHz. Mất sóng thì mạch bay tự hạ cánh.', needs: []},
    {id: 'battery', name: 'Pin LiPo', info: 'Pin 4 cell 14,8 V. Đặt sát trọng tâm; không xả dưới 3,3 V mỗi cell.', needs: []},
    {id: 'props_a', name: 'Cánh quay thuận', info: 'Gắn cánh sau cùng để an toàn. Cánh thuận lắp vào động cơ thuận: lắp nhầm thì lực đẩy hướng xuống, drone lật ngay khi cất cánh.', needs: []},
    {id: 'props_b', name: 'Cánh quay ngược', info: 'Mép trước của cánh nghiêng ngược với cánh thuận, để cùng đẩy gió xuống khi quay ngược chiều.', needs: []},
  ],
};

export const PC: AssemblySpec = {
  title: 'Lắp ráp máy tính để bàn',
  start: 'apart',
  task: 'Lắp máy tính vào thùng máy đúng thứ tự: bo mạch chủ, CPU, tản nhiệt, RAM, SSD, card đồ hoạ, nguồn, cáp, rồi đậy nắp kính để bật máy.',
  done: 'Máy khởi động: quạt quay, đèn sáng, tự kiểm tra (POST) đạt.',
  parts: [
    {id: 'mainboard', name: 'Bo mạch chủ', info: 'Nối mọi linh kiện qua các đường bus. Bắt vít lên các chân đỡ, không để mặt sau chạm vỏ thùng (chập mạch).', needs: ['cpu', 'ram', 'ssd', 'gpu', 'cable']},
    {id: 'cpu', name: 'CPU', info: 'Đặt đúng góc có dấu tam giác, không dùng lực. Hàng nghìn chân tiếp xúc rất dễ cong.', needs: ['cooler']},
    {id: 'cooler', name: 'Tản nhiệt CPU', info: 'Lớp keo tản nhiệt mỏng lấp khe hở giữa CPU và đế tản. Thiếu tản nhiệt, CPU quá 100 °C sau vài giây và tự ngắt.', needs: ['panel']},
    {id: 'ram', name: 'RAM', info: 'Hai thanh cắm vào khe 2 và 4 để chạy kênh đôi. Ấn đến khi hai lẫy tự khoá.', needs: ['panel']},
    {id: 'ssd', name: 'SSD M.2', info: 'Ổ lưu trữ NVMe nối thẳng vào bus PCIe. Khe M.2 nằm dưới card đồ hoạ nên phải lắp trước.', needs: ['gpu']},
    {id: 'gpu', name: 'Card đồ hoạ', info: 'Cắm khe PCIe x16 gần CPU nhất. Cần cáp nguồn riêng vì khe chỉ cấp được 75 W.', needs: ['cable']},
    {id: 'psu', name: 'Bộ nguồn', info: 'Đổi 220 V xoay chiều thành 12 V, 5 V, 3,3 V một chiều. Công suất phải lớn hơn tổng tải khoảng 30 %.', needs: ['cable']},
    {id: 'cable', name: 'Cáp nguồn', info: 'Cáp 24 chân cho bo mạch chủ, 8 chân cho CPU và card đồ hoạ. Chỉ cắm khi nguồn đã ngắt điện.', needs: ['panel']},
    {id: 'panel', name: 'Nắp kính', info: 'Đậy sau cùng. Luồng gió đi từ trước ra sau; nắp kín giúp quạt hút đúng hướng.', needs: []},
  ],
};

export const SPECS = {motor: MOTOR, engine: ENGINE, robot: ROBOT, drone: DRONE, pc: PC};
export type AssemblyKind = keyof typeof SPECS;

/** Cơ cấu tay quay – con trượt: độ cao chốt pít-tông so với tâm trục khuỷu khi khuỷu lệch góc `th` khỏi điểm chết trên. */
export const pistonHeight = (th: number, r: number, l: number): number => r * Math.cos(th) + Math.sqrt(l * l - (r * Math.sin(th)) ** 2);
export const STROKES = ['Nạp', 'Nén', 'Nổ', 'Xả'] as const;
/** Kì đang diễn ra (0 nạp, 1 nén, 2 nổ, 3 xả): mỗi kì nửa vòng trục khuỷu, cả chu trình hai vòng. */
export const strokeOf = (th: number): number => Math.floor((((th % (4 * Math.PI)) + 4 * Math.PI) % (4 * Math.PI)) / Math.PI) % 4;

/** Các chi tiết còn cản việc THÁO `id` (đang lắp và che/gá lên nó). `off` = tập chi tiết đã tháo. */
export const blockersToRemove = (spec: AssemblySpec, off: ReadonlySet<string>, id: string): string[] => (spec.parts.find((p) => p.id === id)?.needs ?? []).filter((n) => !off.has(n));
/** Các chi tiết phải lắp trước khi LẮP `id` (những chi tiết mà `id` gá lên). */
export const blockersToInstall = (spec: AssemblySpec, off: ReadonlySet<string>, id: string): string[] => spec.parts.filter((q) => q.needs.includes(id) && off.has(q.id)).map((q) => q.id);

/**
 * Tháo hoặc lắp `id` (đảo trạng thái). Trả tập `off` mới, hoặc danh sách tên chi tiết còn cản.
 * Một đồ thị `needs` dùng cho cả hai chiều: tháo từ ngoài vào trong, lắp từ trong ra ngoài.
 */
export function movePart(spec: AssemblySpec, off: ReadonlySet<string>, id: string): {off: Set<string>} | {blocked: string[]} {
  const removing = !off.has(id);
  const blockers = removing ? blockersToRemove(spec, off, id) : blockersToInstall(spec, off, id);
  if (blockers.length) return {blocked: blockers.map((b) => spec.parts.find((p) => p.id === b)!.name)};
  const next = new Set(off);
  if (removing) next.add(id);
  else next.delete(id);
  return {off: next};
}

export const allOff = (spec: AssemblySpec): Set<string> => new Set(spec.parts.map((p) => p.id));

/**
 * Động học ngược cho tay máy hai khâu trong mặt phẳng đứng: `r` = tầm với ngang, `h` = độ cao so với khớp vai.
 * Trả góc tuyệt đối so với phương ngang của khâu 1 và khâu 2 (rad), nghiệm khuỷu cao. Điểm ngoài tầm thì duỗi/gập tối đa về phía nó.
 */
export function armIK(r: number, h: number, l1: number, l2: number): {a1: number; a2: number} {
  const d = Math.min(Math.max(Math.hypot(r, h), Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3);
  const a1 = Math.atan2(h, r) + Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const elbow = Math.acos((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2));
  return {a1, a2: a1 - (Math.PI - elbow)};
}
