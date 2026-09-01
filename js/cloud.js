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

let fbAuth = null;
let fbDb = null;
let fbApi = null;
let cloudUid = null;
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

async function initCloud() {
  if (cloudReady) return true;
  try {
    const appMod = await import(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-app.js`);
    const authMod = await import(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-auth.js`);
    const dbMod = await import(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-firestore.js`);

    const app = appMod.initializeApp(FB_CONFIG);
    fbAuth = authMod.getAuth(app);
    fbDb = dbMod.getFirestore(app);
    fbApi = { ...authMod, ...dbMod };

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, 8000);
      fbApi.onAuthStateChanged(fbAuth, (user) => {
        if (!user) return;
        cloudUid = user.uid;
        clearTimeout(timeout);
        resolve();
      }, reject);
      fbApi.signInAnonymously(fbAuth).catch(reject);
    });

    cloudReady = !!cloudUid;
    return cloudReady;
  } catch (e) {
    console.warn('[BrickWords] cloud save unavailable:', e.message || e);
    return false;
  }
}

async function cloudPull() {
  if (!cloudReady || !cloudUid) return null;
  try {
    const ref = fbApi.doc(fbDb, 'players', cloudUid);
    const snap = await fbApi.getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return data.save || null;
  } catch (e) {
    console.warn('[BrickWords] cloud load failed:', e.message || e);
    return null;
  }
}

function scheduleCloudSave(state) {
  if (!cloudReady || !cloudUid) return;
  const payload = snapshotFromState(state);
  if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    cloudSaveTimer = null;
    flushCloudSave(payload, state.name);
  }, SAVE_DEBOUNCE_MS);
}

async function flushCloudSave(payload, name) {
  if (!cloudReady || !cloudUid) return;
  try {
    const ref = fbApi.doc(fbDb, 'players', cloudUid);
    await fbApi.setDoc(ref, {
      name: name || payload.name || 'Player',
      save: payload,
      updatedAt: fbApi.serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.warn('[BrickWords] cloud save failed:', e.message || e);
  }
}

function cloudEnabled() {
  return cloudReady;
}
