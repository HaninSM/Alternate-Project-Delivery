# Alternate Project Delivery (LITE)

Aplikasi manajemen proyek *hybrid* (menjembatani fleksibilitas Notion dan ketegasan Jira) dengan fokus utama menyajikan **Actionable Insights** (Burndown Chart, Lead Time, Cycle Time, Blocker Highlights) untuk Project Manager serta memberikan transparansi real-time bagi klien eksternal.

---

## 🛠 Tech Stack (LITE Version)
- **Backend & Web Hosting:** [Google Apps Script (GAS)](https://developers.google.com/apps-script)
- **Database:** [Google Sheets](https://www.google.com/sheets/about/) (sebagai database relasional terstruktur)
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, [Tailwind CSS](https://tailwindcss.com/) (via CDN)
- **Data Visualization:** [Chart.js](https://www.chartjs.org/) (via CDN)
- **Authentication & RBAC:** Google Identity bawaan (mencocokkan sesi email akun Google aktif dengan data pengguna)

---

## 🌟 Fitur Utama & Alur Kerja

### 1. Inisiasi Proyek (Kanban vs Scrum)
- **Mode Kanban:** Alur kerja kontinu langsung ke papan 4 kolom.
- **Mode Scrum:** 
  - **Bucket Product Backlog:** Wadah menampung seluruh ide & tiket pekerjaan yang belum dijadwalkan.
  - **Bucket Sprints (Sprint 1, Sprint 2, dst.):** PM dapat membuat bucket iterasi baru kapan saja.
  - **Drag and Drop Planning:** Pindahkan task dari wadah Backlog ke wadah Sprint target secara intuitif.
  - **Start Sprint Action:** Tombol aktivasi sprint yang meminta durasi (1-4 minggu) dan *Sprint Goal*, lalu mengarahkan tim langsung ke Active Board.

### 2. Active Kanban Board (Drag & Drop Murni)
- 4 Kolom status standar: `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`.
- Interaksi murni HTML5 Drag & Drop kartu antar kolom (tanpa combobox/dropdown).
- *Optimistic UI Updates* untuk transisi kartu secepat kilat.
- Perlindungan *Read-Only* bagi External Client.

### 3. Actionable Insights Engine
- **Burndown Chart:** Pelacakan sisa jam estimasi harian vs garis Ideal linier.
- **Lead Time & Cycle Time:** Mengukur kecepatan aktual delivery tim.
- **Deteksi Blocker Otomatis:** Menyorot task yang macet di status `IN_PROGRESS` atau `REVIEW` lebih dari 48 jam.

### 4. Manajemen Pengguna & Granular RBAC Permissions (Opsi 2)
- **Role Presets:** `ADMIN`, `PM`, `MEMBER`, `CLIENT` dengan konfigurasi izin bawaan otomatis.
- **Modular Checkbox Permissions:** Administrator dapat menyesuaikan izin per pengguna secara independen:
  - `can_create_project`: Inisiasi / buat project baru.
  - `can_manage_sprint`: Buat bucket sprint & mulai sprint (Planning).
  - `can_create_task`: Buat task baru di Backlog & Active Board.
  - `can_move_task`: Geser status task di Kanban & alokasi bucket.
  - `can_view_insights`: Akses analitik metrik & burndown.
  - `can_manage_users`: Akses menu CRUD User Management (Admin only).
### 5. AI Product Challenger (Gemini API) & Demand Management
- **Senior Product Challenger Session:** PO dapat menguji inisiatif produk secara interaktif melawan AI ex-CPO/Head of Product spesialis finansial/multifinance.
- **Kerahasiaan Prompt Server-Side:** System prompt diinjeksi secara rahasia di backend GAS tanpa kebocoran ke browser klien.
- **Natural AI Initiation:** AI menyapa dan menantang terlebih dahulu: *"Silakan jelaskan inisiatif produk yang ingin kamu ajukan. Ringkas dan konkret."*
- **Pelacakan Attempt & Status Evaluasi:** Sistem melacak jumlah percobaan (*attempts*), catatan evaluasi AI, dan timestamp untuk monitoring Admin.
- **Demand Pipeline & Alokasi Kapasitas:** Inisiatif yang disetujui (*Approved*) otomatis masuk ke tabel `Demands` untuk dihitung kapasitas jam kerjanya oleh Admin/PM dan dapat dikonversi langsung menjadi Proyek aktif.

---

## 📁 Struktur Proyek (Modular)

```text
Alternate Project Delivery/
├── spec.md              # Spesifikasi produk, roles, core mechanics & Scrum workflow
├── plan.md              # Arsitektur sistem, alur Backlog/Sprint engine & Time-in-Status
├── data-model.md        # Skema dan relasi tabel Google Sheets (termasuk status sprint)
├── tasks.md             # Rencana tahapan eksekusi agile
├── README.md            # Dokumentasi panduan setup, alur kerja dan coding style
│
├── src/                 # File sumber aplikasi Google Apps Script
│   ├── Code.gs          # Entry point utama (doGet, include helper, routing RBAC)
│   ├── Setup.gs         # Skema database Google Sheets & data simulator
│   ├── API.gs           # Endpoint Projects, Sprints, Backlog, dan Tasks CRUD
│   ├── Insights.gs      # Mesin kalkulasi Lead Time, Cycle Time, Burndown, Blocker
│   ├── ChallengerAI.gs  # Controller Gemini API Product Challenger & Demand Management
│   ├── Index.html       # Shell HTML utama
│   ├── UI.html          # Komponen layout modular (Navbar, Sidebar, Dashboard, Board, Demand)
│   └── js_main.html     # Client-side controller, SPA logic, Drag-Drop, Chat & Chart.js
```

---

## 🚀 Panduan Setup di Google Apps Script (GAS)

1. **Siapkan Google Spreadsheet:**
   - Buat Google Spreadsheet baru di Google Drive Anda.
   - Buat 7 sheet/tab (atau biarkan fungsi `setup_database_schema` membuatnya otomatis):
     - `Users`
     - `Projects`
     - `Sprints`
     - `Tasks`
     - `Task_History`
     - `Initiative_Tests`
     - `Demands`
   - Salin ID Spreadsheet dari URL (contoh: `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`).

2. **Buka Script Editor:**
   - Di menu Google Spreadsheet, klik **Extensions** > **Apps Script**.

3. **Deploy File Kode:**
   - Salin seluruh file dari folder `src/` (`Code.gs`, `Setup.gs`, `API.gs`, `Insights.gs`, `ChallengerAI.gs`, `Index.html`, `UI.html`, `js_main.html`).
   - Tempelkan `SPREADSHEET_ID` Anda di baris atas file `Code.gs`.
   - Jalankan fungsi `seed_dummy_data` di file `Setup.gs` satu kali untuk menginjeksi struktur data awal.

4. **Konfigurasi Gemini API Key (Aman via Script Properties):**
   - Di panel kiri Apps Script editor, klik **Project Settings** (ikon roda gigi ⚙️).
   - Gulir ke bagian **Script Properties**, lalu klik **Add script property**.
   - Masukkan Property: `GEMINI_API_KEY` dan Value: `<API_KEY_GEMINI_ANDA>`.
   - Simpan Script Property. API key Anda terlindungi dengan aman di backend environment Google tanpa pernah terekspos ke repositori git atau klien browser.

5. **Deploy sebagai Web App:**
   - Klik tombol **Deploy** > **New deployment**.
   - Pilih type: **Web app**.
   - **Execute as:** `User accessing the web app`.
   - **Who has access:** `Anyone with Google account`.
   - Buka URL Web App yang dihasilkan.

---

## 📐 Coding Style & Guidelines
- **Variabel & Fungsi:** Gunakan format `snake_case` (contoh: `get_user_role()`, `create_new_task()`).
- **Class:** Gunakan format `CamelCase` (contoh: `TaskController`).
- **Comments & Docstrings:** Wajib menggunakan format JSDoc pada setiap fungsi.
- **Agile Quality Gate:** Pastikan setiap fitur diuji menyeluruh sebelum diselesaikan.
