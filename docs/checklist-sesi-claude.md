# Checklist Terminal Sebelum Diskusi dengan Claude

Panduan singkat: langkah-langkah di terminal VSCode sebelum mulai ngobrol
dengan Claude soal proyek, supaya Claude langsung dapat gambaran akurat
tanpa nebak-nebak kondisi proyek.

---

## A. Skenario Biasa (laptop sama, lanjut proyek)

Jalankan urutan ini tiap kali buka terminal baru untuk sesi kerja:

```bash
# 1. Pastikan posisi folder benar
pwd

# 2. Lihat status Git — ada perubahan belum di-commit?
git status

# 3. Lihat commit terakhir — progres terakhir apa
git log --oneline -5

# 4. Lihat struktur proyek (skip folder besar yang gak relevan)
tree -L 2 -I 'node_modules|.git|.next|venv|__pycache__'

# 5. Cek service yang lagi jalan (Docker: n8n, WA gateway, Postgres, dll)
docker ps
```

**Kalau proyek ini punya file konteks (`PROJECT_CONTEXT.md`, `CLAUDE.md`,
`AGENTS.md`), buka juga:**
```bash
cat PROJECT_CONTEXT.md
cat CLAUDE.md
```
File-file ini dibuat justru supaya Claude (atau kamu sendiri) bisa cepat
nyambung ke konteks proyek tanpa mulai dari nol.

> Kalau semua ini beres, tinggal copy-paste hasil `git status` +
> `tree` + `docker ps` ke chat Claude di awal sesi, baru lanjut diskusi.

---

## B. Skenario Ganti Laptop (setup dari awal)

Ini urutan sebelum bisa lanjut kerja di laptop baru:

```bash
# 1. Clone ulang proyek dari GitHub
git clone <url-repo-github-kamu>
cd nama-folder-proyek

# 2. Cek isi struktur proyek
tree -L 2 -I 'node_modules|.git|.next|venv|__pycache__'

# 3. Cek apakah ada file .env yang WAJIB dibuat manual
#    (karena .env tidak ikut ke-push ke GitHub — lihat .gitignore)
cat .gitignore | grep env
ls -la | grep env

# 4. Kalau .env/.env.local belum ada, buat manual dan isi ulang
#    kredensial (API key WA, n8n, DB, dll) dari catatan pribadi/password manager
nano .env.local

# 5. Install dependency
npm install          # untuk proyek Next.js/Node
# atau
pip install -r requirements.txt   # untuk proyek Python

# 6. Nyalakan service pendukung (kalau pakai Docker)
docker compose up -d
docker ps             # pastikan semua container yang dibutuhkan nyala

# 7. Cek file konteks proyek (baca ulang biar inget keputusan2 sebelumnya)
cat PROJECT_CONTEXT.md
cat CLAUDE.md
cat AGENTS.md
```

> **Penting:** file `.env`, `.env.local`, file `.sqlite`, dan folder
> `backups/` sengaja TIDAK ikut ke GitHub (lihat `.gitignore`). Jadi di
> laptop baru, ini harus disiapkan ulang secara manual — bukan bug,
> ini memang by design demi keamanan data & kredensial.

---

## C. Pindahkan File dari Windows (Downloads) ke Proyek WSL

Kalau ada file (misal hasil download dari chat Claude) yang perlu
ditambahkan ke proyek yang ada di WSL:

**Di PowerShell:**
```powershell
cd $HOME\Downloads
Copy-Item "nama-file.md" -Destination "\\wsl.localhost\Ubuntu\home\talatee\projects\Buku_Kas_Warung\docs\"
```

> Kalau folder tujuan (`docs/`) belum ada, `Copy-Item` akan error.
> Buat dulu foldernya dari sisi WSL: `mkdir -p ~/projects/Buku_Kas_Warung/docs`

**Balik ke terminal WSL, cek file sudah masuk:**
```bash
cd ~/projects/Buku_Kas_Warung
ls docs/
```

**Kalau file dokumentasi (`.md`, dst) — commit seperti biasa:**
```bash
git add docs/nama-file.md
git commit -m "docs: tambah nama-file.md"
git push
```

**Kalau file berupa script (`.sh`) yang dijalankan sekali lalu tidak
perlu disimpan** — pola yang biasa dipakai:
```bash
bash nama-script.sh && rm nama-script.sh
```

---

## D. Template Pembuka Sesi ke Claude

Supaya diskusi terstruktur, buka sesi dengan format singkat begini
(hasil dari command di atas):

```
Status proyek saat ini:
- git status: [tempel hasil]
- commit terakhir: [tempel hasil]
- struktur folder: [tempel hasil tree, atau screenshot]
- service aktif (docker ps): [tempel hasil]

Yang ingin saya kerjakan hari ini: [tulis tujuan sesi]
```

Dengan format ini, Claude langsung tahu kondisi nyata proyek tanpa
perlu nanya-nanya dulu, dan diskusi bisa langsung ke inti masalah.
