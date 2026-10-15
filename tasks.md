# Execution Tasks: Agile Workflow Roadmap

Roadmap implementasi dilakukan secara bertahap (*incremental development*). Setiap tahap wajib diuji coba secara fungsional melalui automated test suite sebelum melangkah ke tahap selanjutnya.

---

## Tahap 1 - Setup Lingkungan & Pondasi Backend
- [x] Buat 5 sheet/tab awal di Google Sheets (`Users`, `Projects`, `Sprints`, `Tasks`, `Task_History`) beserta header baris 1 (tersedia otomatis via `setup_database_schema()` di `Setup.gs`).
- [x] Buat struktur proyek awal di GAS:
  - `Code.gs`: Inisialisasi `doGet(e)` untuk merender `Index.html` dan fungsi helper `include(filename)`.
  - `Index.html`: Shell HTML dasar.
- [x] Implementasikan fungsi `get_user_role()` di backend untuk mengidentifikasi email aktif Google dan mencocokkannya dengan sheet `Users`.
- [x] **Quality Gate / Uji Coba Tahap 1:**
  - Tes endpoint `doGet()` merender halaman web dengan benar.
  - Tes fungsi `get_user_role()` mengembalikan data user dan role yang sesuai dari sheet. (Diverifikasi via `tests/test_stage1.js`).

---

## Tahap 2 - Frontend UI & SPA Shell
- [x] Tambahkan Tailwind CSS via CDN ke dalam shell template `Index.html`.
- [x] Rancang komponen layout modular:
  - Navbar: Menampilkan identitas aplikasi, info user aktif, dan indikator Role.
  - Sidebar: Menu navigasi (Board, Insights, Project Settings).
- [x] Buat logika navigasi Single Page Application (SPA) berbasis Vanilla JS untuk beralih tampilan (Board view vs Insight view) tanpa reload halaman.
- [x] **Quality Gate / Uji Coba Tahap 2:**
  - Tampilan responsif dan bersih dengan Tailwind CSS.
  - Navigasi antar tampilan (SPA switching) berjalan mulus tanpa error pada console browser. (Diverifikasi via `tests/test_stage2.js`).

---

## Tahap 3 - Core Mechanics (Kanban Board & Time-in-Status Engine)
- [x] Bangun komponen UI Kanban Board dengan 4 kolom status: `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`.
- [x] Buat API backend untuk membaca data:
  - `get_sprint_tasks(sprint_id)`: Mengambil daftar task dalam sprint aktif.
- [x] Implementasikan interaktivitas pergeseran status task di UI (drag-and-drop / dropdown selector dengan optimistic UI update).
- [x] Bangun API backend `update_task_status(task_id, new_status)`:
  - Mengupdate status dan timestamp `updated_at` pada sheet `Tasks`.
  - Secara simultan meng-append log baris baru ke sheet `Task_History` (`task_id`, `old_status`, `new_status`, `changed_by`, `timestamp`).
- [x] **Quality Gate / Uji Coba Tahap 3:**
  - Memindahkan task di UI berhasil memperbarui status kartu di layar.
  - Data di sheet `Tasks` terverifikasi berubah sesuai kolom baru.
  - Baris baru tercatat di sheet `Task_History` dengan timestamp dan email user yang tepat. (Diverifikasi via `tests/test_stage3.js`).

---

## Tahap 4 - Insight Engine (Metrics, Burndown & Blocker Highlights)
- [x] Implementasikan algoritma kalkulasi metrik di backend (`Insights.gs`):
  - Perhitungan Lead Time rata-rata (waktu `created_at` hingga `DONE`).
  - Perhitungan Cycle Time rata-rata (waktu `IN_PROGRESS` hingga `DONE`).
  - Perhitungan Burndown harian (Ideal vs Actual tersisa) berdasarkan `Task_History` dan `estimate_hours`.
  - Deteksi blocker (task aktif yang macet di suatu status melebihi threshold waktu).
- [x] Buat API backend `get_sprint_insights(sprint_id)` yang mengembalikan format JSON terstruktur.
- [x] Integrasikan Chart.js via CDN di frontend:
  - Render grafik garis Burndown (Ideal vs Aktual).
  - Tampilkan kartu metrik rata-rata Lead Time dan Cycle Time.
  - Tampilkan tabel/list Blocker Highlight dengan visual peringatan.
- [x] **Quality Gate / Uji Coba Tahap 4:**
  - Grafik Burndown ter-render dengan benar sesuai riwayat status task.
  - Metrik Lead/Cycle Time menampilkan durasi jam yang akurat.
  - Task yang tidak bergerak terdeteksi sebagai blocker di dasbor. (Diverifikasi via `tests/test_stage4.js`).

---

## Tahap 5 - Quality Gate & End-to-End Validation
- [x] Injeksi data simulasi lengkap (dummy sprint, beragam task, dan log historis pergeseran waktu via `seed_dummy_data()` di `Setup.gs`).
- [x] Validasi *end-to-end* skenario penggunaan:
  - Alur login PM -> Pengecekan sprint -> Pengerjaan task oleh Member -> Perubahan status -> Refresh insight di sisi PM dan Klien Eksternal.
- [x] Verifikasi pembatasan akses Klien Eksternal (Read-only, tidak dapat menggeser task).
- [x] Review kepatuhan konvensi kode (`snake_case` fungsi/variabel, `CamelCase` class, JSDoc/komentar lengkap).
- [x] **Quality Gate / Uji Coba Tahap 5:**
  - Seluruh skenario E2E diverifikasi lulus tanpa error melalui `tests/test_stage5_e2e.js`.

---

## Tahap 6 - Scrum Backlog & Sprint Planning Engine
- [x] Buat API backend pendukung Scrum di `API.gs`:
  - `get_project_backlog_and_sprints(project_id)`: Membaca task backlog dan task per bucket sprint.
  - `create_new_sprint_bucket(project_id, sprint_name)`: Membuat wadah Sprint 2, 3, dst.
  - `move_task_to_sprint(task_id, target_sprint_id)`: Memindahkan task antar bucket (Backlog <-> Sprint).
  - `start_sprint(sprint_id, sprint_name, duration_weeks, sprint_goal)`: Mengaktifkan sprint dan beralih ke Active Board.
- [x] Buat antarmuka UI Scrum Planning di `UI.html`:
  - Menu navigasi sidebar: `Scrum Planning` (otomatis tampil untuk mode Scrum).
  - Wadah Bucket Backlog dengan tombol `+ Tambah Task ke Backlog`.
  - Wadah Bucket Sprint 1..N dengan kalkulasi total scope jam dan tombol `Start Sprint`.
  - Modal dialog konfirmasi Start Sprint (Nama, Durasi, Goal).
- [x] Implementasikan interaksi Drag & Drop antar bucket di `js_main.html`.
- [x] **Quality Gate / Uji Coba Tahap 6:**
  - Uji coba pengisian task ke Backlog.
  - Uji coba drag task dari Backlog ke Sprint bucket.
  - Uji coba Start Sprint yang mengaktifkan sprint dan memunculkan task di Active Board. (Diverifikasi lulus 100% via `tests/test_stage6_scrum.js`).

---

## Tahap 7 - User Management & Modular RBAC Permissions (Opsi 2)
- [x] Modifikasi skema sheet `Users` dengan menambahkan kolom ke-5: `permissions` (JSON format).
- [x] Implementasikan sistem izin modular di `Code.gs`:
  - `DEFAULT_PERMISSIONS` dictionary (`ADMIN`, `PM`, `MEMBER`, `CLIENT`).
  - Helper `resolve_user_permissions(role, permissions_input)`.
- [x] Bangun API backend CRUD User Management di `API.gs`:
  - `get_users_management_list()`: Membaca daftar seluruh pengguna beserta resolusi permissions.
  - `create_new_user(user_input)`: Menambah akun baru dengan validasi anti-duplikasi email.
  - `update_existing_user(user_input)`: Mengubah profil/role/permissions dengan proteksi anti-lockout diri sendiri.
  - `delete_existing_user(user_id)`: Menghapus user dengan proteksi anti-self-deletion.
- [x] Perbarui penjaga otorisasi granular di seluruh endpoint mutasi:
  - `can_create_project`: `create_new_project`
  - `can_manage_sprint`: `create_new_sprint_bucket`, `start_sprint`
  - `can_create_task`: `create_new_task`
  - `can_move_task`: `update_task_status`, `move_task_to_sprint`
  - `can_manage_users`: Seluruh fungsi CRUD pengguna.
- [x] Bangun antarmuka UI di `UI.html` & controller di `js_main.html`:
  - Navigasi sidebar: Menu `Manajemen Pengguna` (hanya tampil jika `can_manage_users: true`).
  - View `view-users`: Tabel pengguna dengan badge role, tag pill izin modular, dan aksi Edit/Hapus.
  - Modal `#modal-user-form`: Form Tambah/Edit dengan dropdown Role preset autofill & checkbox izin granular.
  - Modal `#modal-delete-user`: Dialog konfirmasi penghapusan pengguna yang aman.
- [x] **Quality Gate / Uji Coba Tahap 7:**
  - Uji coba resolusi izin default dan custom override.
  - Uji coba otorisasi admin vs non-admin.
  - Uji coba proteksi anti-lockout dan anti-self-deletion.
  - Uji coba penegakan izin granular pada proyek dan task. (Diverifikasi lulus 100% via `tests/test_stage7_rbac.js`).

---

## Tahap 8 - Complete Sprint (End Sprint) & Post-Sprint Rollover Flow
- [x] Perbarui skema sheet `Sprints` dengan menambahkan kolom ke-6: `status` (`PLANNING`, `ACTIVE`, `COMPLETED`).
- [x] Modifikasi `Setup.gs` untuk memverifikasi kolom `status` dan backfill data sprint eksisting dengan `ACTIVE`.
- [x] Bangun API backend `complete_sprint(input)` di `API.gs`:
  - Penjaga otorisasi granular: hanya user dengan `can_manage_sprint` yang dapat menyelesaikan sprint.
  - Menandai target sprint dengan status `COMPLETED`.
  - Mempertahankan task yang berstatus `DONE` tetap di dalam sprint selesai untuk keakuratan metrik burndown, velocity, dan cycle time historis.
  - Menangani pengalihan (*rollover*) task belum tuntas (`TODO`, `IN_PROGRESS`, `REVIEW`):
    - Opsi A: Dipindahkan ke Sprint Berikutnya (`NEXT_SPRINT`), baik ke draft sprint yang ada atau auto-create sprint baru berstatus `PLANNING`.
    - Opsi B: Dikembalikan ke `Product Backlog` (`BACKLOG-[project_id]`).
  - Mencatat audit trail ke sheet `Task_History` (`Rollover: SPR-X -> SPR-Y`).
- [x] Perbarui frontend UI & controller di `UI.html` dan `js_main.html`:
  - Tombol `🏁 Selesaikan Sprint` di header Kanban Board (tampil jika sprint aktif dan user memiliki izin `can_manage_sprint`).
  - Tampilan Scrum Planning membedakan badge status sprint: `● Aktif Berjalan` + tombol `🏁 Selesaikan Sprint`, `Draft Planning` + tombol `🚀 Start Sprint`, dan `✓ Selesai`.
  - Modal dialog `#modal-complete-sprint` dengan kartu ringkasan tugas (DONE vs Belum Selesai) dan radio pilihan destinasi rollover.
  - Nonaktifkan drag & drop ke sprint yang telah berstatus `COMPLETED` untuk melindungi integritas arsip sprint.
- [x] **Quality Gate / Uji Coba Tahap 8:**
  - Uji coba penolakan RBAC untuk role Client saat memanggil `complete_sprint`.
  - Uji coba penyelesaian sprint dengan opsi rollover ke next sprint.
  - Uji coba retensi task DONE di sprint asal dan pemindahan task belum tuntas ke sprint baru.
  - Uji coba pencatatan audit trail rollover di `Task_History`.
  - Uji coba rollover task ke Product Backlog. (Diverifikasi lulus 100% via `tests/test_stage8_complete_sprint.js`).

---

## Tahap 9 - Unified Project Menu with Tab Navigation
- [x] Unifikasi menu navigasi sidebar: Menggabungkan `Kanban Board` dan `Scrum Planning` menjadi 1 menu utama bernama **Project** (`#nav-btn-project`).
- [x] Rancang wadah tampilan kerja `#view-project` di `UI.html` yang memuat Sub-Navbar Tabs:
  - Tab 1: **Kanban Board** (`#tab-btn-board` -> `#view-board`)
  - Tab 2: **Sprint Planning** (`#tab-btn-planning` -> `#view-scrum-planning`)
- [x] Implementasikan fungsi `switch_project_tab(tab_name)` di `js_main.html` untuk transisi instan antar tab tanpa reload.
- [x] Normalisasi fungsi SPA `switch_view`: panggilan `board` dan `scrum-planning` secara cerdas membuka view `project` pada tab yang sesuai (backward-compatibility terjaga).
- [x] **Quality Gate / Uji Coba Tahap 9:**
  - Uji coba unifikasi tombol navigasi sidebar.
  - Uji coba struktur sub-tab pada ruang kerja proyek.
  - Uji coba fungsionalitas pergantian tab aktif. (Diverifikasi lulus 100% via `tests/test_stage9_project_tabs.js`).

---

## Tahap 10 - Cycle Time & Time-in-Status Reporting (Opsi 2 Dual-Channel API)
- [x] Bangun Dual-Channel API di `Insights.gs`:
  - `get_cycle_time_metadata()`: Mengambil daftar proyek, sprint, dan ringkasan audit log.
  - `get_cycle_time_report(options)`: Menghitung durasi per status (`TODO`, `IN_PROGRESS`, `REVIEW`), penanganan siklus *re-entry*, dan konversi human-readable (`Xd Xh Xm`).
- [x] Penegakan izin granular: `can_view_cycle_time` (didistribusikan ke ADMIN, PM, MEMBER, dan CLIENT).
- [x] Rancang antarmuka UI di `UI.html` (`#view-cycle-time`):
  - Kartu KPI: Rata-rata Lead Time, Cycle Time, Waktu Review, dan Total Task Tuntas.
  - Filter interaktif: Dropdown Proyek, Dropdown Sprint, dan Pencarian Judul/PIC.
  - Tabel rincian transisi task dengan badge status dan visualisasi durasi per kolom.
- [x] **Quality Gate / Uji Coba Tahap 10:**
  - Uji coba kalkulasi durasi per status dan akumulasi re-entry.
  - Uji coba otorisasi izin `can_view_cycle_time`.
  - Uji coba rendering aman tanggal GAS. (Diverifikasi lulus 100% via `tests/test_stage10_cycle_time.js`).

---

## Tahap 11 - AI Product Challenger (Gemini API) & Demand Management Pipeline
- [x] Tambahkan sheet `Initiative_Tests` dan `Demands` di `Setup.gs`.
- [x] Bangun controller Gemini API di `ChallengerAI.gs`:
  - System prompt rahasia ex-CPO / Head of Product spesialis finansial/multifinance.
  - Multi-turn conversation history & attempt tracking counter.
  - Parser keputusan AI (`APPROVED` vs `REJECTED`) dengan pembersihan tag otomatis.
  - Auto-routing inisiatif disetujui langsung ke tab `Demands`.
- [x] Bangun modul Demand Management di `ChallengerAI.gs`:
  - `get_demands_list()`, `update_demand_capacity()`, `convert_demand_to_project()`.
- [x] Bangun UI di `UI.html` (`#view-initiative-test` & `#view-demand-management`):
  - Interface chat interaktif dengan balon percakapan, typing indicator, dan status card.
  - Dashboard Demand Management dengan indikator kapasitas dan modal alokasi insinyur.
- [x] **Quality Gate / Uji Coba Tahap 11:**
  - Uji coba parser evaluasi AI, attempt tracking, dan demand auto-routing.
  - Uji coba alokasi kapasitas dan konversi demand ke project. (Diverifikasi lulus 100% via `tests/test_stage11_challenger_demand.js`).

---

## Tahap 12 - Work Type Hierarchy Engine (Level 1, Level 0, Level -1)
- [x] Perbarui skema sheet `Tasks` dengan kolom `work_type`, `hierarchy_level`, dan `parent_id`.
- [x] Implementasikan pemetaan level hirarki numerik di `API.gs` & `Setup.gs`:
  - Inisiatif: Level 1 (Tanpa parent)
  - User Story, Task, Bug: Level 0 (Opsional parent Inisiatif)
  - Subtask: Level -1 (Wajib parent Level 0)
- [x] Bangun aturan validasi relasi parent-child di `create_new_task` dan `get_eligible_parents_for_task`.
- [x] Hindari double-counting estimasi jam kerja pada grafik Burndown & Scope baris Sprint (*leaf-nodes only aggregation*).
- [x] Agregasi progres subtask pada kartu parent (`subtask_count` & `subtask_done_count`).
- [x] **Quality Gate / Uji Coba Tahap 12:**
  - Uji coba penentuan level angka hirarki (-1, 0, 1).
  - Uji coba validasi relasi legal vs ilegal.
  - Uji coba pencegahan double-counting estimasi jam. (Diverifikasi lulus 100% via `tests/test_stage12_work_type_hierarchy.js`).

---

## Tahap 13 - Bundled Hierarchy Move & Indented Subtask UI Alignment
- [x] Implementasikan fungsi pengurutan hierarkis `sort_tasks_by_hierarchy` di `js_main.html`:
  - Memastikan Subtask (-1) selalu bersarang tepat di bawah kartu parent Level 0-nya.
- [x] Bangun mesin pemindahan sepaket (*bundled move engine*) di `API.gs` (`move_task_to_sprint`):
  - Memindahkan item Level 0 otomatis membawa seluruh Subtask (-1) ke sprint tujuan.
  - Memindahkan Inisiatif Level 1 otomatis membawa seluruh anak Level 0 dan Subtask (-1).
  - Subtask mandiri tetap dapat dipindahkan secara independen.
- [x] Perbarui tata letak UI kartu task di `UI.html` dan `js_main.html`:
  - Tampilan terstruktur 3-baris rapi bebas bentrok visual.
  - Indentasi visual untuk Subtask (`ml-4 sm:ml-6 border-l-4 border-l-indigo-400`).
  - Badge work type warna-warni dan pill indikator progres subtask.
- [x] **Quality Gate / Uji Coba Tahap 13:**
  - Uji coba pengurutan hirarki tampilan.
  - Uji coba pemindahan sepaket Kasus A (Level 0 + Subtask), Kasus B (Inisiatif + Pohon Hirarki), dan Kasus C (Subtask mandiri). (Diverifikasi lulus 100% via `tests/test_stage13_subtask_bundle_move.js`).

---

## Tahap 14 - WYSIWYG Description Editor with Excel Table Paste & Task Detail Modal
- [x] Tambahkan kolom ke-12: `description` pada skema tabel `Tasks` di `Setup.gs`.
- [x] Bangun API backend pendukung deskripsi di `API.gs`:
  - `create_new_task`: Menerima dan menyimpan field `description`.
  - `get_sprint_tasks` & `get_project_backlog_and_sprints`: Mengembalikan kolom `description`.
  - `update_task_details`: Endpoint untuk memperbarui judul, deskripsi, estimasi jam, work type, parent, dan assignee secara bersamaan.
- [x] Bangun Toolbar & Editor WYSIWYG pada dialog form task di `UI.html`:
  - Format teks: Bold, Italic, Underline, Strikethrough, Heading 2, Heading 3, Paragraph, Bullet/Numbered List.
  - Generator tabel instan: Tombol **+ Tabel** (3x3 grid) dan kontrol **+ Baris**, **+ Kolom**, **- Baris**, **- Kolom**.
  - Styling responsif dengan class `.wysiwyg-table` dan wrap `overflow-x-auto`.
- [x] Implementasikan Mesin Interceptor Clipboard Excel & Spreadsheet di `js_main.html`:
  - `sanitize_and_format_excel_html`: Membersihkan tag dan namespace bawaan Microsoft Office MSO, fixed pixel width, dan inline fonts.
  - `convert_tsv_to_html_table`: Mengonversi teks tab-delimited (<kbd>Ctrl+V</kbd>) dari Excel / Google Sheets menjadi tabel HTML terstruktur rapi.
- [x] Bangun Modal Detail Work Item (`#modal-task-detail`) di `UI.html` & `js_main.html`:
  - Menampilkan informasi rincian lengkap tugas, badge hirarki, dan merender HTML deskripsi secara utuh.
  - Tombol **Edit Work Item** untuk langsung membuka form edit terisi data lengkap.
  - Indikator visual `📝` pada kartu tugas di Kanban Board dan Product Backlog.
- [x] **Quality Gate / Uji Coba Tahap 14:**
  - Uji coba pembersihan HTML tabel dari Microsoft Excel.
  - Uji coba konversi data TSV Excel ke tabel HTML.
  - Uji coba CRUD deskripsi pada backend database.
  - Uji coba integritas berkas sumber. (Diverifikasi lulus 100% via `tests/test_stage14_wysiwyg_excel_paste.js`).

---

## Tahap 15 - Kanban Swimlane Grouping & Auto-Parent Done Confirmation
- [x] Tambahkan Grouping Selector pada Toolbar Kanban Board (`#select-kanban-group-by`):
  - Opsi: `Subtask / Parent` (Default), `Inisiatif`, `Assignee`, `None (Tanpa Grouping)`.
- [x] Bangun Arsitektur Papan Kanban Dinamis (`#kanban-board-container`):
  - Global Sticky Header Row untuk 4 Kolom (`TO DO`, `IN PROGRESS`, `REVIEW`, `DONE`) dengan total counter.
  - Baris Swimlane Parent horizontal yang dapat di-collapse / expand:
    - Tombol panah toggle (`v` / `>`).
    - Ikon dan Badge Work Type (`Story`, `Task`, `Bug`, `Inisiatif`).
    - Key Parent, Judul tugas, Indikator jumlah subtask (`X of Y subtasks`), Status Badge, dan Tombol Cepat `+` Subtask.
  - Sub-grid 4 Kolom di bawah setiap swimlane parent berisi kartu subtask anak dengan drag-and-drop mandiri.
  - Swimlane khusus untuk `Work Item Mandiri (Tanpa Subtask)` untuk menampung item Level 0 yang belum memiliki subtask.
- [x] Bangun Modal Konfirmasi Auto-Parent Done (`#modal-parent-done-confirm`):
  - Mendeteksi saat subtask terakhir dari sebuah parent dipindahkan ke status `DONE`.
  - Jika parent belum `DONE`, memunculkan dialog konfirmasi persis seperti Jira:
    - Judul: `Update [Work Type] [Parent ID]` (contoh: `Update Story TES-3`).
    - Pesan: `All subtasks are now complete. Do you want to update this parent work item to match?`
    - Radio Selector: `🔘 Done`.
    - Tombol `Cancel` dan `Update`.
  - Menangani aksi `Update`: Memanggil `update_task_status(parent_id, 'DONE')`, memperbarui status parent di memori, me-render ulang papan, dan menampilkan notifikasi.
- [x] **Quality Gate / Uji Coba Tahap 15:**
  - Uji coba elemen UI Grouping Selector dan Modal Dialog Konfirmasi di `UI.html`.
  - Uji coba definisi handler dan fungsi-fungsi swimlane di `js_main.html`.
  - Uji coba algoritma grouping parent swimlane dan item mandiri.
  - Uji coba simulasi trigger konfirmasi saat seluruh subtask berstatus `DONE`. (Diverifikasi lulus 100% via `tests/test_stage15_kanban_grouping_parent_done.js`).

---

## Tahap 16 - Story Point Field (Khusus Hirarki Level 0) & Dasar Metrik Agile
- [x] Tambahkan kolom ke-13: `story_points` pada skema tabel `Tasks` di `Setup.gs`.
- [x] Perbarui backend API di `API.gs`:
  - `create_new_task`: Menerima `story_points`, memvalidasi hanya disimpan jika `hierarchy_level === 0` (`USER_STORY`, `TASK`, `BUG`). Mengosongkan nilai jika work type Level 1 atau Level -1. Menjamin ketersediaan header kolom secara dinamis dan aman.
  - `update_task_details`: Memperbarui `story_points` hanya untuk item Level 0 dan membersihkan nilainya jika tipe item diubah di luar Level 0.
  - `get_sprint_tasks` & `get_project_backlog_and_sprints`: Membaca dan menyertakan field `story_points` pada objek payload data tugas.
- [x] Bangun antarmuka UI di `UI.html`:
  - Input Text Box Story Point (`#input-task-story-points`) dengan wadah pembungkus (`#group-task-story-points`) pada modal pembuatan/pengubahan task (`#modal-task`).
  - Field penampil Story Point (`#detail-task-story-points`) pada modal detail work item (`#modal-task-detail`).
- [x] Implementasikan logika kontrol UI di `js_main.html`:
  - `handle_work_type_change`: Menampilkan input Story Point hanya jika tipe pekerjaan yang dipilih berlevel 0 (`USER_STORY`, `TASK`, `BUG`), serta menyembunyikan dan mengosongkan nilai saat memilih Inisiatif (Level 1) atau Subtask (Level -1).
  - Integrasikan field `story_points` pada pembukaan modal buat task, edit task, dan submit form.
  - Tampilkan badge Story Point (contoh: `5 pts`) pada kartu Kanban Board dan kartu Product Backlog untuk item Level 0.
- [x] **Quality Gate / Uji Coba Tahap 16:**
  - Uji coba skema tabel `Tasks` di `Setup.gs`.
  - Uji coba elemen UI input dan display Story Point di `UI.html`.
  - Uji coba logika seleksi hirarki level 0 di `js_main.html`.
  - Uji coba simulasi persistensi backend dan penolakan pada Level 1 & Level -1. (Diverifikasi lulus 100% via `tests/test_stage16_story_points_level_0.js`).

---

## Tahap 17 - Sprint Progress & Sprint Burndown (Menu Actionable Insights)
- [x] Bangun mesin kalkulasi Sprint Progress di `Insights.gs` (`calculate_sprint_progress_metrics`):
  - Penegakan **Aturan Opsi A**: Story point Level 0 hanya dianggap selesai (*burned*) apabila seluruh subtask (-1) terafiliasi telah berstatus `DONE` dan item Level 0 itu sendiri berstatus `DONE`.
  - Menghitung segmentasi poin: `done_points`, `in_progress_points`, `todo_points`, serta persentase proporsionalnya.
  - Membentuk label ringkasan persis Jira: `X points done, Y points to go`.
- [x] Bangun mesin grafik Sprint Burndown di `Insights.gs` (`build_burndown_series`):
  - Sumbu X: Timeline harian dari `start_date` hingga `end_date` sprint aktif.
  - Garis **Guideline**: Penurunan linear bertahap dari total komitmen poin ke 0% pada akhir sprint.
  - Garis **Remaining work**: Mengalkulasikan sisa Story Points aktual harian berdasarkan audit log di `Task_History`, berhenti tepat pada hari ini (*null* untuk hari mendatang).
  - Mengembalikan daftar seluruh sprint dalam proyek untuk dropdown pemilih sprint interaktif.
- [x] Perbarui antarmuka Dasbor Actionable Insights di `UI.html`:
  - Kartu **Sprint progress** bergaya Jira: Collapsible card dengan toggle chevron, segmented progress bar (Hijau: Done, Biru: In progress, Abu-abu: Not started), label `XX% done`, dan 3 kolom ringkasan persentase serta poin.
  - Kartu **Sprint burndown** bergaya Jira: Subtitle `X points done, Y points to go`, canvas Chart.js responsif, dan legend visual lingkaran biru (*Remaining work*) & abu-abu (*Guideline*).
  - Dropdown **Pilih Sprint** (`#insight-sprint-select`) pada header untuk melihat insight sprint mana pun dalam proyek.
  - Penataan rapi KPI Cards (Lead Time, Cycle Time, Blocker) dan Blocker Highlights di baris kedua.
- [x] Implementasikan fungsi controller di `js_main.html`:
  - `load_sprint_insights`: Memuat data metrik untuk sprint yang dipilih atau sprint aktif.
  - `handle_insight_sprint_change`: Listener perubahan dropdown sprint untuk me-refresh data secara dinamis.
  - `toggle_insight_widget_collapse`: Fungsi toggle ciut/buka widget kartu Sprint Progress & Burndown.
  - `render_insights_dashboard` & `render_burndown_chart`: Konfigurasi Chart.js v4 dengan kurva biru berbayang (*shaded area*), guideline solid, dan custom tooltip.
  - Perbarui mock data `init_mock_insights` untuk simulasi lokal.
- [x] **Quality Gate / Uji Coba Tahap 17:**
  - Uji coba aturan Opsi A pembakaran Story Points pada relasi parent Level 0 & subtask.
  - Uji coba skenario attachment Jira (3 points done, 13 points to go -> 19% Done, 81% In Progress).
  - Uji coba pembentukan seri data Burndown (Guideline 100% -> 0%, Remaining work aktual).
  - Uji coba integritas DOM dan handler di `UI.html` & `js_main.html`. (Diverifikasi lulus 100% via `tests/test_stage17_sprint_progress_burndown.js`).



