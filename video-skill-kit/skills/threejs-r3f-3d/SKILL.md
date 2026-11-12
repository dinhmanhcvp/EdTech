---
name: threejs-r3f-3d
description: Cảnh 3D cho video/web giới thiệu sản phẩm bằng three.js và React Three Fiber (drei, rapier, postprocessing), tích hợp Remotion (@remotion/three) hoặc HyperFrames. Dùng khi cần hero 3D, mô hình sản phẩm xoay, vật lý, hiệu ứng hậu kỳ (bloom, DOF), hoặc tối ưu GLB.
---

# three.js · R3F · drei · rapier · postprocessing

## Gói và phiên bản

```bash
npm i three @react-three/fiber @react-three/drei @react-three/rapier @react-three/postprocessing
npm i -D @types/three
```

R3F v9 đi với React 19, R3F v8 với React 18: khớp phiên bản với dự án. Trong Remotion thêm `@remotion/three`.

## Cảnh sản phẩm cơ bản (web)

```tsx
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows, Float, useGLTF, PresentationControls } from "@react-three/drei";
import { EffectComposer, Bloom, DepthOfField, Vignette, ToneMapping } from "@react-three/postprocessing";

function Product() {
  const { scene } = useGLTF("/product.glb");
  return <primitive object={scene} scale={1.2} />;
}

export const Hero = () => (
  <Canvas camera={{ position: [0, 0.6, 4], fov: 35 }} dpr={[1, 2]} shadows>
    <color attach="background" args={["#0B0B12"]} />
    <Environment preset="studio" />                      {/* IBL: ánh sáng phản chiếu đẹp nhanh nhất */}
    <Float speed={1.5} rotationIntensity={0.4}><Product /></Float>
    <ContactShadows position={[0, -1, 0]} opacity={0.5} blur={2.5} scale={8} />
    <EffectComposer>
      <DepthOfField focusDistance={0.02} focalLength={0.05} bokehScale={3} />
      <Bloom intensity={0.6} luminanceThreshold={0.9} mipmapBlur />
      <Vignette eskil={false} offset={0.2} darkness={0.6} />
      <ToneMapping />
    </EffectComposer>
  </Canvas>
);
```

drei hay dùng: `useGLTF`, `Environment`, `OrbitControls`/`PresentationControls`, `Float`, `ContactShadows`, `RoundedBox`, `Text`/`Text3D`, `MeshTransmissionMaterial` (kính), `Html`, `Stage`, `Bounds`, `Center`, `useTexture`.
postprocessing hay dùng: `Bloom`, `DepthOfField`, `Vignette`, `ChromaticAberration`, `Noise`, `ToneMapping`, `N8AO` (ambient occlusion), `SMAA`.

## Vật lý với Rapier

```tsx
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
<Physics gravity={[0, -9.81, 0]}>
  <RigidBody colliders="cuboid" restitution={0.4}><mesh><boxGeometry /><meshStandardMaterial /></mesh></RigidBody>
  <CuboidCollider args={[10, 0.5, 10]} position={[0, -2, 0]} />   {/* sàn */}
</Physics>
```

Cho **video tất định**: vật lý theo thời gian thật sẽ khác nhau giữa các lần render. Cách chuẩn: mô phỏng trước theo bước cố định (ví dụ 1/60s) và lưu quỹ đạo/trạng thái theo frame, rồi phát lại theo `frame`; hoặc dùng `<Physics paused>` và tự gọi step theo từng frame có số bước cố định. Đặt seed cho mọi giá trị ngẫu nhiên.

## Trong Remotion

```tsx
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

const Scene = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const rotY = interpolate(frame, [0, 6 * fps], [0, Math.PI * 2]);
  return (
    <ThreeCanvas width={width} height={height} camera={{ position: [0, 0.6, 4], fov: 35 }}>
      <ambientLight intensity={0.6} /><directionalLight position={[3, 5, 2]} />
      <group rotation={[0, rotY, 0]}><Product /></group>
    </ThreeCanvas>
  );
};
```

- **Không dùng `useFrame` làm nguồn thời gian**; điều khiển bằng `useCurrentFrame()`.
- Nạp GLB/texture trước khi render (`useGLTF` + Suspense, hoặc `delayRender`).
- Render WebGL: thêm `--gl=angle` khi gặp lỗi GPU; render chậm hơn 2D, hạ độ phân giải hoặc giảm hiệu ứng hậu kỳ.
- HyperFrames có adapter Three.js: cập nhật cảnh theo thời gian được cấp, không dùng đồng hồ thật.

## Chuẩn bị mô hình (GLB)

- Nén: `npx gltf-transform optimize in.glb out.glb --compress meshopt` (hoặc `draco`), texture KTX2/WebP, giảm số tam giác (thường < 200k cho hero web).
- Tạo component từ GLB: `npx gltfjsx model.glb --types --transform`.
- Quy ước: đơn vị mét, gốc tại tâm đáy, +Y lên; kiểm tra tỉ lệ khi đặt vào cảnh.
- Vật liệu: PBR (`MeshStandardMaterial`/`MeshPhysicalMaterial`), texture sRGB cho màu, linear cho normal/roughness.

## Công thức ánh sáng/camera hay dùng

- Ánh sáng: `Environment` HDRI + 1 key directional + rim light ngược; bóng mềm bằng `ContactShadows`.
- Camera: fov 28-40 (ống tele, ít méo), dolly chậm + xoay nhẹ; dùng DOF để tách chủ thể.
- Màu: tone mapping ACES/AgX, bloom nhẹ cho phần phát sáng; không bật mọi hiệu ứng cùng lúc.

## Hiệu năng

`dpr={[1, 2]}`, `frameloop="demand"` cho cảnh tĩnh trên web, instancing cho nhiều vật giống nhau, giảm shadow map, dispose texture không dùng, tránh tạo object mới trong `useFrame`.
