import * as THREE from 'three';

/**
 * 내 캐릭터를 따라다니는 불: 랜턴은 둘레를 둥글게(점광원). 손전등은 위에서 내려다보는 화면이라 앞만 비추면 오히려 어두우니,
 * 둘레를 랜턴보다 넓게 밝히고(점광원) 바라보는 쪽은 더 멀리까지(스폿광) — 비싼 만큼 랜턴보다 낫지만 눈부시지 않게 은은한 빛.
 * 밤 정도(night)에 맞춰 세기를 바꾸므로 낮에는 거의 보이지 않는다. 그림자는 그리지 않는다(휴대폰에서도 가볍게).
 */
export function createPlayerLights(scene) {
  const lantern = new THREE.PointLight(0xffc27a, 0, 8.5, 1.2);
  const glow = new THREE.PointLight(0xffecc8, 0, 12.5, 1.1);
  const torch = new THREE.SpotLight(0xffecc8, 0, 24, 0.72, 0.7, 1.0);
  const aim = new THREE.Object3D();
  torch.target = aim;
  scene.add(lantern, glow, torch, aim);
  return {
    /** mode: 'off' | 'lantern' | 'flashlight', p: { x, z }, yaw: 바라보는 방향, night: 0(낮) ~ 1(밤) */
    update(mode, p, yaw, night) {
      const k = Math.max(0, Math.min(1, night));
      lantern.intensity = mode === 'lantern' ? 14 * k : 0;
      glow.intensity = mode === 'flashlight' ? 8 * k : 0; // 눈부시지 않게: 하얀 빛이라 랜턴(주황 14)보다 약하게, 대신 더 넓게
      torch.intensity = mode === 'flashlight' ? 15 * k : 0;
      glow.position.set(p.x, 1.6, p.z);
      lantern.position.set(p.x + Math.sin(yaw) * 0.3, 1.2, p.z + Math.cos(yaw) * 0.3);
      torch.position.set(p.x + Math.sin(yaw) * 0.35, 0.9, p.z + Math.cos(yaw) * 0.35);
      aim.position.set(p.x + Math.sin(yaw) * 8, 0, p.z + Math.cos(yaw) * 8);
    }
  };
}
