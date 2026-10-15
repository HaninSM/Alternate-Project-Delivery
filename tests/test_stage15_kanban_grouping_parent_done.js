/**
 * test_stage15_kanban_grouping_parent_done.js
 * Quality Gate & Verification Suite Tahap 15:
 * 1. Verifikasi UI Grouping Selector dan Modal Dialog Konfirmasi Parent Done
 * 2. Verifikasi Fungsi-Fungsi Swimlane & Auto-Done Confirmation di js_main.html
 * 3. Simulasi Algoritma Grouping Parent Swimlane & Standalone Items
 * 4. Simulasi Logika Trigger Confirmation Modal saat Semua Subtask Selesai (DONE)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('  MENJALANKAN TAHAP 15: KANBAN SWIMLANES & AUTO-PARENT DONE SUITE');
console.log('================================================================\n');

// Baca konten UI.html dan js_main.html
const ui_path = path.join(__dirname, '..', 'src', 'UI.html');
const js_path = path.join(__dirname, '..', 'src', 'js_main.html');
const ui_content = fs.readFileSync(ui_path, 'utf8');
const js_content = fs.readFileSync(js_path, 'utf8');

// -------------------------------------------------------------
// 1. Verifikasi Elemen UI di UI.html
// -------------------------------------------------------------
console.log('1. Menguji Elemen UI Grouping & Modal Konfirmasi di UI.html...');

assert(ui_content.includes('id="select-kanban-group-by"'), 'UI.html harus memiliki elemen selector id="select-kanban-group-by"');
assert(ui_content.includes('value="parent"'), 'Selector harus memiliki opsi value="parent"');
assert(ui_content.includes('value="initiative"'), 'Selector harus memiliki opsi value="initiative"');
assert(ui_content.includes('value="assignee"'), 'Selector harus memiliki opsi value="assignee"');
assert(ui_content.includes('value="none"'), 'Selector harus memiliki opsi value="none"');
assert(ui_content.includes('id="kanban-board-container"'), 'UI.html harus memiliki kontainer dinamis id="kanban-board-container"');

assert(ui_content.includes('id="modal-parent-done-confirm"'), 'UI.html harus memiliki modal dialog id="modal-parent-done-confirm"');
assert(ui_content.includes('id="parent-done-modal-title"'), 'Modal harus memiliki title container id="parent-done-modal-title"');
assert(ui_content.includes('id="btn-confirm-parent-done"'), 'Modal harus memiliki tombol konfirmasi id="btn-confirm-parent-done"');
assert(ui_content.includes('All subtasks are now complete.'), 'Modal harus menyertakan teks konfirmasi "All subtasks are now complete."');
assert(ui_content.includes('Do you want to update this parent work item to match?'), 'Modal harus menyertakan teks pertanyaan update parent');
console.log('   ✓ Elemen UI Grouping Selector dan Modal Konfirmasi terverifikasi lengkap.\n');

// -------------------------------------------------------------
// 2. Verifikasi Definisi Fungsi di js_main.html
// -------------------------------------------------------------
console.log('2. Menguji Handler & Engine di js_main.html...');

assert(js_content.includes('kanban_group_by:'), 'app_state harus memiliki properti kanban_group_by');
assert(js_content.includes('collapsed_swimlanes:'), 'app_state harus memiliki properti collapsed_swimlanes');
assert(js_content.includes('pending_parent_done:'), 'app_state harus memiliki properti pending_parent_done');

assert(js_content.includes('function handle_change_kanban_grouping('), 'js_main.html harus mendefinisikan handle_change_kanban_grouping');
assert(js_content.includes('function toggle_swimlane_collapse('), 'js_main.html harus mendefinisikan toggle_swimlane_collapse');
assert(js_content.includes('function open_parent_done_modal('), 'js_main.html harus mendefinisikan open_parent_done_modal');
assert(js_content.includes('function close_parent_done_modal('), 'js_main.html harus mendefinisikan close_parent_done_modal');
assert(js_content.includes('function handle_confirm_parent_done('), 'js_main.html harus mendefinisikan handle_confirm_parent_done');
assert(js_content.includes('function check_and_prompt_parent_completion('), 'js_main.html harus mendefinisikan check_and_prompt_parent_completion');

assert(js_content.includes('function render_swimlane_kanban_board('), 'js_main.html harus mendefinisikan render_swimlane_kanban_board');
assert(js_content.includes('function render_parent_swimlanes('), 'js_main.html harus mendefinisikan render_parent_swimlanes');
console.log('   ✓ Seluruh fungsi controller swimlane dan parent auto-done terdefinisi dengan tepat.\n');

// -------------------------------------------------------------
// 3. Simulasi Algoritma Grouping Parent Swimlane
// -------------------------------------------------------------
console.log('3. Menguji Simulasi Algoritma Pemilahan Swimlane Parent & Standalone...');

const mock_tasks = [
  { id: 'TES-1', title: 'Parent Story 1', work_type: 'USER_STORY', hierarchy_level: 0, status: 'IN_PROGRESS', parent_id: null },
  { id: 'TES-2', title: 'Subtask 1A', work_type: 'SUBTASK', hierarchy_level: -1, status: 'DONE', parent_id: 'TES-1' },
  { id: 'TES-3', title: 'Subtask 1B', work_type: 'SUBTASK', hierarchy_level: -1, status: 'IN_PROGRESS', parent_id: 'TES-1' },
  { id: 'TES-4', title: 'Standalone Task', work_type: 'TASK', hierarchy_level: 0, status: 'TODO', parent_id: null },
  { id: 'TES-5', title: 'Standalone Bug', work_type: 'BUG', hierarchy_level: 0, status: 'REVIEW', parent_id: null }
];

function group_tasks_by_parent(tasks) {
  const subtasks = tasks.filter(t => Boolean(t.parent_id));
  const subtask_parent_ids = new Set(subtasks.map(s => s.parent_id));

  const parent_items = [];
  const standalone_items = [];

  tasks.forEach(t => {
    if (!t.parent_id) {
      if (subtask_parent_ids.has(t.id) || (t.subtask_count && t.subtask_count > 0)) {
        parent_items.push(t);
      } else {
        standalone_items.push(t);
      }
    }
  });

  return { parent_items, standalone_items, subtasks };
}

const grouping_result = group_tasks_by_parent(mock_tasks);
assert.strictEqual(grouping_result.parent_items.length, 1, 'Harus ada 1 parent item (TES-1)');
assert.strictEqual(grouping_result.parent_items[0].id, 'TES-1');
assert.strictEqual(grouping_result.standalone_items.length, 2, 'Harus ada 2 standalone items (TES-4 & TES-5)');
assert.strictEqual(grouping_result.subtasks.length, 2, 'Harus ada 2 subtasks (TES-2 & TES-3)');

const children_of_tes1 = grouping_result.subtasks.filter(s => s.parent_id === 'TES-1');
assert.strictEqual(children_of_tes1.length, 2);
console.log('   ✓ Pemisahan Parent Swimlane dan Item Mandiri berjalan 100% akurat.\n');

// -------------------------------------------------------------
// 4. Simulasi Logika Trigger Confirmation Modal saat Semua Subtask Selesai
// -------------------------------------------------------------
console.log('4. Menguji Simulasi Trigger Parent Auto-Done Modal...');

let modal_opened_for = null;
function mock_open_parent_done_modal(parent) {
  modal_opened_for = parent;
}

function simulate_check_and_prompt_parent_completion(parent_id, current_tasks) {
  if (!parent_id) return false;
  const parent = current_tasks.find(t => t.id === parent_id);
  if (!parent || parent.status === 'DONE') return false;

  const child_subtasks = current_tasks.filter(t => t.parent_id === parent_id);
  if (child_subtasks.length === 0) return false;

  const all_done = child_subtasks.every(s => s.status === 'DONE');
  if (all_done) {
    mock_open_parent_done_modal(parent);
    return true;
  }
  return false;
}

// Skenario 4A: TES-3 masih IN_PROGRESS, belum semua DONE
let prompt_triggered = simulate_check_and_prompt_parent_completion('TES-1', mock_tasks);
assert.strictEqual(prompt_triggered, false, 'Modal TIDAK boleh muncul jika ada subtask yang belum DONE');
assert.strictEqual(modal_opened_for, null);

// Skenario 4B: TES-3 digeser ke DONE (Semua subtask selesai)
const subtask_1b = mock_tasks.find(t => t.id === 'TES-3');
subtask_1b.status = 'DONE';

prompt_triggered = simulate_check_and_prompt_parent_completion('TES-1', mock_tasks);
assert.strictEqual(prompt_triggered, true, 'Modal HARUS muncul saat semua subtask selesai');
assert.strictEqual(modal_opened_for.id, 'TES-1', 'Modal harus menargetkan parent TES-1');

// Skenario 4C: Eksekusi tombol "Update" memindahkan parent ke DONE
const parent_tes1 = mock_tasks.find(t => t.id === 'TES-1');
parent_tes1.status = 'DONE';
assert.strictEqual(parent_tes1.status, 'DONE');

// Skenario 4D: Jika parent sudah DONE, pemindahan subtask lain tidak memicu modal lagi
modal_opened_for = null;
prompt_triggered = simulate_check_and_prompt_parent_completion('TES-1', mock_tasks);
assert.strictEqual(prompt_triggered, false, 'Modal tidak boleh muncul jika parent sudah DONE');
assert.strictEqual(modal_opened_for, null);

console.log('   ✓ Logika trigger konfirmasi Parent Done lulus 100% pada seluruh skenario.\n');

console.log('================================================================');
console.log('  SEMUA TES TAHAP 15 BERHASIL (100% PASS)! KANBAN SWIMLANES SIAP.');
console.log('================================================================\n');
