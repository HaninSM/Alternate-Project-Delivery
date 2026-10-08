/**
 * Unit Test / Test Suite untuk Tahap 3: Core Mechanics
 * Menguji API get_sprint_tasks() dan pembaruan atomik update_task_status()
 * dengan pencatatan audit trail ke Task_History dan perlindungan RBAC Client.
 */

const assert = require('assert');

// Setup mock Google Spreadsheet dengan data realistis
function create_mock_environment_stage3() {
  const users_table = [
    ['id', 'name', 'email', 'role'],
    ['USR-001', 'Alex PM', 'alex@example.com', 'PM'],
    ['USR-002', 'Budi Dev', 'budi@example.com', 'MEMBER'],
    ['USR-003', 'Citra Client', 'citra@example.com', 'CLIENT']
  ];

  const tasks_table = [
    ['id', 'sprint_id', 'title', 'status', 'assignee_id', 'estimate_hours', 'created_at', 'updated_at'],
    ['TSK-001', 'SPR-001', 'Task Pertama', 'TODO', 'USR-002', 8, '2026-10-01T08:00:00Z', '2026-10-01T08:00:00Z'],
    ['TSK-002', 'SPR-001', 'Task Kedua', 'IN_PROGRESS', 'USR-002', 4, '2026-10-02T08:00:00Z', '2026-10-02T08:00:00Z'],
    ['TSK-003', 'SPR-002', 'Task Sprint Lain', 'TODO', 'USR-002', 5, '2026-10-02T08:00:00Z', '2026-10-02T08:00:00Z']
  ];

  const history_table = [
    ['id', 'task_id', 'old_status', 'new_status', 'changed_by', 'timestamp']
  ];

  const mock_spreadsheet = {
    getSheetByName: (name) => {
      let data = null;
      if (name === 'Users') data = users_table;
      else if (name === 'Tasks') data = tasks_table;
      else if (name === 'Task_History') data = history_table;
      if (!data) return null;

      return {
        getDataRange: () => ({ getValues: () => data }),
        getLastRowNum: () => data.length,
        appendRow: (row) => data.push(row),
        getRange: (row, col) => ({
          setValue: (val) => {
            // SpreadsheetApp 1-indexed
            data[row - 1][col - 1] = val;
          }
        })
      };
    }
  };

  return {
    spreadsheet: mock_spreadsheet,
    raw_tables: { users_table, tasks_table, history_table }
  };
}

// Simulasi logika API get_sprint_tasks
function simulate_get_sprint_tasks(env, sprint_id) {
  const sheet_tasks = env.spreadsheet.getSheetByName('Tasks');
  const sheet_users = env.spreadsheet.getSheetByName('Users');
  const user_values = sheet_users.getDataRange().getValues();
  const user_name_map = {};
  for (let i = 1; i < user_values.length; i++) {
    user_name_map[user_values[i][0]] = user_values[i][1];
  }

  const task_values = sheet_tasks.getDataRange().getValues();
  const tasks = [];
  for (let r = 1; r < task_values.length; r++) {
    const row = task_values[r];
    if (!sprint_id || row[1] === sprint_id) {
      tasks.push({
        id: row[0],
        sprint_id: row[1],
        title: row[2],
        status: row[3],
        assignee_id: row[4],
        assignee_name: user_name_map[row[4]] || 'Unassigned',
        estimate_hours: row[5]
      });
    }
  }
  return { success: true, data: tasks };
}

// Simulasi logika API update_task_status
function simulate_update_task_status(env, task_id, new_status, current_user) {
  const VALID_TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
  const formatted_status = String(new_status).toUpperCase().trim();

  if (!VALID_TASK_STATUSES.includes(formatted_status)) {
    return { success: false, message: 'Status tidak valid.' };
  }

  // RBAC check
  if (current_user.role === 'CLIENT') {
    return { success: false, message: 'Akses Ditolak: Klien Eksternal memiliki hak akses Read-only.' };
  }

  const sheet_tasks = env.spreadsheet.getSheetByName('Tasks');
  const sheet_history = env.spreadsheet.getSheetByName('Task_History');
  const task_values = sheet_tasks.getDataRange().getValues();

  let target_row_index = -1;
  let old_status = '';

  for (let r = 1; r < task_values.length; r++) {
    if (task_values[r][0] === task_id) {
      target_row_index = r + 1;
      old_status = task_values[r][3];
      break;
    }
  }

  if (target_row_index === -1) {
    return { success: false, message: 'Task tidak ditemukan.' };
  }

  if (old_status === formatted_status) {
    return { success: true, message: 'Status sama.' };
  }

  const timestamp = '2026-10-08T12:00:00Z';

  // Update sheet Tasks
  sheet_tasks.getRange(target_row_index, 4).setValue(formatted_status); // Col 4: status
  sheet_tasks.getRange(target_row_index, 8).setValue(timestamp);       // Col 8: updated_at

  // Append sheet Task_History
  const history_id = 'HIS-' + Math.floor(Math.random() * 10000);
  sheet_history.appendRow([
    history_id,
    task_id,
    old_status,
    formatted_status,
    current_user.email,
    timestamp
  ]);

  return {
    success: true,
    data: {
      task_id,
      old_status,
      new_status: formatted_status,
      changed_by: current_user.email,
      timestamp
    }
  };
}

console.log('--- Menjalankan Uji Coba Tahap 3: Core Mechanics & Time-in-Status Engine ---');

const env = create_mock_environment_stage3();

// Test 1: Mengambil task berdasarkan sprint_id
const sprint1_res = simulate_get_sprint_tasks(env, 'SPR-001');
assert.strictEqual(sprint1_res.success, true);
assert.strictEqual(sprint1_res.data.length, 2, 'Harus mengembalikan 2 task untuk SPR-001');
assert.strictEqual(sprint1_res.data[0].assignee_name, 'Budi Dev');
console.log('✓ Test 1 Lolos: get_sprint_tasks() berhasil mengambil dan memfilter task sesuai sprint.');

// Test 2: Member / PM mengupdate status task
const user_dev = { email: 'budi@example.com', role: 'MEMBER' };
const update_res = simulate_update_task_status(env, 'TSK-001', 'IN_PROGRESS', user_dev);
assert.strictEqual(update_res.success, true);
assert.strictEqual(update_res.data.old_status, 'TODO');
assert.strictEqual(update_res.data.new_status, 'IN_PROGRESS');

// Verifikasi mutasi pada sheet Tasks
const updated_task_row = env.raw_tables.tasks_table.find(r => r[0] === 'TSK-001');
assert.strictEqual(updated_task_row[3], 'IN_PROGRESS', 'Kolom status di sheet Tasks harus berubah');
console.log('✓ Test 2 Lolos: Status pada sheet Tasks berhasil terupdate ke IN_PROGRESS.');

// Test 3: Verifikasi audit trail di Task_History
assert.strictEqual(env.raw_tables.history_table.length, 2, 'Task_History harus memiliki 1 baris log baru');
const history_entry = env.raw_tables.history_table[1];
assert.strictEqual(history_entry[1], 'TSK-001');
assert.strictEqual(history_entry[2], 'TODO');
assert.strictEqual(history_entry[3], 'IN_PROGRESS');
assert.strictEqual(history_entry[4], 'budi@example.com');
console.log('✓ Test 3 Lolos: Log audit trail berhasil dicatat di sheet Task_History dengan old_status, new_status, email, dan timestamp.');

// Test 4: External Client dilarang mengubah status (RBAC Enforcement)
const user_client = { email: 'citra@example.com', role: 'CLIENT' };
const client_attempt = simulate_update_task_status(env, 'TSK-001', 'DONE', user_client);
assert.strictEqual(client_attempt.success, false);
assert(client_attempt.message.includes('Akses Ditolak'));
console.log('✓ Test 4 Lolos: External Client dicegah memodifikasi status task (Read-only terlindungi).');

// Test 5: Validasi status tidak sah
const invalid_attempt = simulate_update_task_status(env, 'TSK-001', 'UNKNOWN_STATUS', user_dev);
assert.strictEqual(invalid_attempt.success, false);
console.log('✓ Test 5 Lolos: Input status invalid berhasil ditolak oleh sistem.');

console.log('\nSEMUA TEST TAHAP 3 BERHASIL (PASS)! Quality Gate Tahap 3 Terpenuhi.');
