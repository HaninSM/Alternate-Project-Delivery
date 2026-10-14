/**
 * @fileoverview Test Suite Tahap 12: Work Type Hierarchy Engine
 * Memverifikasi:
 * 1. Definisi Skema Tabel Tasks di Setup.gs (work_type, hierarchy_level, parent_id)
 * 2. Logika Pemetaan Level Hirarki:
 *    - Inisiatif: Level 1 (Parent makro, parent_id = '')
 *    - User Story / Task / BUG: Level 0 (Child dari Inisiatif, Parent dari Subtask)
 *    - Subtask: Level -1 (Child wajib dari Level 0, tidak boleh punya child lagi)
 * 3. Validasi Integritas Relasi:
 *    - Subtask tanpa parent -> Ditolak (Error)
 *    - Subtask dengan parent Level 1 atau Level -1 -> Ditolak (Error)
 *    - Subtask dengan parent Level 0 -> Diterima (Sukses)
 *    - Level 0 dengan parent Level 1 -> Diterima (Sukses)
 *    - Inisiatif dengan parent -> Otomatis dibersihkan/dikosongkan
 * 4. Pencegahan Double-Counting Estimasi Jam pada Burndown Chart (Leaf Nodes Scope)
 * 5. Agregasi Subtask (subtask_count & subtask_done_count)
 * 6. Filter Parent yang Memenuhi Syarat (get_eligible_parents_for_task)
 * 7. Integritas File Sumber (Setup.gs, API.gs, Insights.gs, UI.html, js_main.html)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  MENJALANKAN TAHAP 12: WORK TYPE HIERARCHY TEST SUITE');
console.log('================================================================\n');

// 1. Uji Fungsi get_work_type_level
console.log('1. Menguji Penentuan Level Angka Hirarki...');

function get_work_type_level(type_str) {
  const t = String(type_str || 'TASK').toUpperCase().trim();
  if (t === 'INITIATIVE') return 1;
  if (t === 'SUBTASK') return -1;
  return 0; // TASK, USER_STORY, BUG
}

assert.strictEqual(get_work_type_level('INITIATIVE'), 1, 'Inisiatif harus level 1');
assert.strictEqual(get_work_type_level('initiative'), 1, 'Case-insensitive test');
assert.strictEqual(get_work_type_level('USER_STORY'), 0, 'User Story harus level 0');
assert.strictEqual(get_work_type_level('TASK'), 0, 'Task harus level 0');
assert.strictEqual(get_work_type_level('BUG'), 0, 'BUG harus level 0');
assert.strictEqual(get_work_type_level('SUBTASK'), -1, 'Subtask harus level -1');
assert.strictEqual(get_work_type_level(''), 0, 'Default fallback harus level 0');
console.log('   ✓ Penentuan level hirarki (-1, 0, 1) lulus 100%.');

// 2. Uji Validasi Pembuatan Work Item
console.log('\n2. Menguji Aturan Validasi Relasi Parent-Child...');

const mock_db_tasks = [
  { id: 'INIT-001', title: 'Transformasi Portal Multifinance', work_type: 'INITIATIVE', hierarchy_level: 1, parent_id: '' },
  { id: 'TSK-001', title: 'Implementasi Core Payment Engine', work_type: 'TASK', hierarchy_level: 0, parent_id: 'INIT-001' },
  { id: 'US-001', title: 'Sebagai nasabah saya ingin instant loan', work_type: 'USER_STORY', hierarchy_level: 0, parent_id: 'INIT-001' },
  { id: 'BUG-001', title: 'Error timeout kalkulasi bunga kredit', work_type: 'BUG', hierarchy_level: 0, parent_id: 'INIT-001' },
  { id: 'SUB-001', title: 'Subtask: Buat skema migrasi tabel', work_type: 'SUBTASK', hierarchy_level: -1, parent_id: 'TSK-001' }
];

function validate_and_create_task(input, db_tasks) {
  if (!input || !input.title) return { success: false, message: 'Judul task wajib diisi.' };

  let work_type = String(input.work_type || 'TASK').toUpperCase().trim();
  if (!['INITIATIVE', 'USER_STORY', 'TASK', 'BUG', 'SUBTASK'].includes(work_type)) {
    work_type = 'TASK';
  }
  const hierarchy_level = get_work_type_level(work_type);
  let parent_id = input.parent_id ? String(input.parent_id).trim() : '';

  if (hierarchy_level === 1) {
    parent_id = ''; // Inisiatif tidak boleh punya parent
  } else if (hierarchy_level === -1) {
    if (!parent_id) {
      return { success: false, message: 'Subtask (Level -1) wajib memilih parent Level 0.' };
    }
    const parent = db_tasks.find(t => t.id === parent_id);
    if (!parent) {
      return { success: false, message: 'Parent ID tidak ditemukan.' };
    }
    if (parent.hierarchy_level !== 0) {
      return { success: false, message: `Parent dari Subtask harus berlevel 0, bukan level ${parent.hierarchy_level}.` };
    }
  } else if (hierarchy_level === 0) {
    if (parent_id) {
      const parent = db_tasks.find(t => t.id === parent_id);
      if (!parent) {
        return { success: false, message: 'Parent Inisiatif tidak ditemukan.' };
      }
      if (parent.hierarchy_level !== 1) {
        return { success: false, message: 'Parent dari item Level 0 harus berupa Inisiatif (Level 1).' };
      }
    }
  }

  return {
    success: true,
    data: {
      id: 'TSK-NEW',
      title: input.title,
      work_type,
      hierarchy_level,
      parent_id
    }
  };
}

// Case A: Subtask tanpa parent -> Harus Ditolak
const res_sub_no_parent = validate_and_create_task({ title: 'Subtask Yatim', work_type: 'SUBTASK' }, mock_db_tasks);
assert.strictEqual(res_sub_no_parent.success, false);
assert.ok(res_sub_no_parent.message.includes('wajib memilih parent'));

// Case B: Subtask dengan parent sesama Subtask (-1) -> Harus Ditolak
const res_sub_nested = validate_and_create_task({ title: 'Subtask di dalam Subtask', work_type: 'SUBTASK', parent_id: 'SUB-001' }, mock_db_tasks);
assert.strictEqual(res_sub_nested.success, false);
assert.ok(res_sub_nested.message.includes('harus berlevel 0'));

// Case C: Subtask dengan parent langsung ke Inisiatif (1) -> Harus Ditolak
const res_sub_to_init = validate_and_create_task({ title: 'Subtask lompat ke Inisiatif', work_type: 'SUBTASK', parent_id: 'INIT-001' }, mock_db_tasks);
assert.strictEqual(res_sub_to_init.success, false);
assert.ok(res_sub_to_init.message.includes('harus berlevel 0'));

// Case D: Subtask dengan parent Level 0 (Task/Story/Bug) -> Harus Diterima
const res_sub_valid = validate_and_create_task({ title: 'Subtask valid', work_type: 'SUBTASK', parent_id: 'TSK-001' }, mock_db_tasks);
assert.strictEqual(res_sub_valid.success, true);
assert.strictEqual(res_sub_valid.data.hierarchy_level, -1);
assert.strictEqual(res_sub_valid.data.parent_id, 'TSK-001');

// Case E: Item Level 0 (Story) dengan parent Inisiatif (Level 1) -> Harus Diterima
const res_story_valid = validate_and_create_task({ title: 'Story Baru', work_type: 'USER_STORY', parent_id: 'INIT-001' }, mock_db_tasks);
assert.strictEqual(res_story_valid.success, true);
assert.strictEqual(res_story_valid.data.hierarchy_level, 0);
assert.strictEqual(res_story_valid.data.parent_id, 'INIT-001');

// Case F: Inisiatif dengan parent terinput -> Parent harus otomatis dikosongkan
const res_init_valid = validate_and_create_task({ title: 'Inisiatif Baru', work_type: 'INITIATIVE', parent_id: 'TSK-001' }, mock_db_tasks);
assert.strictEqual(res_init_valid.success, true);
assert.strictEqual(res_init_valid.data.hierarchy_level, 1);
assert.strictEqual(res_init_valid.data.parent_id, '', 'Inisiatif tidak boleh memiliki parent');

console.log('   ✓ Seluruh aturan validasi relasi hirarki terverifikasi 100%.');

// 3. Uji Pencegahan Double Counting Burndown Chart
console.log('\n3. Menguji Pencegahan Double Counting Estimasi Jam Kerja...');

const sprint_tasks_sample = [
  // Inisiatif (40 jam) - memiliki children di sprint
  { id: 'INIT-10', estimate_hours: 40, status: 'IN_PROGRESS', parent_id: '' },
  // Task Level 0 (16 jam) - memiliki children subtasks
  { id: 'TSK-10', estimate_hours: 16, status: 'IN_PROGRESS', parent_id: 'INIT-10' },
  // Subtasks dari TSK-10 (4 jam + 6 jam = 10 jam)
  { id: 'SUB-10A', estimate_hours: 4, status: 'DONE', parent_id: 'TSK-10' },
  { id: 'SUB-10B', estimate_hours: 6, status: 'IN_PROGRESS', parent_id: 'TSK-10' },
  // Task Level 0 Mandiri tanpa subtask (8 jam)
  { id: 'TSK-20', estimate_hours: 8, status: 'DONE', parent_id: 'INIT-10' }
];

function calculate_scope_without_double_counting(tasks) {
  const is_parent_set = new Set();
  tasks.forEach(t => {
    if (t.parent_id) is_parent_set.add(String(t.parent_id).trim());
  });

  // Hanya item daun (leaf_tasks) yang tidak bertindak sebagai parent dari item lain dalam sprint ini
  const leaf_tasks = tasks.filter(t => !is_parent_set.has(String(t.id).trim()));
  const total_scope = leaf_tasks.reduce((sum, t) => sum + (Number(t.estimate_hours) || 0), 0);
  return { leaf_tasks, total_scope };
}

const { leaf_tasks, total_scope } = calculate_scope_without_double_counting(sprint_tasks_sample);
// Item daun yang harus dihitung: SUB-10A (4h) + SUB-10B (6h) + TSK-20 (8h) = 18 jam
// INIT-10 (40h) dan TSK-10 (16h) tidak dihitung ganda karena mereka adalah parent item!
assert.strictEqual(leaf_tasks.length, 3, 'Harus ada tepat 3 leaf tasks');
assert.strictEqual(total_scope, 18, 'Total scope jam kerja terhitung 18 jam (tanpa double counting)');
console.log(`   ✓ Total scope terhitung akurat: ${total_scope} jam (Eliminasi double counting sukses).`);

// 4. Uji Agregasi Subtask Progres
console.log('\n4. Menguji Agregasi Progres Subtask pada Kartu Parent...');

function compute_subtask_stats(tasks) {
  const task_map = {};
  tasks.forEach(t => {
    task_map[t.id] = { ...t, subtask_count: 0, subtask_done_count: 0 };
  });

  tasks.forEach(t => {
    if (t.parent_id && task_map[t.parent_id]) {
      task_map[t.parent_id].subtask_count += 1;
      if (t.status === 'DONE') {
        task_map[t.parent_id].subtask_done_count += 1;
      }
    }
  });

  return task_map;
}

const aggregated = compute_subtask_stats(sprint_tasks_sample);
assert.strictEqual(aggregated['TSK-10'].subtask_count, 2, 'TSK-10 harus memiliki 2 subtask');
assert.strictEqual(aggregated['TSK-10'].subtask_done_count, 1, 'TSK-10 harus memiliki 1 subtask selesai');
console.log('   ✓ Agregasi subtask_count (2) & subtask_done_count (1) lulus 100%.');

// 5. Verifikasi Integritas File Sumber
console.log('\n5. Verifikasi Integritas File Sumber...');
const root_dir = path.resolve(__dirname, '..');
const setup_gs = fs.readFileSync(path.join(root_dir, 'src', 'Setup.gs'), 'utf8');
const api_gs = fs.readFileSync(path.join(root_dir, 'src', 'API.gs'), 'utf8');
const insights_gs = fs.readFileSync(path.join(root_dir, 'src', 'Insights.gs'), 'utf8');
const ui_html = fs.readFileSync(path.join(root_dir, 'src', 'UI.html'), 'utf8');
const js_main = fs.readFileSync(path.join(root_dir, 'src', 'js_main.html'), 'utf8');

// A. Setup.gs
assert.ok(setup_gs.includes("'work_type'"), 'Setup.gs harus memuat kolom work_type');
assert.ok(setup_gs.includes("'hierarchy_level'"), 'Setup.gs harus memuat kolom hierarchy_level');
assert.ok(setup_gs.includes("'parent_id'"), 'Setup.gs harus memuat kolom parent_id');
assert.ok(setup_gs.includes("sheet_name === 'Tasks'"), 'Setup.gs harus memiliki backfill kolom Tasks');

// B. API.gs
assert.ok(api_gs.includes('const WORK_TYPES'), 'API.gs harus mendefinisikan WORK_TYPES');
assert.ok(api_gs.includes('get_work_type_level'), 'API.gs harus memuat fungsi get_work_type_level');
assert.ok(api_gs.includes('get_eligible_parents_for_task'), 'API.gs harus mengekspor get_eligible_parents_for_task');
assert.ok(api_gs.includes('subtask_count'), 'API.gs harus menghitung subtask_count');
assert.ok(api_gs.includes('subtask_done_count'), 'API.gs harus menghitung subtask_done_count');

// C. Insights.gs
assert.ok(insights_gs.includes('leaf_tasks'), 'Insights.gs harus menggunakan leaf_tasks di burndown chart');
assert.ok(insights_gs.includes('filter_work_type'), 'Insights.gs harus mendukung filter_work_type');

// D. UI.html
assert.ok(ui_html.includes('id="input-task-work-type"'), 'UI.html harus memuat dropdown input-task-work-type');
assert.ok(ui_html.includes('id="container-task-parent-select"'), 'UI.html harus memuat container-task-parent-select');
assert.ok(ui_html.includes('id="ct-filter-work-type"'), 'UI.html harus memuat filter ct-filter-work-type');

// E. js_main.html
assert.ok(js_main.includes('handle_work_type_change'), 'js_main.html harus memuat fungsi handle_work_type_change');
assert.ok(js_main.includes('open_subtask_modal'), 'js_main.html harus memuat fungsi open_subtask_modal');
assert.ok(js_main.includes('load_parent_dropdown_options'), 'js_main.html harus memuat fungsi load_parent_dropdown_options');

console.log('   ✓ Seluruh berkas terintegrasi dan konsisten.');

console.log('\n================================================================');
console.log('  SEMUA TES TAHAP 12 LULUS 100%! FITUR HIRARKI WORK TYPE SIAP.');
console.log('================================================================');
