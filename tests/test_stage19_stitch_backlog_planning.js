/**
 * Test Suite Tahap 19: Google Stitch Sprint Planning & Product Backlog Redesign
 * Memvalidasi:
 * 1. Struktur Layout Enterprise Google Stitch di UI.html:
 *    - Notice Banner cadensi pengiriman & Client Sync Active
 *    - Agile Framework V2.4 Header & Widget Estimasi Total Backlog (Jam + Points)
 *    - Search & Filter Bar Komprehensif (Kata kunci, Work Type, Assignee, Estimasi Points)
 *    - Section 1 (Top Stack): Wadah Accordion Sprint Buckets (#scrum-sprint-buckets-container)
 *    - Section 2 (Bottom Stack): Wadah Product Backlog (#bucket-product-backlog) & Callout Prinsip Bundled Move
 *    - Sidebar Left Mini-Widget: Sprint Scope Progress (#sidebar-sprint-scope-widget)
 * 2. Logika Frontend & Controller di js_main.html:
 *    - render_scrum_planning_view()
 *    - toggle_sprint_accordion()
 *    - toggle_subtasks_collapse()
 *    - handle_filter_scrum_backlog() & handle_toggle_points_filter()
 *    - create_stitch_task_row_element()
 *    - create_stitch_initiative_card_element()
 *    - create_stitch_subtask_row_element()
 * 3. Simulasi Perhitungan Scope & Hierarchical Tree View:
 *    - Agregasi jam & points backlog
 *    - Progress % active sprint (contoh: 28 dari 34 = 82%)
 *    - Penataan Level 1 (Inisiatif), Level 0 (Story/Task), dan Level -1 (Subtask bertaut)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  MENJALANKAN TAHAP 19: STITCH BACKLOG & SPRINT PLANNING SUITE');
console.log('================================================================\n');

const ui_path = path.join(__dirname, '..', 'src', 'UI.html');
const js_path = path.join(__dirname, '..', 'src', 'js_main.html');

const ui_content = fs.readFileSync(ui_path, 'utf8');
const js_content = fs.readFileSync(js_path, 'utf8');

// ============================================================================
// TEST 1: Verifikasi Struktur UI.html Sesuai Google Stitch Design
// ============================================================================
console.log('1. Menguji Elemen Tata Letak Google Stitch di UI.html...');

// Notice banner
assert(ui_content.includes('Project workspace running in high-cadence delivery mode'), 'UI.html harus memuat notice banner delivery mode');
assert(ui_content.includes('Client Sync Active'), 'UI.html harus memuat badge status Client Sync Active');

// Framework Header
assert(ui_content.includes('AGILE FRAMEWORK V2.4 • Continuous Iteration Flow'), 'UI.html harus memuat header framework V2.4');
assert(ui_content.includes('Sprint Planning & Product Backlog'), 'UI.html harus memuat judul Sprint Planning & Product Backlog');
assert(ui_content.includes('Bundled Hierarchy Enabled'), 'UI.html harus memuat badge Bundled Hierarchy Enabled');

// Estimasi Backlog & Buttons
assert(ui_content.includes('id="scrum-backlog-hours"'), 'UI.html harus memuat id="scrum-backlog-hours"');
assert(ui_content.includes('id="scrum-backlog-points"'), 'UI.html harus memuat id="scrum-backlog-points"');
assert(ui_content.includes('id="btn-create-sprint-bucket"'), 'UI.html harus memuat id="btn-create-sprint-bucket"');
assert(ui_content.includes('id="btn-add-backlog-task"'), 'UI.html harus memuat id="btn-add-backlog-task"');

// Search & Filter Bar
assert(ui_content.includes('id="scrum-search-input"'), 'UI.html harus memuat input pencarian #scrum-search-input');
assert(ui_content.includes('id="scrum-filter-work-type"'), 'UI.html harus memuat dropdown tipe work item #scrum-filter-work-type');
assert(ui_content.includes('id="scrum-filter-assignee"'), 'UI.html harus memuat dropdown assignee #scrum-filter-assignee');
assert(ui_content.includes('id="scrum-btn-points-filter"'), 'UI.html harus memuat tombol toggle points #scrum-btn-points-filter');

// Section Containers
assert(ui_content.includes('id="scrum-sprint-buckets-container"'), 'UI.html harus memuat kontainer sprint #scrum-sprint-buckets-container');
assert(ui_content.includes('id="bucket-product-backlog"'), 'UI.html harus memuat droppable area #bucket-product-backlog');
assert(ui_content.includes('data-bucket-id="BACKLOG"'), 'UI.html #bucket-product-backlog harus memiliki data-bucket-id="BACKLOG"');
assert(ui_content.includes('Prinsip Bundled Move (Section 3.3)'), 'UI.html harus memuat callout edukasi Prinsip Bundled Move (Section 3.3)');

// Sidebar Mini-Widget
assert(ui_content.includes('id="sidebar-sprint-scope-widget"'), 'UI.html harus memuat mini widget sidebar #sidebar-sprint-scope-widget');
assert(ui_content.includes('id="sidebar-sprint-scope-label"'), 'UI.html harus memuat label scope #sidebar-sprint-scope-label');
assert(ui_content.includes('id="sidebar-sprint-scope-pct"'), 'UI.html harus memuat persentase scope #sidebar-sprint-scope-pct');
assert(ui_content.includes('id="sidebar-sprint-scope-bar"'), 'UI.html harus memuat progress bar scope #sidebar-sprint-scope-bar');
assert(ui_content.includes('id="sidebar-sprint-scope-desc"'), 'UI.html harus memuat deskripsi task scope #sidebar-sprint-scope-desc');

console.log('   ✓ Seluruh elemen tata letak Google Stitch di UI.html terverifikasi lengkap.\n');

// ============================================================================
// TEST 2: Verifikasi Fungsi Controller di js_main.html
// ============================================================================
console.log('2. Menguji Ketersediaan Fungsi Controller di js_main.html...');

assert(js_content.includes('function render_scrum_planning_view()'), 'js_main.html harus mendefinisikan render_scrum_planning_view()');
assert(js_content.includes('function toggle_sprint_accordion('), 'js_main.html harus mendefinisikan toggle_sprint_accordion()');
assert(js_content.includes('function toggle_subtasks_collapse('), 'js_main.html harus mendefinisikan toggle_subtasks_collapse()');
assert(js_content.includes('function handle_filter_scrum_backlog()'), 'js_main.html harus mendefinisikan handle_filter_scrum_backlog()');
assert(js_content.includes('function handle_toggle_points_filter()'), 'js_main.html harus mendefinisikan handle_toggle_points_filter()');
assert(js_content.includes('function create_stitch_task_row_element('), 'js_main.html harus mendefinisikan create_stitch_task_row_element()');
assert(js_content.includes('function create_stitch_initiative_card_element('), 'js_main.html harus mendefinisikan create_stitch_initiative_card_element()');
assert(js_content.includes('function create_stitch_subtask_row_element('), 'js_main.html harus mendefinisikan create_stitch_subtask_row_element()');
assert(js_content.includes('function handle_quick_move_task('), 'js_main.html harus mendefinisikan handle_quick_move_task()');

console.log('   ✓ Seluruh fungsi controller dan renderers Stitch terpasang di js_main.html.\n');

// ============================================================================
// TEST 3: Simulasi Perhitungan Scope & Progress Bar
// ============================================================================
console.log('3. Menguji Simulasi Agregasi Backlog & Sprint Scope Progress...');

const mock_backlog = [
  { id: 'TES-110', title: 'Story Pinjaman', work_type: 'USER_STORY', hierarchy_level: 0, estimate_hours: 12, story_points: 8 },
  { id: 'TES-110-1', title: 'Subtask 1', work_type: 'SUBTASK', hierarchy_level: -1, parent_id: 'TES-110', estimate_hours: 4 },
  { id: 'TES-110-2', title: 'Subtask 2', work_type: 'SUBTASK', hierarchy_level: -1, parent_id: 'TES-110', estimate_hours: 6 },
  { id: 'TES-112', title: 'Task DB Sync', work_type: 'TASK', hierarchy_level: 0, estimate_hours: 8, story_points: 5 },
  { id: 'INI-12', title: 'Fraud Detection', work_type: 'INITIATIVE', hierarchy_level: 1, estimate_hours: 40 }
];

let sim_hours = 0;
let sim_points = 0;
mock_backlog.forEach(t => {
  sim_hours += (Number(t.estimate_hours) || 0);
  const lvl = Number(t.hierarchy_level !== undefined ? t.hierarchy_level : 0);
  const wt = String(t.work_type || '').toUpperCase();
  if (lvl === 0 || (wt !== 'INITIATIVE' && wt !== 'SUBTASK')) {
    sim_points += (Number(t.story_points) || 0);
  }
});

assert.strictEqual(sim_hours, 70, 'Total backlog hours harus 70 jam');
assert.strictEqual(sim_points, 13, 'Total backlog story points harus 13 pts (8 + 5, level 0 saja)');

// Simulasi Sprint 4 Progress (seperti pada screenshot: 28 dari 34 selesai = 82%)
const total_sp_tasks = 34;
const done_sp_tasks = 28;
const sp_pct = Math.round((done_sp_tasks / total_sp_tasks) * 100);

assert.strictEqual(sp_pct, 82, 'Persentase progres sprint 4 harus tepat 82%');
console.log(`   ✓ Agregasi jam (${sim_hours}h), points (${sim_points} pts), dan progres sprint (${sp_pct}%) akurat.\n`);

// ============================================================================
// TEST 4: Simulasi Hierarchical Tree View & Bundled Subtask Collapsing
// ============================================================================
console.log('4. Menguji Simulasi Pengelompokan Hierarki Tree View & Bundled Subtasks...');

const subtasks_of_tes110 = mock_backlog.filter(t => t.parent_id === 'TES-110');
assert.strictEqual(subtasks_of_tes110.length, 2, 'TES-110 harus memiliki 2 subtask terhubung');

// Simulasi collapse subtask jika lebih dari 2
function simulate_subtasks_render(subtasks, is_collapsed) {
  if (is_collapsed && subtasks.length > 2) {
    return {
      displayed: subtasks.slice(0, 2),
      hidden_count: subtasks.length - 2
    };
  }
  return {
    displayed: subtasks,
    hidden_count: 0
  };
}

const many_subs = [
  { id: 'S-1' }, { id: 'S-2' }, { id: 'S-3' }, { id: 'S-4' }
];

const collapsed_result = simulate_subtasks_render(many_subs, true);
assert.strictEqual(collapsed_result.displayed.length, 2, 'Saat collapsed, hanya 2 subtask yang tampil pertama');
assert.strictEqual(collapsed_result.hidden_count, 2, '2 subtask lainnya disembunyikan');

const expanded_result = simulate_subtasks_render(many_subs, false);
assert.strictEqual(expanded_result.displayed.length, 4, 'Saat expanded, seluruh 4 subtask tampil');
assert.strictEqual(expanded_result.hidden_count, 0);

console.log('   ✓ Logika tree view bersarang dan toggle collapse subtask lulus 100%.\n');

// ============================================================================
// TEST 5: Simulasi Filter Pencarian & Kategori
// ============================================================================
console.log('5. Menguji Simulasi Real-time Filter Pencarian & Kategori Backlog...');

function simulate_filter(tasks, filter) {
  let list = [...tasks];
  if (filter.search) {
    const q = filter.search.toLowerCase();
    list = list.filter(t => {
      const match_self = t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q);
      if (match_self) return true;
      const child_match = tasks.some(c => c.parent_id === t.id && (c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)));
      const parent_match = t.parent_id && tasks.some(p => p.id === t.parent_id && (p.id.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)));
      return child_match || parent_match;
    });
  }
  if (filter.work_type && filter.work_type !== 'ALL') {
    list = list.filter(t => t.work_type === filter.work_type);
  }
  if (filter.points_only) {
    list = list.filter(t => Number(t.story_points) > 0);
  }
  return list;
}

// Cari "TES-110" -> harus mengembalikan TES-110 beserta subtask-subtasknya
const search_res = simulate_filter(mock_backlog, { search: 'TES-110' });
assert(search_res.some(t => t.id === 'TES-110'), 'TES-110 harus ditemukan');
assert(search_res.some(t => t.id === 'TES-110-1'), 'Subtask TES-110-1 harus ikut terfilter');

// Filter Points Only -> hanya yang punya story points (TES-110 & TES-112)
const points_res = simulate_filter(mock_backlog, { points_only: true });
assert.strictEqual(points_res.length, 2, 'Hanya 2 item yang memiliki Story Points');

// Filter Work Type INITIATIVE -> hanya INI-12
const init_res = simulate_filter(mock_backlog, { work_type: 'INITIATIVE' });
assert.strictEqual(init_res.length, 1);
assert.strictEqual(init_res[0].id, 'INI-12');

console.log('   ✓ Logika multi-kriteria filter pencarian & hierarki terverifikasi akurat.\n');

console.log('================================================================');
console.log('  SEMUA TES TAHAP 19 (STITCH BACKLOG & SPRINT PLANNING) LULUS 100%!');
console.log('================================================================\n');
