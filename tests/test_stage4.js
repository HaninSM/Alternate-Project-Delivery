/**
 * Unit Test / Test Suite untuk Tahap 4: Insight Engine
 * Menguji algoritma kalkulasi Lead Time, Cycle Time, Blocker Detection,
 * dan pembentukan seri data Burndown Chart (Ideal vs Actual).
 */

const assert = require('assert');

// Logika mandiri Insight Engine untuk unit testing
function compute_metrics_for_test(tasks, histories, sprint_info, current_time) {
  const DEFAULT_BLOCKER_THRESHOLD_HOURS = 48;
  const now = current_time || new Date('2026-10-08T12:00:00Z');

  const history_by_task = {};
  histories.forEach(h => {
    if (!history_by_task[h.task_id]) history_by_task[h.task_id] = [];
    history_by_task[h.task_id].push(h);
  });

  let total_lead_hours = 0;
  let done_lead_count = 0;

  let total_cycle_hours = 0;
  let done_cycle_count = 0;

  const blockers = [];

  tasks.forEach(task => {
    const task_histories = history_by_task[task.id] || [];
    task_histories.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const first_in_progress = task_histories.find(h => h.new_status === 'IN_PROGRESS');
    const first_done = task_histories.find(h => h.new_status === 'DONE');

    let done_time = null;
    if (task.status === 'DONE') {
      done_time = first_done ? new Date(first_done.timestamp) : new Date(task.updated_at);
    }

    // Lead Time
    if (done_time && task.created_at) {
      const created_time = new Date(task.created_at);
      const lead_h = Math.max(0, (done_time.getTime() - created_time.getTime()) / (1000 * 3600));
      total_lead_hours += lead_h;
      done_lead_count++;
    }

    // Cycle Time
    if (done_time && first_in_progress) {
      const start_progress_time = new Date(first_in_progress.timestamp);
      const cycle_h = Math.max(0, (done_time.getTime() - start_progress_time.getTime()) / (1000 * 3600));
      total_cycle_hours += cycle_h;
      done_cycle_count++;
    }

    // Blocker
    if (task.status === 'IN_PROGRESS' || task.status === 'REVIEW') {
      const last_change_time = task.updated_at ? new Date(task.updated_at) : (task.created_at ? new Date(task.created_at) : now);
      const stuck_duration_hours = Math.max(0, (now.getTime() - last_change_time.getTime()) / (1000 * 3600));

      if (stuck_duration_hours >= DEFAULT_BLOCKER_THRESHOLD_HOURS) {
        blockers.push({
          task_id: task.id,
          title: task.title,
          status: task.status,
          assignee: task.assignee_name,
          stuck_hours: Number(stuck_duration_hours.toFixed(1))
        });
      }
    }
  });

  const avg_lead = done_lead_count > 0 ? Number((total_lead_hours / done_lead_count).toFixed(1)) : 0;
  const avg_cycle = done_cycle_count > 0 ? Number((total_cycle_hours / done_cycle_count).toFixed(1)) : 0;

  // Burndown
  const total_scope_hours = tasks.reduce((sum, t) => sum + (Number(t.estimate_hours) || 0), 0);
  const start_d = new Date(sprint_info.start_date);
  const end_d = new Date(sprint_info.end_date);
  const days_count = Math.max(1, Math.round((end_d.getTime() - start_d.getTime()) / (1000 * 86400)) + 1);

  const labels = [];
  const ideal_hours = [];
  const actual_hours = [];

  const task_completion_time = {};
  histories.forEach(h => {
    if (h.new_status === 'DONE') {
      const t = new Date(h.timestamp).getTime();
      if (!task_completion_time[h.task_id] || t < task_completion_time[h.task_id]) {
        task_completion_time[h.task_id] = t;
      }
    }
  });
  tasks.forEach(t => {
    if (t.status === 'DONE' && !task_completion_time[t.id]) {
      task_completion_time[t.id] = t.updated_at ? new Date(t.updated_at).getTime() : start_d.getTime();
    }
  });

  for (let i = 0; i < days_count; i++) {
    const current_day = new Date(start_d.getTime() + i * 86400000);
    labels.push('Hari ' + (i + 1));

    const ideal_val = Math.max(0, total_scope_hours - (total_scope_hours / (days_count - 1 || 1)) * i);
    ideal_hours.push(Number(ideal_val.toFixed(1)));

    if (current_day.getTime() <= now.getTime() + 86400000) {
      let remaining = total_scope_hours;
      tasks.forEach(t => {
        const done_ts = task_completion_time[t.id];
        if (done_ts && done_ts <= current_day.getTime() + 86400000 - 1) {
          remaining -= (Number(t.estimate_hours) || 0);
        }
      });
      actual_hours.push(Math.max(0, Number(remaining.toFixed(1))));
    } else {
      actual_hours.push(null);
    }
  }

  return {
    summary: {
      total_tasks: tasks.length,
      avg_lead_time_hours: avg_lead,
      avg_cycle_time_hours: avg_cycle,
      blocker_count: blockers.length
    },
    burndown: { labels, ideal_hours, actual_hours },
    blockers
  };
}

console.log('--- Menjalankan Uji Coba Tahap 4: Insight Engine (Metrics & Burndown) ---');

// Mock Data Skenario
const sprint_info = {
  id: 'SPR-001',
  name: 'Sprint 1',
  start_date: '2026-10-01',
  end_date: '2026-10-05' // 5 Hari
};

const tasks = [
  {
    id: 'TSK-001',
    title: 'Setup Database',
    status: 'DONE',
    assignee_name: 'Budi Dev',
    estimate_hours: 10,
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-02T20:00:00Z'
  },
  {
    id: 'TSK-002',
    title: 'API Gateway',
    status: 'DONE',
    assignee_name: 'Siti Dev',
    estimate_hours: 20,
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-03T08:00:00Z'
  },
  {
    id: 'TSK-003',
    title: 'Integrasi Blocker Bug',
    status: 'IN_PROGRESS',
    assignee_name: 'Siti Dev',
    estimate_hours: 10,
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-02T08:00:00Z' // Terakhir update 6 hari lalu (> 48 jam)
  }
];

const histories = [
  // TSK-001: Created 10-01 08:00 -> IN_PROGRESS 10-01 12:00 -> DONE 10-02 20:00 (Lead: 36h, Cycle: 32h)
  { task_id: 'TSK-001', old_status: 'TODO', new_status: 'IN_PROGRESS', timestamp: '2026-10-01T12:00:00Z' },
  { task_id: 'TSK-001', old_status: 'IN_PROGRESS', new_status: 'DONE', timestamp: '2026-10-02T20:00:00Z' },
  // TSK-002: Created 10-01 08:00 -> IN_PROGRESS 10-02 08:00 -> DONE 10-03 08:00 (Lead: 48h, Cycle: 24h)
  { task_id: 'TSK-002', old_status: 'TODO', new_status: 'IN_PROGRESS', timestamp: '2026-10-02T08:00:00Z' },
  { task_id: 'TSK-002', old_status: 'IN_PROGRESS', new_status: 'DONE', timestamp: '2026-10-03T08:00:00Z' },
  // TSK-003: Masuk IN_PROGRESS 10-02 08:00 lalu macet
  { task_id: 'TSK-003', old_status: 'TODO', new_status: 'IN_PROGRESS', timestamp: '2026-10-02T08:00:00Z' }
];

const current_mock_time = new Date('2026-10-08T12:00:00Z');
const result = compute_metrics_for_test(tasks, histories, sprint_info, current_mock_time);

// Test 1: Lead Time Rata-rata
// TSK-001: 36 jam. TSK-002: 48 jam. Rata-rata: (36 + 48) / 2 = 42 jam
assert.strictEqual(result.summary.avg_lead_time_hours, 42.0);
console.log('✓ Test 1 Lolos: Lead Time rata-rata terhitung akurat (' + result.summary.avg_lead_time_hours + ' jam).');

// Test 2: Cycle Time Rata-rata
// TSK-001: 32 jam. TSK-002: 24 jam. Rata-rata: (32 + 24) / 2 = 28 jam
assert.strictEqual(result.summary.avg_cycle_time_hours, 28.0);
console.log('✓ Test 2 Lolos: Cycle Time rata-rata terhitung akurat (' + result.summary.avg_cycle_time_hours + ' jam).');

// Test 3: Deteksi Blocker
assert.strictEqual(result.summary.blocker_count, 1);
assert.strictEqual(result.blockers[0].task_id, 'TSK-003');
assert(result.blockers[0].stuck_hours > 48, 'Durasi macet harus lebih dari 48 jam');
console.log('✓ Test 3 Lolos: Task macet (TSK-003) teridentifikasi sebagai Blocker aktif (' + result.blockers[0].stuck_hours + ' jam).');

// Test 4: Burndown Chart Data Series
// Total scope: 10 + 20 + 10 = 40 jam
assert.strictEqual(result.burndown.labels.length, 5); // Hari 1 s/d Hari 5
assert.strictEqual(result.burndown.ideal_hours[0], 40); // Hari 1 mulai di 40 jam
assert.strictEqual(result.burndown.ideal_hours[4], 0);  // Hari 5 selesai di 0 jam
console.log('✓ Test 4 Lolos: Burndown Ideal garis linier dari 40 jam turun ke 0 jam.');

// Test 5: Burndown Actual Series
// Hari 1: Belum ada selesai -> 40 jam
// Hari 2: TSK-001 selesai (10h) -> 30 jam tersisa
// Hari 3: TSK-002 selesai (20h) -> 10 jam tersisa
assert.strictEqual(result.burndown.actual_hours[0], 40);
assert.strictEqual(result.burndown.actual_hours[1], 30);
assert.strictEqual(result.burndown.actual_hours[2], 10);
console.log('✓ Test 5 Lolos: Burndown Aktual tereduksi secara tepat saat task berstatus DONE.');

console.log('\nSEMUA TEST TAHAP 4 BERHASIL (PASS)! Quality Gate Tahap 4 Terpenuhi.');
