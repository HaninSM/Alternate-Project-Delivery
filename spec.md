# Specification: Alternate Project Delivery (LITE)

## 1. Visi Produk
Alternate Project Delivery adalah platform manajemen proyek modern (memadukan fleksibilitas Notion dan ketegasan Jira) yang berfokus menyediakan **Actionable Insights** (Burndown Chart, Lead Time, Cycle Time, Blocker Highlights, dan Time-in-Status Reporting) untuk Project Manager agar dapat mengeskalasi masalah sedini mungkin, sekaligus menyediakan akses transparansi langsung untuk klien eksternal, dilengkapi asisten AI Product Challenger, serta editor spesifikasi WYSIWYG yang mendukung integrasi tabel spreadsheet.

---

## 2. Target Pengguna & Roles (Modular RBAC)
Platform mengidentifikasi pengguna berbasis sesi login akun Google Workspace/Gmail dengan 4 peran dasar dan izin modular fleksibel:
1. **Administrator:**
   - Akses penuh konfigurasi sistem, manajemen master pengguna, dan seluruh proyek.
2. **Project Manager (PM):**
   - Membuat dan mengelola Proyek serta siklus Sprint (Planning, Active, Complete).
   - Mengelola Product Backlog dan Sprint Buckets.
   - Mengatur Work Type Hierarchy (Inisiatif, Story, Task, Bug, Subtask).
   - Mengelola dan mengalokasikan task ke anggota tim.
   - Mengakses seluruh Dasbor Insight, Metrik Cycle Time, dan Demand Pipeline.
3. **Team Member:**
   - Melihat dan berpartisipasi pada ruang kerja proyek yang ditugaskan.
   - Memperbarui status task secara drag-and-drop murni (TODO -> IN_PROGRESS -> REVIEW -> DONE).
   - Menambahkan estimasi jam, membuat subtask teknis, dan mengisi rincian deskripsi WYSIWYG.
4. **External Client (Read-Only):**
   - Akses dasbor transparan khusus untuk memantau progres sprint, burndown, dan blocker secara real-time.
   - Dilindungi proteksi read-only: tidak dapat mengubah data task maupun memindahkan sprint.

---

## 3. Core Mechanics & Fitur Utama

### 3.1 Pilihan Metodologi Proyek: Kanban vs Scrum
- **Mode Kanban:**
  - Alur kontinu tanpa batasan iterasi sprint.
  - Task mengalir langsung di papan 4 kolom kanban.
- **Mode Scrum:**
  - Dilengkapi antarmuka **Sprint Planning & Product Backlog**.
  - **Bucket Product Backlog:** Wadah awal seluruh task/pekerjaan yang belum dijadwalkan.
  - **Bucket Sprint (Iterasi Timeboxed):** PM dapat membuat *Sprint 1*, *Sprint 2*, dst.
  - **Drag & Drop Planning:** PM memindahkan task dari Bucket Backlog ke Bucket Sprint target.
  - **Start Sprint Action:** Tombol aktivasi sprint dengan input durasi (1-4 minggu) dan *Sprint Goal*. Setelah dimulai, status sprint menjadi `ACTIVE` dan kartu mengalir ke Active Board.
  - **Complete Sprint Action:** PM menyelesaikan sprint aktif dengan opsi retensi task selesai (`DONE`) dan *rollover* otomatis task belum tuntas ke Sprint berikutnya atau kembali ke Backlog.

### 3.2 Hirarki Tipe Pekerjaan (Work Type Hierarchy)
Sistem memiliki struktur hirarki bertingkat 3 level:
1. **Level 1 — Inisiatif (`INITIATIVE`):**
   - Sasaran strategis / *epic* makro berbobot besar.
   - Tidak boleh memiliki parent.
2. **Level 0 — User Story (`USER_STORY`), Task (`TASK`), BUG (`BUG`):**
   - Unit pekerjaan fungsional dan eksekusi standar.
   - Opsional memiliki parent berlevel 1 (Inisiatif).
   - Dapat menjadi parent bagi Subtask.
3. **Level -1 — Subtask (`SUBTASK`):**
   - Pecahan unit teknis terkecil dari pekerjaan Level 0.
   - **Wajib** memiliki parent berlevel 0 (Task, User Story, atau Bug). Tidak dapat berdiri sendiri atau ber-parent Inisiatif langsung.

### 3.3 Pemindahan Sepaket (Bundled Hierarchy Move Engine)
- **Pemindahan Level 0:** Saat kartu Level 0 (User Story / Task / Bug) dipindahkan (baik via drag-and-drop antar bucket maupun quick move dropdown), seluruh Subtask (Level -1) yang bertaut secara otomatis ikut dipindahkan ke bucket tujuan sebagai satu kesatuan paket.
- **Pemindahan Level 1:** Saat Inisiatif dipindahkan, seluruh rantai anak (Level 0 dan Subtask Level -1) ikut dipindahkan bersamaan.
- **Independensi Subtask:** Subtask individual tetap dapat dipindahkan secara mandiri jika diperlukan refactoring alokasi sprint.

### 3.4 Field Deskripsi Detail dengan Editor WYSIWYG & Copy-Paste Tabel Excel
- **Toolbar Pemformatan Teks:**
  - Gaya huruf: Bold (`B`), Italic (`I`), Underline (`U`), Strikethrough (`S`).
  - Hirarki paragraf: Heading 2 (`H2`), Heading 3 (`H3`), Paragraf Normal (`¶`).
  - Daftar: Bullet List (`•`), Numbered List (`1. 2. 3.`).
  - Pembuat Tabel Instan: Tombol **+ Tabel** (otomatis men-generate tabel grid 3x3).
  - Kontrol Baris & Kolom: **+ Baris**, **+ Kolom**, **- Baris**, **- Kolom**.
  - Alat Pembersih: Clear Formatting.
- **Mesin Interceptor Clipboard Excel & Spreadsheet:**
  - **HTML Paste (`text/html`):** Saat meng-copy sel dari Microsoft Excel Desktop / Excel 365 / Google Sheets, sistem secara otomatis mengekstrak struktur tabel, membersihkan tag asing Office (`mso-*`, fixed pixel widths, font inline), dan mengubahnya menjadi tabel HTML bersih dengan class `.wysiwyg-table`.
  - **TSV Paste (`text/plain`):** Saat meng-copy teks berpemisah tab (`\t`) dan baris baru (`\n`), sistem mengenali pola matriks spreadsheet dan mengonversinya menjadi tabel HTML ber-header rapi.
  - **Tampilan Responsif:** Seluruh tabel dibungkus kontainer `overflow-x-auto` ber-border rapi sehingga tabel lebar tidak merusak tata letak dialog.

### 3.5 Modal Detail Work Item (`#modal-task-detail`) & Quick Edit
- **Klik untuk Membuka Detail:** Mengklik kartu tugas pada Kanban Board atau Product Backlog akan memunculkan dialog modal detail lengkap yang menampilkan:
  - ID Task, Badge Work Type, Relasi Parent, Status, PIC Assignee, Estimasi Waktu, Sprint, dan Waktu Update.
  - Tampilan deskripsi HTML lengkap termasuk tabel spesifikasi teknis dan daftar kriteria penerimaan.
  - Tombol **Edit Work Item** untuk langsung beralih ke form edit modal terisi data lengkap.
- **Indikator Visual `📝`:** Kartu tugas pada Kanban Board dan Backlog otomatis menampilkan ikon `📝` jika task tersebut telah dilengkapi deskripsi/tabel detail.

### 3.6 Time-in-Status & Cycle Time Reporting
- **Pencatatan Audit Trail:** Setiap pergeseran status task dicatat di sheet `Task_History` (`old_status`, `new_status`, `changed_by`, `timestamp`).
- **Pelaporan Durasi Per Kolom:** Menghitung durasi akurat task berada di `TODO`, `IN_PROGRESS`, dan `REVIEW` (termasuk penanganan kasus *re-entry* / kartu yang dikembalikan dari Review ke In Progress).
- **Dual-Channel API:** Mendukung pengambilan metadata terisolasi dan pengolahan tanggal aman (*safe date serialization*).
- **Deteksi Blocker Otomatis:** Menyorot task non-DONE yang macet di status tertentu melampaui 48 jam.

### 3.7 AI Product Challenger (Gemini API) & Demand Management Pipeline
- **Senior Product Challenger:** Sesi tanya-jawab interaktif antara Product Owner dan AI Challenger (berperan sebagai ex-CPO / Head of Product industri finansial) untuk menguji kelayakan inisiatif baru.
- **Evaluasi & Keputusan AI:** AI menilai inisiatif produk secara kritis dan memberikan keputusan `APPROVED` atau `REJECTED`.
- **Pipeline Demand:** Inisiatif yang disetujui (`APPROVED`) otomatis masuk ke tab `Demands`.
- **Alokasi Kapasitas & Konversi Proyek:** Admin/PM dapat menghitung dan mengalokasikan kapasitas insinyur pelaksana pada demand yang disetujui, lalu mengonversinya langsung menjadi Proyek aktif di sistem.

### 3.8 Selector Proyek Aktif Dropdown (Header Navbar)
- Navbar dilengkapi dropdown interaktif **Proyek Aktif** (`#header-project-select`).
- Pengguna dapat berpindah ruang kerja antar proyek secara instan dari layar mana pun tanpa harus kembali ke dasbor utama.

### 3.9 Kanban Swimlane Grouping & Auto-Parent Done Confirmation
- **Selector Group by Kanban:** Dropdown di toolbar Kanban Board (`#select-kanban-group-by`) dengan 4 opsi tampilan:
  - `Subtask / Parent` (Default): Mengelompokkan subtask (Level -1) di bawah baris swimlane parent Level 0 (User Story, Task, Bug) masing-masing.
  - `Inisiatif`: Mengelompokkan work item di bawah payung Inisiatif (Level 1).
  - `Assignee`: Mengelompokkan work item berdasarkan PIC penanggung jawab.
  - `None (Tanpa Grouping)`: Tampilan 4 kolom Kanban datar (*flat*).
- **Desain Baris Swimlane Parent:**
  - Collapsible horizontal row dengan tombol toggle panah (`v` / `>`).
  - Ikon Work Type, Parent ID, Parent Title, Indikator progres Subtask (`X/Y subtasks`), dan Status Badge parent.
  - Tombol cepat `+` pada ujung kanan baris untuk langsung menambahkan subtask baru ke parent tersebut.
  - Sub-grid 4 kolom (`TODO`, `IN PROGRESS`, `REVIEW`, `DONE`) berisi kartu-kartu subtask anak dengan drag-and-drop mandiri.
  - Swimlane khusus `Work Item Mandiri (Tanpa Subtask)` untuk menampung item Level 0 yang belum memiliki subtask.
- **Modal Konfirmasi Auto-Parent Done:**
  - Ketika seluruh subtask dari sebuah parent berstatus `DONE` (misal saat subtask terakhir digeser ke kolom DONE), sistem mendeteksi apakah parent belum berstatus `DONE`.
  - Jika parent belum `DONE`, modal konfirmasi (`#modal-parent-done-confirm`) muncul secara otomatis:
    - Judul: `Update [Work Type] [Parent ID]` (contoh: `Update Story TES-3`).
    - Pertanyaan: `All subtasks are now complete. Do you want to update this parent work item to match?`
    - Opsi status: `🔘 Done`.
    - Tombol: `Cancel` (membatalkan tanpa mutasi parent) dan `Update` (mengubah status parent ke `DONE`).

### 3.9 Story Point Field (Khusus Hirarki Level 0) & Dasar Metrik Agile
- **Aturan Hirarki Ketat:**
  - Field `story_points` hanya berlaku dan ditampilkan untuk work item hirarki **Level 0** (`USER_STORY`, `TASK`, `BUG`).
  - Untuk work item **Level 1** (`INITIATIVE`) dan **Level -1** (`SUBTASK`), form input Story Point disembunyikan/dikosongkan, dan di tingkat backend nilainya diabaikan/dikosongkan (`''`).
- **Input Text Box:**
  - Disediakan kontrol input teks (`#input-task-story-points`) pada modal pembuatan/pengubahan task.
  - Mendukung input angka fleksibel (misal skala Fibonacci: 1, 2, 3, 5, 8, 13).
- **Visibilitas pada UI Kartu & Modal:**
  - Kartu Kanban Board dan kartu Product Backlog menampilkan pill badge `[N] pts` untuk work item Level 0 yang memiliki Story Point.
  - Modal Detail Work Item (`#modal-task-detail`) menampilkan section Story Point jika item berlevel 0.

### 3.10 Dasbor Actionable Insights: Sprint Progress & Sprint Burndown
- **Sprint Progress Widget (Jira-style):**
  - Segmented progress bar multi-warna (Hijau: Done, Biru: In Progress, Abu-abu: Not Started).
  - Label persentase penyelesaian (`XX% done`).
  - 3 Kolom metrik ringkasan: Done (% & pts), In progress (% & pts), Not started (% & pts).
  - Teks deskriptif ringkasan: `X points done, Y points to go`.
- **Sprint Burndown Chart (Story Points):**
  - Sumbu X: Timeline tanggal dari `start_date` sampai `end_date` sprint aktif.
  - Sumbu Y: Persentase (0% - 100%) dan Story Points.
  - Garis Guideline (Abu-abu): Penurunan ideal linear dari 100% pada start date ke 0% pada target selesai.
  - Garis Remaining work (Biru): Sisa Story Points aktual harian dengan kurva terisi bayangan lembut (*shaded area*), berhenti tepat pada hari ini.
  - Custom Legend: Lingkaran biru (*Remaining work*) dan lingkaran abu-abu (*Guideline*).
- **Aturan Pembakaran Poin (Opsi A):**
  - Story Points berada di Level 0 (`USER_STORY`, `TASK`, `BUG`).
  - Poin dianggap terbakar (*burned*) saat seluruh subtask (-1) terafiliasi telah berstatus `DONE` dan item Level 0 itu sendiri berstatus `DONE`.
  - Jika item Level 0 mandiri (tanpa subtask), poin terbakar saat item berstatus `DONE`.
- **Sprint Selector:**
  - Dropdown interaktif pada header dasbor memungkinkan pergantian konteks sprint untuk meninjau sprint mana pun dalam proyek.

### 3.8 Redesain UI Google Stitch: Modern Jira Detail Modal & Executive Health Dashboard
- **Modern Jira-Style Work Item Detail Modal (Screens 1 & 3):**
  - **Navigasi Breadcrumb:** Jalur navigasi terstruktur `[Project] > [Sprint] > Stories & Tasks > [Task ID]` pada header modal.
  - **Status Dropdown Pill Interaktif:** Status pill dengan titik indikator warna (`● IN PROGRESS v`, `● TODO v`, dsb) memungkinkan pembaruan status langsung dari modal dengan sinkronisasi ke Kanban Board dan evaluasi auto-parent done.
  - **Spesifikasi & Kriteria (Kolom Kiri 65%):** Rincian deskripsi WYSIWYG, tabel dictionary otomatis, dan checklist Acceptance Criteria terverifikasi.
  - **Konfigurasi Penugasan (Kolom Kanan 35%):**
    - Kartu Assignee PIC dengan avatar inisial 2 huruf (`RD`) dan perannya.
    - Kartu Reporter PM dengan avatar inisial 2 huruf (`BH`) dan peran Product Lead.
    - Rincian Sprint aktif, Parent inisiatif, estimasi jam kerja, Story Points, dan timestamp update.
  - **Time-in-Status Audit (Kolom Kanan 35%):**
    - Header total durasi pengerjaan (`Total: 24 Jam`).
    - Segmented progress bar horizontal 3 segmen warna (Antrian TODO, Eksekusi IN PROGRESS, Validasi REVIEW).
    - Status box per siklus (`In TODO`, `In PROG`, `In REV`).
    - Riwayat mutasi audit trail dengan timestamp dan user mutasi.
- **Actionable Insights / Executive Health Dashboard (Screen 2):**
  - **Transparency Banner:** Banner klien perbankan `External Client Transparency Mode`, `Audit ID: #OJK-2024-S4`, dan `Live Synced`.
  - **4 Executive KPI Cards:**
    1. *Burndown Progress:* Indikator gauge % On Track, status tag (*On Track* / *Behind Track*), dan rincian sisa vs selesai.
    2. *Average Lead Time:* Waktu total dalam hari (`X.X Hari`) dan jam (`X.X Jam`) beserta tren komparasi sprint.
    3. *Average Cycle Time:* Waktu aktif dalam hari (`X.X Hari`) dan jam (`X.X Jam`) dengan evaluasi ambang batas SLA (< 2.5 Hari).
    4. *Active Blockers:* Jumlah pekerjaan macet > 48 jam dengan tag bahaya berkedip.
  - **Baris Tengah (2 Kolom):**
    - Kolom kiri: Grafik kurva *Sprint Burndown Velocity* (remaining work vs guideline) dilengkapi banner proyeksi tanggal selesai dan daily burn rate.
    - Kolom kanan: *Time-in-Status Donut Chart* dengan center text overlay (`X.Xd Avg Total`) dan 3 legend breakdown (TODO Queue, IN PROG Dev, REVIEW QA).
  - **Escalation Alert Table:**
    - Tabel pekerjaan macet > 48 jam yang merinci work item, tipe & parent, PIC assignee lengkap dengan inisial avatar, status aktif, durasi macet vs target SLA 48h, serta tombol intervensi PM (*Eskalasi ke Lead QA* dan *Minta Update Status*).

---

## 4. Acceptance Criteria
- [x] PM login via akun Google & disambut Dashboard Utama dengan daftar proyek terdaftar yang responsif.
- [x] Dropdown Proyek Aktif di Navbar memungkinkan pergantian konteks proyek secara instan.
- [x] Mendukung Hirarki Work Type: Inisiatif (Level 1), User Story/Task/Bug (Level 0), dan Subtask (Level -1).
- [x] Validasi ketat parent-child: Subtask wajib memilih parent Level 0; Inisiatif tidak boleh ber-parent.
- [x] Pemindahan sepaket (*bundled move*): Menggeser parent Level 0 atau Level 1 otomatis membawa seluruh subtask bertaut ke sprint/backlog tujuan.
- [x] Papan Kanban mendukung pengelompokan Swimlane berdasarkan Subtask/Parent (Default), Inisiatif, Assignee, dan None.
- [x] Baris swimlane parent memiliki tombol collapse/expand, status badge, counter subtask, tombol cepat `+`, dan 4 sub-kolom drag-and-drop.
- [x] Penyelesaian seluruh subtask memicu pop-up konfirmasi `Update [Type] [ID]` untuk menyelaraskan status parent menjadi `DONE`.
- [x] Field Story Point berupa text box saat create/edit task hanya muncul dan berlaku pada work item hirarki Level 0 (`USER_STORY`, `TASK`, `BUG`).
- [x] Field Story Point tersembunyi dan tidak disimpan pada Inisiatif (Level 1) dan Subtask (Level -1).
- [x] Menu Actionable Insights menyajikan widget Sprint Progress dengan progress bar bersegmen 3 warna (Done, In Progress, Not Started).
- [x] Menu Actionable Insights menyajikan grafik Sprint Burndown (Guideline linear vs Remaining work aktual berbasis Story Points).
- [x] Penegakan aturan Opsi A: Story Points hanya ter-burn saat seluruh subtask (-1) selesai dan item Level 0 berstatus `DONE`.
- [x] Dropdown pemilih sprint di Actionable Insights mendukung peninjauan berbagai sprint dalam proyek.
- [x] Editor WYSIWYG pada form task mendukung formatting kaya (Bold, Italic, Headings, Lists, Insert Table).
- [x] Paste tabel dari Microsoft Excel / Google Sheets otomatis dibersihkan dan dirender rapi sebagai tabel HTML responsif.
- [x] Modern Jira-Style Task Detail Modal menampilkan breadcrumb interaktif, badges lengkap, dan interactive status dropdown pill.
- [x] Modal detail membagi area 2 kolom: deskripsi WYSIWYG/kriteria penerimaan di kiri, konfigurasi PIC/reporter dan Time-in-Status audit di kanan.
- [x] Executive Health Dashboard menyajikan header transparansi OJK, 4 KPI cards, Sprint Burndown Velocity chart, Time-in-Status Donut Chart, dan Escalation Alert table.
- [x] Seluruh 18 stage test suites lulus 100% (Green).



- [x] Tampilan Sprint Planning & Product Backlog bertransformasi menjadi Full-Width Stacked Enterprise Layout sesuai Google Stitch (`7bed65713a4c4824a4600a1f846c1b00`).
- [x] Dilengkapi Notice Banner cadensi tinggi (`● Client Sync Active`) dan Header Framework V2.4 dengan widget estimasi total Backlog (Jam + Points).
- [x] Search & Filter Bar mendukung pencarian multi-kriteria real-time: kata kunci teks, tipe work item, assignee PIC, dan filter Story Points.
- [x] Wadah Accordion Sprint Buckets menyajikan badge ACTIVE/PLANNING, progress sprint %, metrik total, tombol aksi selesaikan sprint / start sprint, dan empty state tray drag-and-drop.
- [x] Product Backlog menyajikan Tree View Hirarki Bersarang: Kartu Inisiatif makro beraksen ungu, baris User Story/Task Level 0 dengan cabang subtask bertaut berindentasi (`ml-6 pl-4 border-l-2 border-indigo-200`) dan konektor `↳`, serta toggle collapse jika subtask > 2.
- [x] Mini-widget kemajuan sprint aktif terpasang di sisi kiri bawah sidebar (`Sprint Scope Progress: 82%` - `28 of 34 tasks completed`).
- [x] Option 3 (Human-in-the-Loop Management Override) aktif: PM/Admin dapat meng-override inisiatif yang ditolak AI Challenger dengan justifikasi bisnis & mitigasi risiko wajib.
- [x] Inisiatif yang di-override otomatis bertransisi ke status `APPROVED_OVERRIDE`, diteruskan ke Demand Management bertanda badge `⚠️ OVERRIDDEN`, dan dicatat di audit log.
- [x] Seluruh 20 test suites lulus 100% (Green).
