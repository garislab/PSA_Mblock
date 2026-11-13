P='/home/claude/v4/src/app.js'; s=open(P).read()
def rep(old,new):
    global s
    assert old in s, ('MISSING', old[:90]); s=s.replace(old,new,1)
rep("const tampil = (S.suara3d || DENGAR.memilih) && !cerita.aktif;", "let tur = false; try { tur = cerita.aktif; } catch (e) { /* tur belum terdefinisi saat awal */ }\n  const tampil = (S.suara3d || DENGAR.memilih) && !tur;")

a=s.index("const CERITA = ["); b=s.index("// =============================================================\n//  Lembar bawah (HP)")
VO = [
"Halo, selamat datang di Blok M! Saya akan memandu Anda membaca kawasan inti seluas 29 hektare ini. Kami menilainya dengan Place Diagram dari Project for Public Spaces, dan hasilnya 71 dari 100. Angka ini menarik, karena tidak merata. Sisi sosial dan ragam kegiatan sangat kuat, di atas 80. Tapi kenyamanan baru 47. Artinya, orang sudah datang ke Blok M, tetapi belum betah berlama-lama. Itulah benang merah tur kita hari ini.",
"Kita mulai dari jantungnya, Stasiun MRT Blok M BCA. Di sinilah angkutan massal bertemu: MRT, TransJakarta, dan terminal bus. Hasil analisis menunjukkan 81 persen kawasan inti cukup lima menit berjalan kaki ke simpul transit. Dari sisi akses, Blok M sudah unggul. Tantangannya bukan menambah transit, melainkan memastikan perjalanan dari pintu stasiun ke tujuan terasa mudah, teduh, dan aman.",
"Perhatikan gelombang warna yang merambat dari tujuh pintu MRT. Gelombang ini hanya mengikuti jalan yang benar-benar bisa dilewati. Di atas kertas, radius 400 meter terlihat dekat. Kenyataannya, hanya sekitar 57 persen yang terjangkau dalam jarak itu. Ke mana sisanya? Hilang karena jalan memutar, pagar, dan persimpangan yang sulit diseberangi. Jadi, dekat di peta belum tentu dekat di kaki.",
"Dari atas, penyebabnya mulai terlihat. Median keliling blok di sini 451 meter, hampir dua kali lipat acuan TOD yang menyarankan di bawah 250 meter. Hanya sekitar 6 persen blok yang memenuhi acuan itu. Blok sebesar ini memaksa pejalan kaki memutar jauh. Rekomendasinya jelas: buka jalan tembus dan lorong publik di blok berwarna merah, misalnya lewat insentif pada pembangunan baru.",
"Sekarang tengah hari, dan inilah titik terlemah Blok M. Sekitar 79 persen area tergolong panas tinggi, sementara tutupan vegetasi hanya sekitar 13 persen. Saat matahari hampir tegak lurus, bayangan bangunan menyempit. Inilah alasan skor kenyamanan tertahan di 47. Pohon peneduh di jalur pejalan, kanopi di depan toko, dan material yang tidak menyimpan panas akan langsung terasa bagi siapa pun yang berjalan di sini.",
"Menjelang sore, coba dengarkan arteri dan terminal. Model kebisingan kami mencatat rata-rata 69 desibel di ruang luar, dan area terminal sekitar 75 desibel. Hampir separuh fasad, tepatnya 49 persen, melewati baku mutu sesuai fungsinya. Bagi pejalan kaki, artinya mengobrol pun harus setengah berteriak. Penataan alur bus, penyangga hijau di tepi arteri, dan ruang duduk di jalan lokal yang lebih tenang bisa meringankan beban ini.",
"Dan inilah kekuatan sejati Blok M. Menjelang malam, kawasan ini justru semakin hidup. Perkiraan kunjungan sekitar 80 ribu orang per hari, dengan puncak antara pukul tujuh dan delapan malam. Skor sosialnya 87, tertinggi dari empat atribut. Komunitas, kuliner, dan suasana Little Tokyo menjadi magnet. Tugas kita adalah menjaga energi ini, sambil menyediakan ruang yang lebih nyaman dan aman untuk menampungnya.",
"Terakhir, lihat muka jalannya. Sekitar 51 persen panjang jalan di kawasan inti dibatasi toko, kuliner, atau jasa. Koridor Melawai paling hidup, sementara sisi arteri masih didominasi dinding buta dan pagar. Kesimpulannya, Blok M sudah punya akses dan kehidupan sosial yang kuat. Pekerjaan rumahnya adalah kenyamanan: teduh, tenang, dan jalur yang lebih pendek. Terima kasih sudah berjalan bersama saya. Silakan jelajahi sendiri, dan pilih titik mana pun untuk mendengar suasananya.",
]
old = s[a:b]
lines = [l for l in old.split('\n') if l.strip().startswith('{ vo:')]
assert len(lines)==8
newlines=[]
import re
for i,l in enumerate(lines):
    l2 = re.sub(r"\{ vo: \(\) => `.*?`, l:", "{ vo: %s, a: 'tur/%02d.mp3', l:" % (repr(VO[i]).replace('"',"'") if "'" not in VO[i] else '`'+VO[i]+'`', i+1), l, count=1)
    assert l2!=l
    newlines.append(l2)
cerita_obj = r'''const cerita = {
  aktif: false, i: 0, t: 0,
  mulai() { this.aktif = true; this.i = 0; $('#b-tur').classList.add('on'); SUARA.nyalakan(); if (S.musik && !SUARA.st.musik) { SUARA.musik(true); this.musikTur = true; } renderDengar(true); this.tampil(); },
  stop() { if (!this.aktif) return; this.aktif = false; clearTimeout(this.t); clearTimeout(this.t2); SUARA.diam(); if (this.musikTur) { SUARA.musik(false); this.musikTur = false; } $('#cerita').hidden = true; $('#b-tur').classList.remove('on'); renderDengar(true); },
  // pemandu menjelaskan analisis (rekaman ElevenLabs); bila file tidak ada atau gagal diputar, pakai suara perangkat
  tampil() {
    const s = CERITA[this.i], idx = this.i, teks = s.vo; clearTimeout(this.t); clearTimeout(this.t2); SUARA.diam();
    location.hash = s.l; setLapis(s.l, false); setView(s.v); berhenti(); animJam(s.j);
    const el = $('#cerita'); el.hidden = false;
    el.innerHTML = `<span class="langkah">Tur cerita · ${this.i + 1} dari ${CERITA.length}<span class="c-st" id="c-st"></span></span><h3>${s.t}</h3><p>${s.p}</p>
      <details class="transkrip"><summary>Transkrip pemandu</summary><p>${teks}</p></details>
      <div class="nav"><div class="titik">${CERITA.map((_, k) => `<i class="${k < this.i ? 'lewat' : k === this.i ? 'on' : ''}"></i>`).join('')}</div>
      <button class="btn" id="c-prev" type="button" ${this.i ? '' : 'disabled'}>‹</button><button class="btn primer" id="c-next" type="button">${this.i === CERITA.length - 1 ? 'Selesai' : 'Lanjut ›'}</button><button class="btn" id="c-x" type="button" aria-label="Tutup tur">✕</button></div>`;
    $('#c-prev').onclick = () => { this.i = Math.max(0, this.i - 1); this.tampil(); };
    $('#c-next').onclick = () => this.lanjut(); $('#c-x').onclick = () => this.stop();
    const masih = () => this.aktif && this.i === idx;
    const nanti = (ms) => { clearTimeout(this.t); this.t = setTimeout(() => { if (masih()) this.lanjut(); }, ms); };
    const bar = (ms) => { const b = el.querySelector('.titik i.on'); if (!b) return; b.classList.remove('on'); void b.offsetWidth; el.style.setProperty('--d', ms + 'ms'); b.classList.add('on'); };
    const status = (t) => { const c = $('#c-st'); if (c) c.textContent = t; };
    const perangkat = () => {
      if (S.narasi && SUARA.tersediaNarasi()) { const ms = Math.max(8000, teks.split(/\s+/).length / 2.4 * 1000 + 1500); status(' · 🔊 suara perangkat'); bar(ms); SUARA.bicara(teks, () => { if (masih()) nanti(1400); }); nanti(ms + 12000); }
      else { status(''); bar(10000); nanti(10000); }
    };
    bar(30000); nanti(30000);
    if (!S.narasi) { bar(10000); nanti(10000); return; }
    status(' · memuat pemandu…');
    this.t2 = setTimeout(() => { if (!masih()) return;
      SUARA.putar(s.a, () => { if (masih()) nanti(1400); }, () => { if (masih()) perangkat(); }, (d) => { if (!masih()) return; status(' · 🎙 pemandu tur'); if (isFinite(d) && d > 0) { bar(d * 1000); nanti(d * 1000 + 15000); } });
    }, 900);
  },
  lanjut() { if (this.i >= CERITA.length - 1) { this.stop(); setLapis('ringkasan'); location.hash = 'ringkasan'; setView('iso'); return; } this.i++; this.tampil(); },
};

'''
s = s[:a] + "const CERITA = [\n" + "\n".join(newlines) + "\n];\n" + cerita_obj + s[b:]
open(P,'w').write(s); print('ok')
