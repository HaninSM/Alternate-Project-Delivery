/**
 * Test Suite: Tahap 8 - Complete Sprint (End Sprint) & Post-Sprint Rollover Flow
 * Memvalidasi:
 * 1. Lifecycle Status Sprint (PLANNING -> ACTIVE -> COMPLETED)
 * 2. Eksekusi complete_sprint dengan Rollover ke Next Sprint
 *    - Task DONE tetap diarsip dalam sprint yang selesai (historis)
 *    - Task Belum Selesai (TODO, IN_PROGRESS, REVIEW) dialihkan ke Sprint Baru
 *    - Audit trail tercatat di Task_History
 * 3. Eksekusi complete_sprint dengan Rollover ke Product Backlog
 *    - Task Belum Selesai dialihkan ke BACKLOG-[project_id]
 * 4. Penegakan Otorisasi RBAC (Client tidak diizinkan menyelesaikan sprint)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================');
console.log('  MENJALANKAN TAHAP 8: COMPLETE SPRINT & ROLLOVER TEST SUITE');
console.log('================================================================\n');

class MockSpreadsheetDatabase {
  constructor() {
    this.sheets = {
      Users: [
        ['id', 'name', 'email', 'role', 'permissions'],
        ['USR-001', 'Admin Utama', 'admin@example.com', 'ADMIN', ''],
        ['USR-002', 'Budi PM', 'pm@example.com', 'PM', ''],
        ['USR-003', 'Siti Developer', 'dev@example.com', 'MEMBER', ''],
        ['USR-004', 'Klien Eksternal PT ABC', 'client@example.com', 'CLIENT', '']
      ],
      Projects: [
        ['id', 'name', 'pm_id'],
        ['PRJ-101', 'Core Banking SuperApp', 'USR-002']
      ],
      Sprints: [
        ['id', 'project_id', 'name', 'start_date', 'end_date', 'status'],
        ['SPR-101', 'PRJ-101', 'Sprint 1 - Authentication', '2026-10-01', '2026-10-14', 'ACTIVE']
      ],
      Tasks: [
        ['id', 'sprint_id', 'title', 'status', 'assignee_id', 'estimate_hours', 'created_at', 'updated_at'],
        ['TSK-101', 'SPR-101', 'Implementasi Login Biometrik', 'DONE', 'USR-003', 8, '2026-10-01T08:00:00Z', '2026-10-05T08:00:00Z'],
        ['TSK-102', 'SPR-101', 'Setup OAuth2 Token Refresh', 'DONE', 'USR-003', 6, '2026-10-01T08:00:00Z', '2026-10-06T08:00:00Z'],
        ['TSK-103', 'SPR-101', 'Integrasi MFA SMS & WhatsApp', 'IN_PROGRESS', 'USR-003', 12, '2026-10-01T08:00:00Z', '2026-10-07T08:00:00Z'],
        ['TSK-104', 'SPR-101', 'Penetration Testing Endpoint Auth', 'TODO', 'USR-003', 10, '2026-10-01T08:00:00Z', '2026-10-07T08:00:00Z']
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
      getLastColumn: () => sheetData[0].length,
      getDataRange: () => ({
        getValues: () => JSON.parse(JSON.stringify(sheetData))
      }),
      appendRow: (row) => {
        sheetData.push([...row]);
      },
      getRange: (row, col) => ({
        setValue: (val) => {
          sheetData[row - 1][col - 1] = val;
        },
        getValues: () => [[sheetData[row - 1][col - 1]]]
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
// TEST 1: Proteksi Otorisasi RBAC (Client ditolak saat mencoba End Sprint)
// ============================================================================
console.log('1. Menguji Proteksi RBAC: Klien eksternal ditolak saat mencoba complete_sprint...');
currentMockUserEmail = 'client@example.com';

const clientEndSprintResult = vm.runInContext(`
  complete_sprint({
    sprint_id: 'SPR-101',
    rollover_destination: 'NEXT_SPRINT'
  });
`, gasContext);

assert.strictEqual(clientEndSprintResult.success, false, 'Client seharusnya tidak memiliki izin!');
assert.ok(clientEndSprintResult.message.includes('Akses Ditolak'), 'Pesan penolakan izin harus muncul');
console.log('   ✓ Proteksi RBAC berhasil: Akses ditolak untuk role CLIENT.\n');

// ============================================================================
// TEST 2: PM Menyelesaikan Sprint dengan Rollover ke Sprint Berikutnya (NEXT_SPRINT)
// ============================================================================
console.log('2. Menguji PM Menyelesaikan Sprint dengan Rollover ke Next Sprint...');
currentMockUserEmail = 'pm@example.com';

const pmEndSprintResult = vm.runInContext(`
  complete_sprint({
    sprint_id: 'SPR-101',
    rollover_destination: 'NEXT_SPRINT',
    new_sprint_name: 'Sprint 2 - Payment & Transactions'
  });
`, gasContext);

assert.strictEqual(pmEndSprintResult.success, true, 'complete_sprint harus berhasil untuk PM');
assert.strictEqual(pmEndSprintResult.data.completed_tasks_count, 2, '2 task DONE harus tercatat selesai');
assert.strictEqual(pmEndSprintResult.data.incomplete_tasks_count, 2, '2 task belum selesai harus di-rollover');
console.log('   ✓ Sukses eksekusi complete_sprint:', pmEndSprintResult.message);

// Verifikasi sheet Sprints
const sprintsSheet = mockDb.sheets.Sprints;
const spr101Row = sprintsSheet.find(r => r[0] === 'SPR-101');
assert.ok(spr101Row, 'SPR-101 harus tetap ada di sheet Sprints');
assert.strictEqual(spr101Row[5], 'COMPLETED', 'Status SPR-101 harus berubah menjadi COMPLETED');

// Verifikasi Sprint baru terbuat otomatis
const nextSprintId = pmEndSprintResult.data.destination_sprint_id;
const nextSprintRow = sprintsSheet.find(r => r[0] === nextSprintId);
assert.ok(nextSprintRow, 'Sprint baru harus terbuat di sheet Sprints');
assert.strictEqual(nextSprintRow[2], 'Sprint 2 - Payment & Transactions', 'Nama sprint baru harus sesuai');
assert.strictEqual(nextSprintRow[5], 'PLANNING', 'Status sprint baru harus PLANNING');
console.log(`   ✓ Sprint asal berstatus COMPLETED, sprint tujuan ${nextSprintId} berstatus PLANNING.\n`);

// ============================================================================
// TEST 3: Verifikasi Isolasi Task & Audit Trail
// ============================================================================
console.log('3. Menguji Isolasi Task (DONE tetap diarsip, Incomplete berpindah)...');
const tasksSheet = mockDb.sheets.Tasks;

// Task DONE harus tetap di SPR-101
const tsk101 = tasksSheet.find(r => r[0] === 'TSK-101');
const tsk102 = tasksSheet.find(r => r[0] === 'TSK-102');
assert.strictEqual(tsk101[1], 'SPR-101', 'TSK-101 (DONE) harus tetap di SPR-101');
assert.strictEqual(tsk102[1], 'SPR-101', 'TSK-102 (DONE) harus tetap di SPR-101');

// Task belum selesai harus pindah ke nextSprintId
const tsk103 = tasksSheet.find(r => r[0] === 'TSK-103');
const tsk104 = tasksSheet.find(r => r[0] === 'TSK-104');
assert.strictEqual(tsk103[1], nextSprintId, `TSK-103 harus pindah ke ${nextSprintId}`);
assert.strictEqual(tsk104[1], nextSprintId, `TSK-104 harus pindah ke ${nextSprintId}`);

// Verifikasi Audit Trail di Task_History
const historySheet = mockDb.sheets.Task_History;
const tsk103History = historySheet.filter(r => r[1] === 'TSK-103');
const tsk104History = historySheet.filter(r => r[1] === 'TSK-104');
assert.ok(tsk103History.length >= 1, 'TSK-103 harus memiliki log audit rollover');
assert.ok(tsk103History[0][4].includes('Rollover: SPR-101'), 'Audit trail harus mencatat rollover sumber');
assert.ok(tsk104History.length >= 1, 'TSK-104 harus memiliki log audit rollover');
console.log('   ✓ Task DONE diarsip di SPR-101, task belum tuntas dipindahkan ke ' + nextSprintId);
console.log('   ✓ Audit Trail rollover tercatat di sheet Task_History.\n');

// ============================================================================
// TEST 4: Menguji Rollover ke Product Backlog (BACKLOG-[project_id])
// ============================================================================
console.log('4. Menguji complete_sprint dengan opsi Rollover ke Product Backlog...');
// Aktifkan nextSprintId
vm.runInContext(`
  start_sprint({
    sprint_id: '${nextSprintId}',
    sprint_name: 'Sprint 2 - Payment & Transactions',
    duration_weeks: 2
  });
`, gasContext);

// Jalankan complete_sprint dengan rollover ke BACKLOG
const backlogRolloverResult = vm.runInContext(`
  complete_sprint({
    sprint_id: '${nextSprintId}',
    rollover_destination: 'BACKLOG'
  });
`, gasContext);

assert.strictEqual(backlogRolloverResult.success, true);
assert.strictEqual(backlogRolloverResult.data.destination_sprint_id, 'BACKLOG-PRJ-101');

// Verifikasi task sekarang ada di BACKLOG-PRJ-101
const tsk103After = tasksSheet.find(r => r[0] === 'TSK-103');
const tsk104After = tasksSheet.find(r => r[0] === 'TSK-104');
assert.strictEqual(tsk103After[1], 'BACKLOG-PRJ-101', 'TSK-103 harus dialihkan ke Product Backlog');
assert.strictEqual(tsk104After[1], 'BACKLOG-PRJ-101', 'TSK-104 harus dialihkan ke Product Backlog');
console.log('   ✓ Task belum tuntas berhasil dialihkan kembali ke BACKLOG-PRJ-101.\n');

// ============================================================================
// TEST 5: Menguji get_project_backlog_and_sprints membaca status sprint
// ============================================================================
console.log('5. Menguji get_project_backlog_and_sprints memuat atribut status sprint...');
const planningData = vm.runInContext(`
  get_project_backlog_and_sprints('PRJ-101');
`, gasContext);

assert.strictEqual(planningData.success, true);
assert.strictEqual(planningData.data.sprints.length, 2);
const spr1Status = planningData.data.sprints.find(s => s.id === 'SPR-101').status;
const spr2Status = planningData.data.sprints.find(s => s.id === nextSprintId).status;
assert.strictEqual(spr1Status, 'COMPLETED', 'Status SPR-101 harus COMPLETED');
assert.strictEqual(spr2Status, 'COMPLETED', 'Status SPR-2 harus COMPLETED');
console.log('   ✓ Status sprint berhasil dimuat secara akurat di Scrum Planning Engine.\n');

console.log('================================================================');
console.log('  SEMUA PENGUJIAN TAHAP 8 (COMPLETE SPRINT) BERHASIL (100% PASS)!');
console.log('================================================================\n');
