# Architecture & Implementation Plan: Alternate Project Delivery (LITE)

## 1. System Architecture

```
+-----------------------------------------------------------------------------------------+
|                                      Frontend Layer                                     |
|  - HTML5 + Tailwind CSS (Single Page Application via GAS HTMLService)                   |
|  - Welcome Dashboard & Daftar Proyek Dinamis                                            |
|  - Global Navbar: User Profile Badge & Proyek Aktif Dropdown Selector                   |
|  - Unified Project Workspace: Sub-Navbar Tabs (Kanban Board vs Sprint Planning)         |
|  - Work Type Hierarchy UI (-1 Subtask, 0 Story/Task/Bug, 1 Inisiatif)                   |
|  - Bundled Move Drag-and-Drop & Quick Move Dropdowns                                    |
|  - WYSIWYG Rich Text Editor & Excel/Google Sheets Table Paste Interceptor                |
|  - Modal Detail Work Item (Rendered HTML Description & Quick Edit Trigger)              |
|  - Senior AI Product Challenger Chat Interface (Gemini API)                             |
|  - Demand Management & Capacity Allocation View                                         |
|  - Cycle Time & Time-in-Status Analytics Reporting                                      |
|  - Actionable Insights Dashboard (Chart.js Burndown Line & Blocker Highlights)          |
+-----------------------------------------------------------------------------------------+
                                             |
                                             | google.script.run (RPC calls)
                                             v
+-----------------------------------------------------------------------------------------+
|                                 Backend Layer (GAS Core)                                |
|    - Code.gs         : Entry point, doGet(), modular include(), RBAC session resolver   |
|    - API.gs          : Project CRUD, Sprint Bucket API, Work Type Hierarchy Engine,     |
|                        Bundled Move, Task CRUD, update_task_details, User Management    |
|    - Insights.gs     : Time-in-Status calculation, Cycle Time dual-channel API,         |
|                        Burndown series engine, Blocker escalation detector              |
|    - ChallengerAI.gs : Gemini API client, system prompt security, AI evaluation parser, |
|                        Initiative test tracking, Demand pipeline converter              |
|    - Setup.gs        : 7-Sheet schema migration engine, auto-backfill, dummy data seed  |
+-----------------------------------------------------------------------------------------+
                                             |
                                             | SpreadsheetApp API
                                             v
+-----------------------------------------------------------------------------------------+
|                              Database Layer (Google Sheets)                             |
|   1. Users            : id, name, email, role, permissions (JSON)                       |
|   2. Projects         : id, name, pm_id                                                 |
|   3. Sprints          : id, project_id, name, start_date, end_date, status              |
|   4. Tasks            : id, sprint_id, title, status, assignee_id, estimate_hours,      |
|                         created_at, updated_at, work_type, hierarchy_level, parent_id,  |
|                         description (HTML WYSIWYG)                                      |
|   5. Task_History     : id, task_id, old_status, new_status, changed_by, timestamp      |
|   6. Initiative_Tests : id, user_email, initiative_title, attempt_count, status,        |
|                         ai_summary_note, conversation_history (JSON), timestamps        |
|   7. Demands          : id, initiative_test_id, title, submitter_email, prd_summary,    |
|                         fsd_summary, est_engineers, est_duration_days, capacity_status, |
|                         allocated_capacity_hours, capacity_notes, timestamps            |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Work Type Hierarchy & Bundled Hierarchy Move Engine

### 2.1 Skema & Level Angka Numerik
Setiap work item di sheet `Tasks` memiliki tipe pekerjaan (`work_type`) dan level angka numerik (`hierarchy_level`):
- **Level 1 (`INITIATIVE`):** Inisiatif strategis makro. Wajib `parent_id = ''`.
- **Level 0 (`USER_STORY`, `TASK`, `BUG`):** Unit pengerjaan fungsional standar. Opsional memiliki `parent_id` yang merujuk ke Inisiatif Level 1.
- **Level -1 (`SUBTASK`):** Pecahan unit teknis terkecil. **Wajib** memiliki `parent_id` yang merujuk ke item Level 0 (`TASK`, `USER_STORY`, atau `BUG`).

### 2.2 Validasi Relasi Parent-Child (Backend & Frontend)
1. **Pencegahan Child Ilegal:**
   - Subtask tidak boleh memilih parent berlevel 1 (Inisiatif) atau sesama Level -1 (Subtask).
   - Work item tidak boleh memilih dirinya sendiri sebagai parent (`parent_id !== task_id`).
2. **Pencegahan Double-Counting Estimasi Jam:**
   - Pada penghitungan total jam dan burndown chart, kalkulasi mendeteksi *leaf nodes* (anak daun terluar) agar estimasi jam Subtask tidak terhitung ganda dengan estimasi jam parent item-nya.

### 2.3 Logika Pemindahan Sepaket (*Bundled Hierarchy Move*)
1. Saat user memindahkan kartu Level 0 dari Backlog ke Sprint (atau sebaliknya):
   - Sistem menelusuri seluruh subtask berlevel -1 yang memiliki `parent_id === task_id`.
   - Seluruh subtask tersebut ikut diperbarui kolom `sprint_id`-nya ke sprint tujuan dalam transaksi yang sama.
2. Saat user memindahkan Inisiatif Level 1:
   - Sistem menelusuri seluruh anak Level 0, beserta seluruh cucu Subtask Level -1, lalu memindahkannya sepaket.
3. Subtask mandiri tetap dapat dipindahkan secara independen jika diperlukan reposisi beban kerja.

---

## 3. WYSIWYG Description Editor & Excel Table Paste Architecture

### 3.1 Komponen Editor & Toolbar
- Toolbar terpasang di atas kontainer `contenteditable` (`#editor-task-description`):
  - Perintah `document.execCommand` untuk format teks standar: `bold`, `italic`, `underline`, `strikeThrough`, `insertUnorderedList`, `insertOrderedList`, `removeFormat`.
  - Format blok: `formatBlock` untuk `h3`, `h4`, `p`.
  - Alat tabel instan: `insert_editor_table(rows, cols)` membuat tabel 3x3 dengan tag `<thead>`, `<th>`, `<tbody>`, `<tr>`, `<td>`.
  - Kontrol sel aktif: `editor_table_action` mendeteksi sel tabel aktif kursor dan mengeksekusi penambahan baris (`add-row`), kolom (`add-col`), penghapusan baris (`del-row`), atau penghapusan kolom (`del-col`).

### 3.2 Dual-Channel Clipboard Interceptor Engine
Saat pengguna menempelkan data (<kbd>Ctrl+V</kbd>) ke dalam editor, event listener `paste` mengintersepsi payload clipboard:
1. **Deteksi Tabel HTML (`text/html`):**
   - Mengambil clipboard `text/html`.
   - Jika terdapat tag `<table` atau `<tr`:
     - Membaca DOM dokumen via `DOMParser`.
     - Menghapus atribut asing bawaan Microsoft Office (`xmlns:o`, `xmlns:x`, `class="xl..."`, style lebar tetap dalam `pt`).
     - Menyematkan class Tailwind `.wysiwyg-table`, styling border slate, background header slate, dan membungkusnya dalam kontainer `<div class="overflow-x-auto my-2 border border-slate-200 rounded-lg">`.
     - Menyisipkan tabel bersih ke posisi kursor pengguna.
2. **Deteksi Matriks TSV (`text/plain`):**
   - Jika `text/html` tidak tersedia atau berupa plain text:
   - Memeriksa apakah teks memuat karakter tab (`\t`) dan pemisah baris (`\n`).
   - Jika terdeteksi format TSV Excel:
     - Mem-parsing setiap baris dan kolom.
     - Baris pertama otomatis dijadikan header (`<th>`), baris selanjutnya menjadi data cells (`<td>`).
     - Menghasilkan tabel HTML terstruktur rapi.

---

## 4. Work Item Detail Modal Architecture

1. **Trigger Klik:**
   - Kartu tugas pada Kanban Board (`create_task_card_element`) dan Backlog Bucket (`create_bucket_task_card_element`) memiliki event `onclick` menuju `open_task_detail_modal(task.id)`.
   - Klik pada tombol aksi atau dropdown diisolasi menggunakan `e.stopPropagation()` agar tidak memicu modal tanpa sengaja.
2. **Display Informasi Lengkap:**
   - Dialog `#modal-task-detail` merender ID, Work Type Badge (Inisiatif/Story/Task/Bug/Subtask), Parent Tag, Status Badge, PIC, Estimasi Jam, Sprint, Waktu Update, serta seluruh HTML Deskripsi (termasuk tabel dan daftar).
3. **Peralihan Cepat ke Edit Mode:**
   - Tombol **Edit Work Item** membuka `#modal-task` dalam mode edit terisi data lengkap (`open_task_modal_for_edit`), memungkinkan pembaruan judul, estimasi jam, PIC, tipe, parent, dan deskripsi secara simultan via API `update_task_details`.

---

## 5. Time-in-Status Engine & Cycle Time Reporting (Dual-Channel API)

1. **Pencatatan Audit Trail Atomik:**
   - Setiap pergeseran status task memanggil RPC `update_task_status(task_id, new_status)`.
   - Status baru diperbarui di sheet `Tasks`, dan entri baru dicatat di `Task_History`.
2. **Dual-Channel API:**
   - Channel 1: Mengambil metadata dan riwayat transisi status.
   - Channel 2: Memvalidasi dan menyerialisasi tanggal secara aman untuk konsumsi Chart.js dan tabel pelaporan.
3. **Akumulasi Waktu Per Kolom & Re-entry:**
   - Menghitung total durasi di status `TODO`, `IN_PROGRESS`, dan `REVIEW`.
   - Mengakumulasikan durasi jika sebuah task mengalami siklus *re-entry* (misal dikembalikan dari Review ke In Progress).
4. **Deteksi Blocker Otomatis:**
   - Task aktif non-DONE yang tidak berpindah status > 48 jam otomatis ditandai sebagai Blocker.

---

## 6. AI Product Challenger & Demand Management Workflow

1. **Senior Challenger Session:**
   - PO / Pengusul inisiatif membuka menu **Uji Inisiatif AI**.
   - Sistem memanggil API Gemini di backend (`ChallengerAI.gs`) dengan prompt terenkripsi aman.
   - AI menantang aspek urgensi, ROI bisnis, kepatuhan OJK/BI, dan kompleksitas teknis.
2. **Keputusan Evaluasi & Auto-Routing:**
   - AI menyimpulkan sesi dan menerbitkan status `APPROVED` atau `REJECTED`.
   - Jika `APPROVED`, inisiatif otomatis ditambahkan ke sheet `Demands`.
3. **Alokasi Kapasitas & Konversi Proyek:**
   - PM / Admin membuka tab **Demand Management**.
   - Menginput estimasi insinyur, durasi pengerjaan, dan alokasi jam kerja.
   - Menekan tombol **Konversi ke Proyek** untuk secara instan melahirkan Project baru di sistem.

---

## 7. Kanban Swimlane Grouping & Auto-Parent Done Engine

1. **Multi-Mode Grouping Controller:**
   - Menyediakan 4 mode grouping visual pada papan Kanban: `parent` (Default), `initiative`, `assignee`, dan `none` (flat).
   - Pengguna dapat mengganti mode melalui dropdown `#select-kanban-group-by` tanpa refresh halaman.
2. **Dynamic Swimlane Board Rendering:**
   - Baris swimlane parent horizontal yang interaktif dan dapat diciutkan (*collapsible*).
   - Memisahkan subtask anak ke dalam sub-grid 4 kolom drag-and-drop di bawah parent masing-masing.
   - Mengelompokkan item tanpa subtask ke dalam swimlane mandiri khusus.
3. **Auto-Parent Done Confirmation Modal:**
   - Listener pergeseran status mendeteksi penyelesaian seluruh subtask di bawah parent non-DONE.
   - Menampilkan modal konfirmasi bergaya Jira (`Update Story TES-3`, `All subtasks are now complete. Do you want to update this parent work item to match?`).
   - Eksekusi konfirmasi memperbarui status parent menjadi `DONE` secara atomik di UI dan backend.

---

## 8. Story Point Input Field (Khusus Hirarki Level 0) & Dasar Metrik Agile

1. **Aturan Integritas Hirarki:**
   - Story point hanya diperuntukkan bagi item Level 0 (`USER_STORY`, `TASK`, `BUG`).
   - Mencegah inkonsistensi estimasi dengan menyembunyikan input pada Level 1 (Inisiatif) dan Level -1 (Subtask) serta membersihkan nilainya di backend database.
2. **Pengalaman Pengguna (UI/UX):**
   - Form pembuatan & pengubahan task menyediakan input Text Box Story Point yang dinamis muncul/hilang sesuai pilihan Work Type.
   - Kartu tugas di Kanban Board dan Product Backlog menampilkan indikator poin yang jelas (misal: `5 pts`).
   - Modal detail task menyajikan informasi Story Point secara terstruktur.
3. **Pondasi Actionable Insights:**
   - Menjadi basis agregasi untuk fitur *Sprint Progress* dan *Sprint Burndown* berbasis Story Points dan Jam Kerja di Actionable Insight.

---

## 9. Sprint Progress & Sprint Burndown Engine (Actionable Insights)

1. **Aturan Pembakaran Story Points (Opsi A):**
   - Story point berada di Level 0 (`USER_STORY`, `TASK`, `BUG`).
   - Poin hanya dihitung selesai (*burned*) ketika item Level 0 berstatus `DONE` DAN seluruh subtask terafiliasi (-1) juga berstatus `DONE`.
   - Menjamin bahwa *velocity* dan *burn progress* mencerminkan penyelesaian fitur secara utuh tanpa premature burn.
2. **Kalkulasi Sprint Progress:**
   - Segmented bar visual dengan rasio Done (Hijau), In Progress (Biru), dan Not Started (Abu-abu).
   - Teks ringkasan dinamis: `X points done, Y points to go`.
3. **Kalkulasi Timeline Burndown:**
   - Garis Guideline Ideal: Penurunan linear dari total komitmen poin ke 0 pada tanggal berakhir sprint.
   - Garis Remaining Work: Menghitung akumulasi sisa Story Points harian dari data `Tasks` dan log `Task_History`, berhenti pada tanggal hari ini.
4. **Interaktivitas:**
   - Dropdown pemilih sprint memungkinkan penelusuran metrik sprint historis maupun sprint aktif.
   - Kartu widget collapsible untuk kenyamanan tampilan pengguna.

---

## 10. Redesain UI Google Stitch: Modern Jira Detail Modal & Executive Health Dashboard

1. **Modern Jira-Style Work Item Detail Modal (Screens 1 & 3):**
   - **Breadcrumb Navigation Interaktif:** `[Project Name] > [Sprint Name] > Stories & Tasks > [Task ID]`.
   - **Status Dropdown Pill Langsung:** Indikator visual berwarna (`● IN PROGRESS v`, `● TODO v`, `● REVIEW v`, `● DONE v`) yang memungkinkan transisi status langsung dari modal.
   - **Kolom Kiri (65%):** Area spesifikasi deskripsi WYSIWYG yang mendukung pemformatan tebal, miring, list, tabel terstruktur, serta card Acceptance Criteria terverifikasi.
   - **Kolom Kanan (35%):**
     - *Konfigurasi Penugasan:* Kartu Assignee PIC lengkap dengan avatar inisial (`RD`) dan role, kartu Reporter PM (`BH`) dan role, sprint aktif, inisiatif parent, estimasi jam, dan story points.
     - *Time-in-Status Audit:* Badge total jam pengerjaan (`Total: 24 Jam`), segmented progress bar (antrian TODO, eksekusi IN PROGRESS, validasi REVIEW), 3 box durasi status, dan log mutasi riwayat audit trail.

2. **Actionable Insights / Executive Health Dashboard (Screen 2):**
   - **Header Transparansi Eksternal:** Mode transparansi perbankan dengan audit token `Audit ID: #OJK-2024-S4` dan status `Live Synced`.
   - **4 Executive KPI Cards:**
     1. *Burndown Progress:* Gauge visual % On Track dengan perbandingan sisa poin vs poin selesai.
     2. *Average Lead Time:* Durasi total dalam hari (`X.X Hari`) dengan jam ekuivalen dan tren vs sprint lalu.
     3. *Average Cycle Time:* Durasi pengerjaan aktif dalam hari (`X.X Hari`) dengan evaluasi target SLA (< 2.5 Hari).
     4. *Active Blockers:* Jumlah task macet > 48 jam dengan tag peringatan aktif.
   - **Baris Tengah (2 Kolom):**
     - Kolom kiri: Grafik kurva *Sprint Burndown Velocity* dilengkapi banner proyeksi tanggal selesai dan daily burn rate.
     - Kolom kanan: *Time-in-Status Donut Chart* dengan teks tengah (`X.Xd Avg Total`) dan breakdown durasi antrian TODO, dev IN PROGRESS, dan QA REVIEW.
   - **Tabel Escalation Alert:**
     - Menampilkan daftar task yang mengalami macet > 48 jam beserta PIC, tipe/parent, durasi macet vs target SLA, serta tombol intervensi PM (*Eskalasi ke Lead QA* [merah] dan *Minta Update Status* [biru]).






---

## 11. Redesain UI Google Stitch: Sprint Planning & Product Backlog Full-Width Enterprise

1. **Transformasi Layout Full-Width Stacked Enterprise:**
   - Mengubah arsitektur 2-kolom lama menjadi tata letak bertumpuk horizontal penuh (Full-Width Stacked) sesuai rancangan Google Stitch `7bed65713a4c4824a4600a1f846c1b00`.
   - **Notice Banner:** Banner cadensi tinggi dengan status sinkronisasi aktif klien (`● Client Sync Active`).
   - **Framework Header & Controls:** Identitas `AGILE FRAMEWORK V2.4 • Continuous Iteration Flow`, badge `Bundled Hierarchy Enabled`, widget metrik total Backlog (`340 Jam (42 pts)`), tombol `+ Buat Bucket Sprint`, dan tombol `+ Buat Work Item Baru`.
   - **Unified Search & Filter Bar:** Pencarian real-time berdasarkan kata kunci/ID, penyaringan tipe item (Inisiatif, User Story, Task, Bug), filter per Assignee, dan tombol toggle penyaringan khusus item ber-Story Points.

2. **Section 1: Accordion Sprint Buckets (#scrum-sprint-buckets-container):**
   - Setiap sprint disajikan sebagai kartu accordion mandiri yang dapat dibuka-tutup.
   - Active Sprint: Menampilkan badge `ACTIVE`, persentase progres (`Progress sprint: 82%`), rentang tanggal, metrik tugas, jam, poin, dan tombol `🏁 Selesaikan Sprint`.
   - Planning Sprint: Menampilkan badge `PLANNING`, tombol `Edit Scope`, tombol `🚀 Start Sprint`, dan empty-state tray drag-and-drop.
   - Row Card Work Item: Baris horizontal rapi berfitur drag handle `::`, badge work type, ID tiket, judul, poin, jam, avatar PIC, status badge, dan quick move selector.

3. **Section 2: Product Backlog & Hierarchical Tree View (#bucket-product-backlog):**
   - Header Backlog dengan total work item counter dan badge indikator `Hierarchical Bundled Move: Active`.
   - Callout box edukasi prinsip Bundled Move (Section 3.3).
   - **Tree View Hirarki Bersarang:**
     - *Level 1 (Inisiatif):* Kartu makro beraksen ungu dengan ringkasan jumlah cerita & subtask terhubung, deskripsi fungsional, dan target rilis.
     - *Level 0 (Story/Task/Bug):* Baris utama dengan badge Story Points, estimasi jam, pill subtask bertaut, avatar PIC, dan dropdown pemindahan.
     - *Level -1 (Subtask):* Cabang pohon bersarang dengan indentasi visual (`ml-6 pl-4 border-l-2 border-indigo-200`) dan konektor `↳`. Dilengkapi kontrol ciut/buka (`🔗 X subtask lainnya disembunyikan`) jika subtask > 2.

4. **Sidebar Left Mini-Widget:**
   - Widget ringkasan kemajuan sprint aktif (`Sprint Scope Progress: 82%` - `28 of 34 tasks completed`) dengan bilah progress bar berwarna indigo.
