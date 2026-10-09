import * as THREE from 'three';

/**
 * 내 캐릭터를 따라다니는 불: 랜턴은 둘레를 둥글게(점광원), 손전등은 바라보는 쪽을 멀리(스폿광).
 * 밤 정도(night)에 맞춰 세기를 바꾸므로 낮에는 거의 보이지 않는다. 그림자는 그리지 않는다(휴대폰에서도 가볍게).
 */
export function createPlayerLights(scene) {
  const lantern = new THREE.PointLight(0xffc27a, 0, 8.5, 1.2);
  const torch = new THREE.SpotLight(0xfff1cf, 0, 17, 0.42, 0.55, 1.0);
  const aim = new THREE.Object3D();
  torch.target = aim;
  scene.add(lantern, torch, aim);
  return {
    /** mode: 'off' | 'lantern' | 'flashlight', p: { x, z }, yaw: 바라보는 방향, night: 0(낮) ~ 1(밤) */
    update(mode, p, yaw, night) {
      const k = Math.max(0, Math.min(1, night));
      lantern.intensity = mode === 'lantern' ? 14 * k : 0;
      torch.intensity = mode === 'flashlight' ? 32 * k : 0;
      lantern.position.set(p.x + Math.sin(yaw) * 0.3, 1.2, p.z + Math.cos(yaw) * 0.3);
      torch.position.set(p.x + Math.sin(yaw) * 0.35, 0.9, p.z + Math.cos(yaw) * 0.35);
      aim.position.set(p.x + Math.sin(yaw) * 8, 0, p.z + Math.cos(yaw) * 8);
    }
  };
}
