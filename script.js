/* Full front-end app (localStorage)
 - Collections (fixed-per-member) with Paid / Unpaid marking
 - Signup -> pending admin requests (admin requests require approval)
 - Songs (YouTube embed + MP3 local upload)
 - Events feed, Gallery, Chat (mock)
 - Admin & Super Admin consoles
*/

/* ---------- Storage & defaults ---------- */
const KEY = 'ganapathy_full_v2';
const DEFAULT = {
  users: [
    {email:'harishkumar23489@gmail.com',pass:'Harish@123',role:'superadmin',name:'Harish Kumar'},
    {email:'admin@fest.com',pass:'12345',role:'admin',name:'Admin One'},
    {email:'member@fest.com',pass:'12345',role:'member',name:'Member One'}
  ],
  pending: [], // admin requests
  events: [
    {id:1,title:'Ganesh Chaturthi',when:new Date(Date.now()+5*24*3600*1000).toISOString(),desc:'Main celebration',thumb:''}
  ],
  songs: [
    {id:1,title:'Ganesh Aarti (Example YT)',lang:'Kannada',youtube:'https://www.youtube.com/embed/ke3-EXAMPLE',mp3:''}
  ],
  gallery: [],
  collections: [], // {email, expected, paid:boolean, paidAt}
  chats: [],
  notifications: []
};
let APP = loadAPP();
function loadAPP(){ const raw = localStorage.getItem(KEY); if(!raw){ localStorage.setItem(KEY, JSON.stringify(DEFAULT)); return JSON.parse(JSON.stringify(DEFAULT)); } return JSON.parse(raw); }
function saveAPP(){ localStorage.setItem(KEY, JSON.stringify(APP)); }

/* ---------- Auth ---------- */
function setUser(u){ localStorage.setItem('ganapathy_user', JSON.stringify(u)); renderAll(); }
function getUser(){ try{ return JSON.parse(localStorage.getItem('ganapathy_user')); }catch(e){return null} }
function logout(){ localStorage.removeItem('ganapathy_user'); renderAll(); showPage('page-login'); showToast('Logged out'); }

/* ---------- Splash & init ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('year').innerText = new Date().getFullYear();
  setTimeout(()=>{ document.getElementById('splash').style.display='none'; init(); }, 1200);
});

function init(){
  document.getElementById('tabSignIn').onclick = ()=>toggleTab('signin');
  document.getElementById('tabSignUp').onclick = ()=>toggleTab('signup');
  document.getElementById('btnSignIn').onclick = handleSignIn;
  document.getElementById('btnDemoSuper').onclick = ()=>{ document.getElementById('inEmail').value='harishkumar23489@gmail.com'; document.getElementById('inPass').value='Harish@123'; handleSignIn(); };
  document.getElementById('btnSignUp').onclick = handleSignUp;
  document.getElementById('btnClear').onclick = ()=>['suName','suEmail','suPass'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('btnLogout').onclick = logout;

  const gf = document.getElementById('galleryFile'); if(gf) gf.onchange = handleGalleryFiles;
  const sf = document.getElementById('songFile'); if(sf) sf.onchange = handleSongUpload;
  document.querySelectorAll('.langTab').forEach(btn=>btn.onclick = (e)=>{ document.querySelectorAll('.langTab').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); renderSongs(); });

  document.querySelectorAll('.bb-link').forEach(a=>a.onclick = (e)=>{ e.preventDefault(); showPage(a.getAttribute('data-link')); });

  renderAll();
}

/* ---------- Navigation & render ---------- */
const PAGES = Array.from(document.querySelectorAll('.page'));
function showPage(id){
  PAGES.forEach(p=>p.classList.add('hidden'));
  const el = document.getElementById(id);
  if(el) el.classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
  renderAll();
}
function toggleTab(which){
  document.getElementById('signinForm').classList.toggle('hidden', which==='signup');
  document.getElementById('signupForm').classList.toggle('hidden', which==='signin');
  document.getElementById('tabSignIn').classList.toggle('active', which==='signin');
  document.getElementById('tabSignUp').classList.toggle('active', which==='signup');
}
function showToast(msg, t=1800){ const el=document.getElementById('toast'); el.innerText=msg; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'), t); }

function renderAll(){
  renderHeader(); renderNav(); renderDashboard(); renderNotifications(); renderSongs(); renderEvents(); renderGallery(); renderCollections(); renderChat(); renderAdminPanel(); renderSuperAdmin();
  const u = getUser(); document.getElementById('bottomBar').style.display = (u && u.role==='member') ? 'flex' : 'none';
}
function renderHeader(){
  const u = getUser(); const ui = document.getElementById('userInfo'); const btn = document.getElementById('btnLogout');
  if(u){ ui.innerText = `${u.name || u.email} — ${u.role}`; btn.classList.remove('hidden'); } else { ui.innerText='Not signed in'; btn.classList.add('hidden'); }
}
function renderNav(){
  const nav = document.getElementById('topNav'); const u = getUser(); const role = u?u.role:'guest';
  const links = [
    {id:'page-dashboard',text:'Dashboard',show:true},
    {id:'page-events',text:'Events',show:true},
    {id:'page-songs',text:'Songs',show:true},
    {id:'page-gallery',text:'Gallery',show:true},
    {id:'page-collections',text:'Collections',show: role==='admin' || role==='superadmin'},
    {id:'page-chat',text:'Group Chat',show: role!=='guest'},
    {id:'page-admin',text:'Admin Panel',show: role==='admin' || role==='superadmin'},
    {id:'page-superadmin',text:'Super Admin',show: role==='superadmin'}
  ];
  nav.innerHTML = links.filter(l=>l.show).map(l=>`<a href="#" data-link="${l.id}">${l.text}</a>`).join(' ');
  nav.querySelectorAll('a').forEach(a=>a.onclick=(e)=>{ e.preventDefault(); showPage(a.getAttribute('data-link')); });
}

/* ---------- Dashboard ---------- */
function renderDashboard(){
  if(document.getElementById('page-dashboard').classList.contains('hidden')) return;
  const u = getUser();
  document.getElementById('welcomeMsg').innerText = u ? `Welcome, ${u.name || u.email}` : 'Welcome to Ganapathy Festival';
  renderNotifications();

  const total = APP.collections.length || 0;
  const paid = APP.collections.filter(c=>c.paid).length;
  const percent = total ? Math.round((paid/total)*100) : 0;
  drawProgress('collectionProgress', percent);
  document.getElementById('collectionPercent').innerText = `${percent}% paid`;

  if(APP.events.length){
    const next = APP.events.slice().sort((a,b)=> new Date(a.when)-new Date(b.when))[0];
    document.getElementById('nextEvent').innerText = `${next.title} — ${new Date(next.when).toLocaleString()}`;
    startCountdown(new Date(next.when));
  } else { document.getElementById('nextEvent').innerText='No upcoming event'; document.getElementById('countdown').innerText=''; }
}
function drawProgress(id, percent){
  const c = document.getElementById(id); if(!c) return;
  const ctx = c.getContext('2d'); const w=c.width, h=c.height; ctx.clearRect(0,0,w,h);
  const center={x:w/2,y:h/2}; const r=Math.min(w,h)/2-8;
  ctx.beginPath(); ctx.arc(center.x,center.y,r,0,Math.PI*2); ctx.strokeStyle='#ffe7cc'; ctx.lineWidth=14; ctx.stroke();
  ctx.beginPath(); ctx.arc(center.x,center.y,r,-Math.PI/2, -Math.PI/2 + Math.PI*2*(percent/100)); ctx.strokeStyle='#ff9f3b'; ctx.lineWidth=14; ctx.stroke();
  ctx.fillStyle='#6b3a00'; ctx.font='14px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(percent+'%', center.x, center.y);
}

/* ---------- Notifications ---------- */
function renderNotifications(){
  const list = document.getElementById('notifList'); if(!list) return; list.innerHTML='';
  const latest = (APP.notifications||[]).slice().reverse().slice(0,3);
  if(!latest.length) { list.innerHTML = '<div class="muted">No notifications</div>'; return; }
  latest.forEach(n => {
    const node = document.createElement('div'); node.className='list-card'; node.innerHTML = `<div><strong>${n.title}</strong><div class="muted">${new Date(n.at).toLocaleString()}</div></div><div>${n.msg}</div>`;
    list.appendChild(node);
  });
}

/* ---------- Songs ---------- */
function renderSongs(){
  const active = document.querySelector('.langTab.active').getAttribute('data-lang');
  const el = document.getElementById('songsList'); el.innerHTML='';
  APP.songs.filter(s=>s.lang===active).forEach(s=>{
    const node = document.createElement('div'); node.className='list-card';
    node.innerHTML = `<div><strong>${s.title}</strong><div class="muted">${s.lang}</div></div>
                      <div>${s.youtube?`<iframe width="220" height="124" src="${s.youtube}" frameborder="0" allowfullscreen></iframe>`:''}
                      ${s.mp3?`<audio controls src="${s.mp3}"></audio>`:''}</div>`;
    el.appendChild(node);
  });
}
function handleSongUpload(e){
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader(); r.onload = ()=>{ const id = Date.now(); APP.songs.push({id,title:f.name,lang:document.querySelector('.langTab.active').getAttribute('data-lang'),youtube:'',mp3:r.result}); saveAPP(); renderSongs(); showToast('Song uploaded'); }; r.readAsDataURL(f);
}

/* ---------- Events ---------- */
function renderEvents(){
  const el = document.getElementById('eventsList'); if(!el) return; el.innerHTML='';
  APP.events.sort((a,b)=> new Date(a.when)-new Date(b.when)).forEach(ev=>{
    const node = document.createElement('div'); node.className='list-card';
    node.innerHTML = `<div><strong>${ev.title}</strong><div class="muted">${new Date(ev.when).toLocaleString()}</div><div class="muted">${ev.desc||''}</div></div>
                      <div>${ev.thumb?`<img src="${ev.thumb}" style="width:120px;height:70px;object-fit:cover;border-radius:8px"/>`:''}<div><button class="btn" onclick="showToast('Open event (demo)')">Open</button></div></div>`;
    el.appendChild(node);
  });
  const u = getUser(); document.getElementById('eventForm').classList.toggle('hidden', !(u && (u.role==='admin' || u.role==='superadmin')));
}
function addEvent(){
  const t = document.getElementById('evtTitle').value.trim(); const when=document.getElementById('evtWhen').value; const thumb=document.getElementById('evtThumb').value.trim(); const desc=document.getElementById('evtDesc').value.trim();
  if(!t||!when) return showToast('Add title & time');
  APP.events.push({id:Date.now(),title:t,when:new Date(when).toISOString(),desc,thumb});
  saveAPP(); renderEvents(); showToast('Event posted');
}

/* ---------- Gallery ---------- */
function handleGalleryFiles(e){
  const files = Array.from(e.target.files||[]);
  files.forEach(f=>{
    const r=new FileReader(); r.onload=()=>{ APP.gallery.push({src:r.result,name:f.name}); saveAPP(); renderGallery(); showToast('Image added'); }; r.readAsDataURL(f);
  });
}
function renderGallery(){ const el=document.getElementById('galleryGrid'); if(!el) return; el.innerHTML=''; APP.gallery.forEach(i=>{ const d=document.createElement('div'); d.innerHTML=`<img src="${i.src}" style="width:100%;height:120px;object-fit:cover;border-radius:8px"/><div class="muted">${i.name}</div>`; el.appendChild(d); }); }

/* ---------- Collections ---------- */
function renderCollections(){
  const el = document.getElementById('collectionList'); if(!el) return; el.innerHTML='';
  APP.users.filter(u=>u.role==='member').forEach(mem=>{
    if(!APP.collections.find(c=>c.email===mem.email)) APP.collections.push({email:mem.email,expected:0,paid:false,paidAt:null});
  });
  saveAPP();
  APP.collections.forEach(c=>{
    const user = APP.users.find(u=>u.email===c.email) || {name:c.email};
    const node = document.createElement('div'); node.className='list-card';
    const status = c.paid ? `<span style="color:var(--good)">Paid</span>` : `<span style="color:var(--danger)">Pending</span>`;
    node.innerHTML = `<div><strong>${user.name || c.email}</strong><div class="muted">${c.email}</div></div>
                      <div>
                        <div class="muted small">Expected: ${c.expected? 'Set':'—'}</div>
                        <div>${status}</div>
                        ${canManageCollections()? `<div style="margin-top:6px"><button class="btn" onclick="togglePaid('${c.email}')">${c.paid?'Mark Unpaid':'Mark Paid'}</button> <button class="btn ghost" onclick="editExpected('${c.email}')">Edit</button></div>` : '' }
                      </div>`;
    el.appendChild(node);
  });
  document.getElementById('collectionControls').classList.toggle('hidden', !canManageCollections());
}
function canManageCollections(){ const u = getUser(); return u && (u.role==='admin' || u.role==='superadmin'); }
function togglePaid(email){ const c = APP.collections.find(x=>x.email===email); if(!c) return; c.paid = !c.paid; c.paidAt = c.paid ? Date.now() : null; saveAPP(); renderCollections(); renderDashboard(); }
function editExpected(email){ const val = prompt('Enter expected amount for '+email+' (number only)', APP.collections.find(x=>x.email===email).expected || ''); if(val===null) return; const n = Number(val); if(isNaN(n)) return showToast('Invalid number'); APP.collections.find(x=>x.email===email).expected = n; saveAPP(); renderCollections(); showToast('Updated expected amount'); }
function setDefaultAmount(){ const val = Number(document.getElementById('fixedAmount').value || 0); if(!val) return showToast('Enter amount'); APP.collections.forEach(c=>{ if(!c.expected) c.expected = val; }); saveAPP(); renderCollections(); showToast('Default set'); }

/* ---------- Chat (mock local) ---------- */
function renderChat(){ const el = document.getElementById('chatWindow'); if(!el) return; el.innerHTML=''; (APP.chats || []).slice(-200).forEach(m=>{ const node = document.createElement('div'); node.className='list-card'; node.innerHTML = `<div><strong>${m.by}</strong><div class="muted small">${new Date(m.at).toLocaleString()}</div><div>${m.msg}</div></div>`; el.appendChild(node); }); el.scrollTop = el.scrollHeight; }
function sendChat(){ const txt = document.getElementById('chatMsg').value.trim(); if(!txt) return; const u = getUser() || {name:'Guest'}; APP.chats.push({by:u.name || u.email, msg:txt, at:Date.now()}); saveAPP(); document.getElementById('chatMsg').value=''; renderChat(); }

/* ---------- Admin & SuperAdmin ---------- */
function renderAdminPanel(){ const u = getUser(); if(!u || (u.role!=='admin' && u.role!=='superadmin')){ document.getElementById('page-admin').classList.add('hidden'); return; } document.getElementById('page-admin').classList.remove('hidden'); }
function renderSuperAdmin(){ const u = getUser(); if(!u || u.role!=='superadmin'){ document.getElementById('page-superadmin').classList.add('hidden'); return; } document.getElementById('page-superadmin').classList.remove('hidden');
  const pl = document.getElementById('pendingList'); pl.innerHTML=''; APP.pending.forEach(p=>{ const node = document.createElement('div'); node.className='list-card'; node.innerHTML = `<div><strong>${p.name}</strong><div class="muted">${p.email}</div><div class="muted small">Requested: ${new Date(p.requestedAt).toLocaleString()}</div></div><div><button class="btn" onclick='approve("${p.email}")'>Approve</button><button class="btn ghost" onclick='reject("${p.email}")'>Reject</button></div>`; pl.appendChild(node); });
  const ul = document.getElementById('usersList'); ul.innerHTML=''; APP.users.forEach(u2=>{ const node = document.createElement('div'); node.className='list-card'; node.innerHTML = `<div><strong>${u2.name}</strong><div class="muted">${u2.email}</div><div class="muted small">${u2.role}</div></div><div><button class="btn ghost" onclick='revoke("${u2.email}")'>Revoke</button></div>`; ul.appendChild(node); });
}
function approve(email){ const idx = APP.pending.findIndex(p=>p.email===email); if(idx<0) return; const p = APP.pending.splice(idx,1)[0]; APP.users.push({email:p.email, pass:p.pass, role:p.role, name:p.name}); if(p.role === 'member') APP.collections.push({email:p.email, expected:0, paid:false, paidAt:null}); saveAPP(); renderSuperAdmin(); showToast('Approved '+p.email); }
function reject(email){ APP.pending = APP.pending.filter(p=>p.email!==email); saveAPP(); renderSuperAdmin(); showToast('Rejected'); }
function revoke(email){ if(!confirm('Revoke '+email+'?')) return; APP.users = APP.users.filter(u=>u.email!==email); APP.collections = APP.collections.filter(c=>c.email!==email); saveAPP(); renderSuperAdmin(); showToast('Revoked'); }

/* ---------- Sign in / Sign up ---------- */
function handleSignIn(){ const email = document.getElementById('inEmail').value.trim(); const pass = document.getElementById('inPass').value.trim(); if(!email||!pass){ document.getElementById('inMsg').innerText='Enter credentials'; return; } const user = APP.users.find(u=>u.email===email && u.pass===pass); if(user){ setUser({email:user.email,role:user.role,name:user.name}); document.getElementById('inMsg').innerText=''; showPage('page-dashboard'); renderAll(); return; } const p = APP.pending.find(x=>x.email===email && x.pass===pass); if(p){ document.getElementById('inMsg').innerText='Account pending approval by Super Admin.'; return; } document.getElementById('inMsg').innerText='Invalid credentials'; }
function handleSignUp(){ const name = document.getElementById('suName').value.trim(); const email = document.getElementById('suEmail').value.trim(); const pass = document.getElementById('suPass').value.trim(); const roleReq = document.getElementById('suRole').value; if(!name||!email||!pass){ document.getElementById('suMsg').innerText='Fill all fields'; return; } if(APP.users.find(u=>u.email===email) || APP.pending.find(p=>p.email===email)){ document.getElementById('suMsg').innerText='User exists or pending'; return; } if(roleReq === 'admin'){ APP.pending.push({email,name,pass,role:'admin',requestedAt:Date.now()}); saveAPP(); document.getElementById('suMsg').innerText='Admin request sent — awaiting approval'; showToast('Admin request sent'); renderAll(); } else { APP.users.push({email,pass,role:'member',name}); APP.collections.push({email,expected:0,paid:false,paidAt:null}); saveAPP(); document.getElementById('suMsg').innerText='Member created — login now'; showToast('Member created'); renderAll(); } }

/* ---------- Utilities ---------- */
function startCountdown(dt){ clearInterval(window._countdown); const el = document.getElementById('countdown'); function tick(){ const diff = dt - Date.now(); if(diff<=0){ el.innerText='Now'; clearInterval(window._countdown); return; } const d=Math.floor(diff/86400000); const h=Math.floor(diff%86400000/3600000); const m=Math.floor(diff%3600000/60000); el.innerText = `${d}d ${h}h ${m}m`; } tick(); window._countdown = setInterval(tick,60000); }
document.getElementById('year').innerText = new Date().getFullYear();
renderNav(); renderHeader(); renderAll();
if(getUser()) showPage('page-dashboard'); else showPage('page-login');
