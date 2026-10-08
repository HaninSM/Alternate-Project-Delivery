/**
 * @fileoverview Insight Engine: Kalkulasi Metrik Agregasi Sprint, Lead Time,
 * Cycle Time, Burndown Timeline Series, dan Deteksi Hambatan (Blocker).
 * Alternate Project Delivery (LITE).
 */

/**
 * Ambang batas waktu task dianggap macet/blocker jika tidak bergerak (dalam jam).
 * Standar default: 48 jam (2 hari kerja).
 */
const DEFAULT_BLOCKER_THRESHOLD_HOURS = 48;

/**
 * Mengambil ringkasan insight lengkap untuk sprint aktif.
 *
 * @param {string} sprint_id - ID unik sprint (contoh: 'SPR-001').
 * @return {Object} Payload terstruktur untuk konsumsi Chart.js dan UI dasbor.
 */
function get_sprint_insights(sprint_id) {
  try {
    const spreadsheet = get_db_spreadsheet();
    const sheet_sprints = spreadsheet.getSheetByName('Sprints');
    const sheet_tasks = spreadsheet.getSheetByName('Tasks');
    const sheet_history = spreadsheet.getSheetByName('Task_History');
    const sheet_users = spreadsheet.getSheetByName('Users');

    if (!sheet_tasks || !sheet_history) {
      return { success: false, message: 'Sheet data tidak lengkap.' };
    }

    // 1. Ambil data Sprint untuk rentang tanggal
    let sprint_info = {
      id: sprint_id || 'SPR-001',
      name: 'Sprint Aktif',
      start_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    };

    if (sheet_sprints && sheet_sprints.getLastRowNum() > 1) {
      const sp_values = sheet_sprints.getDataRange().getValues();
      const sp_header = sp_values[0].map(h => String(h).trim().toLowerCase());
      const sp_id_idx = sp_header.indexOf('id');
      const sp_name_idx = sp_header.indexOf('name');
      const sp_start_idx = sp_header.indexOf('start_date');
      const sp_end_idx = sp_header.indexOf('end_date');

      for (let i = 1; i < sp_values.length; i++) {
        if (!sprint_id || String(sp_values[i][sp_id_idx]).trim() === sprint_id) {
          sprint_info = {
            id: sp_values[i][sp_id_idx],
            name: sp_values[i][sp_name_idx],
            start_date: format_date_str(sp_values[i][sp_start_idx]),
            end_date: format_date_str(sp_values[i][sp_end_idx])
          };
          break;
        }
      }
    }

    // 2. Lookup Users
    const user_name_map = {};
    if (sheet_users && sheet_users.getLastRowNum() > 1) {
      const u_values = sheet_users.getDataRange().getValues();
      for (let i = 1; i < u_values.length; i++) {
        user_name_map[u_values[i][0]] = u_values[i][1];
      }
    }

    // 3. Baca Tasks
    const task_values = sheet_tasks.getDataRange().getValues();
    const tasks = [];
    if (task_values.length > 1) {
      const t_header = task_values[0].map(h => String(h).trim().toLowerCase());
      const id_idx = t_header.indexOf('id');
      const sp_idx = t_header.indexOf('sprint_id');
      const title_idx = t_header.indexOf('title');
      const status_idx = t_header.indexOf('status');
      const assignee_idx = t_header.indexOf('assignee_id');
      const est_idx = t_header.indexOf('estimate_hours');
      const created_idx = t_header.indexOf('created_at');
      const updated_idx = t_header.indexOf('updated_at');

      for (let r = 1; r < task_values.length; r++) {
        const row = task_values[r];
        if (!sprint_id || String(row[sp_idx]).trim() === sprint_id) {
          tasks.push({
            id: row[id_idx],
            sprint_id: row[sp_idx],
            title: row[title_idx],
            status: String(row[status_idx]).toUpperCase().trim(),
            assignee_id: row[assignee_idx],
            assignee_name: user_name_map[row[assignee_idx]] || row[assignee_idx] || 'Unassigned',
            estimate_hours: Number(row[est_idx]) || 0,
            created_at: row[created_idx],
            updated_at: row[updated_idx]
          });
        }
      }
    }

    // 4. Baca History
    const history_values = sheet_history.getDataRange().getValues();
    const histories = [];
    if (history_values.length > 1) {
      const h_header = history_values[0].map(h => String(h).trim().toLowerCase());
      const h_id_idx = h_header.indexOf('id');
      const h_task_idx = h_header.indexOf('task_id');
      const h_old_idx = h_header.indexOf('old_status');
      const h_new_idx = h_header.indexOf('new_status');
      const h_by_idx = h_header.indexOf('changed_by');
      const h_time_idx = h_header.indexOf('timestamp');

      for (let r = 1; r < history_values.length; r++) {
        histories.push({
          id: history_values[r][h_id_idx],
          task_id: history_values[r][h_task_idx],
          old_status: String(history_values[r][h_old_idx]).toUpperCase().trim(),
          new_status: String(history_values[r][h_new_idx]).toUpperCase().trim(),
          changed_by: history_values[r][h_by_idx],
          timestamp: history_values[r][h_time_idx]
        });
      }
    }

    // 5. Kalkulasi Metrik (Lead Time, Cycle Time, Blocker, Burndown)
    const metrics = compute_metrics(tasks, histories, sprint_info);

    return {
      success: true,
      data: metrics
    };
  } catch (error) {
    return {
      success: false,
      message: 'Gagal menghitung insight: ' + error.message
    };
  }
}

/**
 * Menghitung seluruh metrik kinerja berdasarkan data task dan audit trail
 *
 * @param {Array<Object>} tasks - Kumpulan task sprint.
 * @param {Array<Object>} histories - Kumpulan log pergeseran status.
 * @param {Object} sprint_info - Informasi rentang sprint.
 * @return {Object} Objek teragregasi.
 */
function compute_metrics(tasks, histories, sprint_info) {
  const now = new Date();
  const task_map = {};
  tasks.forEach(t => { task_map[t.id] = t; });

  // Map riwayat per task
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
    
    // Sort log riwayat berdasarkan waktu ascending
    task_histories.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const first_in_progress = task_histories.find(h => h.new_status === 'IN_PROGRESS');
    const first_done = task_histories.find(h => h.new_status === 'DONE');

    // Waktu selesai
    let done_time = null;
    if (task.status === 'DONE') {
      done_time = first_done ? new Date(first_done.timestamp) : new Date(task.updated_at);
    }

    // Perhitungan Lead Time: Dari created_at sampai DONE
    if (done_time && task.created_at) {
      const created_time = new Date(task.created_at);
      const lead_h = Math.max(0, (done_time.getTime() - created_time.getTime()) / (1000 * 3600));
      total_lead_hours += lead_h;
      done_lead_count++;
    }

    // Perhitungan Cycle Time: Dari pertama kali IN_PROGRESS sampai DONE
    if (done_time && first_in_progress) {
      const start_progress_time = new Date(first_in_progress.timestamp);
      const cycle_h = Math.max(0, (done_time.getTime() - start_progress_time.getTime()) / (1000 * 3600));
      total_cycle_hours += cycle_h;
      done_cycle_count++;
    }

    // Deteksi Blocker: Task aktif (IN_PROGRESS atau REVIEW) yang macet > 48 jam
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

  // Urutkan blocker dari durasi macet tertinggi
  blockers.sort((a, b) => b.stuck_hours - a.stuck_hours);

  const avg_lead_time_hours = done_lead_count > 0 ? Number((total_lead_hours / done_lead_count).toFixed(1)) : 0;
  const avg_cycle_time_hours = done_cycle_count > 0 ? Number((total_cycle_hours / done_cycle_count).toFixed(1)) : 0;

  // Bangun Seri Data Burndown Chart
  const burndown = build_burndown_series(tasks, histories, sprint_info);

  return {
    sprint: sprint_info,
    summary: {
      total_tasks: tasks.length,
      avg_lead_time_hours: avg_lead_time_hours,
      avg_cycle_time_hours: avg_cycle_time_hours,
      blocker_count: blockers.length
    },
    burndown: burndown,
    blockers: blockers
  };
}

/**
 * Membangun timeline series harian untuk grafik Burndown Chart (Ideal vs Aktual)
 *
 * @param {Array<Object>} tasks - Seluruh task sprint.
 * @param {Array<Object>} histories - Audit log.
 * @param {Object} sprint_info - Info tanggal mulai & selesai sprint.
 * @return {Object} Struktur series { labels, ideal_hours, actual_hours }
 */
function build_burndown_series(tasks, histories, sprint_info) {
  const total_scope_hours = tasks.reduce((sum, t) => sum + (Number(t.estimate_hours) || 0), 0);

  const start_d = new Date(sprint_info.start_date);
  const end_d = new Date(sprint_info.end_date);
  const now = new Date();

  // Susun rentang tanggal sprint (misal: 10 hari)
  const labels = [];
  const days_count = Math.max(1, Math.round((end_d.getTime() - start_d.getTime()) / (1000 * 86400)) + 1);

  const ideal_hours = [];
  const actual_hours = [];

  // Peta waktu kapan masing-masing task selesai (DONE)
  const task_completion_time = {};
  histories.forEach(h => {
    if (h.new_status === 'DONE') {
      const t = new Date(h.timestamp).getTime();
      if (!task_completion_time[h.task_id] || t < task_completion_time[h.task_id]) {
        task_completion_time[h.task_id] = t;
      }
    }
  });

  // Task yang status saat ininya DONE tapi belum punya log riwayat (menggunakan updated_at)
  tasks.forEach(t => {
    if (t.status === 'DONE' && !task_completion_time[t.id]) {
      task_completion_time[t.id] = t.updated_at ? new Date(t.updated_at).getTime() : start_d.getTime();
    }
  });

  for (let i = 0; i < days_count; i++) {
    const current_day = new Date(start_d.getTime() + i * 86400000);
    const day_label = 'Hari ' + (i + 1);
    labels.push(day_label);

    // Garis Ideal: Penurunan linear bertahap dari total_scope_hours ke 0
    const ideal_val = Math.max(0, total_scope_hours - (total_scope_hours / (days_count - 1 || 1)) * i);
    ideal_hours.push(Number(ideal_val.toFixed(1)));

    // Garis Aktual: Total jam belum selesai pada akhir hari tersebut
    if (current_day.getTime() <= now.getTime() + 86400000) {
      let remaining = total_scope_hours;
      tasks.forEach(t => {
        const done_ts = task_completion_time[t.id];
        // Jika task telah diselesaikan sebelum atau pada akhir hari ini, kurangkan sisa jam
        if (done_ts && done_ts <= current_day.getTime() + 86400000 - 1) {
          remaining -= (Number(t.estimate_hours) || 0);
        }
      });
      actual_hours.push(Math.max(0, Number(remaining.toFixed(1))));
    } else {
      actual_hours.push(null); // Hari mendatang
    }
  }

  return {
    labels: labels,
    ideal_hours: ideal_hours,
    actual_hours: actual_hours
  };
}

/**
 * Format tanggal ke format string YYYY-MM-DD
 * @param {Date|string} date_val
 * @return {string}
 */
function format_date_str(date_val) {
  if (!date_val) return new Date().toISOString().split('T')[0];
  if (date_val instanceof Date) {
    return Utilities.formatDate(date_val, Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd');
  }
  return String(date_val).split('T')[0];
}
