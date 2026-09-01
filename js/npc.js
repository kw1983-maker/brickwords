// ============================================================================
//  npc.js — the guide, and the Roblox chat bubble over its head.
// ============================================================================
//
// Years 1 and 2 are guided by one of the Super Friends from the Super Minds
// books (Whisper, Misty); Year 4 by a builder. The guide is a full R6 avatar
// standing in the lobby, and everything it says appears in the white rounded
// bubble Roblox puts over a player's head — and is spoken aloud at the same
// time, because a Year 1 pupil cannot read it.

import * as THREE from 'three';
import { bc } from './rbx.js';
import { canvasTexture, decalPlane, UI_FONT } from './parts.js';
import { Avatar } from './avatar.js';
import { say } from './speech.js';

const BUBBLE_W = 1024;
const BUBBLE_LINE = 54;

// Draw the bubble: a white rounded rectangle with a little tail underneath.
function bubbleTexture(text) {
  // Work out the wrapping first so the canvas is only as tall as it needs.
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `600 ${BUBBLE_LINE}px ${UI_FONT}`;
  const maxW = BUBBLE_W - 120;
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (probe.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);

  const padY = 46;
  const tail = 42;
  const bodyH = lines.length * (BUBBLE_LINE * 1.28) + padY * 2;
  const H = bodyH + tail;

  const tex = canvasTexture(BUBBLE_W, H, (g, w) => {
    g.clearRect(0, 0, w, H);
    const r = 42;

    g.fillStyle = 'rgba(255,255,255,0.97)';
    g.strokeStyle = 'rgba(15,22,32,0.12)';
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(r, 0);
    g.arcTo(w, 0, w, bodyH, r);
    g.arcTo(w, bodyH, 0, bodyH, r);
    g.arcTo(0, bodyH, 0, 0, r);
    g.arcTo(0, 0, w, 0, r);
    g.closePath();
    g.fill();
    g.stroke();

    // The tail.
    g.beginPath();
    g.moveTo(w / 2 - 34, bodyH - 4);
    g.lineTo(w / 2, bodyH + tail);
    g.lineTo(w / 2 + 34, bodyH - 4);
    g.closePath();
    g.fillStyle = 'rgba(255,255,255,0.97)';
    g.fill();

    g.fillStyle = '#14202d';
    g.font = `800 ${BUBBLE_LINE}px ${UI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    lines.forEach((l, i) => {
      g.fillText(l, w / 2, padY + BUBBLE_LINE * 0.64 + i * BUBBLE_LINE * 1.28);
    });
  });

  return { tex, aspect: H / BUBBLE_W, lines: lines.length };
}

export class Guide {
  constructor(scene, year, x, y, z) {
    this.scene = scene;
    this.year = year;
    const g = year.guide || {};

    this.avatar = new Avatar(
      { shirt: bc(g.shirt || 'Bright blue'), pants: bc(g.pants || 'Dark stone grey') },
      { name: g.name || 'Guide', npc: true },
    );
    this.avatar.root.position.set(x, y, z);
    this.avatar.root.rotation.y = Math.PI;      // face back down the course
    scene.add(this.avatar.root);

    this.bubble = null;
    this.bubbleTimer = 0;
    this.t = 0;
    this.home = new THREE.Vector3(x, y, z);
  }

  // Say a line: bubble over the head, and out loud.
  chat(text, opts = {}) {
    if (!text) return;
    this.clearBubble();

    const { tex, aspect } = bubbleTexture(text);
    const width = 11;
    const mesh = decalPlane(tex, width, width * aspect, { side: THREE.DoubleSide, depthWrite: false });
    mesh.material.depthTest = false;
    mesh.renderOrder = 30;
    // The bubble lives in the scene rather than on the rig. Parented to a rig
    // that turns to face the player, it would need the rig's yaw undone every
    // frame; in world space it just copies the camera and is always readable.
    this.bubbleLift = 8.2 + (width * aspect) / 2;
    this.scene.add(mesh);
    this.bubble = mesh;
    // Roblox holds a bubble roughly as long as it takes to read it.
    this.bubbleTimer = opts.hold || Math.max(3.5, text.length * 0.075);

    if (opts.speak !== false) say(text, { force: true });
  }

  clearBubble() {
    if (!this.bubble) return;
    this.scene.remove(this.bubble);
    if (this.bubble.geometry) this.bubble.geometry.dispose();
    this.bubble = null;
  }

  update(dt, camera, playerPos) {
    this.t += dt;
    this.avatar.animate(dt, 0, true, camera);

    // A small idle bob, so the guide does not look like a statue.
    this.avatar.root.position.y = this.home.y + Math.sin(this.t * 1.6) * 0.08;

    // Turn to watch the player when they are close, the way a Roblox NPC does.
    if (playerPos) {
      const dx = playerPos.x - this.home.x;
      const dz = playerPos.z - this.home.z;
      if (dx * dx + dz * dz < 900) {
        const want = Math.atan2(dx, dz);
        let d = want - this.avatar.root.rotation.y;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.avatar.root.rotation.y += d * Math.min(1, dt * 3);
      }
    }

    if (this.bubble) {
      const p = this.avatar.root.position;
      this.bubble.position.set(p.x, p.y + this.bubbleLift, p.z);
      this.bubble.quaternion.copy(camera.quaternion);
      this.bubbleTimer -= dt;
      if (this.bubbleTimer <= 0) this.clearBubble();
    }
  }

  dispose() {
    this.clearBubble();
    this.scene.remove(this.avatar.root);
  }
}
