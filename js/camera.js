// ============================================================================
//  camera.js — the Roblox third-person camera.
// ============================================================================
//
// Roblox's camera orbits the character's head at a zoom distance, pitch-clamped,
// and pulls in when something solid gets between it and you. Scrolling all the
// way in drops you into first person. All of that is here.
//
// Mouse look uses pointer lock, which is Roblox's shift-lock: it is by far the
// kindest option for a child on a school trackpad, who cannot hold right-drag
// and steer at the same time.

import * as THREE from 'three';
import { clamp, lerp } from './rbx.js';

export const ZOOM_MIN = 0.5;      // below ~1 stud Roblox goes first person
export const ZOOM_MAX = 40;
export const ZOOM_DEFAULT = 14;

export class OrbitCamera {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.yaw = 0;
    this.pitch = -0.18;
    this.zoom = ZOOM_DEFAULT;
    this.targetZoom = ZOOM_DEFAULT;
    this.sensitivity = 0.0026;
    this.locked = false;
    this.target = new THREE.Vector3();
    this.smoothed = new THREE.Vector3();
    this.hasSmoothed = false;
    this._bind();
  }

  get firstPerson() { return this.zoom <= 1.2; }

  _bind() {
    this._onMove = (e) => {
      if (!this.locked && !this._dragging) return;
      this.yaw -= e.movementX * this.sensitivity;
      // Roblox clamps just short of straight up and straight down.
      this.pitch = clamp(this.pitch - e.movementY * this.sensitivity, -1.35, 1.30);
    };
    document.addEventListener('mousemove', this._onMove);

    // Right-drag rotates too, for anyone who does not want the pointer captured.
    this.dom.addEventListener('mousedown', (e) => { if (e.button === 2) this._dragging = true; });
    window.addEventListener('mouseup', (e) => { if (e.button === 2) this._dragging = false; });
    this.dom.addEventListener('contextmenu', (e) => e.preventDefault());

    this.dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetZoom = clamp(this.targetZoom + Math.sign(e.deltaY) * 1.6, ZOOM_MIN, ZOOM_MAX);
    }, { passive: false });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      if (this.onLockChange) this.onLockChange(this.locked);
    });

    // Touch: one finger drags the camera. Enough to play on a school tablet.
    let lastTouch = null;
    this.dom.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    this.dom.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 1 || !lastTouch) return;
      const t = e.touches[0];
      this.yaw -= (t.clientX - lastTouch.x) * 0.006;
      this.pitch = clamp(this.pitch - (t.clientY - lastTouch.y) * 0.006, -1.35, 1.30);
      lastTouch = { x: t.clientX, y: t.clientY };
    }, { passive: true });
    this.dom.addEventListener('touchend', () => { lastTouch = null; });
  }

  // Pointer lock is refused in plenty of ordinary situations — the document is
  // not focused, the browser is mid-gesture, an automation harness owns the
  // page. Every one of those rejects the promise, and an unhandled rejection is
  // not a reason for the console to fill with red.
  requestLock() {
    if (!this.dom.requestPointerLock) return;
    try {
      const r = this.dom.requestPointerLock();
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch (e) { /* not available here */ }
  }

  releaseLock() {
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch (e) { /* ignore */ }
  }

  // The direction the character should walk when W is pressed: camera forward,
  // flattened onto the ground.
  forward(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  right(out = new THREE.Vector3()) {
    return out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  // `head` is the point to orbit — the character's head, not its feet.
  update(dt, head, solids) {
    this.zoom = lerp(this.zoom, this.targetZoom, 1 - Math.pow(0.001, dt));

    // Follow the head with a touch of lag, so a landing does not snap the view.
    if (!this.hasSmoothed) { this.smoothed.copy(head); this.hasSmoothed = true; }
    else this.smoothed.lerp(head, 1 - Math.pow(0.0001, dt));
    this.target.copy(this.smoothed);

    if (this.firstPerson) {
      this.camera.position.copy(head);
      this.camera.rotation.set(0, 0, 0);
      this.camera.rotateY(this.yaw);
      this.camera.rotateX(this.pitch);
      return;
    }

    const cp = Math.cos(this.pitch);
    const dir = new THREE.Vector3(
      Math.sin(this.yaw) * cp,
      -Math.sin(this.pitch),
      Math.cos(this.yaw) * cp,
    );

    // Roblox pulls the camera in rather than letting it clip through a wall.
    let dist = this.zoom;
    if (solids && solids.length) dist = Math.min(dist, this._castBack(this.target, dir, this.zoom, solids));

    this.camera.position.copy(this.target).addScaledVector(dir, dist);
    this.camera.lookAt(this.target);
  }

  // Walk the ray back from the head in short steps and stop at the first solid.
  // A sampled march is plenty here: the camera moves a few studs a frame and an
  // obby has tens of parts, not thousands.
  _castBack(origin, dir, maxDist, solids) {
    const step = 0.7;
    const pad = 0.6;
    for (let d = step; d <= maxDist; d += step) {
      const x = origin.x + dir.x * d;
      const y = origin.y + dir.y * d;
      const z = origin.z + dir.z * d;
      for (let i = 0; i < solids.length; i++) {
        const b = solids[i];
        if (x > b.x0 - pad && x < b.x1 + pad &&
            y > b.y0 - pad && y < b.y1 + pad &&
            z > b.z0 - pad && z < b.z1 + pad) {
          return Math.max(1.6, d - step);
        }
      }
    }
    return maxDist;
  }

  reset() {
    this.pitch = -0.18;
    this.targetZoom = ZOOM_DEFAULT;
    this.hasSmoothed = false;
  }
}
