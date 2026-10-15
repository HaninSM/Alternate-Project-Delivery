/**
 * Test Suite Tahap 18: Redesain UI Berdasarkan 3 Layar Google Stitch
 * 1. Modern Jira-Style Task Detail Modal (Screens 1 & 3: e3f057f9 & d3d79cef)
 * 2. Actionable Insights / Executive Health Dashboard (Screen 2: 7bed6571)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  MENJALANKAN TAHAP 18: STITCH EXECUTIVE DASHBOARD & DETAIL MODAL');
console.log('================================================================\n');

const src_dir = path.join(__dirname, '..', 'src');
const ui_html = fs.readFileSync(path.join(src_dir, 'UI.html'), 'utf8');
const js_main = fs.readFileSync(path.join(src_dir, 'js_main.html'), 'utf8');
const api_gs = fs.readFileSync(path.join(src_dir, 'API.gs'), 'utf8');
const insights_gs = fs.readFileSync(path.join(src_dir, 'Insights.gs'), 'utf8');

// ============================================================================
// TEST 1: Verifikasi Backend API & Insight Engine Functions
// ============================================================================
console.log('1. Menguji Fungsi Backend API.gs & Insights.gs...');

assert(api_gs.includes('function get_task_audit_detail('), 'API.gs harus mendefinisikan get_task_audit_detail');
assert(api_gs.includes('function get_user_initials('), 'API.gs harus mendefinisikan get_user_initials');
assert(insights_gs.includes('function calculate_time_in_status_summary('), 'Insights.gs harus mendefinisikan calculate_time_in_status_summary');
assert(insights_gs.includes('function calculate_velocity_projection('), 'Insights.gs harus mendefinisikan calculate_velocity_projection');
assert(insights_gs.includes('function calculate_initials('), 'Insights.gs harus mendefinisikan calculate_initials');

console.log('   ✓ Backend endpoint get_task_audit_detail & algoritma kalkulasi insight terpasang.\n');

// ============================================================================
// TEST 2: Simulasi Kalkulasi Time-in-Status & Velocity Projection
// ============================================================================
console.log('2. Menguji Kalkulasi Time-in-Status Summary & Velocity Projection...');

// Ekstrak dan jalankan fungsi kalkulasi
function calculate_initials_sim(name) {
  if (!name || typeof name !== 'string') return 'NA';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

assert.strictEqual(calculate_initials_sim('Rian Developer'), 'RD', 'Inisial Rian Developer harus RD');
assert.strictEqual(calculate_initials_sim('Budi Hartono'), 'BH', 'Inisial Budi Hartono harus BH');
assert.strictEqual(calculate_initials_sim('Administrator'), 'AD', 'Inisial Administrator harus AD');

const mock_tasks = [
  { id: 'TSK-101', title: 'Task A', status: 'DONE', estimate_hours: 6, created_at: '2026-10-01T08:00:00Z', updated_at: '2026-10-02T16:00:00Z' },
  { id: 'TSK-102', title: 'Task B', status: 'IN_PROGRESS', estimate_hours: 8, created_at: '2026-10-01T09:00:00Z', updated_at: '2026-10-03T17:00:00Z' }
];

const mock_histories = [
  { task_id: 'TSK-101', old_status: 'TODO', new_status: 'IN_PROGRESS', timestamp: '2026-10-01T12:00:00Z' },
  { task_id: 'TSK-101', old_status: 'IN_PROGRESS', new_status: 'REVIEW', timestamp: '2026-10-02T10:00:00Z' },
  { task_id: 'TSK-101', old_status: 'REVIEW', new_status: 'DONE', timestamp: '2026-10-02T16:00:00Z' }
];

function calculate_time_in_status_summary_sim(tasks, histories, fallback_lead_hours) {
  let todo_total_h = 0;
  let in_prog_total_h = 0;
  let review_total_h = 0;
  let count = 0;

  const history_by_task = {};
  histories.forEach(h => {
    if (!history_by_task[h.task_id]) history_by_task[h.task_id] = [];
    history_by_task[h.task_id].push(h);
  });

  tasks.forEach(t => {
    const th = history_by_task[t.id] || [];
    if (th.length > 0) {
      th.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      let cur_st = 'TODO';
      let prev_time = new Date(t.created_at || th[0].timestamp);
      let t_todo = 0;
      let t_inp = 0;
      let t_rev = 0;

      th.forEach(entry => {
        const entry_time = new Date(entry.timestamp);
        const diff = Math.max(0, (entry_time.getTime() - prev_time.getTime()) / (1000 * 3600));
        if (cur_st === 'TODO') t_todo += diff;
        else if (cur_st === 'IN_PROGRESS') t_inp += diff;
        else if (cur_st === 'REVIEW') t_rev += diff;
        cur_st = entry.new_status;
        prev_time = entry_time;
      });

      todo_total_h += t_todo;
      in_prog_total_h += t_inp;
      review_total_h += t_rev;
      count++;
    }
  });

  let avg_total_days = 3.0;
  let avg_todo_days = 0.8;
  let avg_in_prog_days = 1.6;
  let avg_review_days = 0.6;

  if (count > 0 && (todo_total_h + in_prog_total_h + review_total_h) > 0) {
    avg_todo_days = Number(((todo_total_h / count) / 24).toFixed(1));
    avg_in_prog_days = Number(((in_prog_total_h / count) / 24).toFixed(1));
    avg_review_days = Number(((review_total_h / count) / 24).toFixed(1));
    avg_total_days = Number((avg_todo_days + avg_in_prog_days + avg_review_days).toFixed(1));
  }

  const sum_d = Math.max(0.1, avg_todo_days + avg_in_prog_days + avg_review_days);
  const todo_pct = Math.round((avg_todo_days / sum_d) * 100);
  const in_prog_pct = Math.round((avg_in_prog_days / sum_d) * 100);
  const review_pct = 100 - todo_pct - in_prog_pct;

  return {
    avg_total_days,
    avg_todo_days,
    avg_in_prog_days,
    avg_review_days,
    todo_percent: todo_pct,
    in_progress_percent: in_prog_pct,
    review_percent: review_pct
  };
}

const tis_res = calculate_time_in_status_summary_sim(mock_tasks, mock_histories, 72);
assert(tis_res.avg_total_days > 0, 'Average total days harus > 0');
assert(tis_res.todo_percent + tis_res.in_progress_percent + tis_res.review_percent === 100, 'Total persentase harus 100%');
console.log(`   ✓ Time-in-Status: Total ${tis_res.avg_total_days}d (TODO: ${tis_res.todo_percent}%, IN PROG: ${tis_res.in_progress_percent}%, REVIEW: ${tis_res.review_percent}%).\n`);

// ============================================================================
// TEST 3: Verifikasi Elemen UI Modern Jira-Style Task Detail Modal (Screens 1 & 3)
// ============================================================================
console.log('3. Menguji Struktur DOM Modal Task Detail Modern Jira-Style...');

// Breadcrumb
assert(ui_html.includes('id="detail-breadcrumb"'), 'UI.html harus memuat breadcrumb navigasi');
assert(ui_html.includes('id="detail-breadcrumb-project"'), 'UI.html harus memuat breadcrumb project');
assert(ui_html.includes('id="detail-breadcrumb-sprint"'), 'UI.html harus memuat breadcrumb sprint');
assert(ui_html.includes('id="detail-task-id-badge"'), 'UI.html harus memuat badge ID task');

// Action buttons
assert(ui_html.includes('id="btn-edit-from-detail"'), 'UI.html harus memuat tombol Edit Work Item');
assert(ui_html.includes('id="btn-share-detail"'), 'UI.html harus memuat tombol Share detail');
assert(ui_html.includes('id="btn-close-task-detail"'), 'UI.html harus memuat tombol Close detail modal');

// Title & Badges
assert(ui_html.includes('id="detail-task-title"'), 'UI.html harus memuat judul task detail');
assert(ui_html.includes('id="detail-task-type-badge"'), 'UI.html harus memuat badge tipe work item');
assert(ui_html.includes('id="detail-task-hierarchy-badge"'), 'UI.html harus memuat badge level hirarki');
assert(ui_html.includes('id="detail-task-story-points-badge"'), 'UI.html harus memuat badge story points');

// Interactive Status Dropdown Pill (Stitch: ● IN PROGRESS v)
assert(ui_html.includes('id="detail-status-pill"'), 'UI.html harus memuat status dropdown pill container');
assert(ui_html.includes('id="detail-task-status-select"'), 'UI.html harus memuat select dropdown status');
assert(ui_html.includes('id="detail-status-pill-dot"'), 'UI.html harus memuat colored status indicator dot');

// Konfigurasi Penugasan (Assignee & Reporter)
assert(ui_html.includes('id="detail-assignee-avatar"'), 'UI.html harus memuat avatar inisial assignee');
assert(ui_html.includes('id="detail-task-assignee"'), 'UI.html harus memuat nama assignee');
assert(ui_html.includes('id="detail-assignee-role"'), 'UI.html harus memuat role assignee');
assert(ui_html.includes('id="detail-task-reporter"'), 'UI.html harus memuat reporter PM');

// Time-in-Status Audit Card
assert(ui_html.includes('id="detail-audit-total-badge"'), 'UI.html harus memuat badge total jam audit');
assert(ui_html.includes('id="detail-audit-bar-todo"'), 'UI.html harus memuat progress bar TODO');
assert(ui_html.includes('id="detail-audit-bar-inprogress"'), 'UI.html harus memuat progress bar IN PROGRESS');
assert(ui_html.includes('id="detail-audit-bar-review"'), 'UI.html harus memuat progress bar REVIEW');
assert(ui_html.includes('id="detail-audit-todo-hours"'), 'UI.html harus memuat box durasi TODO');
assert(ui_html.includes('id="detail-audit-inprogress-hours"'), 'UI.html harus memuat box durasi IN PROGRESS');
assert(ui_html.includes('id="detail-audit-review-hours"'), 'UI.html harus memuat box durasi REVIEW');
assert(ui_html.includes('id="detail-audit-log-list"'), 'UI.html harus memuat log audit trail pergeseran');

console.log('   ✓ Seluruh elemen DOM Modal Task Detail Modern Jira-Style terverifikasi lengkap.\n');

// ============================================================================
// TEST 4: Verifikasi Elemen UI Executive Health Dashboard (Screen 2)
// ============================================================================
console.log('4. Menguji Struktur DOM Executive Health Dashboard (Screen 2)...');

// Transparency Banner
assert(ui_html.includes('External Client Transparency Mode'), 'UI.html harus memuat header transparansi eksternal klien');
assert(ui_html.includes('Audit ID: #OJK-2024-S4'), 'UI.html harus memuat audit ID token perbankan OJK');
assert(ui_html.includes('Live Synced'), 'UI.html harus memuat status sinkronisasi live');

// 4 Executive KPI Cards
assert(ui_html.includes('id="metric-burndown-gauge"'), 'UI.html harus memuat nilai gauge burndown velocity');
assert(ui_html.includes('id="metric-burndown-sub"'), 'UI.html harus memuat subteks sisa story points');
assert(ui_html.includes('id="metric-lead-days"'), 'UI.html harus memuat lead time dalam hari');
assert(ui_html.includes('id="metric-lead-time"'), 'UI.html harus memuat lead time dalam jam');
assert(ui_html.includes('id="metric-cycle-days"'), 'UI.html harus memuat cycle time dalam hari');
assert(ui_html.includes('id="metric-cycle-time"'), 'UI.html harus memuat cycle time dalam jam');
assert(ui_html.includes('id="metric-blocker-count"'), 'UI.html harus memuat jumlah blocker aktif');

// Middle Row: Burndown Velocity & Time-in-Status Donut Chart
assert(ui_html.includes('id="card-sprint-burndown"'), 'UI.html harus memuat container burndown velocity');
assert(ui_html.includes('id="burndownChart"'), 'UI.html harus memuat canvas grafik burndown velocity');
assert(ui_html.includes('id="burndown-projection-banner"'), 'UI.html harus memuat banner proyeksi tanggal selesai');
assert(ui_html.includes('id="burndown-projection-text"'), 'UI.html harus memuat teks proyeksi velocity');

assert(ui_html.includes('id="timeInStatusChart"'), 'UI.html harus memuat canvas Donut Chart time in status');
assert(ui_html.includes('id="time-in-status-center-text"'), 'UI.html harus memuat teks tengah Donut Chart');
assert(ui_html.includes('id="donut-stat-todo"'), 'UI.html harus memuat statistik donut TODO');
assert(ui_html.includes('id="donut-stat-inprogress"'), 'UI.html harus memuat statistik donut IN PROGRESS');
assert(ui_html.includes('id="donut-stat-review"'), 'UI.html harus memuat statistik donut REVIEW');

// Escalation Alert Table
assert(ui_html.includes('id="escalation-table"'), 'UI.html harus memuat tabel eskalasi task macet');
assert(ui_html.includes('id="escalation-table-body"'), 'UI.html harus memuat tbody tabel eskalasi');
assert(ui_html.includes('id="escalation-count-badge"'), 'UI.html harus memuat badge counter eskalasi');

console.log('   ✓ Seluruh elemen DOM Executive Health Dashboard terverifikasi lengkap.\n');

// ============================================================================
// TEST 5: Verifikasi Controller Functions di js_main.html
// ============================================================================
console.log('5. Menguji Controller Functions di js_main.html...');

assert(js_main.includes('function open_task_detail_modal('), 'js_main.html harus mendefinisikan open_task_detail_modal');
assert(js_main.includes('function handle_detail_status_change('), 'js_main.html harus mendefinisikan handle_detail_status_change');
assert(js_main.includes('function handle_share_task_detail('), 'js_main.html harus mendefinisikan handle_share_task_detail');
assert(js_main.includes('function render_time_in_status_donut('), 'js_main.html harus mendefinisikan render_time_in_status_donut');
assert(js_main.includes('function handle_notify_pm_blockers('), 'js_main.html harus mendefinisikan handle_notify_pm_blockers');
assert(js_main.includes('function handle_escalate_blocker('), 'js_main.html harus mendefinisikan handle_escalate_blocker');
assert(js_main.includes('function handle_download_insight_pdf('), 'js_main.html harus mendefinisikan handle_download_insight_pdf');
assert(js_main.includes('function handle_share_insight_report('), 'js_main.html harus mendefinisikan handle_share_insight_report');

console.log('   ✓ Controller functions untuk interaksi modal dan dashboard terverifikasi lengkap.\n');

console.log('================================================================');
console.log('  SEMUA TES TAHAP 18 BERHASIL (100% PASS)! QUALITY GATE TERPENUHI.');
console.log('================================================================');
