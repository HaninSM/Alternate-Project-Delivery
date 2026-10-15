# Alternate Project Delivery (LITE)

Aplikasi manajemen proyek *hybrid* (menjembatani fleksibilitas Notion dan ketegasan Jira) dengan fokus utama menyajikan **Actionable Insights** (Burndown Chart, Lead Time, Cycle Time, Blocker Highlights, dan Time-in-Status Reporting) untuk Project Manager, transparansi real-time bagi klien eksternal, dilengkapi asisten evaluasi **AI Product Challenger**, serta editor spesifikasi **WYSIWYG** yang mendukung integrasi copy-paste tabel dari Microsoft Excel & Google Sheets.

---

## 🛠 Tech Stack (LITE Version)
- **Backend & Web Hosting:** [Google Apps Script (GAS)](https://developers.google.com/apps-script)
- **Database:** [Google Sheets](https://www.google.com/sheets/about/) (sebagai database relasional terstruktur 7 tab)
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, [Tailwind CSS](https://tailwindcss.com/) (via CDN)
- **Data Visualization:** [Chart.js](https://www.chartjs.org/) (via CDN)
- **Generative AI:** [Google Gemini API](https://ai.google.dev/) (via REST API di Apps Script)
- **Authentication & RBAC:** Google Identity bawaan dengan resolusi sesi email akun Google aktif

---

## 🌟 Fitur Utama & Alur Kerja

### 1. Inisiasi Proyek & Selector Proyek Aktif (Navbar)
- **Mode Kanban & Scrum:** Inisiasi proyek baru dengan alur kontinu Kanban atau siklus iterasi Scrum ber-bucket.
- **Header Project Dropdown:** Berpindah ruang kerja antar proyek secara instan langsung dari dropdown di navbar atas tanpa harus kembali ke dasbor.

### 2. Unified Project Workspace (Sub-Navbar Tabs)
- Navigasi proyek disatukan dalam satu menu utama **Project** dengan sub-tab:
  - **Tab Kanban Board:** Papan eksekusi sprint aktif dengan alur 4 status: `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`.
  - **Tab Sprint Planning:** Ruang perencanaan Product Backlog dan pengelolaan bucket Sprint (Planning, Start Sprint, Complete Sprint dengan rollover).

### 3. Kanban Swimlane Grouping & Konfirmasi Auto-Parent Done
- **Opsi Grouping Papan Kanban:** Selector di toolbar board (`#select-kanban-group-by`) dengan 4 opsi:
  - `Subtask / Parent` (Default): Mengelompokkan subtask (Level -1) di bawah baris horizontal parent Level 0 (Story, Task, Bug) masing-masing.
  - `Inisiatif`: Mengelompokkan pekerjaan di bawah inisiatif Level 1.
  - `Assignee`: Mengelompokkan pekerjaan per PIC pelaksana.
  - `None (Tanpa Grouping)`: Tampilan datar (*flat*) 4 kolom klasik.
- **Baris Swimlane Parent Interaktif:**
  - Baris horizontal collapsible dengan panah toggle (`v` / `>`).
  - Ikon work type, Parent ID, judul, counter subtask (`X of Y subtasks`), status badge, dan tombol cepat `+` Subtask.
  - Sub-grid 4 kolom mandiri untuk drag-and-drop subtask antar status.
  - Swimlane khusus `Work Item Mandiri (Tanpa Subtask)` untuk menampung item Level 0 yang belum memiliki subtask.
- **Modal Konfirmasi Auto-Parent Done:**
  - Saat subtask terakhir dari sebuah parent digeser ke status `DONE`, jika parent belum `DONE`, modal konfirmasi bergaya Jira otomatis muncul (`Update Story TES-3`, `All subtasks are now complete. Do you want to update this parent work item to match?`).
  - Mengklik `Update` otomatis memutasi status parent menjadi `DONE` secara atomik di UI dan backend.

### 4. Hirarki Tipe Pekerjaan (Work Type Hierarchy) & Pemindahan Sepaket
- **Struktur Hirarki 3 Level:**
  - **Level 1 (`INITIATIVE`):** Sasaran strategis makro (tanpa parent).
  - **Level 0 (`USER_STORY`, `TASK`, `BUG`):** Pekerjaan fungsional standar (opsional memiliki parent Inisiatif).
  - **Level -1 (`SUBTASK`):** Pecahan teknis terkecil (**wajib** memiliki parent Level 0).
- **Bundled Hierarchy Move Engine:**
  - Menggeser kartu Level 0 (Story/Task/Bug) otomatis memindahkan seluruh Subtask (-1) yang bertaut ke sprint tujuan dalam satu paket.
  - Menggeser Inisiatif Level 1 otomatis memindahkan seluruh pohon anak (Level 0 & Subtask -1).
  - Subtask mandiri tetap dapat dialokasikan secara independen jika diperlukan.
- **Visual Indentasi Rapi:** Kartu subtask tampil menempel dan bersarang rapi di bawah kartu parent dengan border penanda khusus.

### 5. Field Deskripsi WYSIWYG & Copy-Paste Tabel Excel
- **Toolbar Pemformatan Lengkap:**
  - Gaya huruf: Bold, Italic, Underline, Strikethrough.
  - Hirarki: Heading 2, Heading 3, Paragraf Normal.
  - Daftar: Bullet List, Numbered List.
  - Generator Tabel Instan: Tombol **+ Tabel** (3x3 grid) dan kontrol baris/kolom (**+ Baris**, **+ Kolom**, **- Baris**, **- Kolom**).
  - Clear formatting.
- **Mesin Interceptor Clipboard Excel & Spreadsheet:**
  - **HTML Paste:** Menyaring tag asing bawaan Microsoft Office (`mso-*`, fixed pixel width, font inline) dan mengonversinya menjadi tabel HTML bersih dengan styling Tailwind CSS terintegrasi.
  - **TSV Paste:** Mengonversi data plaintext berpemisah tab (`\t`) dan baris baru (`\n`) menjadi tabel HTML ber-header lengkap secara otomatis.
  - **Scroll Responsif:** Tabel dibungkus kontainer `overflow-x-auto` ber-border halus sehingga tabel lebar tidak merusak tampilan.

### 6. Modal Detail Work Item (`#modal-task-detail`) & Quick Edit
- **Klik Kartu untuk Buka Detail:** Mengklik kartu tugas pada Kanban Board atau Backlog memunculkan dialog modal detail lengkap yang menampilkan status, assignee, estimasi, dan rendering HTML deskripsi secara utuh.
- **Tombol Edit Cepat:** Tombol *Edit Work Item* membuka form edit modal terisi data lengkap untuk pembaruan cepat.
- **Indikator Visual `📝`:** Kartu di Kanban dan Backlog otomatis menampilkan ikon `📝` jika task telah dilengkapi deskripsi atau tabel rincian.

### 7. Time-in-Status & Cycle Time Reporting
- **Pelacakan Durasi Per Kolom:** Mengukur durasi aktual sebuah task berada di kolom `TODO`, `IN_PROGRESS`, dan `REVIEW`, termasuk penanganan akumulasi durasi pada kasus *re-entry* (misal dikembalikan dari Review ke In Progress).
- **Dual-Channel API:** Menjamin pemrosesan tanggal GAS yang aman dan serialisasi data yang akurat.
- **Deteksi Blocker Otomatis:** Menyorot task non-DONE yang macet di status tertentu melampaui 48 jam.

### 8. Manajemen Pengguna & Granular RBAC Permissions
- **Role Presets:** `ADMIN`, `PM`, `MEMBER`, `CLIENT`.
- **Modular Permissions:** Administrator dapat menyesuaikan izin per pengguna secara mandiri:
  - `can_create_project`: Inisiasi / buat project baru.
  - `can_manage_sprint`: Buat bucket sprint, start sprint, dan complete sprint.
  - `can_create_task`: Buat work item di Backlog & Board.
  - `can_move_task`: Geser kartu di Kanban & alokasi bucket sprint.
  - `can_view_insights`: Akses metrik burndown & analitik.
  - `can_view_cycle_time`: Akses pelaporan Time-in-Status & Cycle Time.
  - `can_test_initiative`: Akses pengujian inisiatif bersama AI Challenger.
  - `can_manage_demand`: Akses modul Demand Management & alokasi kapasitas.
  - `can_manage_users`: Akses menu CRUD User Management (Admin only).

### 10. Redesain UI Google Stitch: Modern Jira Detail Modal & Executive Health Dashboard
- **Modern Jira-Style Work Item Detail Modal (Screens 1 & 3):**
  - **Navigasi Breadcrumb Interaktif:** Menampilkan hierarki kontekstual `[Project] > [Sprint] > Stories & Tasks > [Task ID]`.
  - **Status Dropdown Pill Langsung:** Status pill interaktif (`● IN PROGRESS v`, `● TODO v`, dsb) untuk mengubah status work item langsung dari dalam modal.
  - **Dua Kolom Responsif:** Kolom kiri (65%) untuk spesifikasi WYSIWYG, tabel dictionary, dan box Acceptance Criteria terverifikasi; kolom kanan (35%) untuk Konfigurasi Penugasan (Assignee avatar inisial `RD`, Reporter `BH`, sprint, parent inisiatif, estimasi jam, story points) serta Time-in-Status Audit (total durasi `Total: 24 Jam`, segmented horizontal bar, 3 box status durasi, dan log mutasi audit trail).
- **Executive Health Dashboard / Transparency Mode (Screen 2):**
  - **Header Transparansi Perbankan:** Header berstandar perbankan dengan `External Client Transparency Mode`, `Audit ID: #OJK-2024-S4`, dan status `Live Synced`.
  - **4 Executive KPI Cards:** Burndown Progress Gauge (% On Track), Average Lead Time (Hari & Jam), Average Cycle Time (Hari & Jam + evaluasi SLA < 2.5 Hari), dan Active Blockers (> 48 Jam).
  - **Sprint Burndown Velocity & Donut Chart:** Visualisasi kurva burndown dengan banner proyeksi selesai serta Time-in-Status Donut Chart dengan center overlay (`3.0d Avg Total`) dan breakdown legend.
  - **Escalation Alert Table:** Tabel monitoring task macet > 48 jam dengan tombol aksi intervensi PM (*Eskalasi ke Lead QA* [merah] dan *Minta Update Status* [biru]).

---

## 📁 Struktur Proyek (Modular)

```text
Alternate Project Delivery/
├── spec.md              # Spesifikasi produk, roles, core mechanics & work type hierarchy
├── plan.md              # Arsitektur sistem, alur Backlog/Sprint engine & WYSIWYG paste
├── data-model.md        # Skema 7 sheet Google Sheets dan diagram relasi data
├── tasks.md             # Catatan tahapan eksekusi agile (Tahap 1 s.d. Tahap 18)
├── README.md            # Dokumentasi panduan setup, fitur, dan pedoman teknis
│
├── src/                 # Berkas sumber aplikasi Google Apps Script
│   ├── Code.gs          # Entry point utama (doGet, include helper, routing RBAC)
│   ├── Setup.gs         # Skema database 7 sheet Google Sheets & data simulator
│   ├── API.gs           # Endpoint Projects, Sprints, Backlog, Tasks, Audit Detail & Users
│   ├── Insights.gs      # Mesin kalkulasi Lead Time, Cycle Time, Burndown, Time-in-Status Donut
│   ├── ChallengerAI.gs  # Controller Gemini API Product Challenger & Demand Management
│   ├── Index.html       # Shell HTML utama & global CSS styling (.wysiwyg-table)
│   ├── UI.html          # Layout modular (Navbar, Sidebar, Board, Stitch Modals & Executive Dashboard)
│   └── js_main.html     # Client-side controller, Drag-Drop, WYSIWYG, Donut Chart & Chart.js
│
└── tests/               # Automated Unit Test Suites (Node.js)
    ├── test_stage1.js   # Setup & Pondasi Backend
    ├── test_stage2.js   # Frontend UI & SPA Shell
    ├── test_stage3.js   # Core Mechanics & Time-in-Status
    ├── test_stage4.js   # Insight Engine (Metrics & Burndown)
    ├── test_stage5_e2e.js # End-to-End Validation
    ├── test_stage6_scrum.js # Scrum Backlog & Sprint Planning
    ├── test_stage7_rbac.js # RBAC & User Management CRUD
    ├── test_stage8_complete_sprint.js # Complete Sprint & Rollover
    ├── test_stage9_project_tabs.js # Unified Project Tabs Navigation
    ├── test_stage10_cycle_time.js # Cycle Time Analytics Reporting
    ├── test_stage11_challenger_demand.js # AI Challenger & Demand Pipeline
    ├── test_stage12_work_type_hierarchy.js # Work Type Hierarchy Engine
    ├── test_stage13_subtask_bundle_move.js # Bundled Move & Subtask UI Alignment
    ├── test_stage14_wysiwyg_excel_paste.js # WYSIWYG Description & Excel Paste
    ├── test_stage15_kanban_grouping_parent_done.js # Kanban Swimlanes & Auto-Parent Done
    ├── test_stage16_story_points_level_0.js # Story Points Field (Khusus Level 0)
    ├── test_stage17_sprint_progress_burndown.js # Sprint Progress & Burndown (Story Points)
    └── test_stage18_stitch_executive_dashboard_detail_modal.js # Stitch UI Redesign
```

---

## 🚀 Panduan Setup di Google Apps Script (GAS)

1. **Siapkan Google Spreadsheet:**
   - Buat Google Spreadsheet baru di Google Drive Anda.
   - Salin ID Spreadsheet dari URL (contoh: `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`).

2. **Buka Script Editor:**
   - Di menu Google Spreadsheet, klik **Extensions** > **Apps Script**.

3. **Deploy File Kode:**
   - Salin seluruh file dari folder `src/` (`Code.gs`, `Setup.gs`, `API.gs`, `Insights.gs`, `ChallengerAI.gs`, `Index.html`, `UI.html`, `js_main.html`).
   - Tempelkan `SPREADSHEET_ID` Anda di baris atas file `Code.gs`.
   - Jalankan fungsi `seed_dummy_data` di file `Setup.gs` satu kali untuk menginjeksi 7 tab skema dan data awal.

4. **Konfigurasi Gemini API Key (Aman via Script Properties):**
   - Di panel kiri editor Apps Script, klik **Project Settings** (ikon roda gigi ⚙️).
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

## 🧪 Pengujian Otomatis (Quality Gate)
Seluruh modul dan logika bisnis dilindungi oleh 18 automated test suite berbasis Node.js:
```bash
# Menjalankan seluruh test suite tahap 1 sampai 18
Get-ChildItem -Path tests -Filter *.js | ForEach-Object { node $_.FullName }
```
Hasil uji coba: **18 Test Suites PASS (100% Green)** tanpa error.
