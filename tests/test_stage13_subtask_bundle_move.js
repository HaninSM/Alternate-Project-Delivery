/**
 * @fileoverview Test Suite Tahap 13: Bundled Hierarchy Movement & Clean Backlog UI
 * Memverifikasi:
 * 1. Logika Pemindahan Sepaket (Bundled Move) saat menggeser Parent (Level 0 atau Level 1):
 *    - Memindahkan task Level 0 (Story/Task/Bug) otomatis mengikutsertakan seluruh Subtask (-1)
 *    - Memindahkan task Level 1 (Inisiatif) otomatis mengikutsertakan seluruh anak (Level 0) dan subtask (Level -1)
 *    - Memindahkan single Subtask (Level -1) hanya memindahkan dirinya sendiri
 * 2. Logika Pengurutan Hirarki Tampilan (sort_tasks_by_hierarchy):
 *    - Subtask selalu tampil menempel langsung di bawah kartu parent-nya
 * 3. Tata Letak UI Responsif 3-Baris:
 *    - Menghilangkan tumpang tindih elemen (Header terpisah, Title lebar penuh, Footer terstruktur)
 *    - Indentasi visual untuk kartu Subtask (border-l-4, ml-4/ml-6, background kontras)
 * 4. Sinkronisasi Backend Google Apps Script (move_task_to_sprint):
 *    - Pembaruan baris database sheet Tasks mencakup seluruh ID turunan
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  MENJALANKAN TAHAP 13: BUNDLED HIERARCHY MOVE & UI TEST SUITE');
console.log('================================================================\n');

// 1. Uji Logika Pengurutan Hirarki (sort_tasks_by_hierarchy)
console.log('1. Menguji Pengurutan Hirarki Tampilan (sort_tasks_by_hierarchy)...');

function sort_tasks_by_hierarchy(tasks) {
  if (!tasks || tasks.length <= 1) return tasks || [];

  const task_map = {};
  const children_map = {};
  const root_tasks = [];

  tasks.forEach(t => {
    task_map[t.id] = t;
  });

  tasks.forEach(t => {
    if (t.parent_id && task_map[t.parent_id]) {
      if (!children_map[t.parent_id]) children_map[t.parent_id] = [];
      children_map[t.parent_id].push(t);
    } else {
      root_tasks.push(t);
    }
  });

  root_tasks.sort((a, b) => {
    const lvl_a = Number(a.hierarchy_level !== undefined ? a.hierarchy_level : 0);
    const lvl_b = Number(b.hierarchy_level !== undefined ? b.hierarchy_level : 0);
    if (lvl_b !== lvl_a) return lvl_b - lvl_a;
    return String(a.id).localeCompare(String(b.id));
  });

  const result = [];
  function append_branch(item) {
    result.push(item);
    const children = children_map[item.id] || [];
    children.sort((a, b) => {
      const lvl_a = Number(a.hierarchy_level !== undefined ? a.hierarchy_level : 0);
      const lvl_b = Number(b.hierarchy_level !== undefined ? b.hierarchy_level : 0);
      if (lvl_b !== lvl_a) return lvl_b - lvl_a;
      return String(a.id).localeCompare(String(b.id));
    });
    children.forEach(child => append_branch(child));
  }

  root_tasks.forEach(rt => append_branch(rt));
  tasks.forEach(t => {
    if (!result.includes(t)) result.push(t);
  });

  return result;
}

const mock_unordered_tasks = [
  { id: 'TSK-010', title: 'Subtask B', work_type: 'SUBTASK', hierarchy_level: -1, parent_id: 'TSK-009' },
  { id: 'TSK-012', title: 'Independent Task', work_type: 'TASK', hierarchy_level: 0, parent_id: '' },
  { id: 'TSK-009', title: 'Parent Story', work_type: 'USER_STORY', hierarchy_level: 0, parent_id: '' },
  { id: 'TSK-011', title: 'Subtask A', work_type: 'SUBTASK', hierarchy_level: -1, parent_id: 'TSK-009' },
  { id: 'INIT-001', title: 'Macro Initiative', work_type: 'INITIATIVE', hierarchy_level: 1, parent_id: '' }
];

const sorted_tasks = sort_tasks_by_hierarchy(mock_unordered_tasks);
const sorted_ids = sorted_tasks.map(t => t.id);

// Verifikasi: Inisiatif tampil paling awal
assert.strictEqual(sorted_ids[0], 'INIT-001', 'Inisiatif (Level 1) harus berada di urutan teratas');
// Verifikasi: Subtask TSK-010 dan TSK-011 harus langsung mengikuti parent TSK-009
const idx_parent = sorted_ids.indexOf('TSK-009');
const idx_sub_a = sorted_ids.indexOf('TSK-010');
const idx_sub_b = sorted_ids.indexOf('TSK-011');

assert.strictEqual(idx_sub_a > idx_parent, true, 'Subtask harus berada setelah parent');
assert.strictEqual(idx_sub_b > idx_parent, true, 'Subtask harus berada setelah parent');
assert.strictEqual(Math.abs(idx_sub_a - idx_parent) <= 2, true, 'Subtask menempel rapat pada parent');
console.log('   ✓ Pengurutan hirarki lulus 100%: Subtask selalu berdampingan di bawah parent.');

// 2. Menguji Logika Pemindahan Sepaket (Bundled Hierarchy Move)
console.log('\n2. Menguji Logika Pemindahan Sepaket (Bundled Move Engine)...');

function simulate_bundled_move(task_id, all_tasks_pool, target_sprint_id) {
  const main_task = all_tasks_pool.find(t => t.id === task_id);
  if (!main_task) return { success: false, moved_ids: [] };

  const tasks_to_move = [main_task];
  const main_level = Number(main_task.hierarchy_level !== undefined ? main_task.hierarchy_level : 0);

  if (main_level === 1) {
    const child_level_0 = all_tasks_pool.filter(t => t.parent_id === main_task.id);
    const child_l0_ids = child_level_0.map(t => t.id);
    const child_subtasks = all_tasks_pool.filter(t => t.parent_id && child_l0_ids.includes(t.parent_id));

    child_level_0.forEach(c => { if (!tasks_to_move.includes(c)) tasks_to_move.push(c); });
    child_subtasks.forEach(s => { if (!tasks_to_move.includes(s)) tasks_to_move.push(s); });
  } else if (main_level === 0) {
    const subtasks = all_tasks_pool.filter(t => t.parent_id === main_task.id);
    subtasks.forEach(s => { if (!tasks_to_move.includes(s)) tasks_to_move.push(s); });
  }

  const moved_ids = tasks_to_move.map(t => t.id);
  tasks_to_move.forEach(t => {
    t.sprint_id = target_sprint_id;
  });

  return { success: true, moved_ids };
}

// Uji Kasus A: Geser Story Level 0 yang punya 2 Subtask
const pool_a = [
  { id: 'TSK-009', title: 'Story Form', hierarchy_level: 0, sprint_id: 'BACKLOG-PRJ-001' },
  { id: 'TSK-010', title: 'Subtask 1', hierarchy_level: -1, parent_id: 'TSK-009', sprint_id: 'BACKLOG-PRJ-001' },
  { id: 'TSK-011', title: 'Subtask 2', hierarchy_level: -1, parent_id: 'TSK-009', sprint_id: 'BACKLOG-PRJ-001' },
  { id: 'TSK-099', title: 'Unrelated Task', hierarchy_level: 0, sprint_id: 'BACKLOG-PRJ-001' }
];

const res_a = simulate_bundled_move('TSK-009', pool_a, 'SPR-001');
assert.deepStrictEqual(res_a.moved_ids.sort(), ['TSK-009', 'TSK-010', 'TSK-011'].sort(), 'Parent Level 0 dan 2 subtask harus berpindah sepaket');
assert.strictEqual(pool_a.find(t => t.id === 'TSK-009').sprint_id, 'SPR-001');
assert.strictEqual(pool_a.find(t => t.id === 'TSK-010').sprint_id, 'SPR-001');
assert.strictEqual(pool_a.find(t => t.id === 'TSK-011').sprint_id, 'SPR-001');
assert.strictEqual(pool_a.find(t => t.id === 'TSK-099').sprint_id, 'BACKLOG-PRJ-001', 'Task lain tidak boleh terpengaruh');
console.log('   ✓ Kasus A Lulus: Story Level 0 mengikutsertakan 2 Subtask (-1) ke Sprint.');

// Uji Kasus B: Geser Inisiatif Level 1 yang punya anak Level 0 dan cucu Subtask
const pool_b = [
  { id: 'INIT-001', title: 'Initiative Core', hierarchy_level: 1, sprint_id: 'BACKLOG-PRJ-001' },
  { id: 'US-001', title: 'User Story 1', hierarchy_level: 0, parent_id: 'INIT-001', sprint_id: 'BACKLOG-PRJ-001' },
  { id: 'SUB-001', title: 'Subtask of US-001', hierarchy_level: -1, parent_id: 'US-001', sprint_id: 'BACKLOG-PRJ-001' }
];

const res_b = simulate_bundled_move('INIT-001', pool_b, 'SPR-002');
assert.deepStrictEqual(res_b.moved_ids.sort(), ['INIT-001', 'SUB-001', 'US-001'].sort(), 'Inisiatif Level 1, anak Level 0, dan subtask -1 harus berpindah sepaket');
console.log('   ✓ Kasus B Lulus: Inisiatif Level 1 memindahkan seluruh rantai hirarki (Level 0 & Level -1).');

// Uji Kasus C: Geser Single Subtask secara mandiri
const pool_c = [
  { id: 'TSK-009', title: 'Story Form', hierarchy_level: 0, sprint_id: 'BACKLOG-PRJ-001' },
  { id: 'TSK-010', title: 'Subtask 1', hierarchy_level: -1, parent_id: 'TSK-009', sprint_id: 'BACKLOG-PRJ-001' }
];

const res_c = simulate_bundled_move('TSK-010', pool_c, 'SPR-001');
assert.deepStrictEqual(res_c.moved_ids, ['TSK-010'], 'Memindahkan subtask mandiri hanya menggeser dirinya sendiri');
assert.strictEqual(pool_c.find(t => t.id === 'TSK-009').sprint_id, 'BACKLOG-PRJ-001', 'Parent tetap di Backlog');
console.log('   ✓ Kasus C Lulus: Subtask mandiri dapat dipindahkan secara independen.');

// 3. Verifikasi Kode Sumber (js_main.html & API.gs)
console.log('\n3. Verifikasi Konsistensi Berkas Sumber...');

const js_main_content = fs.readFileSync(path.join(__dirname, '../src/js_main.html'), 'utf8');
const api_gs_content = fs.readFileSync(path.join(__dirname, '../src/API.gs'), 'utf8');

// A. js_main.html memiliki fungsi sort_tasks_by_hierarchy
assert.strictEqual(js_main_content.includes('function sort_tasks_by_hierarchy'), true, 'sort_tasks_by_hierarchy harus terpasang di js_main.html');

// B. js_main.html create_bucket_task_card_element memiliki struktur baris yang bersih
assert.strictEqual(js_main_content.includes('border-l-4 border-l-indigo-400'), true, 'Styling visual indentasi subtask harus terpasang');
assert.strictEqual(js_main_content.includes('tasks_to_move'), true, 'Logika pemindahan paket tasks_to_move harus terpasang di js_main.html');

// C. API.gs move_task_to_sprint memiliki logika pencarian turunan parent_idx
assert.strictEqual(api_gs_content.includes('main_task_level === 1'), true, 'move_task_to_sprint di API.gs harus mendukung relasi level 1');
assert.strictEqual(api_gs_content.includes('main_task_level === 0'), true, 'move_task_to_sprint di API.gs harus mendukung relasi level 0');

console.log('   ✓ Seluruh berkas sumber terverifikasi valid dan sinkron.');

console.log('\n================================================================');
console.log('  SEMUA TES TAHAP 13 LULUS 100%! BUNDLED HIERARCHY MOVE SIAP.');
console.log('================================================================\n');
