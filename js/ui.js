// ============================================================================
//  ui.js — every 2D screen: title, avatar editor, HUD, shop, finish.
// ============================================================================
//
// The 3D world says everything once, in Roblox's own furniture — a board over
// the stage, a bubble over the guide, a leaderboard in the corner. This file is
// the flat copy of the same information, which matters more than it sounds:
// a seven-year-old reading a question off a billboard seen at an angle, from
// twenty studs away, on a classroom projector, cannot. So the question is
// always repeated flat and large at the top of the screen too.

import * as THREE from 'three';
import { bc, BrickColor, DEFAULT_AVATAR } from './rbx.js';
import { Avatar, HATS } from './avatar.js';
import { say } from './speech.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);

// The swatches offered in the avatar editor — real BrickColor names.
const SKIN_COLOURS = ['Bright yellow', 'Cool yellow', 'Reddish brown', 'Institutional white',
  'Bright orange', 'Br. yellowish green', 'Pastel blue', 'Hot pink'];
const SHIRT_COLOURS = ['Bright blue', 'Bright red', 'Bright green', 'Bright violet',
  'Bright yellow', 'Deep orange', 'Really black', 'Institutional white', 'Bright bluish green', 'Hot pink'];
const PANTS_COLOURS = ['Br. yellowish green', 'Dark stone grey', 'Bright blue', 'Reddish brown',
  'Really black', 'Bright red', 'Medium stone grey', 'Bright violet'];
const HAIR_COLOURS = ['Reddish brown', 'Really black', 'Bright yellow', 'Cool yellow',
  'Bright red', 'Medium stone grey', 'Bright violet', 'Institutional white'];

// Shop tile colours — matches the design-system shop mockup.
const HAT_SWATCH = {
  none: '#7a8798',
  cap: '#d43a2c',
  tophat: '#1b2634',
  crown: '#f5b81d',
  wizard: '#7d2fb8',
  headphones: '#3a8ee0',
};

export const UI = {
  el: {},
  hooks: {},
  preview: null,

  init(hooks = {}) {
    this.hooks = hooks;
    [
      'loading', 'load-fill', 'load-status',
      'title', 'mode-picker', 'year-picker', 'pack-picker', 'btn-play', 'btn-continue', 'mode-badge',
      'pick-words', 'ls-stage-head', 'compass', 'compass-arrow', 'compass-label', 'finish-title',
      'opt-speech', 'opt-music', 'title-hint',
      'avatar-screen', 'avatar-preview', 'player-name', 'sw-skin', 'sw-shirt', 'sw-pants', 'sw-hair',
      'hat-row', 'btn-spawn', 'btn-back',
      'hud', 'btn-menu', 'btn-shop', 'btn-repeat', 'btn-hint', 'btn-map',
      'btn-quests', 'btn-bag', 'btn-quests-close', 'btn-bag-close',
      'minimap', 'mm-canvas', 'mm-label',
      'quest-banner', 'qb-icon', 'qb-eyebrow', 'qb-sub', 'qb-fill', 'qb-count',
      'cur-star', 'cur-coin', 'cur-gem', 'rail', 'actions',
      'player-card', 'pc-face', 'pc-name', 'pc-lv', 'pc-fill', 'pc-xp',
      'burst', 'burst-emoji', 'burst-word', 'burst-count', 'burst-rewards',
      'quests', 'quests-icon', 'quests-eyebrow', 'quests-title', 'quests-count',
      'quests-section', 'quests-note', 'quest-list', 'quests-hint',
      'bag', 'bag-title', 'bag-note', 'bag-grid', 'health-wrap',
      'q-text', 'q-sub', 'chat-log', 'health-fill', 'jump-btn',
      'respawn', 'respawn-msg', 'respawn-count', 'toasts',
      'menu', 'btn-resume', 'btn-reset', 'opt-speech2', 'opt-music2', 'opt-sens', 'btn-quit',
      'shop', 'shop-coins', 'shop-items', 'btn-shop-close',
      'finish', 'finish-line', 'finish-stats', 'word-wall', 'btn-again', 'btn-lobby',
    ].forEach((id) => { this.el[id] = $(id); });

    const on = (id, ev, fn) => { if (this.el[id]) this.el[id].addEventListener(ev, fn); };

    on('btn-play', 'click', () => { sfx.click(); hooks.onPlay && hooks.onPlay(); });
    on('btn-continue', 'click', () => { sfx.click(); hooks.onContinue && hooks.onContinue(); });
    on('btn-spawn', 'click', () => { sfx.click(); hooks.onSpawn && hooks.onSpawn(); });
    on('btn-back', 'click', () => { sfx.click(); this.showTitle(); });
    on('btn-menu', 'click', () => { sfx.click(); hooks.onMenu && hooks.onMenu(); });
    on('btn-resume', 'click', () => { sfx.click(); hooks.onResume && hooks.onResume(); });
    on('btn-reset', 'click', () => { sfx.click(); hooks.onReset && hooks.onReset(); });
    on('btn-quit', 'click', () => { sfx.click(); hooks.onQuit && hooks.onQuit(); });
    on('btn-repeat', 'click', () => { sfx.click(); hooks.onRepeat && hooks.onRepeat(); });
    on('btn-shop', 'click', () => { sfx.click(); this.showShop(); });
    on('btn-shop-close', 'click', () => { sfx.click(); this.hideShop(); });
    on('btn-hint', 'click', () => { sfx.click(); hooks.onHint && hooks.onHint(); });
    on('btn-map', 'click', () => { sfx.click(); this.toggleMap(); });
    on('btn-quests', 'click', () => { sfx.click(); this.togglePanel('quests'); });
    on('btn-bag', 'click', () => { sfx.click(); this.togglePanel('bag'); });
    on('btn-quests-close', 'click', () => { sfx.click(); this.closePanels(); });
    on('btn-bag-close', 'click', () => { sfx.click(); this.closePanels(); });
    on('btn-again', 'click', () => { sfx.click(); hooks.onPlayAgain && hooks.onPlayAgain(); });
    on('btn-lobby', 'click', () => { sfx.click(); hooks.onBackToTitle && hooks.onBackToTitle(); });

    // The two copies of each option checkbox stay in step.
    const pair = (a, b, fn) => {
      const sync = (src, dst) => {
        if (!src || !dst) return;
        src.addEventListener('change', () => { dst.checked = src.checked; fn(src.checked); });
      };
      sync(this.el[a], this.el[b]);
      sync(this.el[b], this.el[a]);
    };
    pair('opt-speech', 'opt-speech2', (v) => hooks.onSpeechToggle && hooks.onSpeechToggle(v));
    pair('opt-music', 'opt-music2', (v) => hooks.onMusicToggle && hooks.onMusicToggle(v));

    if (this.el['opt-sens']) {
      this.el['opt-sens'].addEventListener('input', (e) => {
        hooks.onSensitivity && hooks.onSensitivity(Number(e.target.value));
      });
    }

    // Touch devices get the on-screen jump button.
    if ('ontouchstart' in window) document.body.classList.add('touch');
    if (this.el['jump-btn']) {
      const jb = this.el['jump-btn'];
      jb.addEventListener('touchstart', (e) => { e.preventDefault(); hooks.onJumpDown && hooks.onJumpDown(true); });
      jb.addEventListener('touchend', (e) => { e.preventDefault(); hooks.onJumpDown && hooks.onJumpDown(false); });
    }
  },

  // ------------------------------------------------------------- screens
  screen(name) {
    ['loading', 'title', 'avatar-screen', 'finish'].forEach((k) => {
      if (this.el[k]) this.el[k].classList.add('hidden');
    });
    if (name && this.el[name]) this.el[name].classList.remove('hidden');
    const inGame = name === null;
    if (this.el.hud) this.el.hud.classList.toggle('hidden', !inGame);
    if (!inGame) this.closePanels();
  },

  showLoading(msg) {
    this.screen('loading');
    if (msg && this.el['load-status']) this.el['load-status'].textContent = msg;
  },
  setLoad(pct, msg) {
    if (this.el['load-fill']) this.el['load-fill'].style.width = `${Math.round(pct * 100)}%`;
    if (msg && this.el['load-status']) this.el['load-status'].textContent = msg;
  },
  showTitle() { this.screen('title'); this.hideMenu(); },
  showAvatar() { this.screen('avatar-screen'); },
  showGame() { this.screen(null); },

  showMenu() { if (this.el.menu) this.el.menu.classList.remove('hidden'); },
  hideMenu() { if (this.el.menu) this.el.menu.classList.add('hidden'); },
  get menuOpen() { return this.el.menu && !this.el.menu.classList.contains('hidden'); },

  // ------------------------------------------------------- title pickers

  // The two games. Same class, same word packs, same Robloxian — a different
  // thing to do with them.
  buildModeCards(modes, selectedId, onPick) {
    const box = this.el['mode-picker'];
    if (!box) return;
    box.innerHTML = '';
    modes.forEach((m) => {
      const b = document.createElement('button');
      b.className = 'card mode-card' + (m.id === selectedId ? ' on' : '');
      b.innerHTML =
        `<div class="card-emoji">${m.emoji}</div>` +
        `<div class="card-name">${m.name}</div>` +
        `<div class="card-blurb">${m.blurb}</div>` +
        `<div class="card-book">${m.how}</div>`;
      b.addEventListener('click', () => {
        sfx.click();
        box.querySelectorAll('.card').forEach((c) => c.classList.remove('on'));
        b.classList.add('on');
        onPick(m.id);
      });
      box.appendChild(b);
    });
  },

  // The wording of the rest of the title screen follows the mode.
  setModeCopy(mode) {
    const isle = mode === 'explore';
    if (this.el['pick-words']) {
      this.el['pick-words'].innerHTML = isle
        ? '3 &middot; Choose this week&rsquo;s words <em>(your home district)</em>'
        : '3 &middot; Choose this week&rsquo;s words';
    }
    if (this.el['btn-spawn']) this.el['btn-spawn'].textContent = isle ? 'Join the Island' : 'Join the Obby';
    if (this.el['ls-stage-head']) this.el['ls-stage-head'].textContent = isle ? 'Found' : 'Stage';
    const badge = this.el['mode-badge'];
    if (badge) {
      badge.textContent = isle ? 'ISLAND' : 'OBBY';
      badge.classList.remove('hidden');
    }
  },

  // ---------------------------------------------------------------- compass
  // Which way to run. It points at the district GATE, never at the answer —
  // the beam in the world and this arrow agree on that, and the reading starts
  // where they both stop.
  setCompass(deg, label) {
    const box = this.el.compass;
    if (!box) return;
    box.classList.remove('hidden');
    if (this.el['compass-arrow']) this.el['compass-arrow'].style.transform = `rotate(${deg}deg)`;
    if (this.el['compass-label']) this.el['compass-label'].textContent = label || '';
  },
  hideCompass() { if (this.el.compass) this.el.compass.classList.add('hidden'); },

  buildYearCards(years, selectedId, onPick) {
    const box = this.el['year-picker'];
    if (!box) return;
    box.innerHTML = '';
    years.forEach((y) => {
      const b = document.createElement('button');
      b.className = 'card' + (y.id === selectedId ? ' on' : '');
      b.innerHTML =
        `<div class="card-emoji">${y.emoji}</div>` +
        `<div class="card-name">${y.label}</div>` +
        `<div class="card-blurb">${y.blurb}</div>` +
        `<div class="card-book">${y.book}</div>`;
      b.addEventListener('click', () => {
        sfx.click();
        box.querySelectorAll('.card').forEach((c) => c.classList.remove('on'));
        b.classList.add('on');
        onPick(y.id);
      });
      box.appendChild(b);
    });
  },

  buildPackCards(packs, selectedId, onPick) {
    const box = this.el['pack-picker'];
    if (!box) return;
    box.innerHTML = '';
    packs.forEach((p) => {
      const b = document.createElement('button');
      b.className = 'card' + (p.id === selectedId ? ' on' : '');
      b.innerHTML =
        `<div class="card-emoji">${p.emoji}</div>` +
        `<div class="card-name">${p.name}</div>` +
        `<div class="card-blurb">${p.blurb}</div>` +
        `<div class="card-book">${p.book}</div>`;
      b.addEventListener('click', () => {
        sfx.click();
        box.querySelectorAll('.card').forEach((c) => c.classList.remove('on'));
        b.classList.add('on');
        onPick(p.id);
      });
      box.appendChild(b);
    });
  },

  setContinueVisible(on) {
    if (this.el['btn-continue']) this.el['btn-continue'].classList.toggle('hidden', !on);
  },

  // ------------------------------------------------------- avatar editor
  // A tiny second renderer, so the pupil sees the Robloxian they are building
  // rather than a row of colour names.
  buildAvatarEditor(look, owned, coins, onChange) {
    const mount = this.el['avatar-preview'];
    if (!mount) return;

    if (!this.preview) {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(mount.clientWidth || 240, mount.clientHeight || 300);
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f7a, 1.6));
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(4, 9, 7);
      scene.add(key);

      const cam = new THREE.PerspectiveCamera(30, 240 / 300, 0.1, 200);
      cam.position.set(0, 4.4, 17);
      cam.lookAt(0, 3.2, 0);

      this.preview = { renderer, scene, cam, avatar: null, t: 0 };
    }

    const P = this.preview;
    if (P.avatar) P.scene.remove(P.avatar.root);
    P.avatar = new Avatar(look, { name: '', nametag: false, backpack: true });
    P.scene.add(P.avatar.root);

    const swatchRow = (elId, colours, key) => {
      const box = this.el[elId];
      if (!box) return;
      box.innerHTML = '';
      colours.forEach((name) => {
        const hex = bc(name);
        const b = document.createElement('button');
        b.className = 'sw' + (look[key] === hex ? ' on' : '');
        b.style.background = '#' + hex.toString(16).padStart(6, '0');
        b.title = name;
        b.addEventListener('click', () => {
          sfx.click();
          look[key] = hex;
          box.querySelectorAll('.sw').forEach((s) => s.classList.remove('on'));
          b.classList.add('on');
          if (key === 'hair') P.avatar.setHair(hex);
          else P.avatar.setColours({ [key]: hex });
          onChange && onChange(look);
        });
        box.appendChild(b);
      });
    };
    swatchRow('sw-skin', SKIN_COLOURS, 'skin');
    swatchRow('sw-shirt', SHIRT_COLOURS, 'shirt');
    swatchRow('sw-pants', PANTS_COLOURS, 'pants');
    swatchRow('sw-hair', HAIR_COLOURS, 'hair');

    const hats = this.el['hat-row'];
    if (hats) {
      hats.innerHTML = '';
      HATS.forEach((h) => {
        const has = h.cost === 0 || owned.includes(h.id);
        const b = document.createElement('button');
        b.className = 'hat' + (look.hat === h.id ? ' on' : '') + (has ? '' : ' locked');
        b.innerHTML = `${h.emoji}<small>${has ? h.name : `<span class="icon-coin hat-coin"></span>${h.cost}`}</small>`;
        b.title = h.name;
        b.addEventListener('click', () => {
          if (!has) { this.toast('Locked', `Earn ${h.cost} coins in the obby, then buy it in the shop.`); return; }
          sfx.click();
          look.hat = h.id;
          hats.querySelectorAll('.hat').forEach((s) => s.classList.remove('on'));
          b.classList.add('on');
          P.avatar.setHat(h.id);
          onChange && onChange(look);
        });
        hats.appendChild(b);
      });
    }

    if (this.el['player-name']) {
      this.el['player-name'].oninput = () => onChange && onChange(look);
    }
  },

  renderPreview(dt) {
    const P = this.preview;
    if (!P || !P.avatar) return;
    P.t += dt;
    P.avatar.root.rotation.y = Math.sin(P.t * 0.55) * 0.65;
    P.avatar.animate(dt, 0, true, P.cam);
    P.renderer.render(P.scene, P.cam);
  },

  get playerName() {
    const v = this.el['player-name'] ? this.el['player-name'].value.trim() : '';
    return v || 'Player';
  },
  set playerName(v) { if (this.el['player-name']) this.el['player-name'].value = v; },

  // ------------------------------------------------------------------ HUD
  // The counters the HUD keeps for itself. `stars` is words found this run and
  // `gems` is badges — both are numbers the game already had, given the faces
  // the reference sheet gives them.
  hud: { stars: 0, gems: 0, coins: 0, xpPer: 300, isle: false },

  // The banner's eyebrow, where the old title bar used to be.
  setTitleBar(text) {
    if (this.el['qb-eyebrow']) this.el['qb-eyebrow'].textContent = text || '';
    if (this.el['quests-eyebrow']) this.el['quests-eyebrow'].textContent = text || '';
  },

  // Which furniture this mode gets. The island has a map and no health bar;
  // the obby has a health bar and no map, because nothing on the island can
  // hurt you and there is nothing on a corridor to map.
  setModeFurniture(isle) {
    this.hud.isle = !!isle;
    if (this.el.minimap) this.el.minimap.classList.toggle('hidden', !isle);
    if (this.el['health-wrap']) this.el['health-wrap'].style.display = isle ? 'none' : '';
    if (this.el['btn-map']) this.el['btn-map'].style.display = isle ? '' : 'none';
    if (this.el['qb-icon']) {
      this.el['qb-icon'].textContent = '';
      this.el['qb-icon'].classList.toggle('qb-icon--isle', isle);
      this.el['qb-icon'].classList.toggle('qb-icon--obby', !isle);
    }
    if (this.el['quests-title']) this.el['quests-title'].textContent = isle ? 'Today’s hunt' : 'Today’s course';
    if (this.el['quests-icon']) {
      this.el['quests-icon'].textContent = '';
      this.el['quests-icon'].classList.toggle('qb-icon--isle', isle);
      this.el['quests-icon'].classList.toggle('qb-icon--obby', !isle);
    }
    if (this.el['quests-section']) {
      this.el['quests-section'].textContent = isle ? 'Words to find' : 'Stages';
    }
  },

  setStats({ name, stage, total, coins }) {
    if (name !== undefined) {
      if (this.el['pc-name']) this.el['pc-name'].textContent = name;
      this.drawFace();
    }
    if (stage !== undefined) {
      this.hud.stars = stage;
      if (this.el['cur-star']) this.el['cur-star'].textContent = String(stage);
      const n = total || 0;
      if (this.el['qb-count']) this.el['qb-count'].textContent = n ? `${stage} / ${n}` : String(stage);
      if (this.el['quests-count']) this.el['quests-count'].textContent = n ? `${stage} / ${n}` : '';
      if (this.el['qb-fill']) this.el['qb-fill'].style.width = `${n ? (stage / n) * 100 : 0}%`;
    }
    if (coins !== undefined) {
      this.hud.coins = coins;
      if (this.el['cur-coin']) this.el['cur-coin'].textContent = String(coins);
      // The level bar is the coin total dressed as XP: every 300 coins is a
      // level. No new number is being tracked — it is the same purse.
      const per = this.hud.xpPer;
      const lv = 1 + Math.floor(coins / per);
      const into = coins % per;
      if (this.el['pc-lv']) this.el['pc-lv'].textContent = String(lv);
      if (this.el['pc-fill']) this.el['pc-fill'].style.width = `${(into / per) * 100}%`;
      if (this.el['pc-xp']) this.el['pc-xp'].textContent = `${into} / ${per}`;
    }
  },

  setGems(n) {
    this.hud.gems = n;
    if (this.el['cur-gem']) this.el['cur-gem'].textContent = String(n);
  },

  setQuestion(q) {
    const box = this.el['quest-banner'];
    if (!box) return;
    if (!q) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    if (this.el['q-text']) this.el['q-text'].textContent = q.board;
    if (this.el['q-sub']) {
      this.el['q-sub'].textContent = q.subtitle || '';
      this.el['q-sub'].style.color = '';
    }
  },

  markQuestion(correct) {
    if (this.el['q-sub']) {
      this.el['q-sub'].textContent = correct ? '✔ Correct!' : '✘ Try again';
      this.el['q-sub'].style.color = correct ? '#6de08f' : '#ff8b80';
    }
  },

  // ------------------------------------------------------------- the burst
  // Panel 3 of the reference: the one moment the middle of the screen is used.
  // Rewards are passed in rather than assumed, so the obby and the island can
  // pay differently without this knowing which is which.
  showBurst({ emoji, word, count, of, rewards }) {
    const b = this.el.burst;
    if (!b) return;
    clearTimeout(this._burstT);
    b.classList.remove('hidden', 'out');
    // Restarting a CSS animation needs the node to be re-inserted.
    void b.offsetWidth;
    if (this.el['burst-emoji']) this.el['burst-emoji'].textContent = emoji || '⭐';
    if (this.el['burst-word']) {
      const label = word || 'FOUND!';
      this.el['burst-word'].textContent = `★ ${label} ★`;
    }
    if (this.el['burst-count']) {
      this.el['burst-count'].textContent = of ? `${count} / ${of}` : '';
    }
    if (this.el['burst-rewards']) {
      const iconCls = (icon) => {
        if (!icon) return { cls: 'rw--star', icon: 'icon-star' };
        if (icon.includes('🪙') || icon.includes('coin')) return { cls: 'rw--coin', icon: 'icon-coin' };
        if (icon.includes('💎') || icon.includes('gem')) return { cls: 'rw--gem', icon: 'icon-gem' };
        return { cls: 'rw--star', icon: 'icon-star' };
      };
      const rows = rewards || [];
      this.el['burst-rewards'].innerHTML = rows
        .map((r) => {
          const { cls, icon } = iconCls(r.icon);
          return `<div class="rw ${cls}"><span class="${icon}"></span><div class="rw-val">+${r.n}</div></div>`;
        }).join('');
      const side = this.el['burst-rewards'].closest('.burst-side');
      if (side) side.classList.toggle('hidden', !rows.length);
      b.classList.toggle('burst--solo', !rows.length);
    }
    this._burstT = setTimeout(() => {
      b.classList.add('out');
      this._burstT = setTimeout(() => b.classList.add('hidden'), 460);
    }, 1250);
  },

  // ------------------------------------------------------------- side panels
  togglePanel(name) {
    const el = this.el[name];
    if (!el) return;
    const wasOpen = !el.classList.contains('hidden');
    this.closePanels();
    if (!wasOpen) {
      el.classList.remove('hidden');
      if (this.hooks.onPanelOpen) this.hooks.onPanelOpen(name);
    }
  },
  closePanels() {
    ['quests', 'bag'].forEach((k) => { if (this.el[k]) this.el[k].classList.add('hidden'); });
  },
  get panelOpen() {
    return ['quests', 'bag'].some((k) => this.el[k] && !this.el[k].classList.contains('hidden'));
  },

  // The checklist. Rows already answered are named and ticked; the one being
  // asked is highlighted; the rest stay dots, because naming them up front
  // would hand over the answers the mode exists to make you look for.
  setQuests(rows, note, hint) {
    if (this.el['quests-note']) this.el['quests-note'].textContent = note || '';
    if (this.el['quests-hint']) this.el['quests-hint'].innerHTML = hint || '';
    const box = this.el['quest-list'];
    if (!box) return;
    box.innerHTML = '';
    (rows || []).forEach((r) => {
      const d = document.createElement('div');
      d.className = `ql ${r.state}`;
      const tick = r.state === 'done' ? '✔' : '';
      const label = r.state === 'locked' ? '· · ·' : `${r.emoji || ''} ${r.word}`.trim();
      d.innerHTML =
        `<span class="ql-tick">${tick}</span>` +
        `<span class="ql-word">${label}</span>` +
        `<span class="ql-where">${r.where || ''}</span>`;
      box.appendChild(d);
    });
  },

  // The bag: every word this run has actually taught, tappable to hear again.
  setBag(words, note) {
    if (this.el['bag-note']) this.el['bag-note'].textContent = note || '';
    const box = this.el['bag-grid'];
    if (!box) return;
    box.innerHTML = '';
    if (!words || !words.length) {
      box.innerHTML = '<div class="bag-empty">Nothing yet. Every sign you touch puts its word in here — even the wrong ones.</div>';
      return;
    }
    words.forEach((w) => {
      const d = document.createElement('button');
      d.className = 'bg-item';
      d.innerHTML = `<div class="bg-emoji">${w.emoji || '📘'}</div><div class="bg-word">${w.word}</div>`;
      d.title = w.sentence || '';
      d.addEventListener('click', () => say(w.sentence ? `${w.word}. ${w.sentence}` : w.word, { force: true }));
      box.appendChild(d);
    });
  },

  // ---------------------------------------------------------------- minimap
  toggleMap() {
    if (!this.el.minimap || !this.hud.isle) return;
    this.el.minimap.classList.toggle('hidden');
  },

  // Drawn straight from the island's own district list, so a pack a teacher
  // adds later appears on the map without anything here changing. North is up
  // and the map does NOT rotate with the camera — a seven-year-old reading a
  // rotating map learns nothing about where anything is.
  drawMinimap(m) {
    const c = this.el['mm-canvas'];
    if (!c || !m) return;
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    const R = W / 2;
    const scale = R / (m.span * 0.62);
    const px = (x) => R + x * scale;
    const pz = (z) => R + z * scale;

    g.clearRect(0, 0, W, H);
    g.fillStyle = '#1d4f78';                     // the sea
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#1c4527';
    g.beginPath();
    g.arc(R, R, m.span * 0.5 * scale, 0, Math.PI * 2);
    g.fill();

    // The four streets, then the plaza on top of them.
    g.strokeStyle = 'rgba(255,255,255,0.34)';
    g.lineWidth = 13;
    (m.districts || []).forEach((d) => {
      g.beginPath();
      g.moveTo(R, R);
      g.lineTo(px(d.x), pz(d.z));
      g.stroke();
    });
    g.fillStyle = 'rgba(255,255,255,0.30)';
    g.beginPath();
    g.arc(R, R, 22, 0, Math.PI * 2);
    g.fill();

    // A dot per district in its own accent colour, ringed white when it is the
    // one being hunted for.
    (m.districts || []).forEach((d) => {
      const x = px(d.x), z = pz(d.z);
      g.fillStyle = `#${(d.colour >>> 0).toString(16).padStart(6, '0')}`;
      g.beginPath();
      g.arc(x, z, 15, 0, Math.PI * 2);
      g.fill();
      if (m.beacon && Math.hypot(d.x - m.beacon.x, d.z - m.beacon.z) < 30) {
        g.strokeStyle = '#f5b81d';
        g.lineWidth = 4;
        g.stroke();
      }
    });

    // The player: a triangle pointing the way the camera is facing.
    const x = px(m.player.x), z = pz(m.player.z);
    g.save();
    g.translate(x, z);
    g.rotate(-m.yaw + Math.PI);
    g.fillStyle = '#f5b81d';
    g.strokeStyle = '#0f1620';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, -12);
    g.lineTo(6, 10);
    g.lineTo(0, 4);
    g.lineTo(-6, 10);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();

    if (this.el['mm-label']) this.el['mm-label'].textContent = m.label || '';
  },

  // A 2D brick-figure portrait for the player card — the design system's
  // two-tone body (shirt 46%, dark legs), rounded blocks, classic face.
  drawFace(look) {
    const c = this.el['pc-face'];
    if (!c) return;
    if (look) this._face = look;
    const L = Object.assign({}, DEFAULT_AVATAR, this._face || {});
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    const hex = (n) => `#${(n >>> 0).toString(16).padStart(6, '0')}`;

    const roundRect = (x, y, w, h, rad) => {
      g.beginPath();
      g.moveTo(x + rad, y);
      g.arcTo(x + w, y, x + w, y + h, rad);
      g.arcTo(x + w, y + h, x, y + h, rad);
      g.arcTo(x, y + h, x, y, rad);
      g.arcTo(x, y, x + w, y, rad);
      g.closePath();
    };

    g.clearRect(0, 0, W, H);

    // Warm skin-tone backdrop — matches the design-system player-card placeholder.
    const skin = hex(L.skin);
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, skin);
    grad.addColorStop(1, '#b97a44');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    const bodyW = W * 0.58;
    const bodyH = H * 0.44;
    const bodyX = (W - bodyW) / 2;
    const bodyY = H * 0.48;
    const headS = W * 0.46;
    const headX = (W - headS) / 2;
    const headY = H * 0.14;
    const r = W * 0.09;

    // Torso — shirt over pants at the 46% split.
    roundRect(bodyX, bodyY, bodyW, bodyH, r);
    g.save();
    g.clip();
    g.fillStyle = hex(L.shirt);
    g.fillRect(bodyX, bodyY, bodyW, bodyH * 0.46);
    g.fillStyle = hex(L.pants);
    g.fillRect(bodyX, bodyY + bodyH * 0.46, bodyW, bodyH * 0.54);
    g.restore();

    // Brick lip under the torso.
    g.save();
    roundRect(bodyX, bodyY, bodyW, bodyH, r);
    g.clip();
    g.fillStyle = 'rgba(0,0,0,0.20)';
    g.fillRect(bodyX, bodyY + bodyH - W * 0.05, bodyW, W * 0.05);
    g.restore();

    // Hair block (sits behind the head).
    const hairH = headS * 0.22;
    roundRect(headX, headY - hairH * 0.35, headS, hairH, r * 0.7);
    g.fillStyle = hex(L.hair);
    g.fill();

    // Head.
    roundRect(headX, headY, headS, headS, r);
    g.fillStyle = skin;
    g.fill();

    // Classic 2006 face, scaled to the head block.
    g.fillStyle = '#101010';
    const eye = (cx) => {
      g.beginPath();
      g.ellipse(cx, headY + headS * 0.40, headS * 0.07, headS * 0.11, 0, 0, Math.PI * 2);
      g.fill();
    };
    eye(headX + headS * 0.33);
    eye(headX + headS * 0.67);
    g.strokeStyle = '#101010';
    g.lineWidth = headS * 0.055;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(headX + headS * 0.5, headY + headS * 0.54, headS * 0.20, 0.22 * Math.PI, 0.78 * Math.PI);
    g.stroke();
  },

  chat(who, text, cls = '') {
    const log = this.el['chat-log'];
    if (!log || !text) return;
    const d = document.createElement('div');
    d.className = `chat-line ${cls}`;
    d.innerHTML = `<b>${who}:</b> ${text}`;
    log.appendChild(d);
    while (log.children.length > 5) log.removeChild(log.firstChild);
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 12000);
  },

  setHealth(frac) {
    const f = this.el['health-fill'];
    if (!f) return;
    const v = Math.max(0, Math.min(1, frac));
    f.style.width = `${v * 100}%`;
    f.style.background = v > 0.5 ? '#34b24a' : v > 0.25 ? '#f5b81d' : '#d43a2c';
  },

  showRespawn(msg) {
    if (!this.el.respawn) return;
    this.el.respawn.classList.remove('hidden');
    if (this.el['respawn-msg']) this.el['respawn-msg'].textContent = msg || '';
  },
  setRespawnCount(n) {
    if (this.el['respawn-count']) {
      this.el['respawn-count'].textContent = n > 0 ? `Back in ${n}…` : 'Here we go!';
    }
  },
  hideRespawn() { if (this.el.respawn) this.el.respawn.classList.add('hidden'); },

  toast(title, sub, cls = '') {
    const box = this.el.toasts;
    if (!box) return;
    const d = document.createElement('div');
    d.className = `toast ${cls}`;
    d.innerHTML = `${title}${sub ? `<span class="toast-sub">${sub}</span>` : ''}`;
    box.appendChild(d);
    setTimeout(() => {
      d.style.transition = 'opacity .3s';
      d.style.opacity = '0';
      setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 320);
    }, 4200);
  },

  badge(name, sub) {
    sfx.badge();
    this.setGems(this.hud.gems + 1);
    this.toast(`🏅 Badge earned — ${name}`, sub, 'badge');
  },

  // ----------------------------------------------------------------- shop
  buildShop(coins, owned, currentHat, onBuy, onWear) {
    if (this.el['shop-coins']) this.el['shop-coins'].textContent = String(coins);
    const box = this.el['shop-items'];
    if (!box) return;
    box.innerHTML = '';
    HATS.forEach((h) => {
      const has = h.cost === 0 || owned.includes(h.id);
      const b = document.createElement('button');
      b.className = 'shop-item' + (currentHat === h.id ? ' on' : '') + (has || coins >= h.cost ? '' : ' locked');
      b.innerHTML =
        `<div class="si-swatch" style="background:${HAT_SWATCH[h.id] || '#7a8798'}"></div>` +
        `<div class="si-name">${h.name}</div>` +
        `<div class="si-cost${has ? ' owned' : ''}">${has ? (currentHat === h.id ? 'Wearing' : 'Owned') : `<span class="icon-coin"></span>${h.cost}`}</div>`;
      b.addEventListener('click', () => {
        if (has) { sfx.click(); onWear(h.id); }
        else if (coins >= h.cost) { onBuy(h); }
        else this.toast('Not enough coins', `${h.name} costs ${h.cost}. Keep jumping!`);
      });
      box.appendChild(b);
    });
  },

  showShop() {
    if (this.hooks.onShopOpen) this.hooks.onShopOpen();
    if (this.el.shop) this.el.shop.classList.remove('hidden');
  },
  hideShop() {
    if (this.el.shop) this.el.shop.classList.add('hidden');
    if (this.hooks.onShopClose) this.hooks.onShopClose();
  },
  get shopOpen() { return this.el.shop && !this.el.shop.classList.contains('hidden'); },

  // --------------------------------------------------------------- finish
  // `stats` is a list of {n, label} so the island can report Words, Coins and
  // Districts where the obby reports Stages, Coins and Oofs.
  showFinish({ line, title, stats, words }) {
    this.screen('finish');
    if (this.el['finish-line']) this.el['finish-line'].textContent = line || '';
    if (this.el['finish-title']) this.el['finish-title'].textContent = title || 'Course complete!';

    if (this.el['finish-stats']) {
      this.el['finish-stats'].innerHTML = (stats || [])
        .map((c) => `<div class="fs"><b>${c.n}</b><span>${c.label}</span></div>`)
        .join('');
    }

    const wall = this.el['word-wall'];
    if (wall) {
      wall.innerHTML = '';
      (words || []).forEach((w) => {
        const d = document.createElement('button');
        d.className = 'ww';
        d.innerHTML = `<div class="ww-emoji">${w.emoji || '📘'}</div><div class="ww-word">${w.word}</div>`;
        d.title = w.sentence || '';
        // Tapping a word says it — the revision the fast finishers actually do.
        d.addEventListener('click', () => say(w.sentence ? `${w.word}. ${w.sentence}` : w.word, { force: true }));
        wall.appendChild(d);
      });
    }
  },
};
