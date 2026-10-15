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
- [x] Editor WYSIWYG pada form task mendukung formatting kaya (Bold, Italic, Headings, Lists, Insert Table).
- [x] Paste tabel dari Microsoft Excel / Google Sheets otomatis dibersihkan dan dirender rapi sebagai tabel HTML responsif.
- [x] Mengklik kartu task pada Kanban Board atau Backlog memunculkan Modal Detail Work Item lengkap dengan deskripsi dan tombol edit.
- [x] Kartu tugas menampilkan indikator `📝` jika memiliki deskripsi rincian dan badge `pts` jika memiliki Story Point.
- [x] Start Sprint dan Complete Sprint dengan post-sprint rollover berjalan akurat.
- [x] AI Product Challenger mengevaluasi inisiatif produk dan merouting inisiatif yang disetujui ke Demand Management.
- [x] Pelaporan Time-in-Status & Cycle Time akurat dengan deteksi blocker otomatis.
- [x] Seluruh 16 stage test suites lulus 100% (Green).


