# Data Model Specification: Google Sheets Schema

Seluruh tabel disimpan sebagai tab individual (Sheet) pada dokumen Google Sheets. Baris pertama (Row 1) digunakan sebagai Header Kolom.

---

## 1. Sheet: `Users`
Menyimpan data identitas dan role otorisasi pengguna.

| Kolom Header | Tipe Data | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- | :--- |
| `id` | String | Identifier unik pengguna | `USR-001` |
| `name` | String | Nama lengkap pengguna | `Budi Setiawan` |
| `email` | String | Alamat email Google pengguna (Kunci Autentikasi) | `budi@example.com` |
| `role` | String | Peran pengguna: `ADMIN`, `PM`, `MEMBER`, `CLIENT` | `PM` |
| `permissions` | String (JSON) | Izin granular modular (`can_create_project`, `can_manage_sprint`, `can_create_task`, `can_move_task`, `can_view_insights`, `can_view_cycle_time`, `can_test_initiative`, `can_manage_demand`, `can_manage_users`) | `{"can_create_project":true,"can_manage_sprint":true,...}` |

---

## 2. Sheet: `Projects`
Menyimpan data master proyek yang dikelola.

| Kolom Header | Tipe Data | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- | :--- |
| `id` | String | Identifier unik proyek | `PRJ-001` |
| `name` | String | Nama proyek | `Website Redesign MVP` |
| `pm_id` | String | ID user penanggung jawab (Foreign Key -> `Users.id`) | `USR-001` |

---

## 3. Sheet: `Sprints`
Menyimpan siklus iterasi (Sprint) pada masing-masing proyek. Mendukung status siklus sprint (`PLANNING`, `ACTIVE`, `COMPLETED`) dan *Sprint Goal*.

| Kolom Header | Tipe Data | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- | :--- |
| `id` | String | Identifier unik sprint | `SPR-001` |
| `project_id` | String | ID proyek induk (Foreign Key -> `Projects.id`) | `PRJ-001` |
| `name` | String | Nama sprint | `Sprint 1 - Foundations` |
| `start_date` | String (ISO) | Tanggal mulai sprint (YYYY-MM-DD) | `2026-10-01` |
| `end_date` | String (ISO) | Tanggal berakhir sprint (YYYY-MM-DD) | `2026-10-14` |
| `status` | String | Status siklus sprint: `PLANNING`, `ACTIVE`, `COMPLETED` | `ACTIVE` |

---

## 4. Sheet: `Tasks`
Menyimpan daftar pekerjaan dalam backlog maupun sprint aktif, lengkap dengan tingkatan hirarki work type dan konten deskripsi format WYSIWYG.

| Kolom Header | Tipe Data | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- | :--- |
| `id` | String | Identifier unik task | `TSK-001` |
| `sprint_id` | String | ID sprint pemuat task (atau `BACKLOG-[project_id]`) | `SPR-001` |
| `title` | String | Judul/ringkasan work item | `Integrasi Payment Gateway Core Flow` |
| `status` | String | Status kanban: `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE` | `IN_PROGRESS` |
| `assignee_id` | String | ID user yang mengerjakan (Foreign Key -> `Users.id`) | `USR-002` |
| `estimate_hours` | Number | Estimasi waktu pengerjaan (jam) | `8` |
| `created_at` | String (ISO) | Waktu task dibuat | `2026-10-01T09:00:00Z` |
| `updated_at` | String (ISO) | Waktu perubahan terakhir | `2026-10-03T14:30:00Z` |
| `work_type` | String | Tipe pekerjaan: `INITIATIVE`, `USER_STORY`, `TASK`, `BUG`, `SUBTASK` | `TASK` |
| `hierarchy_level` | Number | Level hirarki numerik: `1` (Inisiatif), `0` (Story/Task/Bug), `-1` (Subtask) | `0` |
| `parent_id` | String | Foreign Key ke item induk (`Tasks.id`). Kosong jika root/inisiatif. | `TSK-000` |
| `description` | String (HTML) | Rincian deskripsi format WYSIWYG termasuk tabel Excel/Sheets, list, dan catatan teknis | `<h4>Acceptance Criteria</h4><div class="overflow-x-auto"><table class="wysiwyg-table">...</table></div>` |
| `story_points` | String / Number | Estimasi Story Point (hanya berlaku pada work item hirarki level 0: User Story, Task, Bug) | `5` |

---

## 5. Sheet: `Task_History`
Menyimpan catatan riwayat (*audit trail*) setiap kali status task bergeser untuk dasar kalkulasi metrik Time-in-Status dan pelaporan Cycle Time.

| Kolom Header | Tipe Data | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- | :--- |
| `id` | String | Identifier unik log riwayat | `HIS-001` |
| `task_id` | String | ID task yang statusnya berubah (Foreign Key -> `Tasks.id`) | `TSK-001` |
| `old_status` | String | Status task sebelum berubah | `TODO` |
| `new_status` | String | Status task sesudah berubah | `IN_PROGRESS` |
| `changed_by` | String | Email akun yang melakukan perubahan status | `budi@example.com` |
| `timestamp` | String (ISO) | Waktu pergeseran status terjadi | `2026-10-02T10:15:00Z` |

---

## 6. Sheet: `Initiative_Tests`
Menyimpan riwayat pengujian inisiatif produk oleh Product Owner / Innovator bersama Senior AI Product Challenger (Gemini API).

| Kolom Header | Tipe Data | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- | :--- |
| `id` | String | Identifier unik sesi pengujian inisiatif | `INIT-TEST-001` |
| `user_email` | String | Email pengaju inisiatif | `po@example.com` |
| `initiative_title` | String | Judul inisiatif produk yang diuji | `Instant Disbursement via Virtual Account` |
| `attempt_count` | Number | Jumlah iterasi/percobaan tanya jawab dengan AI | `3` |
| `status` | String | Status keputusan AI: `TESTING`, `APPROVED`, `REJECTED` | `APPROVED` |
| `ai_summary_note` | String | Catatan kesimpulan dan rekomendasi ex-CPO AI | `Inisiatif memiliki product-market fit dan kepatuhan regulasi yang solid.` |
| `conversation_history` | String (JSON) | Seluruh transkrip percakapan multi-turn chat | `[{"role":"model","text":"..."},{"role":"user","text":"..."}]` |
| `created_at` | String (ISO) | Waktu inisiasi pengujian | `2026-10-09T08:00:00Z` |
| `updated_at` | String (ISO) | Waktu keputusan evaluasi akhir | `2026-10-09T08:30:00Z` |

---

## 7. Sheet: `Demands`
Menampung inisiatif produk yang telah disetujui (*Approved*) oleh AI Challenger untuk diestimasi kapasitas teknisnya sebelum dikonversi menjadi Proyek aktif.

| Kolom Header | Tipe Data | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- | :--- |
| `id` | String | Identifier unik demand | `DEM-001` |
| `initiative_test_id` | String | ID referensi pengujian inisiatif (FK -> `Initiative_Tests.id`) | `INIT-TEST-001` |
| `title` | String | Judul inisiatif / fitur demand | `Instant Disbursement via Virtual Account` |
| `submitter_email` | String | Email pemilik inisiatif | `po@example.com` |
| `prd_summary` | String | Ringkasan Product Requirement Document (PRD) | `Sistem otomatisasi pencairan pinjaman seketika.` |
| `fsd_summary` | String | Ringkasan Functional Specification Document (FSD) | `Integrasi webhook callback dan signature verification.` |
| `est_engineers` | Number | Kebutuhan insinyur pelaksana | `3` |
| `est_duration_days` | Number | Estimasi durasi pengerjaan (hari kalender) | `14` |
| `capacity_status` | String | Status kapasitas: `UNALLOCATED`, `PARTIALLY_ALLOCATED`, `FULLY_ALLOCATED`, `CONVERTED_TO_PROJECT` | `FULLY_ALLOCATED` |
| `allocated_capacity_hours` | Number | Total jam kerja yang telah dialokasikan tim | `168` |
| `capacity_notes` | String (JSON) | Catatan rincian alokasi per personil tim | `[{"user_id":"USR-003","hours":84},{"user_id":"USR-004","hours":84}]` |
| `approved_at` | String (ISO) | Waktu inisiatif disetujui AI | `2026-10-09T08:30:00Z` |
| `created_at` | String (ISO) | Waktu entri demand dibuat | `2026-10-09T08:30:00Z` |

---

## Relasi Data (Database Architecture Diagram)

```
Users (1) --------< Projects (N)
   ^                     | (1)
   |                     v
   |                  Sprints (N) [Status: PLANNING / ACTIVE / COMPLETED]
   |                     | (1)
   |                     v
Users (1) --------< Tasks (N) [sprint_id: BACKLOG-[prj] / SPR-xxx, work_type, level, desc]
                         | (1)
                         +--------< Tasks (Self-Ref: Parent-Child Hierarchy)
                         |            Level 1: INITIATIVE
                         |            Level 0: USER_STORY / TASK / BUG (parent: INITIATIVE)
                         |            Level -1: SUBTASK (parent: Level 0)
                         |
                         v
                      Task_History (N) [Audit trail time-in-status & rollover]

Users (1) --------< Initiative_Tests (N) [attempt_count, status: TESTING/APPROVED/REJECTED]
                         | (1)
                         v
                      Demands (1) [capacity_status, allocated_capacity_hours]
                         | (1 - Opsional)
                         v
                      Projects (Konversi Demand menjadi Proyek Baru)
```

---

## 7. Model State Sisi Klien (Frontend SPA State)

Pada `js_main.html`, objek global `app_state` mengelola state aplikasi reaktif:

```javascript
const app_state = {
  current_user: null,               // Objek profil pengguna yang login
  active_project_id: 'PRJ-001',      // ID proyek aktif
  active_sprint_id: 'SPR-001',       // ID sprint aktif
  current_view: 'dashboard',         // Tampilan aktif ('dashboard' | 'projects' | 'users' | dst.)
  projects: [],                      // Daftar seluruh proyek terdaftar
  tasks: [],                         // Daftar tugas pada sprint aktif (termasuk parent & subtask)
  backlog_tasks: [],                 // Daftar tugas di bucket Backlog proyek
  sprints: [],                       // Daftar seluruh bucket sprint proyek
  insights: null,                    // Metrik lead/cycle time & burndown
  users_list: [],                    // Daftar user untuk RBAC management
  is_loading: false,                 // Indikator loading
  burndown_chart_instance: null,     // Objek instance Chart.js
  
  // State Swimlane Grouping & Konfirmasi Auto-Done (Tahap 15):
  kanban_group_by: 'parent',         // Mode pengelompokan ('parent' | 'initiative' | 'assignee' | 'none')
  collapsed_swimlanes: {},           // Dictionary boolean status collapse baris swimlane { [group_id]: true/false }
  pending_parent_done: null          // Objek parent sementara yang menunggu konfirmasi modal auto-done
};
```

