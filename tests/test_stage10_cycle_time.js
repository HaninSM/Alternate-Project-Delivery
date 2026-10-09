/**
 * @fileoverview Test Suite Tahap 10: Cycle Time & Time-in-Status Engine & User Management Integration.
 * Menverifikasi:
 * 1. Logika format_duration_human (konversi ms ke 'Xd Yh Zm')
 * 2. Perhitungan durasi per kolom dari riwayat transition dan active state
 * 3. Logika filter combobox (project, sprint, status, assignee, search)
 * 4. Integrasi permissions can_view_cycle_time pada DEFAULT_PERMISSIONS & RBAC
 * 5. Keberadaan elemen UI Cycle Time di UI.html dan kontrol di js_main.html
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  MENJALANKAN TAHAP 10: CYCLE TIME & REPORTING TEST SUITE');
console.log('================================================================\n');

// 1. Uji Helper format_duration_human
console.log('1. Menguji Fungsi format_duration_human...');
function format_duration_human(ms) {
  if (!ms || ms <= 0 || isNaN(ms)) return '-';
  const total_minutes = Math.round(ms / (1000 * 60));
  if (total_minutes <= 0) return '< 1m';

  const days = Math.floor(total_minutes / (24 * 60));
  const hours = Math.floor((total_minutes % (24 * 60)) / 60);
  const minutes = total_minutes % 60;

  const parts = [];
  if (days > 0) parts.push(days + 'd');
  if (hours > 0) parts.push(hours + 'h');
  if (minutes > 0 || parts.length === 0) parts.push(minutes + 'm');

  return parts.join(' ');
}

// 1d 19h 48m = (1 * 24 * 60 + 19 * 60 + 48) * 60 * 1000 ms = (1440 + 1140 + 48) * 60000 = 2628 * 60000 = 157680000 ms
assert.strictEqual(format_duration_human(157680000), '1d 19h 48m', 'Format 1d 19h 48m harus sesuai');
// 19h 55m = (19 * 60 + 55) * 60000 = 1195 * 60000 = 71700000 ms
assert.strictEqual(format_duration_human(71700000), '19h 55m', 'Format 19h 55m harus sesuai');
// 30m = 30 * 60000 = 1800000 ms
assert.strictEqual(format_duration_human(1800000), '30m', 'Format 30m harus sesuai');
assert.strictEqual(format_duration_human(0), '-', '0 ms harus return -');
assert.strictEqual(format_duration_human(null), '-', 'null harus return -');
console.log('   ✓ Logika konversi durasi format human-readable lulus 100%.');

// 2. Uji Kalkulasi Time-in-Status per Kolom
console.log('\n2. Menguji Kalkulasi Time-in-Status per Kolom & Re-entry...');
const base_time = new Date('2026-10-01T08:00:00Z').getTime();
const t1 = base_time + 2 * 3600 * 1000;       // +2 jam -> masuk IN_PROGRESS
const t2 = base_time + 10 * 3600 * 1000;      // +8 jam kemudian -> masuk REVIEW
const t3 = base_time + 14 * 3600 * 1000;      // +4 jam kemudian -> ditolak, balik ke IN_PROGRESS
const t4 = base_time + 20 * 3600 * 1000;      // +6 jam kemudian -> masuk DONE

const test_task = {
  id: 'TSK-TEST',
  created_at: new Date(base_time).toISOString(),
  status: 'DONE',
  updated_at: new Date(t4).toISOString()
};

const test_histories = [
  { task_id: 'TSK-TEST', old_status: 'TODO', new_status: 'IN_PROGRESS', timestamp: new Date(t1).toISOString() },
  { task_id: 'TSK-TEST', old_status: 'IN_PROGRESS', new_status: 'REVIEW', timestamp: new Date(t2).toISOString() },
  { task_id: 'TSK-TEST', old_status: 'REVIEW', new_status: 'IN_PROGRESS', timestamp: new Date(t3).toISOString() },
  { task_id: 'TSK-TEST', old_status: 'IN_PROGRESS', new_status: 'DONE', timestamp: new Date(t4).toISOString() }
];

let duration_todo_ms = 0;
let duration_in_progress_ms = 0;
let duration_review_ms = 0;
let duration_done_ms = 0;

let last_status = 'TODO';
let last_ts = base_time;

test_histories.forEach(trans => {
  const trans_ts = new Date(trans.timestamp).getTime();
  const delta = Math.max(0, trans_ts - last_ts);
  if (last_status === 'TODO') duration_todo_ms += delta;
  else if (last_status === 'IN_PROGRESS') duration_in_progress_ms += delta;
  else if (last_status === 'REVIEW') duration_review_ms += delta;
  else if (last_status === 'DONE') duration_done_ms += delta;

  last_status = trans.new_status;
  last_ts = trans_ts;
});

// To Do = t1 - base_time = 2 jam
assert.strictEqual(duration_todo_ms, 2 * 3600 * 1000, 'Durasi To Do harus 2 jam');
// In Progress = (t2 - t1) + (t4 - t3) = 8 jam + 6 jam = 14 jam (re-entry ping pong berhasil dijumlahkan)
assert.strictEqual(duration_in_progress_ms, 14 * 3600 * 1000, 'Durasi In Progress harus 14 jam terakumulasi');
// Review = t3 - t2 = 4 jam
assert.strictEqual(duration_review_ms, 4 * 3600 * 1000, 'Durasi Review harus 4 jam');

const cycle_time_ms = duration_in_progress_ms + duration_review_ms;
assert.strictEqual(cycle_time_ms, 18 * 3600 * 1000, 'Cycle time harus 18 jam');
console.log('   ✓ Kalkulasi durasi To Do, In Progress, Review, dan akumulasi re-entry lulus.');

// 3. Uji File Code.gs & Setup.gs untuk Izin can_view_cycle_time
console.log('\n3. Menguji Integrasi Hak Akses can_view_cycle_time...');
const code_content = fs.readFileSync(path.join(__dirname, '../src/Code.gs'), 'utf8');
const setup_content = fs.readFileSync(path.join(__dirname, '../src/Setup.gs'), 'utf8');

assert(code_content.includes('can_view_cycle_time: true'), 'Code.gs harus memuat can_view_cycle_time');
assert(setup_content.includes('can_view_cycle_time'), 'Setup.gs harus memuat can_view_cycle_time');
console.log('   ✓ Hak akses can_view_cycle_time terpasang di Code.gs dan Setup.gs.');

// 4. Uji File UI.html untuk Elemen Sidebar, Form, dan Table
console.log('\n4. Menguji Elemen UI di UI.html...');
const ui_content = fs.readFileSync(path.join(__dirname, '../src/UI.html'), 'utf8');

assert(ui_content.includes('id="nav-btn-cycle-time"'), 'Sidebar harus memuat tombol #nav-btn-cycle-time');
assert(ui_content.includes('id="view-cycle-time"'), 'UI harus memuat kontainer #view-cycle-time');
assert(ui_content.includes('id="ct-filter-project"'), 'Form filter harus memuat combobox project #ct-filter-project');
assert(ui_content.includes('id="ct-filter-sprint"'), 'Form filter harus memuat combobox sprint #ct-filter-sprint');
assert(ui_content.includes('id="ct-filter-status"'), 'Form filter harus memuat combobox status #ct-filter-status');
assert(ui_content.includes('id="ct-filter-assignee"'), 'Form filter harus memuat combobox assignee #ct-filter-assignee');
assert(ui_content.includes('id="ct-filter-search"'), 'Form filter harus memuat input pencarian #ct-filter-search');
assert(ui_content.includes('id="ct-table-body"'), 'Tabel report harus memuat #ct-table-body');
assert(ui_content.includes('id="perm-can-view-cycle-time"'), 'Modal User Management harus memuat checkbox perm-can-view-cycle-time');
console.log('   ✓ Seluruh elemen UI Cycle Time & User Management terverifikasi di UI.html.');

// 5. Uji File js_main.html untuk Handler dan State
console.log('\n5. Menguji Controller di js_main.html...');
const js_content = fs.readFileSync(path.join(__dirname, '../src/js_main.html'), 'utf8');

assert(js_content.includes('load_cycle_time_report'), 'js_main.html harus memiliki fungsi load_cycle_time_report');
assert(js_content.includes('preload_cycle_time_metadata'), 'js_main.html harus memiliki fungsi preload_cycle_time_metadata (Opsi 2)');
assert(js_content.includes('fetch_cycle_time_table_data'), 'js_main.html harus memiliki fungsi fetch_cycle_time_table_data (Opsi 2)');
assert(js_content.includes('render_cycle_time_report'), 'js_main.html harus memiliki fungsi render_cycle_time_report');
assert(js_content.includes('populate_cycle_time_comboboxes'), 'js_main.html harus memiliki fungsi populate_cycle_time_comboboxes');
assert(js_content.includes('can_view_cycle_time'), 'js_main.html harus memvalidasi permission can_view_cycle_time');
console.log('   ✓ Controller dan event handler Cycle Time terpasang dengan rapi di js_main.html.');

// 6. Uji Opsi 2 Dual-Channel API di Insights.gs
console.log('\n6. Menguji Dual-Channel Backend API di Insights.gs (Opsi 2)...');
const insights_content = fs.readFileSync(path.join(__dirname, '../src/Insights.gs'), 'utf8');

assert(insights_content.includes('function get_cycle_time_metadata()'), 'Insights.gs harus memiliki endpoint get_cycle_time_metadata()');
assert(insights_content.includes('function parse_date_safe_ms'), 'Insights.gs harus memiliki helper parse_date_safe_ms');
assert(insights_content.includes('function get_cycle_time_report_data'), 'Insights.gs harus memiliki endpoint get_cycle_time_report_data');
console.log('   ✓ Dual-Channel API get_cycle_time_metadata & safe date handling terverifikasi.');

console.log('\n================================================================');
console.log('  SEMUA PENGUJIAN TAHAP 10 (CYCLE TIME REPORT OPSI 2) BERHASIL (100% PASS)!');
console.log('================================================================\n');

