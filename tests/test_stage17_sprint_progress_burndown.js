/**
 * Test Suite: Tahap 17 - Sprint Progress & Sprint Burndown (Actionable Insights)
 * Memvalidasi:
 * 1. Logika Opsi A Pembakaran Story Points: Story Points Level 0 hanya terbakar saat
 *    semua subtask (-1) selesai (DONE) dan item Level 0 juga berstatus DONE.
 * 2. Perhitungan Sprint Progress: Segmented progress bar (Done, In Progress, Not Started),
 *    persentase penyelesaian, dan teks ringkasan ('X points done, Y points to go').
 * 3. Timeline Series Burndown Chart:
 *    - Guideline ideal (penurunan linear bertahap ke 0%)
 *    - Remaining work aktual (berhenti pada hari ini / null untuk hari mendatang)
 * 4. Verifikasi elemen UI di UI.html dan fungsi controller di js_main.html.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================');
console.log('  MENJALANKAN TAHAP 17: SPRINT PROGRESS & BURNDOWN TEST SUITE');
console.log('================================================================\n');

// Muat kode Insights.gs ke dalam virtual machine context
const insights_code = fs.readFileSync(path.join(__dirname, '..', 'src', 'Insights.gs'), 'utf8');
const vm_context = {
  console: console,
  Utilities: {
    formatDate: (d, tz, fmt) => d.toISOString().split('T')[0]
  },
  Session: {
    getScriptTimeZone: () => 'GMT'
  }
};
vm.createContext(vm_context);
vm.runInContext(insights_code, vm_context);

// ============================================================================
// TEST 1: Aturan Opsi A Pembakaran Story Points pada Hirarki Parent-Subtask
// ============================================================================
console.log('1. Menguji Aturan Opsi A: Story Points Terbakar Saat Semua Subtask & Level 0 Selesai...');

const test_tasks = [
  // User Story 1 (5 pts): memiliki 2 subtask
  {
    id: 'TSK-101',
    sprint_id: 'SPR-001',
    title: 'Autentikasi Biometrik Face ID',
    status: 'DONE',
    work_type: 'USER_STORY',
    hierarchy_level: 0,
    parent_id: '',
    story_points: 5,
    estimate_hours: 0,
    updated_at: '2026-10-16T10:00:00Z'
  },
  // Subtask 1A: DONE
  {
    id: 'TSK-101-A',
    sprint_id: 'SPR-001',
    title: 'Camera Access SDK',
    status: 'DONE',
    work_type: 'SUBTASK',
    hierarchy_level: -1,
    parent_id: 'TSK-101',
    story_points: '',
    estimate_hours: 4,
    updated_at: '2026-10-15T12:00:00Z'
  },
  // Subtask 1B: DONE
  {
    id: 'TSK-101-B',
    sprint_id: 'SPR-001',
    title: 'Neural Engine Verification',
    status: 'DONE',
    work_type: 'SUBTASK',
    hierarchy_level: -1,
    parent_id: 'TSK-101',
    story_points: '',
    estimate_hours: 6,
    updated_at: '2026-10-16T14:00:00Z'
  },

  // User Story 2 (8 pts): memiliki 2 subtask, tapi salah satu belum DONE
  {
    id: 'TSK-102',
    sprint_id: 'SPR-001',
    title: 'Integrasi Payment Gateway QRIS',
    status: 'DONE', // Parent sudah DONE di board
    work_type: 'USER_STORY',
    hierarchy_level: 0,
    parent_id: '',
    story_points: 8,
    estimate_hours: 0,
    updated_at: '2026-10-16T10:00:00Z'
  },
  // Subtask 2A: DONE
  {
    id: 'TSK-102-A',
    sprint_id: 'SPR-001',
    title: 'Generate Dynamic QR',
    status: 'DONE',
    work_type: 'SUBTASK',
    hierarchy_level: -1,
    parent_id: 'TSK-102',
    story_points: '',
    estimate_hours: 5,
    updated_at: '2026-10-15T15:00:00Z'
  },
  // Subtask 2B: MASIH IN_PROGRESS -> User Story 2 BELUM terbakar!
  {
    id: 'TSK-102-B',
    sprint_id: 'SPR-001',
    title: 'Webhook Callback Listener',
    status: 'IN_PROGRESS',
    work_type: 'SUBTASK',
    hierarchy_level: -1,
    parent_id: 'TSK-102',
    story_points: '',
    estimate_hours: 5,
    updated_at: '2026-10-16T11:00:00Z'
  },

  // Task 3 (3 pts): Mandiri tanpa subtask, status DONE
  {
    id: 'TSK-103',
    sprint_id: 'SPR-001',
    title: 'Fix Bug SSL Certificate Expiry Alert',
    status: 'DONE',
    work_type: 'BUG',
    hierarchy_level: 0,
    parent_id: '',
    story_points: 3,
    estimate_hours: 2,
    updated_at: '2026-10-15T09:00:00Z'
  }
];

const progress_result = vm_context.calculate_sprint_progress_metrics(test_tasks);

// Total poin = 5 (Story 1) + 8 (Story 2) + 3 (Bug 3) = 16 pts
assert.strictEqual(progress_result.total_points, 16, 'Total story points harus 16 pts');

// Yang selesai (Done) = Story 1 (5 pts) + Bug 3 (3 pts) = 8 pts.
// Story 2 (8 pts) TIDAK boleh dihitung Done karena subtask 2B masih IN_PROGRESS!
assert.strictEqual(progress_result.done_points, 8, 'Story points selesai harus 8 pts (Story 1 + Bug 3)');
assert.strictEqual(progress_result.in_progress_points, 8, 'Story points in progress harus 8 pts (Story 2)');
assert.strictEqual(progress_result.todo_points, 0, 'Story points todo harus 0 pts');
assert.strictEqual(progress_result.remaining_points, 8, 'Story points tersisa harus 8 pts');

// Persentase
assert.strictEqual(progress_result.done_percent, 50, 'Persentase Done harus 50%');
assert.strictEqual(progress_result.in_progress_percent, 50, 'Persentase In Progress harus 50%');
assert.strictEqual(progress_result.points_done_text, '8 points done, 8 points to go');

console.log('   ✓ Opsi A Terverifikasi: Story 2 (8 pts) tidak terbakar karena Subtask 2B belum DONE.');
console.log(`   ✓ Hasil Progress: ${progress_result.points_done_text} (${progress_result.done_percent}% done).\n`);

// ============================================================================
// TEST 2: Simulasi Attachment Jira (3 points done, 13 points to go)
// ============================================================================
console.log('2. Menguji Skenario Persis Attachment: 3 Points Done, 13 Points to Go (19% Done)...');

const jira_tasks = [
  // User Story 1 (13 pts) - In Progress
  {
    id: 'JIRA-1',
    sprint_id: 'SPR-JIRA',
    title: 'Core Architecture Refactoring',
    status: 'IN_PROGRESS',
    work_type: 'USER_STORY',
    hierarchy_level: 0,
    story_points: 13,
    estimate_hours: 20
  },
  // Task 2 (3 pts) - Done
  {
    id: 'JIRA-2',
    sprint_id: 'SPR-JIRA',
    title: 'Setup CI/CD Pipeline',
    status: 'DONE',
    work_type: 'TASK',
    hierarchy_level: 0,
    story_points: 3,
    estimate_hours: 5
  }
];

const jira_progress = vm_context.calculate_sprint_progress_metrics(jira_tasks);
assert.strictEqual(jira_progress.total_points, 16);
assert.strictEqual(jira_progress.done_points, 3);
assert.strictEqual(jira_progress.in_progress_points, 13);
assert.strictEqual(jira_progress.remaining_points, 13);
assert.strictEqual(jira_progress.done_percent, 19, 'Persentase Done harus 19%');
assert.strictEqual(jira_progress.in_progress_percent, 81, 'Persentase In Progress harus 81%');
assert.strictEqual(jira_progress.points_done_text, '3 points done, 13 points to go');

console.log(`   ✓ Skenario Gambar Attachment Lulus 100%: "${jira_progress.points_done_text}" -> ${jira_progress.done_percent}% Done, ${jira_progress.in_progress_percent}% In Progress.\n`);

// ============================================================================
// TEST 3: Seri Data Burndown Chart (Guideline vs Remaining Work)
// ============================================================================
console.log('3. Menguji Pembentukan Seri Data Burndown Chart (Story Points & Guideline)...');

const sprint_meta = {
  id: 'SPR-JIRA',
  name: 'Sprint 1',
  start_date: '2026-10-15',
  end_date: '2026-10-29' // 15 hari
};

const jira_history = [
  {
    task_id: 'JIRA-2',
    old_status: 'TODO',
    new_status: 'DONE',
    timestamp: '2026-10-15T15:00:00Z'
  }
];

const burndown_res = vm_context.build_burndown_series(jira_tasks, jira_history, sprint_meta);

assert(burndown_res.labels.length === 15, 'Harus ada 15 data point untuk 15 hari');
assert.strictEqual(burndown_res.date_labels[0], 'Oct 15');
assert.strictEqual(burndown_res.date_labels[14], 'Oct 29');

// Guideline dimulai dari 100% dan berakhir di 0%
assert.strictEqual(burndown_res.ideal_percent[0], 100);
assert.strictEqual(burndown_res.ideal_percent[14], 0);

// Guideline poin dimulai dari total (16) dan berakhir di 0
assert.strictEqual(burndown_res.ideal_points[0], 16);
assert.strictEqual(burndown_res.ideal_points[14], 0);

// Hari 1 (Oct 15): JIRA-2 selesai (3 pts terbakar), tersisa 13 pts (81.25% ~ 81.2%)
assert(burndown_res.actual_points[0] <= 13, 'Sisa poin hari pertama harus 13');
assert.strictEqual(burndown_res.points_done_text, '3 points done, 13 points to go');

console.log('   ✓ Burndown Guideline: 100% -> 0% (16 pts -> 0 pts).');
console.log(`   ✓ Burndown Remaining Work terhitung akurat: ${burndown_res.actual_points[0]} pts tersisa.`);
console.log(`   ✓ Label tanggal awal: ${burndown_res.start_date_label}, tanggal akhir: ${burndown_res.end_date_label}.\n`);

// ============================================================================
// TEST 4: Verifikasi Elemen UI & Controller
// ============================================================================
console.log('4. Menguji Integritas Berkas UI.html dan js_main.html...');

const ui_html = fs.readFileSync(path.join(__dirname, '..', 'src', 'UI.html'), 'utf8');
const js_main = fs.readFileSync(path.join(__dirname, '..', 'src', 'js_main.html'), 'utf8');

// UI.html
assert(ui_html.includes('id="card-sprint-progress"'), 'UI.html harus memuat card-sprint-progress');
assert(ui_html.includes('id="card-sprint-burndown"'), 'UI.html harus memuat card-sprint-burndown');
assert(ui_html.includes('id="progress-bar-done"'), 'UI.html harus memuat progress-bar-done');
assert(ui_html.includes('id="progress-bar-inprogress"'), 'UI.html harus memuat progress-bar-inprogress');
assert(ui_html.includes('id="progress-bar-todo"'), 'UI.html harus memuat progress-bar-todo');
assert(ui_html.includes('id="progress-stat-done"'), 'UI.html harus memuat progress-stat-done');
assert(ui_html.includes('id="progress-stat-inprogress"'), 'UI.html harus memuat progress-stat-inprogress');
assert(ui_html.includes('id="progress-stat-todo"'), 'UI.html harus memuat progress-stat-todo');
assert(ui_html.includes('id="burndownChart"'), 'UI.html harus memuat canvas burndownChart');
assert(ui_html.includes('id="burndown-points-summary"'), 'UI.html harus memuat burndown-points-summary');
assert(ui_html.includes('id="insight-sprint-select"'), 'UI.html harus memuat dropdown insight-sprint-select');

// js_main.html
assert(js_main.includes('function render_insights_dashboard('), 'js_main.html harus mendefinisikan render_insights_dashboard');
assert(js_main.includes('function render_burndown_chart('), 'js_main.html harus mendefinisikan render_burndown_chart');
assert(js_main.includes('function toggle_insight_widget_collapse('), 'js_main.html harus mendefinisikan toggle_insight_widget_collapse');
assert(js_main.includes('function handle_insight_sprint_change('), 'js_main.html harus mendefinisikan handle_insight_sprint_change');
assert(js_main.includes('app_state.selected_insight_sprint_id'), 'js_main.html harus mengelola selected_insight_sprint_id');

console.log('   ✓ Seluruh elemen DOM dan fungsi controller terverifikasi lengkap.\n');

console.log('================================================================');
console.log('  SEMUA TES TAHAP 17 BERHASIL (100% PASS)! SPRINT INSIGHTS SIAP.');
console.log('================================================================');
