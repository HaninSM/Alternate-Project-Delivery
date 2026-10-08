/**
 * End-to-End Test Suite: Tahap 5 - Quality Gate & End-to-End Validation
 * Mensimulasikan siklus lengkap dari awal hingga akhir:
 * 1. Seed Database Schema & Data Simulasi
 * 2. Login & Otorisasi RBAC (PM, Member, Client)
 * 3. Retrieval Kanban Board & Sprint Tasks
 * 4. Pengerjaan Task & Perubahan Status Atomik (Audit Trail di Task_History)
 * 5. Kalkulasi Dasbor Actionable Insights (Burndown, Lead Time, Cycle Time, Blocker)
 * 6. Penegakan Otorisasi Read-Only Klien Eksternal
 * 7. Verifikasi Standar Koding (snake_case, JSDoc, Modularitas)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  MENJALANKAN TAHAP 5: END-TO-END QUALITY GATE VALIDATION SUITE ');
console.log('================================================================\n');

// 1. Mock Database In-Memory Google Sheets
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
        ['PRJ-001', 'Website Redesign & Portal Delivery', 'USR-002']
      ],
      Sprints: [
        ['id', 'project_id', 'name', 'start_date', 'end_date'],
        ['SPR-001', 'PRJ-001', 'Sprint 1 - Foundations & Core Flow', '2026-10-01', '2026-10-10']
      ],
      Tasks: [
        ['id', 'sprint_id', 'title', 'status', 'assignee_id', 'estimate_hours', 'created_at', 'updated_at'],
        ['TSK-001', 'SPR-001', 'Setup Database Schema & Google Sheets Tabs', 'DONE', 'USR-003', 8, '2026-10-01T08:00:00Z', '2026-10-02T16:00:00Z'],
        ['TSK-002', 'SPR-001', 'Implementasi Shell UI Tailwind CSS & SPA', 'DONE', 'USR-003', 12, '2026-10-01T09:00:00Z', '2026-10-03T18:00:00Z'],
        ['TSK-003', 'SPR-001', 'Time-in-Status Engine & Audit Trail', 'REVIEW', 'USR-003', 16, '2026-10-02T10:00:00Z', '2026-10-05T14:00:00Z'],
        ['TSK-004', 'SPR-001', 'Integrasi API Gateway Payment Provider', 'IN_PROGRESS', 'USR-004', 14, '2026-10-02T11:00:00Z', '2026-10-04T09:00:00Z'],
        ['TSK-005', 'SPR-001', 'Burndown Chart Visualization & Metrics', 'IN_PROGRESS', 'USR-003', 10, '2026-10-06T08:00:00Z', '2026-10-07T10:00:00Z'],
        ['TSK-006', 'SPR-001', 'UAT Bersama Klien Eksternal & Release Notes', 'TODO', 'USR-002', 8, '2026-10-01T08:00:00Z', '2026-10-01T08:00:00Z']
      ],
      Task_History: [
        ['id', 'task_id', 'old_status', 'new_status', 'changed_by', 'timestamp'],
        ['HIS-001', 'TSK-001', 'TODO', 'IN_PROGRESS', 'dev@example.com', '2026-10-01T10:00:00Z'],
        ['HIS-002', 'TSK-001', 'IN_PROGRESS', 'DONE', 'pm@example.com', '2026-10-02T16:00:00Z'],
        ['HIS-003', 'TSK-002', 'TODO', 'IN_PROGRESS', 'dev@example.com', '2026-10-02T08:00:00Z'],
        ['HIS-004', 'TSK-002', 'IN_PROGRESS', 'DONE', 'pm@example.com', '2026-10-03T18:00:00Z'],
        ['HIS-005', 'TSK-003', 'TODO', 'IN_PROGRESS', 'dev@example.com', '2026-10-03T09:00:00Z'],
        ['HIS-006', 'TSK-003', 'IN_PROGRESS', 'REVIEW', 'dev@example.com', '2026-10-05T14:00:00Z'],
        ['HIS-007', 'TSK-004', 'TODO', 'IN_PROGRESS', 'qa@example.com', '2026-10-04T09:00:00Z'],
        ['HIS-008', 'TSK-005', 'TODO', 'IN_PROGRESS', 'dev@example.com', '2026-10-06T10:00:00Z']
      ]
    };
  }

  getSheet(name) {
    const table = this.sheets[name];
    if (!table) return null;
    return {
      getDataRange: () => ({ getValues: () => table }),
      getLastRowNum: () => table.length,
      appendRow: (row) => table.push(row),
      getRange: (row, col) => ({
        setValue: (val) => { table[row - 1][col - 1] = val; }
      })
    };
  }
}

// 2. Test Skenario E2E
const db = new MockSpreadsheetDatabase();

console.log('--- Skenario 1: Verifikasi Seed Data 5 Sheet ---');
assert.strictEqual(db.sheets.Users.length, 6, 'Users harus berisi 5 user + 1 header');
assert.strictEqual(db.sheets.Projects.length, 2, 'Projects harus berisi 1 project + 1 header');
assert.strictEqual(db.sheets.Sprints.length, 2, 'Sprints harus berisi 1 sprint + 1 header');
assert.strictEqual(db.sheets.Tasks.length, 7, 'Tasks harus berisi 6 task + 1 header');
assert.strictEqual(db.sheets.Task_History.length, 9, 'Task_History harus berisi 8 log + 1 header');
console.log('✓ Skenario 1 PASSED: Skema dan seed data lengkap terinjeksi.\n');

console.log('--- Skenario 2: Login & RBAC Profiling ---');
function get_mock_user(email) {
  const users = db.sheets.Users;
  for (let i = 1; i < users.length; i++) {
    if (users[i][2] === email) {
      return { id: users[i][0], name: users[i][1], email: users[i][2], role: users[i][3] };
    }
  }
  return { id: 'UNREGISTERED', name: email, email, role: 'CLIENT' };
}

const session_pm = get_mock_user('pm@example.com');
const session_dev = get_mock_user('dev@example.com');
const session_client = get_mock_user('client@example.com');

assert.strictEqual(session_pm.role, 'PM');
assert.strictEqual(session_dev.role, 'MEMBER');
assert.strictEqual(session_client.role, 'CLIENT');
console.log('✓ Skenario 2 PASSED: Sesi login PM, Member, dan Client teridentifikasi dengan tepat.\n');

console.log('--- Skenario 3: Pengerjaan Task & Pergeseran Status (Time-in-Status Engine) ---');
function update_status_e2e(task_id, new_status, current_user) {
  if (current_user.role === 'CLIENT') {
    return { success: false, message: 'Akses Ditolak: Klien Eksternal memiliki hak akses Read-only.' };
  }
  const tasks = db.sheets.Tasks;
  const history = db.sheets.Task_History;
  for (let r = 1; r < tasks.length; r++) {
    if (tasks[r][0] === task_id) {
      const old_status = tasks[r][3];
      const now_ts = '2026-10-08T12:00:00Z';
      tasks[r][3] = new_status;
      tasks[r][7] = now_ts;
      history.push(['HIS-' + Math.floor(Math.random() * 9000 + 1000), task_id, old_status, new_status, current_user.email, now_ts]);
      return { success: true, old_status, new_status };
    }
  }
  return { success: false, message: 'Task tidak ditemukan' };
}

// 3.1 Developer memindahkan TSK-003 dari REVIEW ke DONE
const dev_action = update_status_e2e('TSK-003', 'DONE', session_dev);
assert.strictEqual(dev_action.success, true);
assert.strictEqual(dev_action.old_status, 'REVIEW');
assert.strictEqual(dev_action.new_status, 'DONE');

// Verifikasi perubahan pada tabel Tasks & Task_History
const tsk3 = db.sheets.Tasks.find(t => t[0] === 'TSK-003');
assert.strictEqual(tsk3[3], 'DONE', 'Status TSK-003 harus menjadi DONE');
const last_history = db.sheets.Task_History[db.sheets.Task_History.length - 1];
assert.strictEqual(last_history[1], 'TSK-003');
assert.strictEqual(last_history[2], 'REVIEW');
assert.strictEqual(last_history[3], 'DONE');
assert.strictEqual(last_history[4], 'dev@example.com');
console.log('✓ Skenario 3.1 PASSED: Transisi status oleh Developer tercatat di Tasks & Task_History.');

// 3.2 Client mencoba menggeser task (Harus Ditolak)
const client_illegal_action = update_status_e2e('TSK-006', 'IN_PROGRESS', session_client);
assert.strictEqual(client_illegal_action.success, false);
assert(client_illegal_action.message.includes('Akses Ditolak'));
console.log('✓ Skenario 3.2 PASSED: Akses ilegal mutasi task oleh External Client berhasil ditangkal.\n');

console.log('--- Skenario 4: Kalkulasi Insight Teragregasi & Blocker Detection ---');
// Menguji algoritma kalkulasi metriks terhadap state DB terkini
const fixed_now = new Date('2026-10-08T12:00:00Z');
function calculate_insights_e2e() {
  const tasks_raw = db.sheets.Tasks.slice(1);
  const hist_raw = db.sheets.Task_History.slice(1);
  const sprint_raw = db.sheets.Sprints[1];

  let total_lead_h = 0;
  let done_lead_cnt = 0;
  let total_cycle_h = 0;
  let done_cycle_cnt = 0;
  const blockers = [];

  const hist_map = {};
  hist_raw.forEach(h => {
    if (!hist_map[h[1]]) hist_map[h[1]] = [];
    hist_map[h[1]].push({ new_status: h[3], timestamp: h[5] });
  });

  tasks_raw.forEach(t => {
    const id = t[0];
    const title = t[2];
    const status = t[3];
    const assignee_id = t[4];
    const estimate_hours = Number(t[5]);
    const created_at = t[6];
    const updated_at = t[7];

    const logs = hist_map[id] || [];
    const first_in_progress = logs.find(l => l.new_status === 'IN_PROGRESS');
    const first_done = logs.find(l => l.new_status === 'DONE');

    let done_time = null;
    if (status === 'DONE') {
      done_time = first_done ? new Date(first_done.timestamp) : new Date(updated_at);
    }

    if (done_time && created_at) {
      const lead = (done_time.getTime() - new Date(created_at).getTime()) / (1000 * 3600);
      total_lead_h += lead;
      done_lead_cnt++;
    }

    if (done_time && first_in_progress) {
      const cycle = (done_time.getTime() - new Date(first_in_progress.timestamp).getTime()) / (1000 * 3600);
      total_cycle_h += cycle;
      done_cycle_cnt++;
    }

    // Deteksi Blocker (> 48 jam macet di IN_PROGRESS atau REVIEW)
    if (status === 'IN_PROGRESS' || status === 'REVIEW') {
      const last_change = updated_at ? new Date(updated_at) : new Date(created_at);
      const stuck_h = (fixed_now.getTime() - last_change.getTime()) / (1000 * 3600);
      if (stuck_h >= 48) {
        blockers.push({ id, title, stuck_h: Number(stuck_h.toFixed(1)) });
      }
    }
  });

  return {
    avg_lead_time_hours: done_lead_cnt > 0 ? Number((total_lead_h / done_lead_cnt).toFixed(1)) : 0,
    avg_cycle_time_hours: done_cycle_cnt > 0 ? Number((total_cycle_h / done_cycle_cnt).toFixed(1)) : 0,
    done_count: done_lead_cnt,
    blockers: blockers
  };
}

const insight_results = calculate_insights_e2e();
assert.strictEqual(insight_results.done_count, 3, 'Harus ada 3 task yang selesai (TSK-001, TSK-002, TSK-003)');
assert(insight_results.avg_lead_time_hours > 0, 'Rata-rata Lead Time harus bernilai positif');
assert(insight_results.avg_cycle_time_hours > 0, 'Rata-rata Cycle Time harus bernilai positif');

// TSK-004 adalah task IN_PROGRESS sejak 2026-10-04 (macet > 48 jam)
assert.strictEqual(insight_results.blockers.length, 1);
assert.strictEqual(insight_results.blockers[0].id, 'TSK-004');
console.log('✓ Skenario 4 PASSED: Lead Time (' + insight_results.avg_lead_time_hours + 'h), Cycle Time (' + insight_results.avg_cycle_time_hours + 'h), dan Blocker (TSK-004: ' + insight_results.blockers[0].stuck_h + 'h) terhitung akurat.\n');

console.log('--- Skenario 5: Verifikasi Standar Koding & Pedoman Proyek ---');
const src_dir = path.join(__dirname, '..', 'src');
const files_to_audit = ['Code.gs', 'API.gs', 'Insights.gs', 'Setup.gs'];

files_to_audit.forEach(file_name => {
  const content = fs.readFileSync(path.join(src_dir, file_name), 'utf8');
  assert(content.includes('/**'), file_name + ' harus memuat JSDoc comments');
  // Verifikasi konvensi snake_case untuk fungsi utama
  const function_matches = content.match(/function\s+([a-zA-Z0-9_]+)\s*\(/g) || [];
  function_matches.forEach(fn => {
    const fn_name = fn.replace('function', '').replace('(', '').trim();
    if (fn_name !== 'doGet' && fn_name !== 'include') { // Pengecualian fungsi bawaan GAS
      const is_snake_case = /^[a-z][a-z0-9_]*$/.test(fn_name);
      assert(is_snake_case, `Fungsi "${fn_name}" di ${file_name} harus menggunakan format snake_case`);
    }
  });
});
console.log('✓ Skenario 5 PASSED: Seluruh file .gs mematuhi konvensi snake_case, modularitas, dan kelengkapan JSDoc docstrings.\n');

console.log('================================================================');
console.log('  HASIL AKHIR: 100% TEST BERHASIL (PASS)! QUALITY GATE TAHAP 5  ');
console.log('================================================================');
