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

---

## 2. Sheet: `Projects`
Menyimpan data master proyek yang dikelola beserta metodologi kerja yang dipilih.

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
| `id` | String | Identifier unik sprint (atau `SPR-BACKLOG` untuk bucket backlog) | `SPR-001` |
| `project_id` | String | ID proyek induk (Foreign Key -> `Projects.id`) | `PRJ-001` |
| `name` | String | Nama sprint | `Sprint 1 - Foundations` |
| `start_date` | String (ISO) | Tanggal mulai sprint (YYYY-MM-DD) | `2026-10-01` |
| `end_date` | String (ISO) | Tanggal berakhir sprint (YYYY-MM-DD) | `2026-10-14` |

---

## 4. Sheet: `Tasks`
Menyimpan daftar pekerjaan dalam backlog maupun sprint aktif.
> *Catatan Relasi Scrum:* Jika task berada di **Bucket Backlog**, nilai `sprint_id` adalah `BACKLOG` atau `SPR-BACKLOG-[project_id]`. Saat di-drag ke Bucket Sprint, nilai `sprint_id` otomatis diperbarui menjadi ID sprint target (misal `SPR-001`).

| Kolom Header | Tipe Data | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- | :--- |
| `id` | String | Identifier unik task | `TSK-001` |
| `sprint_id` | String | ID sprint pemuat task (atau `BACKLOG`) | `SPR-001` |
| `title` | String | Judul/ringkasan task | `Integrasi Database Schema` |
| `status` | String | Status: `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE` | `IN_PROGRESS` |
| `assignee_id` | String | ID user yang mengerjakan (Foreign Key -> `Users.id`) | `USR-002` |
| `estimate_hours` | Number | Estimasi waktu pengerjaan (jam) | `8` |
| `created_at` | String (ISO) | Waktu task dibuat | `2026-10-01T09:00:00Z` |
| `updated_at` | String (ISO) | Waktu perubahan terakhir | `2026-10-03T14:30:00Z` |

---

## 5. Sheet: `Task_History`
Menyimpan catatan riwayat (*audit trail*) setiap kali status task bergeser untuk dasar kalkulasi metrik Time-in-Status.

| Kolom Header | Tipe Data | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- | :--- |
| `id` | String | Identifier unik log riwayat | `HIS-001` |
| `task_id` | String | ID task yang statusnya berubah (Foreign Key -> `Tasks.id`) | `TSK-001` |
| `old_status` | String | Status task sebelum berubah | `TODO` |
| `new_status` | String | Status task sesudah berubah | `IN_PROGRESS` |
| `changed_by` | String | Email akun yang melakukan perubahan status | `budi@example.com` |
| `timestamp` | String (ISO) | Waktu pergeseran status terjadi | `2026-10-02T10:15:00Z` |

---

## Relasi Data (Scrum & Kanban Architecture)
```
Users (1) --------< Projects (N)
   ^                     | (1)
   |                     v
   |                  Sprints (N) [Termasuk Bucket Backlog & Sprint 1..N]
   |                     | (1)
   |                     v
Users (1) --------< Tasks (N) [sprint_id: BACKLOG / SPR-xxx]
                         | (1)
                         v
                      Task_History (N)
```
