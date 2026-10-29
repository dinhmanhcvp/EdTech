/** Góc xuất phát của con lắc (rad). θ₀ của bảng tính bằng rad (0,1–2,8); một số bản mô phỏng từ AI gửi θ₀ theo độ (VD 30): giá trị ≤ π coi là rad. */
export function pendulumStartAngle(theta0: number | undefined): number {
  const v = theta0 ?? 35;
  return v <= Math.PI ? v : (v * Math.PI) / 180;
}
