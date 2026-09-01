// ============================================================================
//  cloud.js — pupil name and game progress in Firebase (anonymous auth).
//  Fails silently when offline; localStorage remains the fast fallback.
// ============================================================================

const FB_CONFIG = {
  apiKey: 'AIzaSyBsrc4c_nfH5ebS_EO73QlkveDXKw4X-II',
  authDomain: 'blockwords-moe.firebaseapp.com',
  projectId: 'blockwords-moe',
  storageBucket: 'blockwords-moe.firebasestorage.app',
  messagingSenderId: '825558826969',
  appId: '1:825558826969:web:3223e2422ce2280951e3c8',
};

const FB_VERSION = '10.12.5';
const SAVE_DEBOUNCE_MS = 1500;

let fbDb = null;
let fbApi = null;
let cloudReady = false;
let cloudSaveTimer = null;

function snapshotFromState(state) {
  return {
    mode: state.mode,
    yearId: state.yearId,
    packId: state.packId,
    look: state.look,
    name: state.name,
    coins: state.coins,
    owned: state.owned,
    badges: state.badges,
    best: state.best,
    found: state.found,
  };
}

export async function initCloud() {
  if (cloudReady) return true;
  try {
    const appMod = await import(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-app.js`);
    const dbMod = await import(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-firestore.js`);

    appMod.initializeApp(FB_CONFIG);
    fbDb = dbMod.getFirestore();
    fbApi = dbMod;

    cloudReady = true;
    return true;
  } catch (e) {
    console.warn('[BrickWords] cloud save unavailable:', e.message || e);
    return false;
  }
}

function playerIdFromName(name) {
  const s = (name || 'player').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 16);
  return s || 'player';
}

export async function cloudPull(name) {
  if (!cloudReady) return null;
  const playerId = playerIdFromName(name);
  try {
    const ref = fbApi.doc(fbDb, 'players', playerId);
    const snap = await fbApi.getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return data.save || null;
  } catch (e) {
    console.warn('[BrickWords] cloud load failed:', e.message || e);
    return null;
  }
}

export function scheduleCloudSave(state) {
  if (!cloudReady) return;
  const payload = snapshotFromState(state);
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    cloudSaveTimer = null;
    flushCloudSave(payload, state.name);
  }, SAVE_DEBOUNCE_MS);
}

export async function flushCloudSave(payload, name) {
  if (!cloudReady) return;
  const playerId = playerIdFromName(name || payload.name);
  try {
    const ref = fbApi.doc(fbDb, 'players', playerId);
    await fbApi.setDoc(ref, {
      name: name || payload.name || 'Player',
      save: payload,
      updatedAt: fbApi.serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.warn('[BrickWords] cloud save failed:', e.message || e);
  }
}

export function cloudEnabled() {
  return cloudReady;
}
