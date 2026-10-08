/**
 * Test Suite: Tahap 7 - User Management & Granular Permissions (RBAC Opsi 2)
 * Memvalidasi:
 * 1. Default permissions matrix & resolusi izin modular (resolve_user_permissions)
 * 2. Granular override (custom permissions JSON pada baris user)
 * 3. Otorisasi akses get_users_management_list (Hanya can_manage_users yang diizinkan)
 * 4. Pembuatan user baru (create_new_user) & validasi duplikasi email
 * 5. Update user (update_existing_user) & proteksi anti-lockout diri sendiri
 * 6. Hapus user (delete_existing_user) & proteksi anti-self-deletion
 * 7. Penegakan izin granular pada endpoints: create_new_project, create_new_task, move_task_to_sprint, start_sprint
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================');
console.log('  MENJALANKAN TAHAP 7: RBAC & USER MANAGEMENT CRUD TEST SUITE');
console.log('================================================================\n');

class MockSpreadsheetDatabase {
  constructor() {
    this.sheets = {
      Users: [
        ['id', 'name', 'email', 'role', 'permissions'],
        ['USR-001', 'Admin Utama', 'admin@example.com', 'ADMIN', '{"can_create_project":true,"can_manage_sprint":true,"can_create_task":true,"can_move_task":true,"can_view_insights":true,"can_manage_users":true}'],
        ['USR-002', 'Budi PM', 'pm@example.com', 'PM', ''],
        ['USR-003', 'Siti Developer', 'dev@example.com', 'MEMBER', ''],
        ['USR-004', 'Rian QA Engineer', 'qa@example.com', 'MEMBER', '{"can_create_task":true,"can_move_task":true}'],
        ['USR-005', 'Klien Eksternal PT ABC', 'client@example.com', 'CLIENT', '']
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
        ['TSK-001', 'SPR-001', 'Task A', 'TODO', 'USR-003', 8, '2026-10-01T08:00:00Z', '2026-10-01T08:00:00Z']
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
      getLastColumn: () => (sheetData[0] ? sheetData[0].length : 0),
      getDataRange: () => ({
        getValues: () => JSON.parse(JSON.stringify(sheetData))
      }),
      appendRow: (row) => {
        sheetData.push([...row]);
      },
      deleteRow: (row_idx) => {
        sheetData.splice(row_idx - 1, 1);
      },
      getRange: (row, col, numRows, numCols) => ({
        setValue: (val) => {
          sheetData[row - 1][col - 1] = val;
        },
        setFontWeight: () => {},
        setBackground: () => {},
        getValues: () => {
          return [sheetData[row - 1] || []];
        }
      })
    };
  }

  insertSheet(name) {
    this.sheets[name] = [];
    return this.getSheetByName(name);
  }
}

const mockDb = new MockSpreadsheetDatabase();
let currentMockUserEmail = 'admin@example.com';

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
const setupScript = fs.readFileSync(path.join(__dirname, '..', 'src', 'Setup.gs'), 'utf8');
const apiCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'API.gs'), 'utf8');

vm.runInContext(codeScript, gasContext);
vm.runInContext(setupScript, gasContext);
vm.runInContext(apiCode, gasContext);

// ============================================================================
// TEST 1: Default Permissions & Custom Granular Permissions Resolution
// ============================================================================
console.log('1. Menguji Matriks Hak Akses Default & Resolusi Granular...');

// Default Admin
const adminPerms = gasContext.resolve_user_permissions('ADMIN');
assert.strictEqual(adminPerms.can_manage_users, true, 'Admin harus punya can_manage_users');
assert.strictEqual(adminPerms.can_create_project, true, 'Admin harus punya can_create_project');

// Default PM
const pmPerms = gasContext.resolve_user_permissions('PM');
assert.strictEqual(pmPerms.can_manage_users, false, 'PM default tidak boleh can_manage_users');
assert.strictEqual(pmPerms.can_create_project, true, 'PM harus punya can_create_project');
assert.strictEqual(pmPerms.can_manage_sprint, true, 'PM harus punya can_manage_sprint');

// Default Member
const memberPerms = gasContext.resolve_user_permissions('MEMBER');
assert.strictEqual(memberPerms.can_create_project, false, 'Member default tidak boleh buat project');
assert.strictEqual(memberPerms.can_create_task, false, 'Member default tidak boleh buat task');
assert.strictEqual(memberPerms.can_move_task, true, 'Member default boleh geser status task');

// Granular Override: Member dengan custom can_create_task: true
const customMemberPerms = gasContext.resolve_user_permissions('MEMBER', '{"can_create_task":true}');
assert.strictEqual(customMemberPerms.can_create_task, true, 'Custom member harus memiliki can_create_task: true');
assert.strictEqual(customMemberPerms.can_create_project, false, 'Custom member tetap tidak boleh buat project');

console.log('   ✓ Resolusi default & custom modular permissions lulus.');

// ============================================================================
// TEST 2: Endpoint get_users_management_list & Guard Otorisasi
// ============================================================================
console.log('2. Menguji Otorisasi get_users_management_list...');

// Test akses ditolak jika bukan can_manage_users (misal PM)
currentMockUserEmail = 'pm@example.com';
const unauthorizedList = gasContext.get_users_management_list();
assert.strictEqual(unauthorizedList.success, false, 'PM tanpa izin tidak boleh memuat daftar users');
assert.match(unauthorizedList.message, /Akses Ditolak/i);

// Test akses diizinkan jika Admin
currentMockUserEmail = 'admin@example.com';
const adminList = gasContext.get_users_management_list();
assert.strictEqual(adminList.success, true, 'Admin harus bisa memuat daftar users');
assert.strictEqual(adminList.data.length, 5, 'Daftar user harus berjumlah 5');

// Validasi user Rian QA (USR-004) memiliki custom can_create_task: true
const rianUser = adminList.data.find(u => u.id === 'USR-004');
assert.ok(rianUser, 'User USR-004 harus ditemukan');
assert.strictEqual(rianUser.permissions.can_create_task, true, 'Rian QA harus memiliki izin can_create_task');

console.log('   ✓ Otorisasi dan data get_users_management_list lulus.');

// ============================================================================
// TEST 3: Pembuatan Pengguna Baru (create_new_user)
// ============================================================================
console.log('3. Menguji create_new_user & Validasi Duplikasi...');

// Ditolak jika user aktif bukan admin
currentMockUserEmail = 'dev@example.com';
const rejectCreate = gasContext.create_new_user({
  name: 'Hacker',
  email: 'hacker@example.com',
  role: 'MEMBER'
});
assert.strictEqual(rejectCreate.success, false, 'Non-admin tidak boleh membuat user');

// Admin membuat user baru dengan custom permissions
currentMockUserEmail = 'admin@example.com';
const newUserRes = gasContext.create_new_user({
  name: 'Doni Lead Dev',
  email: 'doni@example.com',
  role: 'MEMBER',
  permissions: { can_create_task: true, can_manage_sprint: true }
});
assert.strictEqual(newUserRes.success, true, 'Admin harus berhasil membuat user baru');
assert.strictEqual(newUserRes.data.id, 'USR-006', 'ID user baru harus USR-006');
assert.strictEqual(newUserRes.data.permissions.can_create_task, true);
assert.strictEqual(newUserRes.data.permissions.can_manage_sprint, true);

// Ditolak jika email sudah terdaftar
const duplicateRes = gasContext.create_new_user({
  name: 'Kloning Admin',
  email: 'admin@example.com',
  role: 'ADMIN'
});
assert.strictEqual(duplicateRes.success, false, 'Email duplikat harus ditolak');
assert.match(duplicateRes.message, /sudah terdaftar/i);

console.log('   ✓ Pembuatan user baru dan proteksi duplikasi email lulus.');

// ============================================================================
// TEST 4: Update Pengguna & Proteksi Anti-Lockout (update_existing_user)
// ============================================================================
console.log('4. Menguji update_existing_user & Proteksi Lockout...');

// Update data user USR-003 (Siti Developer) menjadi PM
const updateRes = gasContext.update_existing_user({
  id: 'USR-003',
  name: 'Siti Promoted PM',
  email: 'dev@example.com',
  role: 'PM',
  permissions: { can_create_project: true, can_manage_sprint: true }
});
assert.strictEqual(updateRes.success, true, 'Update user lain harus berhasil');
assert.strictEqual(updateRes.data.name, 'Siti Promoted PM');
assert.strictEqual(updateRes.data.role, 'PM');

// Admin mencoba mencabut can_manage_users dari akunnya sendiri (admin@example.com)
const lockoutAttempt = gasContext.update_existing_user({
  id: 'USR-001',
  name: 'Admin Utama',
  email: 'admin@example.com',
  role: 'MEMBER',
  permissions: { can_manage_users: false }
});
assert.strictEqual(lockoutAttempt.success, false, 'Mencabut can_manage_users dari diri sendiri harus ditolak!');
assert.match(lockoutAttempt.message, /lockout sistem/i);

console.log('   ✓ Update pengguna dan proteksi anti-lockout lulus.');

// ============================================================================
// TEST 5: Hapus Pengguna & Proteksi Anti-Self-Deletion (delete_existing_user)
// ============================================================================
console.log('5. Menguji delete_existing_user & Proteksi Self-Deletion...');

// Admin mencoba menghapus akunnya sendiri (USR-001 / admin@example.com)
const selfDeleteAttempt = gasContext.delete_existing_user('USR-001');
assert.strictEqual(selfDeleteAttempt.success, false, 'Admin tidak boleh menghapus akunnya sendiri!');
assert.match(selfDeleteAttempt.message, /tidak dapat menghapus akun Anda sendiri/i);

// Admin menghapus user yang baru dibuat (USR-006)
const deleteUserRes = gasContext.delete_existing_user('USR-006');
assert.strictEqual(deleteUserRes.success, true, 'Menghapus user lain harus berhasil');

console.log('   ✓ Hapus pengguna dan proteksi anti-self-deletion lulus.');

// ============================================================================
// TEST 6: Penegakan Izin Granular pada Operasi Project & Task
// ============================================================================
console.log('6. Menguji Penegakan Izin Granular pada Project & Task...');

// Akun Member murni tanpa can_create_project / can_create_task
currentMockUserEmail = 'qa@example.com'; // Rian QA: has can_create_task: true, but can_create_project: false
const failProject = gasContext.create_new_project({ name: 'Proyek QA Ilegal' });
assert.strictEqual(failProject.success, false, 'User tanpa can_create_project harus ditolak');

const passTask = gasContext.create_new_task({
  title: 'Task Baru oleh QA yang diizinkan',
  sprint_id: 'SPR-001'
});
assert.strictEqual(passTask.success, true, 'User dengan granular can_create_task: true harus berhasil membuat task');

// Klien eksternal (client@example.com) mencoba memindahkan task
currentMockUserEmail = 'client@example.com';
const failMove = gasContext.move_task_to_sprint('TSK-001', 'SPR-001');
assert.strictEqual(failMove.success, false, 'User tanpa can_move_task harus ditolak memindahkan task');

console.log('   ✓ Penegakan izin granular pada operasi project & task lulus.\n');

console.log('================================================================');
console.log('  SEMUA PENGUJIAN TAHAP 7 BERHASIL (100% PASS)!');
console.log('================================================================\n');
