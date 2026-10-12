import * as THREE from 'three';
import {
  EAR_TYPES, BODY_COLORS, PATTERNS, CHEEK_COLORS, EYE_TYPES, BROW_TYPES, MOUTH_TYPES, BEARD_TYPES,
  HAIR_TYPES, HAIR_COLORS, STARTER_ACCESSORIES, normalizeLook, buildChibi, animateChibi
} from '../actors/models.js';
import { createScenery } from './scenery.js';
import { setCelLight } from '../render/toon.js';

const WHITE = new THREE.Color(1, 1, 1);
const BODY_NAMES = ['하양', '노랑', '분홍', '하늘', '민트', '보라', '살구', '라테'];
const CHEEK_NAMES = ['분홍 볼', '주황 볼', '보라 볼', '빨강 볼'];
const HAIR_COLOR_NAMES = ['갈색', '검정', '금발', '분홍', '하늘', '민트', '보라', '하양'];

const opt = (list) => list.map((o) => ({ value: o.id, label: o.label }));
const sw = (colors, names) => colors.map((c, i) => ({ value: c, label: names[i], swatch: c }));

/** 탭 > 항목 > 선택지. */
const TABS = [
  { id: 'shape', label: '모양', groups: [
    { key: 'ears', title: '귀 모양', options: opt(EAR_TYPES) },
    { key: 'body', title: '몸 색', options: sw(BODY_COLORS, BODY_NAMES) },
    { key: 'pattern', title: '무늬', options: opt(PATTERNS) }
  ] },
  { id: 'face', label: '얼굴', groups: [
    { key: 'eyes', title: '눈', options: opt(EYE_TYPES) },
    { key: 'brows', title: '눈썹', options: opt(BROW_TYPES) },
    { key: 'mouth', title: '입', options: opt(MOUTH_TYPES) },
    { key: 'cheek', title: '볼 색', options: sw(CHEEK_COLORS, CHEEK_NAMES) },
    { key: 'beard', title: '수염', options: opt(BEARD_TYPES) }
  ] },
  { id: 'hair', label: '머리', groups: [
    { key: 'hair', title: '헤어스타일', options: opt(HAIR_TYPES) },
    { key: 'hairColor', title: '머리와 수염 색', options: sw(HAIR_COLORS, HAIR_COLOR_NAMES) },
    { key: 'accessory', title: '장식', options: opt(STARTER_ACCESSORIES) } // 비싼 장식(왕관 등)은 포셰트 가게에서
  ] }
];

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)].value;

/**
 * 캐릭터 만들기 화면. 다 고르면 onDone({ name, look }) 를 부른다.
 * initial 이 있으면 그 모습과 이름에서 시작한다(모습 바꾸기). onCancel 이 있으면 "취소" 버튼을 보인다.
 */
export function openCreator(ui, onDone, initial = null, onCancel = null) {
  const look = normalizeLook(initial ? initial.look : {});
  let tab = TABS[0].id;
  const wrap = document.createElement('div');
  wrap.className = 'creator';
  wrap.innerHTML = `
    <div class="creator-preview"><canvas aria-label="내 캐릭터 미리보기. 좌우로 끌면 돌아가요"></canvas><p class="preview-hint" aria-hidden="true">↔ 끌어서 돌려 보기</p></div>
    <div class="creator-form card"><form class="creator-scroll" novalidate>
      <div class="creator-head">
        <h1>${initial ? '모습 바꾸기' : '나만의 먼작귀 만들기'}</h1>
        <button class="btn" type="button" data-random>랜덤</button>
      </div>
      <div class="tabs" role="tablist"></div>
      <div class="tab-body"></div>
      <h2><label for="creator-name">이름</label></h2>
      <input id="creator-name" class="name-input" maxlength="8" autocomplete="off" placeholder="최대 8자">
      <div class="creator-actions">
        ${onCancel ? '<button class="btn" type="button" data-cancel>취소</button>' : ''}
        <button class="btn primary" type="submit" disabled>${initial ? '이대로 할래요' : '마을로 가기'}</button>
      </div>
    </form></div>`;
  wrap.prepend(createScenery({ friends: false }));
  ui.appendChild(wrap);

  // ---------- 미리보기 ----------
  const canvas = wrap.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8d8a8, 1.2));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.8);
  sun.position.set(3, 5, 4);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.25, 3.5);
  camera.lookAt(0, 0.78, 0);
  let model = null;
  const rebuild = () => {
    if (model) scene.remove(model.root);
    model = buildChibi(look);
    scene.add(model.root);
  };
  rebuild();

  // 끌어서 돌려 보기: 가만히 정면을 보고 있다가, 끄는 만큼만 돌고, 손을 떼면 그 자리에서 바로 멈춘다
  let yaw = 0, drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { id: e.pointerId, x: e.clientX };
    canvas.setPointerCapture(e.pointerId);
    wrap.classList.add('turning');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    yaw += (e.clientX - drag.x) * 0.012;
    drag.x = e.clientX;
  });
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    wrap.classList.remove('turning');
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  let raf = 0, t = 0, last = performance.now(), alive = true;
  const frame = (now) => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const w = canvas.clientWidth, hh = canvas.clientHeight;
    if (w && hh) {
      const size = renderer.getSize(new THREE.Vector2());
      if (size.x !== w || size.y !== hh) { renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix(); }
    }
    model.root.rotation.y = yaw;
    animateChibi(model, 'idle', t, {});
    setCelLight(WHITE); // 마을이 밤이어도 미리보기는 밝게
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  // ---------- 탭과 선택지 ----------
  const tabsEl = wrap.querySelector('.tabs'), bodyEl = wrap.querySelector('.tab-body');
  function renderTabs() {
    tabsEl.replaceChildren(...TABS.map((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(t.id === tab));
      b.textContent = t.label;
      b.addEventListener('click', () => { tab = t.id; renderTabs(); renderBody(); });
      return b;
    }));
  }
  function renderBody() {
    const current = TABS.find((t) => t.id === tab);
    const nodes = [];
    current.groups.forEach((g) => {
      const h = document.createElement('h2');
      h.textContent = g.title;
      const box = document.createElement('div');
      box.className = 'choices';
      g.options.forEach((o) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = o.swatch ? 'swatch' : 'choice';
        if (o.swatch) { b.style.background = o.swatch; b.setAttribute('aria-label', o.label); b.title = o.label; } else b.textContent = o.label;
        b.setAttribute('aria-pressed', String(look[g.key] === o.value));
        b.addEventListener('click', () => {
          look[g.key] = o.value;
          box.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          rebuild();
        });
        box.appendChild(b);
      });
      nodes.push(h, box);
    });
    bodyEl.replaceChildren(...nodes);
  }
  renderTabs();
  renderBody();

  wrap.querySelector('[data-random]').addEventListener('click', () => {
    TABS.forEach((t) => t.groups.forEach((g) => { look[g.key] = pickRandom(g.options); }));
    // 수염과 장식은 너무 자주 붙지 않게 반반
    if (Math.random() < 0.5) look.beard = 'none';
    if (Math.random() < 0.4) look.accessory = 'none';
    rebuild();
    renderBody();
  });

  // ---------- 이름과 완료 ----------
  const form = wrap.querySelector('form'), input = wrap.querySelector('input'), go = form.querySelector('button[type="submit"]');
  if (initial) { input.value = initial.name; go.disabled = false; }
  input.addEventListener('input', () => { go.disabled = !input.value.trim(); });
  const finish = () => {
    alive = false;
    cancelAnimationFrame(raf);
    renderer.forceContextLoss();
    renderer.dispose();
    wrap.remove();
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = input.value.trim().slice(0, 8);
    if (!name) return;
    finish();
    onDone({ name, look: { ...look } });
  });
  const cancel = wrap.querySelector('[data-cancel]');
  if (cancel) cancel.addEventListener('click', () => { finish(); onCancel(); });
}
