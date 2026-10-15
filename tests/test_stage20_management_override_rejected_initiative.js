/**
 * @fileoverview Test Suite Tahap 20: Management Override untuk Inisiatif yang Ditolak AI (Opsi 3).
 * Memverifikasi:
 * 1. Ketersediaan fungsi override_rejected_initiative di src/ChallengerAI.gs dengan audit trail lengkap
 * 2. Status APPROVED_OVERRIDE dan pencatatan justifikasi bisnis & mitigasi risiko
 * 3. Integrasi ke Demands sheet dengan flag is_override dan badge ⚠️ OVERRIDDEN
 * 4. Modal Management Override (#modal-management-override) dan form fields di src/UI.html
 * 5. Alert banner #chat-alert-overridden di chat UI Uji Inisiatif AI
 * 6. Tombol override di chat alert rejected dan tabel inisiatif tertolak di Demand Management
 * 7. Controller frontend di src/js_main.html (open, close, submit, render updates)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  MENJALANKAN TAHAP 20: MANAGEMENT OVERRIDE REJECTED INITIATIVE');
console.log('================================================================\n');

// 1. Verifikasi File Backend src/ChallengerAI.gs
console.log('1. Memverifikasi implementasi backend di src/ChallengerAI.gs...');
const challengerAiPath = path.join(__dirname, '..', 'src', 'ChallengerAI.gs');
const challengerAiContent = fs.readFileSync(challengerAiPath, 'utf8');

assert.ok(
  challengerAiContent.includes('function override_rejected_initiative('),
  'src/ChallengerAI.gs harus memiliki fungsi override_rejected_initiative'
);
assert.ok(
  challengerAiContent.includes('APPROVED_OVERRIDE'),
  'override_rejected_initiative harus mengubah status menjadi APPROVED_OVERRIDE'
);
assert.ok(
  challengerAiContent.includes('MANAGEMENT OVERRIDE'),
  'override_rejected_initiative harus mencatat audit trail di history chat'
);
assert.ok(
  challengerAiContent.includes('sheet_demands.appendRow'),
  'override_rejected_initiative harus memasukkan data ke sheet Demands'
);
assert.ok(
  challengerAiContent.includes('is_override'),
  'get_demands_list harus memetakan flag is_override untuk demand yang dioverride'
);
console.log('   ✓ src/ChallengerAI.gs lulus verifikasi backend.\n');

// 2. Verifikasi UI HTML di src/UI.html
console.log('2. Memverifikasi elemen UI di src/UI.html...');
const uiHtmlPath = path.join(__dirname, '..', 'src', 'UI.html');
const uiHtmlContent = fs.readFileSync(uiHtmlPath, 'utf8');

assert.ok(
  uiHtmlContent.includes('id="modal-management-override"'),
  'src/UI.html harus memiliki modal #modal-management-override'
);
assert.ok(
  uiHtmlContent.includes('id="form-management-override"'),
  'src/UI.html harus memiliki form #form-management-override'
);
assert.ok(
  uiHtmlContent.includes('id="override-session-id"'),
  'src/UI.html harus memiliki hidden input #override-session-id'
);
assert.ok(
  uiHtmlContent.includes('id="override-input-reason"'),
  'src/UI.html harus memiliki input #override-input-reason'
);
assert.ok(
  uiHtmlContent.includes('id="override-input-mitigation"'),
  'src/UI.html harus memiliki input #override-input-mitigation'
);
assert.ok(
  uiHtmlContent.includes('id="override-target-project"'),
  'src/UI.html harus memiliki dropdown #override-target-project'
);
assert.ok(
  uiHtmlContent.includes('id="override-work-type"'),
  'src/UI.html harus memiliki dropdown #override-work-type'
);
assert.ok(
  uiHtmlContent.includes('id="override-story-points"'),
  'src/UI.html harus memiliki input #override-story-points'
);
assert.ok(
  uiHtmlContent.includes('id="override-target-bucket"'),
  'src/UI.html harus memiliki dropdown #override-target-bucket'
);
assert.ok(
  uiHtmlContent.includes('id="chat-alert-overridden"'),
  'src/UI.html harus memiliki banner alert #chat-alert-overridden'
);
assert.ok(
  uiHtmlContent.includes('open_management_override_modal()'),
  'src/UI.html harus memanggil open_management_override_modal dari chat alert rejected'
);

// Verifikasi pembatasan hirarki: Hanya Level 1 (INITIATIVE) dan Level 0 (USER_STORY, TASK, BUG), TIDAK ADA SUBTASK
const workTypeMatch = uiHtmlContent.match(/<select id="override-work-type"[\s\S]*?<\/select>/);
assert.ok(workTypeMatch, 'Dropdown #override-work-type harus ditemukan');
const workTypeHtml = workTypeMatch[0];
assert.ok(workTypeHtml.includes('value="INITIATIVE"'), 'Harus berisi opsi Level 1 (INITIATIVE)');
assert.ok(workTypeHtml.includes('value="USER_STORY"'), 'Harus berisi opsi Level 0 (USER_STORY)');
assert.ok(workTypeHtml.includes('value="TASK"'), 'Harus berisi opsi Level 0 (TASK)');
assert.ok(workTypeHtml.includes('value="BUG"'), 'Harus berisi opsi Level 0 (BUG)');
assert.ok(!workTypeHtml.includes('value="SUBTASK"'), 'TIDAK BOLEH berisi opsi SUBTASK (Level -1) sesuai spesifikasi');

console.log('   ✓ src/UI.html lulus verifikasi modal, form konversi work item hirarki 1 & 0.\n');

// 3. Verifikasi Controller Frontend di src/js_main.html
console.log('3. Memverifikasi controller logic di src/js_main.html...');
const jsMainPath = path.join(__dirname, '..', 'src', 'js_main.html');
const jsMainContent = fs.readFileSync(jsMainPath, 'utf8');

assert.ok(
  jsMainContent.includes('function open_management_override_modal('),
  'src/js_main.html harus memiliki fungsi open_management_override_modal'
);
assert.ok(
  jsMainContent.includes('function close_management_override_modal('),
  'src/js_main.html harus memiliki fungsi close_management_override_modal'
);
assert.ok(
  jsMainContent.includes('function handle_submit_management_override('),
  'src/js_main.html harus memiliki fungsi handle_submit_management_override'
);
assert.ok(
  jsMainContent.includes('function handle_override_work_type_change('),
  'src/js_main.html harus memiliki fungsi handle_override_work_type_change'
);
assert.ok(
  jsMainContent.includes('session.status === \'APPROVED_OVERRIDE\''),
  'render_active_initiative_chat harus menangani status APPROVED_OVERRIDE'
);
assert.ok(
  jsMainContent.includes('item.status === \'APPROVED_OVERRIDE\''),
  'render_initiatives_history_list harus menangani status APPROVED_OVERRIDE'
);
assert.ok(
  jsMainContent.includes('⚠️ OVERRIDDEN'),
  'render_demands_table harus menampilkan badge ⚠️ OVERRIDDEN'
);
assert.ok(
  jsMainContent.includes('open_management_override_modal'),
  'render_rejected_demands_table harus menyediakan tombol Override ke modal'
);
console.log('   ✓ src/js_main.html lulus verifikasi controller frontend.\n');

// 4. Simulasi Logika Bisnis End-to-End Option 3 dengan Konversi Work Item
console.log('4. Menjalankan simulasi logika Option 3 Management Override dengan Konversi Work Item...');

// Mock state
const mock_initiative_session = {
  id: 'INIT-2026-TEST01',
  title: 'AI Automated Loan Underwriting',
  status: 'REJECTED',
  attempt_count: 2,
  user_email: 'pm@multifinance.com',
  ai_summary_note: 'AI Challenger: Tidak memiliki keunggulan kompetitif jelas dibanding rule-engine konvensional.',
  messages: [
    { role: 'user', text: 'Kami ingin otomasi underwriting pinjaman.' },
    { role: 'model', text: 'Inisiatif ditolak. Tidak ada efisiensi nyata.' }
  ]
};

let mock_demands = [];
let mock_tasks = [];
let mock_rejected_list = [mock_initiative_session];

function simulate_override_with_work_item(session_id, reason, mitigation, engineers, days, current_user_email, work_item_config) {
  assert.ok(reason && reason.trim().length > 0, 'Reason wajib diisi');
  assert.ok(mitigation && mitigation.trim().length > 0, 'Mitigation wajib diisi');
  
  const target = mock_rejected_list.find(item => item.id === session_id);
  assert.ok(target, 'Target inisiatif harus ditemukan');
  assert.strictEqual(target.status, 'REJECTED', 'Hanya inisiatif REJECTED yang bisa di-override');

  // Validasi work type: Hanya Hirarki 1 dan 0 yang sah
  const allowed_types = ['INITIATIVE', 'USER_STORY', 'TASK', 'BUG'];
  const work_type = work_item_config.work_type || 'USER_STORY';
  assert.ok(allowed_types.includes(work_type), 'Work type harus hirarki 1 atau 0');
  assert.notStrictEqual(work_type, 'SUBTASK', 'SUBTASK tidak diperbolehkan');

  const hierarchy_level = work_type === 'INITIATIVE' ? 1 : 0;
  const target_proj = work_item_config.project_id || 'PRJ-001';
  const target_sprint = work_item_config.target_bucket === 'SPRINT' ? 'SPR-001' : 'BACKLOG-' + target_proj;
  const story_points = hierarchy_level === 0 ? (work_item_config.story_points || '5') : '';

  // 1. Update session status
  target.status = 'APPROVED_OVERRIDE';
  target.ai_summary_note = `⚠️ OVERRIDE: ${reason} (Mitigasi: ${mitigation})`;
  target.messages.push({
    role: 'model',
    text: `⚠️ [MANAGEMENT OVERRIDE (OPSI 3)]: Disetujui oleh ${current_user_email}.\nJustifikasi: ${reason}\nMitigasi: ${mitigation}\nWork Item: ${work_type} di ${target_sprint}`,
    timestamp: new Date().toISOString()
  });

  // 2. Remove from rejected list
  mock_rejected_list = mock_rejected_list.filter(item => item.id !== session_id);

  // 3. Create Work Item Task
  const new_task = {
    id: 'TSK-999',
    sprint_id: target_sprint,
    title: target.title,
    work_type: work_type,
    hierarchy_level: hierarchy_level,
    story_points: story_points,
    estimate_hours: engineers * days * 8,
    status: 'TODO'
  };
  mock_tasks.push(new_task);

  // 4. Add to demands
  const new_demand = {
    id: 'DMD-TEST999',
    initiative_test_id: session_id,
    title: target.title,
    submitter_email: target.user_email,
    est_engineers: engineers,
    est_duration_days: days,
    capacity_status: 'CONVERTED_TO_PROJECT',
    allocated_capacity_hours: engineers * days * 8,
    capacity_notes: `⚠️ OVERRIDDEN: ${reason} | Work Item: ${new_task.id} (${work_type}) di ${target_proj}`,
    is_override: true
  };
  mock_demands.unshift(new_demand);

  return { success: true, demand: new_demand, task: new_task };
}

const override_result = simulate_override_with_work_item(
  'INIT-2026-TEST01',
  'Mandat regulasi OJK & komitmen ke direksi kuartal 4',
  'Melakukan dual-run dengan manual underwriter selama 1 bulan pertama',
  4,
  30,
  'executive@multifinance.com',
  {
    project_id: 'PRJ-001',
    work_type: 'USER_STORY',
    story_points: '8',
    target_bucket: 'BACKLOG'
  }
);

assert.strictEqual(override_result.success, true);
assert.strictEqual(mock_initiative_session.status, 'APPROVED_OVERRIDE');
assert.strictEqual(mock_rejected_list.length, 0, 'Inisiatif tertolak harus dikeluarkan dari tabel rejected');
assert.strictEqual(mock_demands.length, 1, 'Inisiatif harus masuk ke pipeline Demand');
assert.strictEqual(mock_demands[0].is_override, true);
assert.ok(mock_demands[0].capacity_notes.includes('OVERRIDDEN'));
assert.strictEqual(mock_tasks.length, 1, 'Work item task harus dibuat di target project backlog');
assert.strictEqual(mock_tasks[0].work_type, 'USER_STORY');
assert.strictEqual(mock_tasks[0].hierarchy_level, 0);
assert.strictEqual(mock_tasks[0].story_points, '8');
assert.strictEqual(mock_tasks[0].sprint_id, 'BACKLOG-PRJ-001');

console.log('   ✓ Simulasi Option 3 dengan Konversi Work Item (Hirarki 1 & 0) berhasil 100%.\n');

console.log('================================================================');
console.log('  SEMUA TES TAHAP 20 BERHASIL (100% PASS)');
console.log('================================================================');
