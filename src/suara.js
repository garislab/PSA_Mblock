// Suara 3D imersif, musik latar generatif, dan narasi tur (Web Audio API + Web Speech API + file narasi ElevenLabs).
// Efek lingkungan disintesis di peramban (bebas hak cipta). Pendengar bisa di kamera atau di titik pilihan pengguna;
// lapisan suara menyesuaikan konteks lokasi (terminal, stasiun MRT, koridor kuliner, tepi arteri, taman, jalan lingkungan).
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const acak = (a, b) => a + Math.random() * (b - a);

export function buatSuara(api) {
  let ctx = null, master, sfx, musikG, komp, siap = false, rev, kirimRev;
  const st = { suara3d: false, musik: false, narasi: true, vol: .75, kat: { orang: true, kendaraan: true, bus: true, kereta: true, alam: true }, suasana: 'sepi', bicara: false, mode: 'kamera', titik: null, konteks: null };
  const B = {};            // buffer hasil sintesis
  const pan = [];          // semua panner (untuk penyesuaian jarak acuan)
  let hrtf = !api.lite;

  // ---------------- sintesis buffer ----------------
  const SR = 22050;
  function buf(dur, isi) { const b = ctx.createBuffer(1, Math.floor(SR * dur), SR); isi(b.getChannelData(0)); return b; }
  function resonator(f, bw) { const r = Math.exp(-Math.PI * bw / SR), a1 = 2 * r * Math.cos(2 * Math.PI * f / SR), a2 = -r * r; let y1 = 0, y2 = 0; return (x) => { const y = x * (1 - r) + a1 * y1 + a2 * y2; y2 = y1; y1 = y; return y; }; }
  function normal(d, puncak = .6) { let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); const k = puncak / (m || 1); for (let i = 0; i < d.length; i++) d[i] *= k; }
  function sambungLoop(d, n = 1200) { for (let i = 0; i < n; i++) { const t = i / n; d[i] = d[i] * t + d[d.length - n + i] * (1 - t); } }
  function sintesis() {
    // keramaian: 14 suara obrolan (sumber glotal + dua formant per suku kata)
    B.obrolan = buf(7, (d) => {
      for (let v = 0; v < 14; v++) {
        const f0 = acak(95, 235); let t = Math.floor(acak(0, SR * .5)), fase = 0;
        while (t < d.length) {
          const durS = Math.floor(acak(.09, .26) * SR), f1 = acak(320, 860), f2 = acak(1050, 2300), R1 = resonator(f1, 90), R2 = resonator(f2, 140), keras = acak(.4, 1);
          for (let i = 0; i < durS && t + i < d.length; i++) {
            const e = Math.sin(Math.PI * i / durS) ** 2, f = f0 * (1 + .04 * Math.sin(i / 900));
            fase += f / SR; const glot = (fase % 1) * 2 - 1, x = glot * .7 + (Math.random() * 2 - 1) * .3;
            d[t + i] += (R1(x) * 1.0 + R2(x) * .5) * e * keras;
          }
          t += durS + (Math.random() < .25 ? Math.floor(acak(.15, .7) * SR) : Math.floor(acak(.01, .05) * SR));
        }
      }
      normal(d, .55); sambungLoop(d);
    });
    // langkah kaki
    B.langkah = buf(.09, (d) => { const R = resonator(acak(180, 320), 260); for (let i = 0; i < d.length; i++) d[i] = R((Math.random() * 2 - 1)) * Math.exp(-i / (SR * .012)) * 6; normal(d, .5); });
    // gemuruh lalu lintas: derau coklat + dengung mesin
    B.gemuruh = buf(6, (d) => { let b = 0; for (let i = 0; i < d.length; i++) { b = (b + (Math.random() * 2 - 1) * .02) * .996; d[i] = b * 8 + .05 * Math.sin(2 * Math.PI * 55 * i / SR) * (1 + Math.sin(i / 9000)); } normal(d, .5); sambungLoop(d, 3000); });
    // mesin bus diesel idle/jalan
    B.mesin = buf(2, (d) => { let ph = 0, b = 0; for (let i = 0; i < d.length; i++) { const f = 44 + 3 * Math.sin(i / 2500); ph += f / SR; const pulsa = Math.pow(Math.max(0, Math.sin(2 * Math.PI * ph)), 6); b = (b + (Math.random() * 2 - 1) * .05) * .99; d[i] = pulsa * .8 + b * 2; } normal(d, .5); sambungLoop(d, 2000); });
    // desis rem angin
    B.desis = buf(.9, (d) => { let p = 0; for (let i = 0; i < d.length; i++) { const n = Math.random() * 2 - 1, hp = n - p; p = n; d[i] = hp * Math.min(1, i / 400) * Math.exp(-i / (SR * .35)); } normal(d, .45); });
    // roda kereta di rel
    B.rel = buf(4, (d) => { let b = 0; for (let i = 0; i < d.length; i++) { b = (b + (Math.random() * 2 - 1) * .03) * .993; d[i] = b * 5; } normal(d, .5); sambungLoop(d, 3000); });
    B.klak = buf(.06, (d) => { const R = resonator(900, 400); for (let i = 0; i < d.length; i++) d[i] = R(Math.random() * 2 - 1) * Math.exp(-i / (SR * .008)) * 5; normal(d, .6); });
    // ---- v7: lapisan lokasi ----
    // derau ban di aspal (mobil lewat)
    B.ban = buf(2.5, (d) => { let p1 = 0, p2 = 0; for (let i = 0; i < d.length; i++) { const n = Math.random() * 2 - 1; p1 = p1 * .97 + n * .03; p2 = p2 * .6 + n * .4; d[i] = p1 * 5 + (p2 - p1) * .35 + .06 * Math.sin(2 * Math.PI * 38 * i / SR); } normal(d, .5); sambungLoop(d, 2000); });
    // sepeda motor: deret pulsa knalpot + derau
    B.motor = buf(1.5, (d) => { let ph = 0; const R = resonator(420, 300); for (let i = 0; i < d.length; i++) { ph += (92 + 6 * Math.sin(i / 1800)) / SR; const p = Math.pow(Math.max(0, Math.sin(2 * Math.PI * ph)), 10); d[i] = R(p * 2 + (Math.random() * 2 - 1) * .25); } normal(d, .5); sambungLoop(d, 1500); });
    // gemerisik daun: derau dengan modulasi amplitudo acak
    B.daun = buf(6, (d) => { let a = 0, ta = 0, hp = 0; for (let i = 0; i < d.length; i++) { if (i % 900 === 0) ta = Math.random() ** 2; a += (ta - a) * .002; const n = Math.random() * 2 - 1; d[i] = (n - hp) * a; hp = n; } normal(d, .45); sambungLoop(d, 3000); });
    // musik kafe lo-fi 8 detik (4 birama, 120 bpm): piano elektrik, bas, kick, hi-hat
    B.kafe = buf(8, (d) => {
      const AK = [[174.6, 220, 261.6, 329.6], [164.8, 196, 246.9, 293.7], [146.8, 174.6, 220, 261.6], [130.8, 164.8, 196, 246.9]], bt = SR / 2;
      AK.forEach((ak, b) => { const t0 = b * 4 * bt;
        for (const [o, f] of ak.map((f, k) => [k * 120, f])) for (const hit of [0, 1.5, 2.5]) { const s0 = Math.floor(t0 + hit * bt + o); for (let i = 0; i < bt * 1.6 && s0 + i < d.length; i++) { const t = i / SR, e = Math.exp(-t * 3.2); d[s0 + i] += (Math.sin(2 * Math.PI * f * t) + .25 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 8)) * e * .16; } }
        for (let k = 0; k < 4; k++) { const s0 = Math.floor(t0 + k * bt), f = ak[0] / 2; for (let i = 0; i < bt * .9 && s0 + i < d.length; i++) d[s0 + i] += Math.sin(2 * Math.PI * f * i / SR) * Math.exp(-i / SR * 4) * .3;
          if (k % 2 === 0) for (let i = 0; i < SR * .18 && s0 + i < d.length; i++) { const t = i / SR; d[s0 + i] += Math.sin(2 * Math.PI * (50 + 90 * Math.exp(-t * 30)) * t) * Math.exp(-t * 18) * .5; }
          const sh = Math.floor(s0 + bt / 2); let hp = 0; for (let i = 0; i < SR * .05 && sh + i < d.length; i++) { const n = Math.random() * 2 - 1; d[sh + i] += (n - hp) * Math.exp(-i / SR * 70) * .12; hp = n; } }
      });
      normal(d, .5); sambungLoop(d, 800);
    });
    // pengumuman pengeras suara: satu suara bernada naik-turun, pita sempit
    B.pa = buf(3.6, (d) => { const f0 = 205; let t = 0, fase = 0;
      while (t < d.length - SR * .3) { const durS = Math.floor(acak(.12, .3) * SR), f1 = acak(380, 820), f2 = acak(1200, 2200), R1 = resonator(f1, 80), R2 = resonator(f2, 120);
        for (let i = 0; i < durS && t + i < d.length; i++) { const e = Math.sin(Math.PI * i / durS) ** 1.5, f = f0 * (1 + .12 * Math.sin(t / SR * 2.2) - .1 * (t / d.length)); fase += f / SR; const x = ((fase % 1) * 2 - 1) * .8 + (Math.random() * 2 - 1) * .2; d[t + i] += (R1(x) + R2(x) * .6) * e; }
        t += durS + (Math.random() < .2 ? Math.floor(acak(.2, .4) * SR) : Math.floor(acak(.01, .04) * SR)); }
      normal(d, .5); });
    // gema ruang kota untuk musik (respons impuls derau meluruh)
    rev = ctx.createConvolver(); rev.buffer = (() => { const R = ctx.sampleRate, b = ctx.createBuffer(2, Math.floor(R * 1.8), R); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6) * .5; } return b; })();
  }

  // ---------------- graf audio ----------------
  // HRTF hanya untuk bunyi sesaat (klakson, lonceng); sumber kontinu memakai equalpower agar ringan
  function panner(x = 0, y = 2, z = 0, peristiwa = false) {
    const p = ctx.createPanner(); p.panningModel = hrtf && peristiwa ? 'HRTF' : 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = 40; p.rolloffFactor = 1.1; p.maxDistance = 4000;
    setPos(p, x, y, z); p.connect(sfx); pan.push(p); return p;
  }
  function setPos(p, x, y, z) { if (!isFinite(x) || !isFinite(y) || !isFinite(z)) return; if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z); }
  function loop(b, p, gain = 0, filtF = 0) { const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; const g = ctx.createGain(); g.gain.value = gain; let n = s; if (filtF) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filtF; s.connect(f); n = f; } n.connect(g); g.connect(p); s.start(0, Math.random() * b.duration); return { s, g, f: n !== s ? n : null }; }
  function sekali(b, x, y, z, gain = 1, rate = 1) { const p = panner(x, y, z), s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate; const g = ctx.createGain(); g.gain.value = gain; s.connect(g); g.connect(p); s.start(); s.onended = () => { p.disconnect(); pan.splice(pan.indexOf(p), 1); }; }

  // sumber tetap & bergerak
  let KER = [], GEM = [], BUS = [], KRT = [], LOK = {}, KND = [];
  function pasangSumber() {
    // keramaian di titik aktivitas (dipilih yang terdekat ke pendengar tiap 0,5 s)
    KER = api.spot.slice(0, 40).map((s) => ({ s, p: null, n: null }));
    for (const k of KER.slice(0, 6)) { k.p = panner(k.s.c[0], 1.6, k.s.c[1]); k.n = loop(B.obrolan, k.p, 0, 2600); }
    GEM = api.gemuruh.slice(0, 5).map(([x, z, kl]) => { const p = panner(x, 1, z); return { x, z, kl, p, n: loop(B.gemuruh, p, 0, 700) }; });
    BUS = [0, 1, 2].map(() => { const p = panner(0, 1.5, 0); return { p, n: loop(B.mesin, p, 0, 900), x: 0, z: 0 }; });
    // lapisan lokasi: kerumunan dekat, gemuruh arteri terdekat, daun, musik kafe
    const lk = (b, y, f, tipe) => { const p = panner(0, y, 0); let n = loop(b, p, 0, tipe ? 0 : f); if (tipe) { const fl = ctx.createBiquadFilter(); fl.type = tipe; fl.frequency.value = f; fl.Q.value = .7; n.s.disconnect(); n.s.connect(fl); fl.connect(n.g); n.f = fl; } return { p, n }; };
    LOK = { kerumunan: lk(B.obrolan, 1.6, 3000), arteri: lk(B.gemuruh, 1, 1100), daun: lk(B.daun, 8, 2400, 'bandpass'), kafe: lk(B.kafe, 2, 1700) };
    // kendaraan terdekat: mobil (derau ban) dan motor (knalpot)
    const nK = api.lite ? 2 : 3;
    KND = [...Array(nK).fill('mobil'), ...Array(nK).fill('motor')].map((j) => { const p = panner(0, .8, 0); return { j, p, n: loop(j === 'mobil' ? B.ban : B.motor, p, 0, j === 'mobil' ? 1500 : 2600) }; });
    KRT = [0, 1].map(() => { const p = panner(0, 12, 0), rel = loop(B.rel, p, 0, 900); const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 200; const og = ctx.createGain(); og.gain.value = 0; o.connect(og); og.connect(p); o.start(); return { p, rel, o, og, tk: 0, henti: false, v0: 0 }; });
  }
  function nyalakan() {
    if (siap) { ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC({ latencyHint: 'playback' }); komp = ctx.createDynamicsCompressor(); komp.threshold.value = -16; komp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = st.vol; sfx = ctx.createGain(); sfx.gain.value = 0; musikG = ctx.createGain(); musikG.gain.value = 0;
    sfx.connect(master); musikG.connect(master); master.connect(komp); komp.connect(ctx.destination);
    sintesis(); const rg = ctx.createGain(); rg.gain.value = .55; musikG.connect(rev); rev.connect(rg); rg.connect(master);
    kirimRev = ctx.createGain(); kirimRev.gain.value = 0; sfx.connect(kirimRev); kirimRev.connect(rev);
    pasangSumber(); siap = true; return true;
  }

  // ---------------- klakson, desis, lonceng ----------------
  function klakson(x, z, jenis) {
    if (!siap) return; const t = ctx.currentTime, p = panner(x + acak(-18, 18), 1.2, z + acak(-18, 18), true), g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(g); g.connect(p);
    const nada = jenis === 'motor' ? [620, 745] : jenis === 'bus' ? [290, 350] : [415, 520], panjang = jenis === 'motor' ? .13 : jenis === 'bus' ? .7 : acak(.22, .55), ulang = jenis === 'motor' ? 2 : Math.random() < .3 ? 2 : 1;
    for (let r = 0; r < ulang; r++) {
      const t0 = t + r * (panjang + .09);
      for (const f of nada) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f * acak(.98, 1.02); o.connect(lp); o.start(t0); o.stop(t0 + panjang + .05); }
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(jenis === 'motor' ? .16 : .22, t0 + .015); g.gain.setValueAtTime(jenis === 'motor' ? .16 : .22, t0 + panjang); g.gain.linearRampToValueAtTime(0, t0 + panjang + .04);
    }
    setTimeout(() => { p.disconnect(); pan.splice(pan.indexOf(p), 1); }, 2500);
    api.riak && api.riak(x, z);
  }
  function lonceng(x, z, nada = [659.3, 523.3], y = 3, vol = .14) {
    if (!siap) return; const p = panner(x, y, z, true), t = ctx.currentTime;
    nada.forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(p); const t0 = t + i * .42; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .01); g.gain.exponentialRampToValueAtTime(.0005, t0 + 1.3); o.start(t0); o.stop(t0 + 1.4); });
    setTimeout(() => { p.disconnect(); pan.splice(pan.indexOf(p), 1); }, 3200);
  }

  // kicau burung: tiga pola (cuit dua nada, getar cepat, siulan menurun)
  function burung(x, y, z, vol = .09) {
    if (!siap) return; const p = panner(x, y, z, true), t = ctx.currentTime, pola = (Math.random() * 3) | 0, n = pola === 1 ? 7 + (Math.random() * 6 | 0) : 2 + (Math.random() * 3 | 0), fb = acak(2300, 3800);
    for (let k = 0; k < n; k++) {
      const t0 = t + k * (pola === 1 ? .055 : acak(.12, .22)), d = pola === 1 ? .04 : acak(.06, .13), o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
      const f0 = pola === 2 ? fb * (1.3 - k * .08) : fb * (k % 2 ? 1.18 : 1);
      o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(pola === 2 ? f0 * .8 : f0 * acak(1.15, 1.45), t0 + d);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .008); g.gain.exponentialRampToValueAtTime(.0004, t0 + d);
      o.connect(g); g.connect(p); o.start(t0); o.stop(t0 + d + .02);
    }
    setTimeout(() => { p.disconnect(); pan.splice(pan.indexOf(p), 1); }, 2600);
  }
  // pengumuman: lonceng tiga nada lalu suara pengeras (bergema)
  function pengumuman(x, z, y = 6) {
    if (!siap) return; lonceng(x, z, [523.3, 659.3, 784], y, .1);
    setTimeout(() => { if (siap && st.suara3d) sekali(B.pa, x, y, z, .5, acak(.96, 1.04)); }, 1500);
  }
  // bunyi peringatan pintu kereta
  function pintu(x, z) {
    if (!siap) return; const p = panner(x, 12, z, true), t = ctx.currentTime + 1.6;
    for (let k = 0; k < 4; k++) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 1046; o.connect(g); g.connect(p); const t0 = t + k * .32; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.05, t0 + .01); g.gain.setValueAtTime(.05, t0 + .17); g.gain.linearRampToValueAtTime(0, t0 + .19); o.start(t0); o.stop(t0 + .2); }
    setTimeout(() => { p.disconnect(); pan.splice(pan.indexOf(p), 1); }, 4000);
  }

  // ---------------- pembaruan per bingkai ----------------
  let tAtur = 0, tKlak = 0, tKon = 0, tPA = 10, tKlakD = 0;
  const KOSONG = { w: { terminal: 0, mrt: 0, kuliner: 0, arteri: 0, taman: 0, lokal: 1 }, ramai: 0, db: 55, nama: '', pArteri: null, pKafe: null, pTerminal: [0, 0], pMRT: [0, 0] };
  function update(dt) {
    if (!siap || ctx.state !== 'running') return;
    const C = api.camera.position, T = api.target(), L = ctx.listener, titik = st.mode === 'titik' && st.titik;
    let fx = T.x - C.x, fy = T.y - C.y, fz = T.z - C.z, ex, ey, ez;
    if (titik) { ex = st.titik.x; ey = 3; ez = st.titik.z; const hl = Math.hypot(fx, fz) || 1; fx /= hl; fz /= hl; fy = 0; }   // telinga setinggi pejalan, menghadap arah kamera
    else { ex = T.x + (C.x - T.x) * .12; ey = T.y + (C.y - T.y) * .12; ez = T.z + (C.z - T.z) * .12; const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl; }
    if (!isFinite(ex + ez + fx + fz)) return;
    if (L.positionX) { L.positionX.value = ex; L.positionY.value = ey; L.positionZ.value = ez; L.forwardX.value = fx; L.forwardY.value = fy; L.forwardZ.value = fz; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
    else { L.setPosition(ex, ey, ez); L.setOrientation(fx, fy, fz, 0, 1, 0); }
    const jarak = api.jarak(), h = api.jam() % 24, kec = api.kecepatan();
    const dekat = titik ? 1 : clamp(1 - (jarak - 140) / 700);      // lapisan lokasi memudar saat kamera menjauh
    if (tKon <= 0 || !st.konteks) { tKon = .5; st.konteks = (api.konteks && api.konteks(ex, ez)) || KOSONG; }
    tKon -= dt;
    const K = st.konteks, w = K.w, lal = api.lalin(h), siang = h > 5.3 && h < 18.6 ? (h < 9 ? 1 : .5) : 0;
    tAtur -= dt;
    if (tAtur <= 0) {
      tAtur = .25; const ref = titik ? 7 : clamp(jarak * .11, 22, 240); for (const p of pan) p.refDistance = ref;
      const on = st.suara3d, tc = ctx.currentTime, gL = on ? dekat : 0;
      // keramaian: 6 titik aktivitas terdekat ke pendengar, keras sesuai profil jam
      const urut = KER.map((k) => ({ k, d: Math.hypot(k.s.c[0] - ex, k.s.c[1] - ez), w: api.ramai(k.s, h) })).sort((a, b) => a.d - b.d);
      const pakai = urut.slice(0, 6); let tot = 0;
      KER.filter((k) => k.n).forEach((k, i) => { const u = pakai[i]; if (!u) return; setPos(k.p, u.k.s.c[0], 1.6, u.k.s.c[1]); const g = on && st.kat.orang ? u.w : 0; tot += u.w; k.n.g.gain.setTargetAtTime(g * .55, tc, .6); if (k.n.f) k.n.f.frequency.setTargetAtTime(1400 + 1800 * g, tc, .6); });
      const rata = Math.max(tot / Math.max(1, pakai.length) * (titik ? .5 : 1), K.ramai * dekat); st.suasana = rata > .58 ? 'ramai' : rata > .28 ? 'sedang' : 'sepi';
      // gemuruh arteri mengikuti volume lalu lintas
      GEM.forEach((g) => g.n.g.gain.setTargetAtTime(on && st.kat.kendaraan ? (.08 + .3 * lal) * (g.kl / 3) : 0, tc, .8));
      // lapisan lokasi
      const kr = LOK.kerumunan; setPos(kr.p, ex + 5, 1.6, ez + 4); kr.n.g.gain.setTargetAtTime(gL * (st.kat.orang ? 1 : 0) * K.ramai * .5, tc, .8); kr.n.f && kr.n.f.frequency.setTargetAtTime(1200 + 2000 * K.ramai, tc, .8);
      if (K.pArteri) setPos(LOK.arteri.p, K.pArteri[0], 1, K.pArteri[1]); LOK.arteri.n.g.gain.setTargetAtTime(K.pArteri ? gL * (st.kat.kendaraan ? 1 : 0) * w.arteri * (.15 + .65 * lal) : 0, tc, .8);
      setPos(LOK.daun.p, ex - 5, 8, ez - 7); LOK.daun.n.g.gain.setTargetAtTime(gL * (st.kat.alam ? 1 : 0) * (.03 + .32 * w.taman), tc, 1);
      if (K.pKafe) setPos(LOK.kafe.p, K.pKafe[0], 2, K.pKafe[1]); const buka = h >= 10 && h < 23.5 ? 1 : .1;
      LOK.kafe.n.g.gain.setTargetAtTime(K.pKafe ? gL * (st.kat.orang ? 1 : 0) * w.kuliner * buka * .38 : 0, tc, 1);
      kirimRev.gain.setTargetAtTime(on ? (.03 + .32 * w.terminal + .26 * w.mrt + .12 * w.kuliner + .06 * w.arteri) * (.35 + .65 * dekat) : 0, tc, 1);
      // kendaraan terdekat: tiga mobil dan tiga motor yang lewat
      const kd = api.kendaraan ? api.kendaraan() : [];
      for (const j of ['mobil', 'motor']) {
        const dek = kd.filter((v) => v.j === j).map((v) => ({ ...v, d: Math.hypot(v.x - ex, v.z - ez) })).sort((a, b) => a.d - b.d);
        KND.filter((u) => u.j === j).forEach((u, i) => { const v = dek[i], ada = on && st.kat.kendaraan && v && v.d < 160;
          if (v) setPos(u.p, v.x, .8, v.z); u.n.g.gain.setTargetAtTime(ada ? (j === 'motor' ? .3 : .45) : 0, tc, .2);
          if (v) u.n.s.playbackRate.setTargetAtTime(j === 'motor' ? clamp(.65 + v.v / 14, .6, 1.8) : clamp(.75 + v.v / 26, .7, 1.5), tc, .3); });
      }
      // mesin bus: tiga bus terdekat
      const bs = api.bus().map((b) => ({ ...b, d: Math.hypot(b.x - ex, b.z - ez) })).sort((a, b) => a.d - b.d).slice(0, 3);
      BUS.forEach((u, i) => { const b = bs[i]; if (b) { setPos(u.p, b.x, 1.5, b.z); u.x = b.x; u.z = b.z; } u.n.g.gain.setTargetAtTime(on && st.kat.bus && b ? .42 : 0, tc, .3); });
      // kereta: gemuruh roda + dengung motor sesuai kecepatan; lonceng dan peringatan pintu saat berhenti
      const ka = api.kereta();
      KRT.forEach((u, i) => { const k = ka[i]; const g = on && st.kat.kereta && k ? 1 : 0; if (k) setPos(u.p, k.x, 12, k.z); const v = k && isFinite(k.v) ? Math.min(k.v, 30) : 0;
        u.rel.g.gain.setTargetAtTime(g * clamp(v / 16) * .7, tc, .25); u.og.gain.setTargetAtTime(g * clamp(v / 16) * .05, tc, .25); u.o.frequency.setTargetAtTime(180 + v * 38, tc, .3);
        if (k && k.henti && !u.henti && g) { lonceng(k.x, k.z, [784, 659.3, 523.3], 12, .12); if (Math.hypot(k.x - ex, k.z - ez) < 260) pintu(k.x, k.z); } u.henti = !!(k && k.henti); });
    }
    if (!st.suara3d) return;
    // klakson di titik rawan macet: lebih sering saat jam sibuk dan lalu lintas padat
    const padat = api.sibuk(h) ? 1 : .25, laju = st.kat.kendaraan ? .9 * lal * padat * kec : 0;
    tKlak -= dt;
    if (tKlak <= 0 && laju > .02) { tKlak = acak(.4, 2.4) / laju; const m = api.macet[(Math.random() * api.macet.length) | 0]; klakson(m[0], m[1], Math.random() < .55 ? 'motor' : Math.random() < .85 ? 'mobil' : 'bus'); }
    // klakson dari kendaraan yang lewat di sekitar pendengar
    const lajuD = st.kat.kendaraan ? .4 * lal * padat * kec * (.25 + w.arteri) * dekat : 0; tKlakD -= dt;
    if (tKlakD <= 0 && lajuD > .02) { tKlakD = acak(.8, 2.6) / lajuD; const kd = (api.kendaraan ? api.kendaraan() : []).filter((v) => Math.hypot(v.x - ex, v.z - ez) < (titik ? 90 : 200)); if (kd.length) { const v = kd[(Math.random() * kd.length) | 0]; klakson(v.x, v.z, v.j); } }
    // pengumuman di terminal dan stasiun
    if (dekat > .45 && (w.terminal > .3 || w.mrt > .3) && h >= 5 && h < 23.5) { tPA -= dt; if (tPA <= 0) { tPA = acak(24, 48); const term = w.terminal >= w.mrt, q = term ? K.pTerminal : K.pMRT; pengumuman(q[0], q[1], term ? 5 : 12); } }
    // kicau burung: banyak di taman dan pagi hari, sesekali di tempat lain
    if (st.kat.alam && siang && Math.random() < dt * (.08 + 1.4 * w.taman) * siang * dekat * (titik ? 1.4 : 1)) { const r = titik ? acak(8, 35) : acak(30, 120), a = Math.random() * 6.283; burung(ex + Math.cos(a) * r, acak(5, 12), ez + Math.sin(a) * r, titik ? .09 : .07); }
    // desis rem & lonceng halte di jalur bus (lebih sering di terminal)
    if (st.kat.bus && Math.random() < dt * (.25 + 1.4 * w.terminal * dekat) * kec) { const b = BUS[(Math.random() * 3) | 0]; if (b && b.x) sekali(B.desis, b.x, 1, b.z, .5, acak(.9, 1.1)); }
    if (st.kat.bus && Math.random() < dt * .06 * kec) { const hl = api.halteTJ(); if (hl.length) { const t = hl[(Math.random() * hl.length) | 0]; lonceng(t[0], t[1], [659.3, 523.3], 3, .07); } }
    // langkah kaki di sekitar pendengar saat suasana sepi/sedang
    if (st.kat.orang && st.suasana !== 'ramai' && Math.random() < dt * (titik ? 3.2 : 2.2)) sekali(B.langkah, ex + acak(-25, 25) * (titik ? .4 : 1), .2, ez + acak(-25, 25) * (titik ? .4 : 1), .35, acak(.85, 1.2));
    // kereta: bunyi sambungan rel berirama sesuai kecepatan
    if (st.kat.kereta) { const ka = api.kereta(); KRT.forEach((u, i) => { const k = ka[i]; if (!k || k.v < 2) return; u.tk -= dt * kec; if (u.tk <= 0) { u.tk = 20 / k.v / 2; sekali(B.klak, k.x, 12, k.z, .35 * clamp(k.v / 16), acak(.9, 1.1)); } }); }
  }
  // mode pendengar
  function setMode(m) { st.mode = m; st.konteks = null; tKon = 0; }
  function setTitik(x, z) { st.titik = { x, z }; st.konteks = null; tKon = 0; tPA = 3; }

  // ---------------- musik latar generatif (ambient tenang) ----------------
  let musikT = null, akordI = 0;
  const AKORD = [[146.8, 185, 220, 277.2, 329.6], [123.5, 146.8, 185, 220, 277.2], [98, 123.5, 146.8, 185, 246.9], [110, 146.8, 164.8, 220, 246.9]];
  function mainAkord() {
    const t = ctx.currentTime, ak = AKORD[akordI++ % AKORD.length], lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.connect(musikG);
    for (const f of ak) for (const dt of [-3, 3]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = dt; o.connect(g); g.connect(lp); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.035, t + 2.4); g.gain.setValueAtTime(.035, t + 6.5); g.gain.linearRampToValueAtTime(0, t + 9.5); o.start(t); o.stop(t + 9.6); }
    for (let k = 0; k < 16; k++) { if (Math.random() > .55) continue; const t0 = t + k * .5, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = ak[(Math.random() * ak.length) | 0] * (Math.random() < .5 ? 2 : 4); o.connect(g); g.connect(musikG); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.05, t0 + .01); g.gain.exponentialRampToValueAtTime(.0004, t0 + 1.6); o.start(t0); o.stop(t0 + 1.7); }
  }
  function musik(on) {
    st.musik = on; if (!nyalakan()) return; const t = ctx.currentTime;
    musikG.gain.cancelScheduledValues(t); musikG.gain.setTargetAtTime(on ? (st.bicara ? .32 : .8) : 0, t, .8);
    if (on && !musikT) { mainAkord(); musikT = setInterval(mainAkord, 8000); }
    if (!on && musikT) { clearInterval(musikT); musikT = null; }
  }
  function suara3d(on) { st.suara3d = on; if (!nyalakan()) return false; sfx.gain.setTargetAtTime(on ? (st.bicara ? .45 : 1) : 0, ctx.currentTime, .4); return true; }
  function volume(v) { st.vol = v; if (siap) master.gain.setTargetAtTime(v, ctx.currentTime, .2); }

  // ---------------- narasi (Web Speech API, suara Bahasa Indonesia perangkat) ----------------
  const SY = window.speechSynthesis; let suaraID = null, antrian = 0;
  function pilihSuara() {
    if (!SY) return null; const vs = SY.getVoices().filter((v) => /^id([-_]|$)/i.test(v.lang) || /indones/i.test(v.name));
    const skor = (v) => (/natural|neural/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0) + (/gadis|ardi|damayanti/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
    suaraID = vs.sort((a, b) => skor(b) - skor(a))[0] || null; return suaraID;
  }
  if (SY) { pilihSuara(); SY.onvoiceschanged = pilihSuara; }
  function tersediaNarasi() { return !!(SY && (suaraID || pilihSuara())); }
  function bicara(teks, selesai) {
    if (!st.narasi || !tersediaNarasi()) return false;
    SY.cancel(); const id = ++antrian;
    // Chrome memotong ujaran panjang: pecah per kalimat
    const kal = teks.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*/g) || [teks];
    st.bicara = true; if (siap) { musikG.gain.setTargetAtTime(st.musik ? .32 : 0, ctx.currentTime, .4); sfx.gain.setTargetAtTime(st.suara3d ? .45 : 0, ctx.currentTime, .4); }
    const akhir = () => { if (id !== antrian) return; st.bicara = false; if (siap) { musikG.gain.setTargetAtTime(st.musik ? .8 : 0, ctx.currentTime, .8); sfx.gain.setTargetAtTime(st.suara3d ? 1 : 0, ctx.currentTime, .8); } selesai && selesai(); };
    kal.forEach((k, i) => { const u = new SpeechSynthesisUtterance(k.trim()); u.voice = suaraID; u.lang = suaraID.lang; u.rate = 1; u.pitch = 1; u.volume = 1; if (i === kal.length - 1) { u.onend = akhir; u.onerror = akhir; } SY.speak(u); });
    return true;
  }
  // narasi rekaman (ElevenLabs): file mp3 diputar lewat elemen audio, musik dan efek diredam selama narasi
  let aud = null;
  function redam(on) { st.bicara = on; if (!siap) return; const tc = ctx.currentTime; musikG.gain.setTargetAtTime(st.musik ? (on ? .3 : .8) : 0, tc, on ? .4 : .8); sfx.gain.setTargetAtTime(st.suara3d ? (on ? .42 : 1) : 0, tc, on ? .4 : .8); }
  function putar(url, selesai, gagal, mulai) {
    diam(); const id = ++antrian; aud = new Audio(url); aud.preload = 'auto'; aud.volume = clamp(.35 + st.vol * .85);
    let jalan = false, gagalSekali = false; const g = () => { if (gagalSekali || id !== antrian) return; gagalSekali = true; redam(false); gagal && gagal(); };
    aud.addEventListener('playing', () => { if (id !== antrian) return; if (!jalan) { jalan = true; mulai && mulai(aud.duration); } redam(true); });
    aud.addEventListener('ended', () => { if (id !== antrian) return; redam(false); selesai && selesai(); });
    aud.addEventListener('error', g);
    const pr = aud.play(); if (pr && pr.catch) pr.catch(() => { if (!jalan) g(); });
    return true;
  }
  function diam() { antrian++; if (aud) { aud.pause(); aud.src = ''; aud = null; } if (SY) SY.cancel(); st.bicara = false; if (siap) { musikG.gain.setTargetAtTime(st.musik ? .8 : 0, ctx.currentTime, .5); sfx.gain.setTargetAtTime(st.suara3d ? 1 : 0, ctx.currentTime, .5); } }

  return { st, nyalakan, update, musik, suara3d, volume, bicara, putar, diam, tersediaNarasi, namaSuara: () => suaraID && suaraID.name, klakson, setMode, setTitik };
}
