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
