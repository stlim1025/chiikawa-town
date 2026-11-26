import * as THREE from 'three';
import { CONTESTS } from '../core/contest.js';

/**
 * 마을 대회 시상식(게임 오리지널, core/contest.js): 대회 날 오후 5시 광장.
 *  1) 광장 동쪽에 단상이 놓이고(world/contestprops.js), 친구들이 모인다. 1 ~ 3등은 자기 단 앞에, 나머지는 단상 양옆에 앉아서 본다.
 *     카메라는 남쪽 높은 곳에서 단상을 내려다본다(남쪽 길목 현수막과 관중 우산에 가리지 않게).
 *  2) 노동 갑옷 씨가 3등부터 부르고, 1등 차례에 종이꽃가루가 팡. 내 등수와 1등 친구의 한마디.
 *  3) 끝나면 친구들을 풀어 주고 done().
 * 단상은 장애물이라 올라설 수는 없어서 등수 안이면 그 단 바로 앞에 선다.
 * ctx: stickday.js 와 같다(npcs, village, guide, input, hud, staged, who, narrator, fill, getPlayer, confetti, sound, summon) + props(contestprops).
 * info = { kind, top: [{ who: 'me' | 친구 kind | 'mp:…', name, s, t, rank }], me: { rank, s } | null, guests: [마을에 있는 친구 kind] }
 */
const WIN_LINE = {
  chiikawa: '…아, 아, 1등…? 와아…!', hachiware: '헤헤, 해냈다~!', usagi: '야하! 우라!', kurimanju: '하아~ 오늘은 운이 좋았네~',
  rakko: '…수련의 성과다.', momonga: '거봐! 내가 제일이지? 흥!'
};

export function createContestCeremony(ctx) {
  const { npcs, village, guide, input, hud, staged } = ctx;
  let S = null; // { kind: 'arrive' | 'talk', t, info, came, done }
  const P = () => ctx.getPlayer();
  const say = (lines, then) => guide.say(ctx.fill(lines.map(([w, text]) => ({ who: w === 'N' ? ctx.narrator : ctx.who(w), text }))), then, ctx.who('labor'));
  const unit = (kind) => (kind === 'fish' ? '마리' : '점');
  const tie = (kind, t) => (kind === 'fish' ? (t ? `가장 큰 것 ${t}cm` : '') : t ? `깔끔 ${t}` : '');
  const nameOf = (e) => (e.who === 'me' ? '{name}' : e.name);

  function arrive(info, done) {
    input.setEnabled(false);
    hud.setAction(null);
    const spots = ctx.props.podiumSpots();
    const front = (i) => village.nearestFree(spots[i].x, spots[i].z + 0.9, 0.3);
    // 관중은 단상 양옆에 번갈아(남쪽에 앉으면 카메라 앞을 가린다)
    const crowd = (i) => { const side = i % 2 ? 1 : -1, row = Math.floor(i / 2); return village.nearestFree(spots[0].x + side * (2.5 + row * 0.9), spots[0].z + 0.6 + row * 0.7, 0.3); };
    // 나: 등수 안이면 내 단 앞(남쪽을 본다), 아니면 관중 가운데(단상을 본다)
    const myIdx = info.top.findIndex((e) => e.who === 'me');
    const meSpot = myIdx >= 0 ? front(myIdx) : village.nearestFree(spots[0].x - 1.6, spots[0].z + 2.0, 0.3);
    P().setPosition(meSpot.x, meSpot.z);
    P().face(spots[0].x, myIdx >= 0 ? spots[0].z + 10 : spots[0].z);
    // 불려 오지 않은 캐릭터(갑옷 씨 등)가 단상 자리에 서 있으면 앞으로 비켜 세운다(단상 장애물 안에 묻히지 않게)
    for (const o of npcs.list) if (Math.abs(o.x - spots[0].x) < 1.9 && Math.abs(o.z - spots[0].z) < 0.95) { const p = village.nearestFree(o.x, spots[0].z + 1.7, 0.4); o.x = p.x; o.z = p.z; }
    ctx.props.setPodium(true); // 자리를 잡은 뒤에 놓는다(단상 자리에 서 있다가 갇히지 않게)
    const came = [], watchers = info.guests.filter((k) => !info.top.some((e) => e.who === k));
    info.guests.forEach((k, i) => {
      const idx = info.top.findIndex((e) => e.who === k);
      const to = idx >= 0 ? front(idx) : crowd(watchers.indexOf(k));
      const from = village.nearestFree(to.x + (i % 2 ? 3 : -3), to.z + 4, 0.4);
      const npc = ctx.summon(k, from.x, from.z);
      if (!npc) return;
      came.push(k);
      npcs.plan(npc, [{ do: 'wait', time: 0.2 + i * 0.3 }, { do: 'walk', x: to.x, z: to.z },
        idx >= 0 ? { do: 'act', anim: 'hop', time: 9999, face: { x: to.x, z: to.z + 5 } } : { do: 'act', anim: 'sit', time: 9999, face: { x: spots[0].x, z: spots[0].z } }]);
    });
    S = { kind: 'arrive', t: 0, ct: 0, info, came, done, from: ctx.cam.poseFor(P().position.x, P().position.z) };
  }
  const allHere = () => S.came.every((k) => { const n = npcs.byKind(k); return !n || (n.task && n.task.type === 'act'); });

  function talk() {
    S.kind = 'talk';
    const { kind, top, me } = S.info, C = CONTESTS[kind];
    const lines = [['N', '(광장에 단상이 놓이고 친구들이 모였다)'], ['labor', `${C.name} 시상식을 시작한다!`]];
    for (const e of [...top].sort((a, b) => b.rank - a.rank)) {
      const extra = tie(kind, e.t);
      lines.push(['labor', `${e.rank}등, ${nameOf(e)}! ${e.s}${unit(kind)}${extra ? `, ${extra}` : ''}.`]);
    }
    say(lines, () => {
      if (!S) return;
      const c = ctx.props.podiumSpots()[0];
      ctx.confetti.burst(c.x, 2.2, c.z, { n: 180, up: 4, spread: 2.6 });
      ctx.sound.play('quest');
      if (top.some((e) => e.who === 'me')) P().cheerTime = 2.8;
      const winner = top.find((e) => e.rank === 1);
      const after = [];
      if (winner && WIN_LINE[winner.who] && S.came.includes(winner.who)) after.push([winner.who, WIN_LINE[winner.who]]);
      if (me && me.rank != null) after.push(['labor', me.rank <= 3 ? `{name}, ${me.rank}등 축하한다!` : `{name}은 ${me.rank}등이다. 다음엔 단상에 서 보자!`]);
      after.push(['labor', '다음 대회도 기다리마!']);
      setTimeout(() => { if (S) say(after, finish); }, 1200);
    });
  }
  function finish() {
    if (!S) return;
    const { done } = S;
    release();
    S = null;
    input.setEnabled(true);
    done();
  }
  function release() {
    if (!S) return;
    P().act(null, 0);
    ctx.props.setPodium(false);
    S.came.forEach((k) => { const n = npcs.byKind(k); if (n && staged.has(k)) npcs.plan(n, []); staged.delete(k); });
  }

  return {
    get active() { return !!S; },
    /** 시작(info 는 위 설명). done() 은 장면이 끝난 뒤 상품 받기. */
    play(info, done) { if (!S) arrive(info, done); },
    /** 시상식 카메라: 단상 남쪽 조금 높은 곳에서 내려다본다. */
    camPose(dt) {
      if (!S || !S.from) return null;
      S.ct += dt;
      const k = Math.min(1, S.ct / 1.2), e = k * k * (3 - 2 * k), c = ctx.props.podiumSpots()[0];
      return { pos: S.from.pos.clone().lerp(new THREE.Vector3(c.x + 0.6, 4.2, c.z + 7.2), e), look: S.from.look.clone().lerp(new THREE.Vector3(c.x, 0.9, c.z), e) };
    },
    update(dt) {
      if (!S || S.kind !== 'arrive') return;
      S.t += dt;
      if ((S.t > 1.2 && allHere()) || S.t > 10) talk();
    },
    reset() { release(); S = null; }
  };
}
