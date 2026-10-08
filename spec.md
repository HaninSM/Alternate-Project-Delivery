# Specification: Alternate Project Delivery (LITE)

## 1. Visi Produk
Alternate Project Delivery adalah platform manajemen proyek modern (memadukan fleksibilitas Notion dan ketegasan Jira) yang berfokus menyediakan **Actionable Insights** (Burndown Chart, Lead Time, Cycle Time, dan Blocker Highlights) untuk Project Manager agar dapat mengeskalasi masalah/blocker sedini mungkin, sekaligus menyediakan akses transparansi langsung untuk klien eksternal.

---

## 2. Target Pengguna & Roles (RBAC)
Platform membedakan 4 peran pengguna berbasis email Google Workspace/Gmail:
1. **Administrator:**
   - Memiliki akses penuh terhadap konfigurasi sistem, manajemen master pengguna, dan seluruh proyek.
2. **Project Manager (PM):**
   - Membuat dan mengelola Project serta Sprint.
   - Mengelola Bucket Backlog dan inisiasi Bucket Sprint.
   - Mengelola dan menugaskan Task ke anggota tim.
   - Mengakses Dasbor Insight secara penuh (Burndown, Lead Time, Cycle Time, Blocker Highlights).
3. **Team Member:**
   - Melihat papan Kanban proyek yang ditugaskan.
   - Memperbarui status task secara drag-and-drop (TODO -> IN_PROGRESS -> REVIEW -> DONE).
   - Menambahkan estimasi/update pada task.
4. **External Client (Read-Only):**
   - Akses dasbor transparan khusus untuk memantau progres sprint, burndown, dan blocker secara real-time.
   - Tidak memiliki izin memodifikasi data task maupun sprint.

---

## 3. Core Mechanics

### 3.1 Pilihan Metodologi Proyek: Kanban vs Scrum
- **Mode Kanban:**
  - Alur kontinu tanpa batasan siklus sprint.
  - Task mengalir langsung di papan 4 kolom.
- **Mode Scrum:**
  - Dilengkapi antarmuka **Scrum Backlog & Sprints Planning**.
  - **Bucket Product Backlog:** Wadah awal seluruh task/pekerjaan yang belum dijadwalkan.
  - **Bucket Sprint (Iterasi Timeboxed):** PM dapat membuat *Sprint 1*, *Sprint 2*, dst.
  - **Drag & Drop Planning:** PM memindahkan task dari Bucket Backlog ke Bucket Sprint yang dituju.
  - **Start Sprint Action:** Tombol aktivasi sprint yang meminta input nama sprint, durasi sprint (1-4 minggu), dan *Sprint Goal*. Setelah dimulai, sprint berstatus `ACTIVE` dan task mengalir ke Papan Active Board.

### 3.2 Manajemen Papan Task (Active Board)
- Alur status standar 4 kolom:
  - `TODO`: Task siap dikerjakan dalam sprint aktif.
  - `IN_PROGRESS`: Task sedang dikerjakan secara aktif oleh Team Member.
  - `REVIEW`: Task selesai dikerjakan dan sedang dalam pengujian/review PM/QA.
  - `DONE`: Task dinyatakan tuntas.
- **Interaksi Drag and Drop:** Pemindahan status task dilakukan murni dengan drag-and-drop antar kolom (tanpa combobox).

### 3.3 Time-in-Status Tracking (Satuan Jam)
- Setiap pergeseran status task dicatat secara otomatis ke log riwayat waktu (*audit trail* di `Task_History`).
- Menghitung durasi sebuah task berada pada masing-masing status.
- Threshold peringatan status (task berada di `IN_PROGRESS` atau `REVIEW` > 48 jam otomatis ditandai sebagai Blocker).

### 3.4 Dasbor Insight
- **Burndown Chart:**
  - Menampilkan perbandingan garis ideal vs garis aktual sisa estimasi jam kerja per hari sepanjang durasi Sprint aktif.
- **Lead Time:**
  - Waktu total dari task dibuat (`TODO`) hingga tuntas (`DONE`).
- **Cycle Time:**
  - Waktu aktif pengerjaan dari mulai dikerjakan (`IN_PROGRESS`) hingga tuntas (`DONE`).
- **Blocker Highlights:**
  - Identifikasi otomatis task yang macet (*idle/stuck*) di status tertentu melampaui batas waktu wajar.

---

## 4. Out of Scope (MVP)
Fitur-fitur berikut tidak disertakan dalam versi MVP LITE:
- Kustomisasi kolom dinamis per proyek (kolom fix: TODO, IN_PROGRESS, REVIEW, DONE).
- Chat/komentar realtime di dalam task.
- Integrasi CI/CD & GitHub/GitLab webhook.
- Modul Billing / Invoicing / Timesheet berbayar.
- Multi-attachment file upload kompleks (selain referensi link).

---

## 5. Acceptance Criteria
- [x] PM login via akun Google & disambut Dashboard Utama.
- [x] PM dapat membuat project baru dengan memilih Mode Kanban atau Scrum.
- [x] Di Mode Scrum: terdapat Bucket Backlog, pembuatan Bucket Sprint ke-1 dan seterusnya, drag-and-drop task dari Backlog ke Sprint, serta tombol Start Sprint dengan input durasi dan Sprint Goal.
- [x] Member memindahkan status task via drag-and-drop tanpa combobox.
- [x] Task terisolasi secara ketat per project (project baru bersih 0 task).
- [x] PM dan Klien Eksternal dapat melihat dasbor insight (Burndown, Cycle Time, Lead Time, Blocker) secara akurat.
