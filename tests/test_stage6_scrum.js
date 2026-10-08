/**
 * Test Suite: Tahap 6 - Scrum Backlog & Sprint Planning Engine
 * Memvalidasi:
 * 1. Isolasi Task Proyek (Proyek baru Scrum mulai dengan 0 task di board)
 * 2. Inisialisasi Backlog Bucket ('BACKLOG-[project_id]')
 * 3. Pembuatan Bucket Sprint 2, 3, dst. via create_new_sprint_bucket
 * 4. Alokasi task antar bucket via move_task_to_sprint (Backlog <-> Sprint)
 * 5. Aktivasi Sprint via start_sprint (Durasi, Nama, Goal)
 * 6. Penegakan Otorisasi RBAC (Client tidak dapat memodifikasi alokasi/memulai sprint)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================');
console.log('  MENJALANKAN TAHAP 6: SCRUM BACKLOG & SPRINT PLANNING TEST SUITE');
console.log('================================================================\n');

class MockSpreadsheetDatabase {
  constructor() {
    this.sheets = {
      Users: [
        ['id', 'name', 'email', 'role'],
        ['USR-001', 'Admin Utama', 'admin@example.com', 'ADMIN'],
        ['USR-002', 'Budi PM', 'pm@example.com', 'PM'],
        ['USR-003', 'Siti Developer', 'dev@example.com', 'MEMBER'],
        ['USR-004', 'Rian QA Engineer', 'qa@example.com', 'MEMBER'],
        ['USR-005', 'Klien Eksternal PT ABC', 'client@example.com', 'CLIENT']
      ],
      Projects: [
        ['id', 'name', 'pm_id'],
        ['PRJ-001', 'Website Redesign MVP', 'USR-002']
      ],
      Sprints: [
        ['id', 'project_id', 'name', 'start_date', 'end_date'],
        ['SPR-001', 'PRJ-001', 'Sprint 1 - Foundations', '2026-10-01', '2026-10-14']
      ],
      Tasks: [
        ['id', 'sprint_id', 'title', 'status', 'assignee_id', 'estimate_hours', 'created_at', 'updated_at'],
        ['TSK-001', 'SPR-001', 'Task Legacy Project 1', 'TODO', 'USR-003', 8, '2026-10-01T08:00:00Z', '2026-10-01T08:00:00Z']
      ],
      Task_History: [
        ['id', 'task_id', 'old_status', 'new_status', 'changed_by', 'timestamp']
      ]
    };
  }

  getSheetByName(name) {
    if (!this.sheets[name]) return null;
    const sheetData = this.sheets[name];
    return {
      getLastRow: () => sheetData.length,
      getDataRange: () => ({
        getValues: () => JSON.parse(JSON.stringify(sheetData))
      }),
      appendRow: (row) => {
        sheetData.push([...row]);
      },
      getRange: (row, col) => ({
        setValue: (val) => {
          sheetData[row - 1][col - 1] = val;
        }
      })
    };
  }
}

const mockDb = new MockSpreadsheetDatabase();
let currentMockUserEmail = 'pm@example.com';

const gasContext = {
  console: console,
  Utilities: {
    getUuid: () => 'MOCK-' + Math.random().toString(36).substring(2, 10).toUpperCase()
  },
  Session: {
    getActiveUser: () => ({
      getEmail: () => currentMockUserEmail
    })
  },
  SpreadsheetApp: {
    getActiveSpreadsheet: () => mockDb,
    openById: () => mockDb
  },
  get_db_spreadsheet: () => mockDb,
  VALID_TASK_STATUSES: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']
};

vm.createContext(gasContext);
const codeScript = fs.readFileSync(path.join(__dirname, '..', 'src', 'Code.gs'), 'utf8');
const apiCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'API.gs'), 'utf8');
vm.runInContext(codeScript, gasContext);
vm.runInContext(apiCode, gasContext);

// ============================================================================
// TEST 1: Inisiasi Project Baru Mode Scrum
// ============================================================================
console.log('1. Menguji Inisiasi Project Baru Mode Scrum...');
currentMockUserEmail = 'pm@example.com';

const newPrjRes = gasContext.create_new_project({
  name: 'Mobile Banking App',
  mode: 'SCRUM',
  sprint_name: 'Sprint 1 - Foundations',
  sprint_duration_weeks: 2,
  sprint_goal: 'MVP User Authentication & Core Services'
});

assert.strictEqual(newPrjRes.success, true, 'create_new_project harus sukses');
const newPrjId = newPrjRes.data.id;
const newSprintId = newPrjRes.data.sprint_id;
console.log(`   ✓ Proyek baru terdaftar: ${newPrjId} (${newPrjRes.data.name}) dengan Sprint awal ${newSprintId}`);

// ============================================================================
// TEST 2: Isolasi Ketat Task (Tidak Bleeding dari Project Lain)
// ============================================================================
console.log('2. Menguji Isolasi Ketat Task di Sprint Baru...');
const sprintTasksRes = gasContext.get_sprint_tasks(newSprintId);
assert.strictEqual(sprintTasksRes.success, true);
assert.strictEqual(sprintTasksRes.data.length, 0, 'Sprint baru tidak boleh tercampur task proyek lain!');
console.log('   ✓ Terverifikasi: Sprint baru bersih (0 task). Tidak ada bleeding!');

// ============================================================================
// TEST 3: Ambil Backlog dan Sprints Proyek
// ============================================================================
console.log('3. Menguji Pengambilan Scrum Backlog & Sprint Buckets...');
const planningData1 = gasContext.get_project_backlog_and_sprints(newPrjId);
assert.strictEqual(planningData1.success, true);
assert.strictEqual(planningData1.data.backlog_tasks.length, 0, 'Backlog awal harus kosong');
assert.strictEqual(planningData1.data.sprints.length, 1, 'Harus ada 1 sprint terdaftar');
assert.strictEqual(planningData1.data.sprints[0].id, newSprintId);
console.log('   ✓ Terverifikasi: Backlog kosong dan 1 Sprint Bucket terdeteksi.');

// ============================================================================
// TEST 4: Tambah Task Langsung ke Bucket Backlog
// ============================================================================
console.log('4. Menguji Tambah Task ke Bucket Backlog (BACKLOG-[project_id])...');
const addBacklogTaskRes = gasContext.create_new_task({
  sprint_id: 'BACKLOG-' + newPrjId,
  title: 'Implementasi Fitur Biometric Login & Face ID',
  estimate_hours: 10,
  assignee_id: 'USR-003'
});
assert.strictEqual(addBacklogTaskRes.success, true);

const addBacklogTaskRes2 = gasContext.create_new_task({
  sprint_id: 'BACKLOG-' + newPrjId,
  title: 'Integrasi Core Banking API Webhook',
  estimate_hours: 14,
  assignee_id: 'USR-004'
});
assert.strictEqual(addBacklogTaskRes2.success, true);

const planningData2 = gasContext.get_project_backlog_and_sprints(newPrjId);
assert.strictEqual(planningData2.data.backlog_tasks.length, 2, 'Backlog harus berisi 2 task');
const task1Id = planningData2.data.backlog_tasks[0].id;
const task2Id = planningData2.data.backlog_tasks[1].id;
console.log(`   ✓ 2 Task berhasil masuk ke Backlog: ${task1Id} (10 jam), ${task2Id} (14 jam).`);

// ============================================================================
// TEST 5: Pembuatan Bucket Sprint ke-2
// ============================================================================
console.log('5. Menguji Pembuatan Bucket Sprint ke-2 via create_new_sprint_bucket...');
const newSprintBucketRes = gasContext.create_new_sprint_bucket(newPrjId, 'Sprint 2 (Planning)');
assert.strictEqual(newSprintBucketRes.success, true);
const sprint2Id = newSprintBucketRes.data.id;
console.log(`   ✓ Bucket Sprint ke-2 berhasil dibuat: ${sprint2Id}`);

const planningData3 = gasContext.get_project_backlog_and_sprints(newPrjId);
assert.strictEqual(planningData3.data.sprints.length, 2, 'Proyek harus memiliki 2 bucket sprint');

// ============================================================================
// TEST 6: Drag & Drop Task (Backlog -> Sprint 1)
// ============================================================================
console.log('6. Menguji Drag & Drop: Pindahkan Task dari Backlog ke Sprint 1...');
const moveTaskRes = gasContext.move_task_to_sprint(task1Id, newSprintId);
assert.strictEqual(moveTaskRes.success, true);

const planningData4 = gasContext.get_project_backlog_and_sprints(newPrjId);
assert.strictEqual(planningData4.data.backlog_tasks.length, 1, 'Backlog tersisa 1 task');
assert.strictEqual(planningData4.data.sprints[0].tasks.length, 1, 'Sprint 1 sekarang berisi 1 task');
assert.strictEqual(planningData4.data.sprints[0].tasks[0].id, task1Id);
assert.strictEqual(planningData4.data.sprints[0].total_hours, 10, 'Total scope Sprint 1 harus 10 jam');
console.log(`   ✓ Task ${task1Id} berhasil dipindahkan ke ${newSprintId}. Scope terhitung 10 jam.`);

// ============================================================================
// TEST 7: Aktivasi Sprint (Start Sprint)
// ============================================================================
console.log('7. Menguji Start Sprint dengan Durasi, Nama, dan Goal...');
const startSprintRes = gasContext.start_sprint({
  sprint_id: newSprintId,
  sprint_name: 'Sprint 1 - Biometric Release',
  duration_weeks: 2,
  sprint_goal: 'Rilis Biometric Auth MVP'
});
assert.strictEqual(startSprintRes.success, true);
assert.strictEqual(startSprintRes.data.sprint_name, 'Sprint 1 - Biometric Release');
console.log(`   ✓ Sprint ${newSprintId} berhasil diaktifkan dengan nama '${startSprintRes.data.sprint_name}'!`);

// Cek bahwa sekarang task1Id muncul di board sprint aktif
const activeBoardTasks = gasContext.get_sprint_tasks(newSprintId);
assert.strictEqual(activeBoardTasks.data.length, 1);
assert.strictEqual(activeBoardTasks.data[0].id, task1Id);
console.log(`   ✓ Task ${task1Id} sekarang aktif di Kanban Board ${newSprintId}.`);

// ============================================================================
// TEST 8: Proteksi RBAC Client (Read-Only)
// ============================================================================
console.log('8. Menguji Proteksi RBAC Client Eksternal (Read-Only)...');
currentMockUserEmail = 'client@example.com';

const clientMoveRes = gasContext.move_task_to_sprint(task2Id, newSprintId);
assert.strictEqual(clientMoveRes.success, false, 'Client tidak boleh memindahkan task');

const clientCreateBucketRes = gasContext.create_new_sprint_bucket(newPrjId, 'Sprint 3');
assert.strictEqual(clientCreateBucketRes.success, false, 'Client tidak boleh membuat sprint');

const clientStartRes = gasContext.start_sprint({
  sprint_id: sprint2Id,
  sprint_name: 'Sprint 2',
  duration_weeks: 1,
  sprint_goal: 'Hacking'
});
assert.strictEqual(clientStartRes.success, false, 'Client tidak boleh memulai sprint');
console.log('   ✓ Terverifikasi: Seluruh aksi modifikasi Scrum ditolak untuk CLIENT (Read-only).');

console.log('\n================================================================');
console.log('  SEMUA PENGUJIAN TAHAP 6 (SCRUM ENGINE) BERHASIL LULUS 100%! ');
console.log('================================================================');
