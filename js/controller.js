// ============================================================================
//  controller.js — the Humanoid. Walking, jumping, landing, dying.
// ============================================================================
//
// This is the file that decides whether the game "feels like Roblox", so it
// uses Roblox's own numbers (see rbx.js) and Roblox's own quirks:
//
//   * acceleration is nearly instant — a Robloxian goes from still to full
//     speed in about a tenth of a second, which is why obbies are precise;
//   * you keep full air control while jumping;
//   * you automatically step up ledges under 2 studs without jumping;
//   * you die from touching lava or falling off the world, never from a fall.
//
// Collision is a swept AABB resolved one axis at a time against PartWorld's
// flat list of solids. Move X, push out. Move Z, push out. Move Y, push out and
// record whether the thing under your feet was ground.

import * as THREE from 'three';
import { GRAVITY, WALKSPEED, JUMPPOWER, HULL, clamp } from './rbx.js';

const STEP_HEIGHT = 2;      // Roblox humanoids climb this much unaided
// Below this you have left the world. It sits just under the lava so a fall to
// either side of the strip still ends the same way, and quickly — a child
// watching themselves drop for four seconds has stopped thinking about English.
const VOID_Y = -30;

export class Humanoid {
  constructor(world, avatar) {
    this.world = world;
    this.avatar = avatar;
    this.pos = new THREE.Vector3(0, 0, 0);      // FEET, centred
    this.vel = new THREE.Vector3(0, 0, 0);
    this.facing = 0;
    this.grounded = false;
    this.groundBox = null;
    this.health = 100;
    this.dead = false;
    this.climbing = false;
    this.walkSpeed = WALKSPEED;
    this.jumpPower = JUMPPOWER;
    this.enabled = true;

    // Callbacks the game fills in.
    this.onLand = null;         // (box) — landed on a solid, first frame only
    this.onTouch = null;        // (trigger)
    this.onDeath = null;        // (cause)
  }

  get head() {
    return new THREE.Vector3(this.pos.x, this.pos.y + 4.65, this.pos.z);
  }

  teleport(x, y, z) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.grounded = false;
    this.groundBox = null;
  }

  hull(pos = this.pos) {
    const hw = HULL.w / 2, hd = HULL.d / 2;
    return {
      x0: pos.x - hw, x1: pos.x + hw,
      y0: pos.y, y1: pos.y + HULL.h,
      z0: pos.z - hd, z1: pos.z + hd,
    };
  }

  overlaps(a, b) {
    return a.x0 < b.x1 && a.x1 > b.x0 &&
           a.y0 < b.y1 && a.y1 > b.y0 &&
           a.z0 < b.z1 && a.z1 > b.z0;
  }

  // ------------------------------------------------------------------ update
  update(dt, input) {
    if (!this.enabled) return;
    if (this.dead) return;

    const solids = this.world.solids;

    // ---- horizontal intent, in world space, from the camera's facing
    let wish = new THREE.Vector3(input.x, 0, input.z);
    if (wish.lengthSq() > 1e-6) wish.normalize();

    const targetVX = wish.x * this.walkSpeed;
    const targetVZ = wish.z * this.walkSpeed;

    // Roblox accelerates hard — about 0.1 s to full speed, in the air too.
    const accel = 1 - Math.pow(0.0001, dt);
    this.vel.x += (targetVX - this.vel.x) * accel;
    this.vel.z += (targetVZ - this.vel.z) * accel;

    // ---- climbing a truss overrides gravity entirely
    if (this.climbing) {
      this.vel.y = input.jump ? this.walkSpeed * 0.55 : (input.crouch ? -this.walkSpeed * 0.55 : 0);
    } else {
      if (input.jump && this.grounded) {
        this.vel.y = this.jumpPower;
        this.grounded = false;
        if (this.onJump) this.onJump();
      }
      this.vel.y -= GRAVITY * dt;
      // Terminal velocity, so a long fall does not tunnel through a platform.
      this.vel.y = Math.max(this.vel.y, -220);
    }

    // ---- move, one axis at a time
    this.moveAxis('x', this.vel.x * dt, solids);
    this.moveAxis('z', this.vel.z * dt, solids);
    const landedOn = this.moveAxis('y', this.vel.y * dt, solids);

    // ---- face the way we are going (Roblox turns the torso to the movement)
    if (wish.lengthSq() > 1e-6) {
      const want = Math.atan2(wish.x, wish.z);
      let d = want - this.facing;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.facing += d * Math.min(1, dt * 14);
    }

    // ---- fell off the edge of everything
    if (this.pos.y < VOID_Y) { this.kill('void'); return; }

    this.checkTriggers();

    if (landedOn && this.onLand) this.onLand(landedOn);
  }

  // Move along one axis and resolve. Returns the box landed on, if any.
  moveAxis(axis, delta, solids) {
    if (delta === 0) return null;
    const before = this.pos[axis];
    this.pos[axis] += delta;
    const h = this.hull();

    let landed = null;
    const wasGrounded = this.grounded;
    if (axis === 'y') this.grounded = false;

    for (let i = 0; i < solids.length; i++) {
      const b = solids[i];
      if (b.dead || !this.overlaps(h, b)) continue;

      if (axis === 'y') {
        if (delta < 0) {
          this.pos.y = b.y1;
          this.vel.y = 0;
          this.grounded = true;
          this.groundBox = b;
          if (!wasGrounded) landed = b;
        } else {
          this.pos.y = b.y0 - HULL.h;
          this.vel.y = 0;
        }
      } else {
        // A ledge under STEP_HEIGHT is walked up rather than bumped into —
        // Roblox does this and an obby is unplayable without it.
        const rise = b.y1 - this.pos.y;
        if (this.grounded && rise > 0 && rise <= STEP_HEIGHT && this.canStandAt(this.pos.x, b.y1, this.pos.z, solids, b)) {
          this.pos.y = b.y1;
        } else {
          this.pos[axis] = before;
          this.vel[axis] = 0;
        }
      }
      // The hull moved; re-read it before testing the next solid.
      Object.assign(h, this.hull());
    }
    return landed;
  }

  // Is there room for the body at this height? Used before a step-up.
  canStandAt(x, y, z, solids, ignore) {
    const h = this.hull(new THREE.Vector3(x, y + 0.05, z));
    for (let i = 0; i < solids.length; i++) {
      const b = solids[i];
      if (b === ignore || b.dead) continue;
      if (this.overlaps(h, b)) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------- triggers
  checkTriggers() {
    const h = this.hull();
    let onTruss = false;

    for (const t of this.world.triggers) {
      if (t.done) continue;
      if (!this.overlaps(h, t)) continue;

      if (t.kind === 'truss') {
        onTruss = true;
        continue;
      }
      if (this.onTouch) this.onTouch(t);
      if (this.dead) return;
    }

    // You cling to a truss only while actually pressed against it.
    this.climbing = onTruss;
    if (onTruss) this.grounded = true;
  }

  // ------------------------------------------------------------------ death
  kill(cause = 'lava') {
    if (this.dead) return;
    this.dead = true;
    this.health = 0;
    this.vel.set(0, 0, 0);
    if (this.onDeath) this.onDeath(cause);
  }

  revive(x, y, z) {
    this.dead = false;
    this.health = 100;
    this.climbing = false;
    this.teleport(x, y, z);
  }

  // Push the rig to wherever the physics ended up.
  syncAvatar(dt, camera) {
    const a = this.avatar;
    if (!a) return;
    a.root.position.copy(this.pos);
    a.root.rotation.y = this.facing;
    const speed = Math.hypot(this.vel.x, this.vel.z);
    a.animate(dt, speed, this.grounded || this.climbing, camera);
    a.setHealth(this.health / 100);
  }
}
