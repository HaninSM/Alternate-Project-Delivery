# Architecture & Implementation Plan: Alternate Project Delivery (LITE)

## 1. System Architecture

```
+-------------------------------------------------------------------------+
|                              Frontend Layer                             |
|  - HTML5 + Tailwind CSS (SPA via GAS HTMLService)                       |
|  - Welcome Dashboard & Project Inisiasi (Kanban vs Scrum Selector)       |
|  - Scrum Planning Engine (Backlog Bucket & Sprint 1..N Buckets)         |
|  - Active Kanban Board (HTML5 Drag & Drop murni)                        |
|  - Actionable Insights Dashboard (Chart.js Burndown & Blocker Cards)    |
+-------------------------------------------------------------------------+
                                    |
                                    | google.script.run (RPC calls)
                                    v
+-------------------------------------------------------------------------+
|                         Backend Layer (GAS Core)                        |
|    - Code.gs (doGet, include helper, user session/RBAC detection)       |
|    - API.gs  (Project CRUD, Backlog/Sprint Bucket API, Task Controller) |
|    - Insights.gs (Metric computation, Lead/Cycle Time, Burndown Engine) |
+-------------------------------------------------------------------------+
                                    |
                                    | SpreadsheetApp API
                                    v
+-------------------------------------------------------------------------+
|                       Database Layer (Google Sheets)                    |
|   - Users (id, name, email, role)                                       |
|   - Projects (id, name, pm_id)                                          |
|   - Sprints (id, project_id, name, start_date, end_date)                |
|   - Tasks (id, sprint_id, title, status, assignee_id, hours, ...)       |
|   - Task_History (id, task_id, old_status, new_status, by, timestamp)   |
+-------------------------------------------------------------------------+
```

---

## 2. Scrum Backlog & Sprint Planning Engine (Tahap 2 Workflow)

### 2.1 Alur Inisiasi Proyek Mode Scrum
1. PM mengklik **`+ Buat Project Baru`** di Dashboard dan memilih opsi **Scrum**.
2. Sistem menyimpan proyek dan secara otomatis menyediakan dua wadah awal:
   * **Product Backlog Bucket (`sprint_id = BACKLOG-[project_id]`)**: Tempat seluruh tiket/task baru ditampung.
   * **Sprint 1 Bucket (`sprint_id = SPR-[project_id]-1`)**: Wadah iterasi sprint pertama dalam status `PLANNING`.

### 2.2 Alur Pengisian & Drag-and-Drop Planning
1. **Tambah Task ke Backlog:**
   * PM / Authorized Member menekan tombol **`+ Tambah Task ke Backlog`**.
   * Task tersimpan di sheet `Tasks` dengan `sprint_id = BACKLOG-[project_id]` dan status `TODO`.
2. **Pembuatan Bucket Sprint Baru:**
   * PM dapat menekan tombol **`+ Create Sprint`** kapan saja untuk membuat wadah sprint berikutnya (*Sprint 2*, *Sprint 3*, dst.) yang tersimpan ke sheet `Sprints`.
3. **Drag and Drop Planning (Backlog $\rightarrow$ Sprint Bucket):**
   * Pengguna men-drag kartu task dari wadah Backlog dan me-drop ke wadah Sprint yang diinginkan.
   * Frontend memanggil RPC `move_task_to_sprint(task_id, target_sprint_id)`.
   * Sheet `Tasks` diperbarui secara real-time pada kolom `sprint_id`.
   * Total estimasi jam (*Total Scope*) pada header Bucket Sprint terhitung otomatis.

### 2.3 Start Sprint Action
1. Pada header Bucket Sprint yang sudah terisi task, PM menekan tombol **`Start Sprint`**.
2. Muncul modal dialog penegasan:
   * **Nama Sprint** (misal *Sprint 1 - Foundations & Core Auth*)
   * **Durasi Sprint** (1 Minggu, 2 Minggu, 3 Minggu, 4 Minggu)
   * **Sprint Goal / Target Rilis** (Objektif utama yang disepakati)
3. Saat dikonfirmasi:
   * Backend mengupdate tanggal mulai (*start_date*) dan tanggal selesai (*end_date*) di sheet `Sprints`.
   * Sistem otomatis mengalihkan antarmuka ke **Active Kanban Board** yang menampilkan seluruh task sprint tersebut siap dieksekusi!

---

## 3. Time-in-Status Engine

1. Pengguna memindahkan kartu task di Active Board menggunakan **HTML5 Drag and Drop**.
2. Frontend memanggil backend RPC: `update_task_status(task_id, new_status)`.
3. Backend memverifikasi hak akses pengguna aktif (External Client ditolak karena read-only).
4. Backend membaca status lama (`old_status`) dari sheet `Tasks`.
5. Backend melakukan update baris pada sheet `Tasks` (`status`, `updated_at`).
6. Secara simultan (atomik), backend melakukan `appendRow` ke sheet `Task_History`:
   - `id`, `task_id`, `old_status`, `new_status`, `changed_by`, `timestamp`.

---

## 4. Insight Engine

1. **Lead Time:** Waktu dari task dibuat (`created_at`) hingga mencapai `DONE`.
2. **Cycle Time:** Waktu pengerjaan aktif dari pertama kali masuk `IN_PROGRESS` hingga `DONE`.
3. **Burndown Timeline Series:** Mengagregasi total estimasi jam di awal sprint, membentuk garis Ideal linier menuju 0 jam, dan garis Aktual yang berkurang setiap hari sesuai kapan task selesai ke `DONE`.
4. **Active Blocker Detection:** Task non-`DONE` yang tidak bergerak > 48 jam otomatis masuk daftar eskalasi Blocker.
