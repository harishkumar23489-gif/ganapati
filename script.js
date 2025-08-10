/**
 * app.js — mobile-first dashboard wired to Firebase (Auth + Firestore + Storage)
 * Replace firebaseConfig below with your provided config (I already used your config).
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, where, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";

/* ====== YOUR FIREBASE CONFIG (you gave earlier) ====== */
const firebaseConfig = {
  apiKey: "AIzaSyACYX0sGSNPMFUWnJT8N5f5Tb82gMjqzcc",
  authDomain: "kolur-85c1f.firebaseapp.com",
  projectId: "kolur-85c1f",
  storageBucket: "kolur-85c1f.firebasestorage.app",
  messagingSenderId: "652302989474",
  appId: "1:652302989474:web:1d5a54deb03fce77137ffb"
};
/* ===================================================== */

const SUPER_ADMIN_EMAIL = "harishkumar23489@gmail.com"; // permanent super admin email
const FESTIVAL_DATE = new Date("2025-08-27T00:00:00"); // change if needed

// init firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

/* UI elements */
const splash = document.getElementById('splash');
const authModal = document.getElementById('auth');
const emailIn = document.getElementById('email');
const passIn = document.getElementById('password');
const btnSignIn = document.getElementById('btnSignIn');
const btnSignUp = document.getElementById('btnSignUp');
const btnGoogle = document.getElementById('btnGoogle');
const authMsg = document.getElementById('authMsg');

const avatarSmall = document.getElementById('avatarSmall');
const topName = document.getElementById('topName');
const topRole = document.getElementById('topRole');

const main = document.getElementById('main');
const welcomeMsg = document.getElementById('welcomeMsg');
const progressCanvas = document.getElementById('progress');
const progressPct = document.getElementById('progressPct');
const countdownEl = document.getElementById('countdown');
const nextEvent = document.getElementById('nextEvent');
const eventsList = document.getElementById('eventsList');
const btnRefresh = document.getElementById('btnRefresh');

const btnMenu = document.getElementById('btnMenu');
const menu = document.getElementById('menu');
const panelWrap = document.getElementById('panelWrap');
const panelChat = document.getElementById('panelChat');
const panelCollections = document.getElementById('panelCollections');
const panelSongs = document.getElementById('panelSongs');
const panelEvents = document.getElementById('panelEvents');
const panelGallery = document.getElementById('panelGallery');
const panelAdmin = document.getElementById('panelAdmin');

const chatWindow = document.getElementById('chatWindow');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

const collectionsList = document.getElementById('collectionsList');
const songsList = document.getElementById('songsList');
const eventsPanelList = document.getElementById('eventsPanelList');
const galleryGrid = document.getElementById('galleryGrid');

const btnLogout = document.getElementById('btnLogout');
const btnAdminPanel = document.getElementById('btnAdminPanel');
const btnAddAdmin = document.getElementById('btnPromote');
const promoteEmail = document.getElementById('promoteEmail');
const pendingList = document.getElementById('pendingList');

const galleryFile = document.getElementById('galleryFile');
const songFile = document.getElementById('songFile');
const btnUploadSong = document.getElementById('btnUploadSong');

document.getElementById('year').innerText = new Date().getFullYear();

/* ---------- auth actions ---------- */
btnSignIn.onclick = async () => {
  authMsg.innerText = '';
  const e = emailIn.value.trim(), p = passIn.value;
  if(!e||!p){ authMsg.innerText='Enter email & password'; return; }
  try {
    await signInWithEmailAndPassword(auth, e, p);
  } catch(err){
    authMsg.innerText = err.message;
    console.error(err);
  }
};
btnSignUp.onclick = async () => {
  authMsg.innerText='';
  const e = emailIn.value.trim(), p = passIn.value;
  if(!e||!p){ authMsg.innerText='Enter email & password'; return; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, e, p);
    // user doc will be created in onAuthStateChanged
  } catch(err){ authMsg.innerText = err.message; console.error(err); }
};
btnGoogle.onclick = async () => {
  try { await signInWithPopup(auth, googleProvider); }
  catch(e){ authMsg.innerText = e.message; console.error(e); }
};
btnLogout.onclick = async ()=> { await signOut(auth); };

/* menu toggles */
btnMenu.onclick = ()=> menu.classList.toggle('hidden');
document.querySelectorAll('.back').forEach(b=>b.onclick = ()=>{ panelWrap.classList.add('hidden'); document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden')); });

/* three-dots menu actions */
menu.querySelectorAll('.menu-item').forEach(btn=>{
  btn.onclick = (ev) => {
    const panel = ev.target.getAttribute('data-panel');
    openPanel(panel);
    menu.classList.add('hidden');
  };
});
document.getElementById('btnAdminPanel').onclick = ()=>openPanel('admin');

/* open particular panel */
function openPanel(name){
  panelWrap.classList.remove('hidden');
  document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
  switch(name){
    case 'chat': panelChat.classList.remove('hidden'); break;
    case 'collections': panelCollections.classList.remove('hidden'); break;
    case 'songs': panelSongs.classList.remove('hidden'); break;
    case 'events': panelEvents.classList.remove('hidden'); break;
    case 'gallery': panelGallery.classList.remove('hidden'); break;
    case 'admin': panelAdmin.classList.remove('hidden'); break;
  }
}

/* ---------- auth state & user doc ---------- */
onAuthStateChanged(auth, async user=>{
  if(user){
    // hide auth modal
    authModal.classList.add('hidden');
    splash.style.display = 'none';
    main.classList.remove('hidden');

    // ensure user doc exists and auto-assign superadmin if email matches
    const uRef = doc(db,'users', user.uid);
    const snap = await getDoc(uRef);
    if(!snap.exists()){
      const role = (user.email === SUPER_ADMIN_EMAIL) ? 'superadmin' : 'member';
      await setDoc(uRef, { email: user.email, name: user.displayName||user.email.split('@')[0], role, createdAt: serverTimestamp() });
    } else {
      const data = snap.data();
      if(user.email === SUPER_ADMIN_EMAIL && data.role !== 'superadmin'){
        await updateDoc(uRef, { role: 'superadmin' });
      }
    }
    // update UI
    await refreshUI();
  } else {
    // signed out
    authModal.classList.remove('hidden');
    main.classList.add('hidden');
    menu.classList.add('hidden');
    panelWrap.classList.add('hidden');
    avatarSmall.innerHTML = '';
    topName.innerText = 'Welcome';
    topRole.innerText = 'Sign in to continue';
  }
});

/* ---------- UI refresh ---------- */
async function refreshUI(){
  const user = auth.currentUser;
  if(!user) return;
  // load user doc
  const uDoc = await getDoc(doc(db,'users',user.uid));
  const udata = uDoc.exists() ? uDoc.data() : {};
  topName.innerText = udata.name || user.email;
  topRole.innerText = udata.role || 'member';
  welcomeMsg.innerText = `Welcome, ${udata.name || user.email}`;

  // avatar
  if(udata.photoURL){
    avatarSmall.innerHTML = `<img src="${udata.photoURL}" alt="pf">`;
  } else if(user.photoURL){
    avatarSmall.innerHTML = `<img src="${user.photoURL}" alt="pf">`;
    await updateDoc(doc(db,'users',user.uid), { photoURL: user.photoURL }).catch(()=>{});
  } else {
    avatarSmall.innerHTML = `<img src="images/ganesha.png" alt="ganesha">`;
  }

  // show admin menu buttons if superadmin
  if(udata.role === 'superadmin'){
    document.getElementById('btnAdminPanel').classList.remove('hidden');
    document.getElementById('btnLogout').classList.remove('hidden');
  } else {
    document.getElementById('btnAdminPanel').classList.add('hidden');
    document.getElementById('btnLogout').classList.remove('hidden');
  }

  // load lists
  await loadEventsList();
  await loadCollections();
  await drawProgress();
}

/* ---------- countdown ---------- */
function startCountdown(target){
  function tick(){
    const diff = target - Date.now();
    if(diff<=0){ countdownEl.innerText='Now'; return; }
    const d = Math.floor(diff/86400000);
    const h = Math.floor(diff%86400000/3600000);
    const m = Math.floor(diff%3600000/60000);
    countdownEl.innerText = `${d}d ${h}h ${m}m`;
  }
  tick(); setInterval(tick,60000);
}
startCountdown(FESTIVAL_DATE);

/* ---------- events ---------- */
async function loadEventsList(){
  eventsList.innerHTML = '';
  try {
    const snaps = await getDocs(collection(db,'events'));
    if(snaps.empty){ eventsList.innerHTML = '<div class="muted small">No upcoming events</div>'; return; }
    snaps.forEach(s=>{
      const ev = s.data();
      const div = document.createElement('div'); div.className='item';
      div.innerHTML = `<strong>${ev.title||'Event'}</strong><div class="muted small">${ev.when?.toDate ? ev.when.toDate().toLocaleString() : (ev.when||'')}</div><div class="muted small">${ev.desc||''}</div>`;
      eventsList.appendChild(div);
    });
  } catch(e){ console.error(e); eventsList.innerHTML = '<div class="muted small">Error loading events</div>'; }
}

/* ---------- collections ---------- */
async function loadCollections(){
  collectionsList.innerHTML = '';
  try {
    const snaps = await getDocs(collection(db,'collections'));
    if(snaps.empty){ collectionsList.innerHTML = '<div class="muted small">No collection records</div>'; return; }
    snaps.forEach(s=>{
      const c = s.data();
      const div = document.createElement('div'); div.className='item';
      div.innerHTML = `<div><strong>${c.name||c.email}</strong><div class="muted small">${c.email||''}</div></div><div class="muted small">${c.paid? 'Paid':'Pending'}</div>`;
      collectionsList.appendChild(div);
    });
  } catch(e){ console.error(e); collectionsList.innerHTML = '<div class="muted small">Error</div>'; }
}

/* ---------- songs ---------- */
async function loadSongs(){
  songsList.innerHTML = '';
  try {
    const snaps = await getDocs(collection(db,'songs'));
    if(snaps.empty){ songsList.innerHTML = '<div class="muted small">No songs</div>'; return; }
    snaps.forEach(s=>{
      const x = s.data();
      const div = document.createElement('div'); div.className='item';
      div.innerHTML = `<strong>${x.title||'Song'}</strong><div class="muted small">${x.lang||''}</div>${x.youTube? `<iframe width="100%" height="90" src="${x.youTube}" frameborder="0"></iframe>`:''}`;
      songsList.appendChild(div);
    });
  } catch(e){ console.error(e); songsList.innerHTML = '<div class="muted small">Error</div>'; }
}

/* ---------- gallery ---------- */
galleryFile?.addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const user = auth.currentUser; if(!user) return alert('Sign in first');
  const path = `gallery/${user.uid}/${Date.now()}_${file.name}`;
  const r = ref(storage, path);
  await uploadBytes(r, file);
  const url = await getDownloadURL(r);
  await addDoc(collection(db,'gallery'), { url, uploader: user.email, createdAt: serverTimestamp() });
  showToast('Image uploaded');
  loadGallery();
});
async function loadGallery(){
  galleryGrid.innerHTML = '';
  try {
    const snaps = await getDocs(collection(db,'gallery'));
    if(snaps.empty){ galleryGrid.innerHTML = '<div class="muted small">No images</div>'; return; }
    snaps.forEach(s=>{ const d=s.data(); const img=document.createElement('img'); img.src=d.url; galleryGrid.appendChild(img); });
  } catch(e){ console.error(e); galleryGrid.innerHTML = '<div class="muted small">Error</div>'; }
}

/* ---------- chat ---------- */
chatSend.onclick = async ()=>{
  const txt = chatInput.value.trim(); if(!txt) return;
  const user = auth.currentUser; if(!user) return alert('Sign in first');
  await addDoc(collection(db,'chats'), { text: txt, by: user.email, at: serverTimestamp() });
  chatInput.value = ''; loadChat();
};
async function loadChat(){
  chatWindow.innerHTML = '';
  try {
    const snaps = await getDocs(query(collection(db,'chats'), orderBy('at','asc')));
    snaps.forEach(s=>{ const m=s.data(); const div=document.createElement('div'); div.className='item'; div.innerHTML = `<strong>${m.by}</strong><div class="muted small">${m.text}</div>`; chatWindow.appendChild(div); });
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch(e){ console.error(e); chatWindow.innerHTML = '<div class="muted small">Error</div>'; }
}

/* ---------- admin actions ---------- */
document.getElementById('btnPromote')?.addEventListener('click', async ()=>{
  const email = promoteEmail.value.trim(); if(!email) return alert('Email required');
  // find user doc by email
  try {
    const snaps = await getDocs(collection(db,'users'));
    let found = null;
    snaps.forEach(s=>{ if(s.data().email === email) found = { id: s.id, data: s.data() }; });
    if(found){
      await updateDoc(doc(db,'users',found.id), { role: 'admin' });
      await addDoc(collection(db,'admins'), { email, by: auth.currentUser.email, at: serverTimestamp() });
      showToast('User promoted to admin');
      loadAdminsList();
    } else {
      // create pending admin request
      await addDoc(collection(db,'pending'), { email, requestedAt: serverTimestamp(), by: auth.currentUser?.email||null });
      showToast('Admin request saved. Will be promoted when user signs up');
      loadPending();
    }
  } catch(e){ console.error(e); showToast('Error'); }
});

async function loadPending(){
  pendingList.innerHTML = '';
  const snaps = await getDocs(collection(db,'pending'));
  snaps.forEach(s=>{ const d=s.data(); const div=document.createElement('div'); div.className='item'; div.innerHTML = `<div>${d.email}</div><div class="muted small">Requested</div>`; pendingList.appendChild(div); });
}

/* ---------- helpers ---------- */
async function drawProgress(){
  const ctx = progressCanvas.getContext ? progressCanvas.getContext('2d') : progressCanvas.getContext('2d');
  const c = progressCanvas;
  const center = { x: c.width/2, y: c.height/2 };
  const r = Math.min(c.width,c.height)/2 - 8;
  // compute percent
  try {
    const snaps = await getDocs(collection(db,'collections'));
    const total = snaps.size || 0;
    const paid = snaps.docs.filter(d=>d.data().paid).length;
    const pct = total ? Math.round((paid/total)*100) : 0;
    ctx.clearRect(0,0,c.width,c.height);
    ctx.beginPath(); ctx.arc(center.x, center.y, r, 0, Math.PI*2); ctx.lineWidth=12; ctx.strokeStyle='#ffe7cc'; ctx.stroke();
    ctx.beginPath(); ctx.arc(center.x, center.y, r, -Math.PI/2, -Math.PI/2 + Math.PI*2*(pct/100)); ctx.lineWidth=12; ctx.strokeStyle='#ff9a3b'; ctx.stroke();
    ctx.fillStyle='#6b3a00'; ctx.font='14px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(pct+'%', center.x, center.y);
    progressPct.innerText = pct + '%';
  } catch(e){ console.error(e); }
}

/* ---------- load helpers ---------- */
async function loadEventsPanelList(){
  eventsPanelList.innerHTML = '';
  const snaps = await getDocs(collection(db,'events'));
  snaps.forEach(s=>{ const d=s.data(); const div=document.createElement('div'); div.className='item'; div.innerHTML = `<strong>${d.title}</strong><div class="muted small">${d.when?.toDate? d.when.toDate().toLocaleString() : (d.when||'')}</div>`; eventsPanelList.appendChild(div); });
}
async function loadAdminsList(){
  const el = document.getElementById('adminsList'); if(!el) return;
  el.innerHTML=''; const snaps = await getDocs(collection(db,'admins')); snaps.forEach(s=>{ const d=s.data(); const div=document.createElement('div'); div.className='item'; div.innerText = d.email; el.appendChild(div); });
}

/* load initial lists */
async function loadAll(){
  await loadEventsList(); await loadCollections(); await loadSongs(); await loadGallery(); await loadChat(); await drawProgress();
}
btnRefresh.onclick = ()=> loadAll();

/* quick connectivity test */
window.testWriteRead = async ()=>{
  try {
    const r = await addDoc(collection(db,'testConnection'), { at: serverTimestamp(), by: auth.currentUser?.email||null });
    const snap = await getDoc(r);
    console.log('test write/read ok', snap.id, snap.data());
    alert('Write OK');
  } catch(e){ console.error(e); alert('Test failed: '+e.message); }
};

/* simple toast */
function showToast(msg){ const t=document.createElement('div'); t.className='toast'; t.innerText=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),1600); }

/* initial hide splash */
setTimeout(()=>{ if(splash) splash.style.display='none'; }, 1000);

/* expose some functions for debugging in console */
window.loadAll = loadAll;
window.loadChat = loadChat;
window.loadGallery = loadGallery;
window.loadEventsList = loadEventsList;
window.loadCollections = loadCollections;
window.loadSongs = loadSongs;
window.loadPending = loadPending;
