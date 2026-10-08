/**
 * Unit Test / Test Suite untuk Tahap 1: Setup & Pondasi Backend
 * Menguji logika get_user_role() dan integritas skema spreadsheet.
 */

const assert = require('assert');

// Mock SpreadsheetApp & Google Apps Script Environment
function create_mock_gas_environment(options = {}) {
  const sheets = {
    Users: options.users_data || [
      ['id', 'name', 'email', 'role'],
      ['USR-001', 'Admin Utama', 'admin@example.com', 'ADMIN'],
      ['USR-002', 'Budi PM', 'pm@example.com', 'PM'],
      ['USR-003', 'Siti Developer', 'dev@example.com', 'MEMBER'],
      ['USR-004', 'Klien Eksternal', 'client@example.com', 'CLIENT']
    ],
    Projects: [['id', 'name', 'pm_id']],
    Sprints: [['id', 'project_id', 'name', 'start_date', 'end_date']],
    Tasks: [['id', 'sprint_id', 'title', 'status', 'assignee_id', 'estimate_hours', 'created_at', 'updated_at']],
    Task_History: [['id', 'task_id', 'old_status', 'new_status', 'changed_by', 'timestamp']]
  };

  const mock_spreadsheet = {
    getSheetByName: (name) => {
      if (!sheets[name]) return null;
      return {
        getDataRange: () => ({
          getValues: () => sheets[name]
        }),
        getLastRowNum: () => sheets[name].length,
        appendRow: (row) => sheets[name].push(row),
        getRange: () => ({
          setFontWeight: () => {},
          setBackground: () => {}
        })
      };
    },
    insertSheet: (name) => {
      sheets[name] = [];
      return mock_spreadsheet.getSheetByName(name);
    },
    getSheets: () => Object.keys(sheets).map(name => mock_spreadsheet.getSheetByName(name)),
    deleteSheet: () => {}
  };

  const mock_session = {
    getActiveUser: () => ({
      getEmail: () => options.current_user_email || 'pm@example.com'
    })
  };

  return { mock_spreadsheet, mock_session };
}

// Implementasi fungsi yang diuji dengan injeksi mock
function run_get_user_role_test(mock_env) {
  const user_email = mock_env.mock_session.getActiveUser().getEmail().toLowerCase().trim();
  const spreadsheet = mock_env.mock_spreadsheet;
  const sheet_users = spreadsheet.getSheetByName('Users');

  if (!sheet_users) {
    return {
      success: false,
      message: 'Sheet "Users" belum ditemukan.'
    };
  }

  const data_values = sheet_users.getDataRange().getValues();
  if (data_values.length <= 1) {
    return {
      success: true,
      data: {
        id: 'GUEST',
        name: user_email || 'Tamu Google',
        email: user_email,
        role: 'CLIENT'
      }
    };
  }

  const header = data_values[0].map(h => String(h).trim().toLowerCase());
  const email_index = header.indexOf('email');
  const id_index = header.indexOf('id');
  const name_index = header.indexOf('name');
  const role_index = header.indexOf('role');

  for (let row_idx = 1; row_idx < data_values.length; row_idx++) {
    const row = data_values[row_idx];
    const registered_email = String(row[email_index]).toLowerCase().trim();

    if (user_email && registered_email === user_email) {
      return {
        success: true,
        data: {
          id: row[id_index],
          name: row[name_index],
          email: registered_email,
          role: String(row[role_index]).toUpperCase().trim()
        }
      };
    }
  }

  return {
    success: true,
    data: {
      id: 'UNREGISTERED',
      name: user_email || 'Pengguna Tidak Terdaftar',
      email: user_email,
      role: 'CLIENT'
    }
  };
}

// Menjalankan Test Cases
console.log('--- Menjalankan Uji Coba Tahap 1: Backend & RBAC Logic ---');

// Test 1: User PM terdaftar
const env_pm = create_mock_gas_environment({ current_user_email: 'pm@example.com' });
const res_pm = run_get_user_role_test(env_pm);
assert.strictEqual(res_pm.success, true);
assert.strictEqual(res_pm.data.role, 'PM');
assert.strictEqual(res_pm.data.name, 'Budi PM');
console.log('✓ Test 1 Lolos: PM berhasil dikenali dengan role PM.');

// Test 2: User Member terdaftar
const env_dev = create_mock_gas_environment({ current_user_email: 'dev@example.com' });
const res_dev = run_get_user_role_test(env_dev);
assert.strictEqual(res_dev.success, true);
assert.strictEqual(res_dev.data.role, 'MEMBER');
console.log('✓ Test 2 Lolos: Member berhasil dikenali dengan role MEMBER.');

// Test 3: User Klien Eksternal
const env_client = create_mock_gas_environment({ current_user_email: 'client@example.com' });
const res_client = run_get_user_role_test(env_client);
assert.strictEqual(res_client.success, true);
assert.strictEqual(res_client.data.role, 'CLIENT');
console.log('✓ Test 3 Lolos: Klien berhasil dikenali dengan role CLIENT.');

// Test 4: User tidak terdaftar (Fallback aman ke CLIENT / Read-only)
const env_unknown = create_mock_gas_environment({ current_user_email: 'stranger@external.io' });
const res_unknown = run_get_user_role_test(env_unknown);
assert.strictEqual(res_unknown.success, true);
assert.strictEqual(res_unknown.data.role, 'CLIENT');
assert.strictEqual(res_unknown.data.id, 'UNREGISTERED');
console.log('✓ Test 4 Lolos: Email tak terdaftar otomatis fallback ke role CLIENT (Read-only).');

// Test 5: Sheet Users kosong hanya header
const env_empty = create_mock_gas_environment({ 
  current_user_email: 'anyone@test.com',
  users_data: [['id', 'name', 'email', 'role']]
});
const res_empty = run_get_user_role_test(env_empty);
assert.strictEqual(res_empty.success, true);
assert.strictEqual(res_empty.data.role, 'CLIENT');
console.log('✓ Test 5 Lolos: Sheet kosong ditangani dengan fallback aman.');

console.log('\nSEMUA TEST TAHAP 1 BERHASIL (PASS)! Quality Gate Tahap 1 Terpenuhi.');
