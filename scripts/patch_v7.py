import re
P='/home/claude/v4/src/app.js'; s=open(P).read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)>=1, ('MISSING', old[:80])
    s=s.replace(old,new,cnt)

# ---------- A) konteks lokasi ----------
rep("const SUARA = buatSuara({", r'''// ---- v7: konteks lokasi untuk lanskap suara (dipakai mode dengar kamera maupun titik) ----
const MRT_ST = D.transit.filter((t) => t.jenis === 'MRT').map((t) => t.m);
const TERM_P = V4.terminal, TERM_C = [avg(TERM_P.map((p) => p[0])), avg(TERM_P.map((p) => p[1]))];
const titikRuas = (kelas) => { const o = []; O.seg.forEach((g) => { if (!kelas.includes(g.c)) return; for (let k = 0; k + 3 < g.p.length; k += 2) { const ax = g.p[k], az = g.p[k + 1], bx = g.p[k + 2], bz = g.p[k + 3], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 12)); for (let i = 0; i < n; i++) o.push([ax + (bx - ax) * i / n, az + (bz - az) * i / n, g.c, g.n]); } }); return o; };
const PT_ARTERI = titikRuas([0, 1]), PT_JALAN = titikRuas([0, 1, 2, 3, 4, 5]);
const POI_KULINER = D.poi.filter((p) => KAT[p[2]] === 'kuliner');
const SPOT_HIJAU = V4.spot.filter((s) => s.j === 'taman' || s.j === 'plaza');
const LTOKYO = V4.spot.find((s) => /Little Tokyo/.test(s.n));
const namaJalan = (n) => n && !/^(nan|None)$/.test(n) ? n.replace(/^Jalan /, 'Jl. ') : '';
function terdekat(arr, x, z, f = (a) => a) { let b = null, bd = 1e18; for (const a of arr) { const q = f(a), d = (q[0] - x) ** 2 + (q[1] - z) ** 2; if (d < bd) { bd = d; b = a; } } return [b, Math.sqrt(bd)]; }
function konteksSuara(x, z) {
  const [pa, da] = terdekat(PT_ARTERI, x, z), arteri = pa ? clamp(1 - da / 110) * (pa[2] === 0 ? 1 : .7) : 0;
  const diTerm = dalamPoligon(x, z, TERM_P), terminal = diTerm ? 1 : clamp(1 - (Math.hypot(x - TERM_C[0], z - TERM_C[1]) - 45) / 130);
  const [pm, dm] = terdekat(MRT_ST, x, z), mrt = clamp(1 - (dm - 20) / 150);
  let nk = 0, pk = null, dk = 1e9; for (const p of POI_KULINER) { const d = Math.hypot(p[0] - x, p[1] - z); if (d < 70) nk++; if (d < dk) { dk = d; pk = p; } }
  const dLT = LTOKYO ? Math.hypot(LTOKYO.c[0] - x, LTOKYO.c[1] - z) : 1e9, kuliner = Math.max(clamp(nk / 10), clamp(1 - dLT / 170) * .9);
  const [pt, dt] = terdekat(SPOT_HIJAU, x, z, (q) => q.c), taman = pt ? clamp(1 - (dt - pt.r * .7) / 70) * (pt.j === 'taman' ? 1 : .55) : 0;
  const w = { terminal, mrt, kuliner, arteri, taman, lokal: clamp(1 - Math.max(arteri, terminal, mrt, kuliner, taman)) };
  const h = S.jam % 24, ramai = (S.orang ? 1 : 0) * clamp(totalJam(Math.floor(h)) / tjPuncak * (.22 + .9 * kuliner + .7 * terminal + .6 * mrt + .3 * taman));
  const i = cellOf(x, z), db = i >= 0 ? val.bising(i) : NaN, [pj] = terdekat(PT_JALAN, x, z), jl = pj ? namaJalan(pj[3]) : '';
  const kunci = Object.entries(w).sort((a, b) => b[1] - a[1])[0][0];
  const nama = kunci === 'terminal' ? 'Terminal Bus Blok M' : kunci === 'mrt' ? 'Sekitar ' + (D.transit.find((t) => t.m === pm) || { nama: 'stasiun MRT' }).nama
    : kunci === 'kuliner' ? (dLT < 170 ? 'Koridor kuliner Melawai · Little Tokyo' : 'Kawasan kuliner' + (jl ? ' · ' + jl : ''))
    : kunci === 'taman' ? (pt.n && pt.n !== 'nan' ? pt.n : pt.j === 'taman' ? 'Taman kota' : 'Plaza publik')
    : kunci === 'arteri' ? 'Tepi ' + (namaJalan(pa[3]) || 'jalan arteri') : 'Jalan lingkungan' + (jl ? ' · ' + jl : '');
  return { w, ramai, db, nama, kunci, pArteri: pa ? [pa[0], pa[1]] : null, pKafe: pk && dk < 120 ? [pk[0], pk[1]] : null, pTerminal: TERM_C, pMRT: pm };
}
function lapisanTeks(K) {
  const L = [], h = S.jam % 24, siang = h > 5.3 && h < 18.6;
  if (K.w.terminal > .3) L.push('mesin bus, rem angin, pengumuman'); if (K.w.mrt > .3) L.push('kereta, lonceng & pintu');
  if (K.w.kuliner > .3) L.push(h >= 10 && h < 23.5 ? 'obrolan, musik kafe' : 'kafe sudah tutup'); if (K.w.arteri > .3) L.push('arus kendaraan, klakson');
  if (K.w.taman > .3) L.push(siang ? 'kicau burung, gemerisik daun' : 'daun, malam tenang'); if (!L.length) L.push('langkah kaki, kendaraan sesekali');
  return L.join(' · ');
}
const SUARA = buatSuara({''')

rep("  halteTJ: () => HALTE_TJ, riak,\n});", """  halteTJ: () => HALTE_TJ, riak,
  kendaraan: () => { const o = [], k = sibuk(S.jam % 24); for (const j of ['mobil', 'motor']) for (const v of KEND[j].list) if (v.aktif && v.x != null) o.push({ x: v.x, z: v.z, j, v: v.v * k }); return o; },
  konteks: konteksSuara,
});""")

# ---------- B) pin titik dengar + panel dengar ----------
rep("function ikonSuara() {", r'''// ---- v7: titik dengar pilihan pengguna ----
const PIN = (() => {
  const g = new THREE.Group(), warna = '#7C5CFF', mat = new THREE.MeshBasicMaterial({ color: warna, toneMapped: false });
  const tiang = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 13, 10), mat); tiang.position.y = 6.5;
  const bola = new THREE.Mesh(new THREE.SphereGeometry(3, 20, 14), mat); bola.position.y = 15;
  const inti = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })); inti.position.y = 15;
  const gel = [0, 1, 2].map((k) => { const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 56), new THREE.MeshBasicMaterial({ color: warna, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.y = .7; m.renderOrder = 5; m.userData.f = k / 3; g.add(m); return m; });
  g.add(tiang, bola, inti); g.visible = false; scene.add(g); return { g, gel, kepala: [bola, inti, tiang] };
})();
function langkahPin(dt) {
  if (!PIN.g.visible) return; const s = clamp(cc.distance / 420, .7, 3.2); PIN.kepala.forEach((m) => m.scale.setScalar(s)); PIN.kepala[0].position.y = PIN.kepala[1].position.y = 15 * s; PIN.kepala[2].position.y = 6.5 * s;
  for (const m of PIN.gel) { m.userData.f = (m.userData.f + dt * .45) % 1; const u = m.userData.f, r = (8 + 70 * u) * Math.min(s, 1.6); m.scale.set(r, r, r); m.material.opacity = .55 * (1 - u); }
}
const DENGAR = { memilih: false };
function setModeDengar(m) {
  SUARA.nyalakan(); if (!S.suara3d) setSuara3d(true); S.dengar = m;
  if (m === 'titik') { if (SUARA.st.titik) { SUARA.setMode('titik'); PIN.g.visible = true; } else mulaiPilihTitik(); }
  else { SUARA.setMode('kamera'); DENGAR.memilih = false; canvas.style.cursor = ''; PIN.g.visible = false; }
  renderDengar(true);
}
function mulaiPilihTitik() { SUARA.nyalakan(); if (!S.suara3d) setSuara3d(true); DENGAR.memilih = true; canvas.style.cursor = 'crosshair'; toast('Klik atau ketuk peta untuk menaruh titik dengar 🎧'); renderDengar(true); }
function taruhTitik(x, z) {
  DENGAR.memilih = false; canvas.style.cursor = ''; SUARA.setTitik(x, z); SUARA.setMode('titik'); S.dengar = 'titik';
  PIN.g.position.set(x, 0, z); PIN.g.visible = true; riak(x, z); renderDengar(true);
}
function pandangDariTitik() {
  const t = SUARA.st.titik; if (!t) return; const C = camera.position; let dx = t.x - C.x, dz = t.z - C.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  cerita.stop(); cc.setLookAt(t.x - dx * 30, 22, t.z - dz * 30, t.x + dx * 70, 5, t.z + dz * 70, true);
}
let dengarSig = '';
function renderDengar(paksa = false) {
  const el = $('#dengar'); if (!el) return;
  const tampil = (S.suara3d || DENGAR.memilih) && !cerita.aktif; el.hidden = !tampil; if (!tampil) { dengarSig = ''; return; }
  const titik = S.dengar === 'titik' && SUARA.st.titik, K = SUARA.st.konteks || (titik ? konteksSuara(SUARA.st.titik.x, SUARA.st.titik.z) : null);
  const SUAS = { ramai: 'ramai', sedang: 'sedang', sepi: 'sepi' };
  let h;
  if (DENGAR.memilih) h = `<i class="dg-ikon pilih">🎧</i><div class="dg-teks"><b>Pilih titik dengar</b><small>Klik atau ketuk lokasi mana pun di peta</small></div><button class="btn" data-dg="batal" type="button">Batal</button>`;
  else if (titik && K) h = `<i class="dg-ikon">🎧</i><div class="dg-teks"><b>${K.nama}</b><small>${lapisanTeks(K)} · ${isFinite(K.db) ? '≈' + Math.round(K.db) + ' dB(A) · ' : ''}${SUAS[SUARA.st.suasana]}</small></div><button class="btn" data-dg="lihat" type="button" title="Pandang dari titik ini">Lihat</button><button class="btn" data-dg="pindah" type="button" title="Pindahkan titik dengar">Pindah</button><button class="btn" data-dg="kamera" type="button" title="Kembali dengar dari kamera" aria-label="Dengar dari kamera">✕</button>`;
  else h = `<i class="dg-ikon kam">🎥</i><div class="dg-teks"><b>Dengar dari kamera${K && cc.distance < 840 ? ' · ' + K.nama : ''}</b><small>${K && cc.distance < 840 ? lapisanTeks(K) : 'mendekatlah untuk mendengar suasana lokasi'}</small></div><button class="btn primer" data-dg="pilih" type="button">Pilih titik</button>`;
  if (!paksa && h === dengarSig) return; dengarSig = h; el.innerHTML = h;
  el.querySelectorAll('[data-dg]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); const a = b.dataset.dg;
    if (a === 'pilih' || a === 'pindah') mulaiPilihTitik(); else if (a === 'batal') { DENGAR.memilih = false; canvas.style.cursor = ''; renderDengar(true); } else if (a === 'kamera') setModeDengar('kamera'); else if (a === 'lihat') pandangDariTitik(); });
}
setInterval(() => renderDengar(), 700);
function ikonSuara() {''')
rep("function setSuara3d(on) { S.suara3d = on; SUARA.suara3d(on); ikonSuara(); }",
    "function setSuara3d(on) { S.suara3d = on; SUARA.suara3d(on); ikonSuara(); if (!on) { DENGAR.memilih = false; canvas.style.cursor = ''; } renderDengar(true); }")

# klik peta untuk menaruh titik
rep("function klik(e) {\n  setRay(e); const hb = ray.intersectObject(bMesh, false)[0];",
    "function klik(e) {\n  setRay(e); if (DENGAR.memilih) { if (ray.ray.intersectPlane(planeY, hitP)) taruhTitik(hitP.x, hitP.z); return; }\n  const hb = ray.intersectObject(bMesh, false)[0];")
rep("SUARA.update(dt); langkahRiak(dt);", "SUARA.update(dt); langkahRiak(dt); langkahPin(dt);")

# ---------- C) menu suara ----------
rep("""    { t: 'Suara 3D', sub: 'keramaian, klakson, bus, kereta', saklar: () => S.suara3d, aksi: () => setSuara3d(!S.suara3d) },""",
"""    { t: 'Suara 3D', sub: 'keramaian, klakson, bus, kereta, alam', saklar: () => S.suara3d, aksi: () => setSuara3d(!S.suara3d) },
    { label: 'Dengar dari' },
    { t: 'Kamera', sub: 'suasana mengikuti tempat yang sedang dilihat', radio: () => S.dengar !== 'titik', aksi: () => setModeDengar('kamera') },
    { t: 'Titik pilihan', sub: SUARA.st.titik ? 'telinga setinggi pejalan di titik yang dipilih' : 'klik peta untuk menaruh titik dengar', radio: () => S.dengar === 'titik', aksi: () => { tutupMenu(); setModeDengar('titik'); } },
    ...(SUARA.st.titik ? [{ t: 'Pindahkan titik dengar', sub: 'klik lokasi baru di peta', aksi: () => { tutupMenu(); mulaiPilihTitik(); } }, { t: 'Pandang dari titik dengar', sub: 'kamera mendekat ke titik', aksi: () => { tutupMenu(); pandangDariTitik(); } }] : []),
    { label: 'Lainnya' },""")
rep("""['kereta', 'Kereta MRT', 'roda, motor, lonceng stasiun']]""", """['kereta', 'Kereta MRT', 'roda, motor, lonceng, pintu'], ['alam', 'Alam', 'kicau burung, gemerisik daun di taman']]""")
rep("""{ t: 'Narasi tur', sub: SUARA.tersediaNarasi() ? 'suara: ' + SUARA.namaSuara() : 'suara Bahasa Indonesia belum tersedia di peramban ini',""",
    """{ t: 'Narasi tur', sub: 'pemandu tur (rekaman ElevenLabs)' + (SUARA.tersediaNarasi() ? ', cadangan: ' + SUARA.namaSuara() : ''),""")

open(P,'w').write(s); print('ok A-C')
