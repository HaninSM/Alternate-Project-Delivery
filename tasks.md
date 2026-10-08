# Execution Tasks: Agile Workflow Roadmap

Roadmap implementasi dilakukan secara bertahap (*incremental development*). Setiap tahap wajib diuji coba secara fungsional sebelum melangkah ke tahap selanjutnya.

---

## Tahap 1 - Setup Lingkungan & Pondasi Backend
- [x] Buat 5 sheet/tab di Google Sheets (`Users`, `Projects`, `Sprints`, `Tasks`, `Task_History`) beserta header baris 1 (tersedia otomatis via `setup_database_schema()` di `Setup.gs`).
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

## Tahap 6 - Scrum Backlog & Sprint Planning Engine (Baru)
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
  - Modal `#modal-user-form`: Form Tambah/Edit dengan dropdown Role preset autofill & 6 checkbox izin granular.
  - Modal `#modal-delete-user`: Dialog konfirmasi penghapusan pengguna yang aman.
- [x] **Quality Gate / Uji Coba Tahap 7:**
  - Uji coba resolusi izin default dan custom override.
  - Uji coba otorisasi admin vs non-admin.
  - Uji coba proteksi anti-lockout dan anti-self-deletion.
  - Uji coba penegakan izin granular pada proyek dan task. (Diverifikasi lulus 100% via `tests/test_stage7_rbac.js`).
