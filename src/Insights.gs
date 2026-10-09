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
/**
 * Helper aman untuk konversi nilai tanggal (mendukung objek Date, string ISO, atau timestamp)
 * @param {Date|string|number} raw_val
 * @param {number} fallback_ms
 * @return {number}
 */
function parse_date_safe_ms(raw_val, fallback_ms) {
  if (!raw_val) return fallback_ms;
  if (raw_val instanceof Date) {
    const t = raw_val.getTime();
    return isNaN(t) ? fallback_ms : t;
  }
  const parsed = new Date(raw_val).getTime();
  return isNaN(parsed) ? fallback_ms : parsed;
}

/**
 * Format tanggal ke format string YYYY-MM-DD aman
 * @param {Date|string} date_val
 * @return {string}
 */
function format_date_str(date_val) {
  if (!date_val) return new Date().toISOString().split('T')[0];
  if (date_val instanceof Date) {
    try {
      return Utilities.formatDate(date_val, Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd');
    } catch (e) {
      return date_val.toISOString().split('T')[0];
    }
  }
  return String(date_val).split('T')[0];
}

/**
 * Konversi durasi dalam milidetik ke representasi string human-readable
 * Format serupa Jira: '1d 19h 48m', '19h 55m', '30m', '-'
 *
 * @param {number} ms - Durasi dalam milidetik
 * @return {string}
 */
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

/**
 * OPSI 2 CHANNEL 1: Mengambil metadata khusus (Daftar Project, Sprint, User)
 * Ringan, cepat, dan dijamin langsung mengisi seluruh combobox filter.
 *
 * @return {Object} Payload { success: boolean, data: { projects, sprints, users } }
 */
function get_cycle_time_metadata() {
  try {
    const spreadsheet = get_db_spreadsheet();
    const sheet_projects = spreadsheet.getSheetByName('Projects');
    const sheet_sprints = spreadsheet.getSheetByName('Sprints');
    const sheet_users = spreadsheet.getSheetByName('Users');

    const projects = [];
    if (sheet_projects && sheet_projects.getLastRow() > 1) {
      const p_vals = sheet_projects.getDataRange().getValues();
      const p_head = p_vals[0].map(h => String(h).trim().toLowerCase());
      const id_i = p_head.indexOf('id') !== -1 ? p_head.indexOf('id') : 0;
      const nm_i = p_head.indexOf('name') !== -1 ? p_head.indexOf('name') : 1;
      const pm_i = p_head.indexOf('pm_id') !== -1 ? p_head.indexOf('pm_id') : 2;

      for (let r = 1; r < p_vals.length; r++) {
        projects.push({
          id: String(p_vals[r][id_i]).trim(),
          name: String(p_vals[r][nm_i]).trim(),
          pm_id: pm_i !== -1 ? String(p_vals[r][pm_i]).trim() : ''
        });
      }
    }

    const sprints = [];
    if (sheet_sprints && sheet_sprints.getLastRow() > 1) {
      const sp_vals = sheet_sprints.getDataRange().getValues();
      const sp_head = sp_vals[0].map(h => String(h).trim().toLowerCase());
      const id_i = sp_head.indexOf('id') !== -1 ? sp_head.indexOf('id') : 0;
      const prj_i = sp_head.indexOf('project_id') !== -1 ? sp_head.indexOf('project_id') : 1;
      const nm_i = sp_head.indexOf('name') !== -1 ? sp_head.indexOf('name') : 2;
      const st_i = sp_head.indexOf('status') !== -1 ? sp_head.indexOf('status') : 5;

      for (let r = 1; r < sp_vals.length; r++) {
        sprints.push({
          id: String(sp_vals[r][id_i]).trim(),
          project_id: prj_i !== -1 ? String(sp_vals[r][prj_i]).trim() : '',
          name: nm_i !== -1 ? String(sp_vals[r][nm_i]).trim() : String(sp_vals[r][id_i]).trim(),
          status: st_i !== -1 && sp_vals[r][st_i] ? String(sp_vals[r][st_i]).toUpperCase().trim() : 'ACTIVE'
        });
      }
    }

    const users = [];
    if (sheet_users && sheet_users.getLastRow() > 1) {
      const u_vals = sheet_users.getDataRange().getValues();
      const u_head = u_vals[0].map(h => String(h).trim().toLowerCase());
      const id_i = u_head.indexOf('id') !== -1 ? u_head.indexOf('id') : 0;
      const nm_i = u_head.indexOf('name') !== -1 ? u_head.indexOf('name') : 1;
      const rl_i = u_head.indexOf('role') !== -1 ? u_head.indexOf('role') : 3;

      for (let r = 1; r < u_vals.length; r++) {
        users.push({
          id: String(u_vals[r][id_i]).trim(),
          name: String(u_vals[r][nm_i]).trim(),
          role: rl_i !== -1 ? String(u_vals[r][rl_i]).trim() : 'MEMBER'
        });
      }
    }

    return {
      success: true,
      data: {
        projects: projects,
        sprints: sprints,
        users: users
      }
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal memuat metadata Cycle Time: ' + err.message
    };
  }
}

/**
 * OPSI 2 CHANNEL 2: Mengambil data baris laporan Time-in-Status & Cycle Time per Task
 * Dilengkapi dynamic header mapping dan safe date computation.
 *
 * @param {Object} [filters] - Parameter filter dari antarmuka pengguna
 * @return {Object} Payload { success: boolean, data: Array, metadata: Object }
 */
function get_cycle_time_report_data(filters) {
  try {
    const spreadsheet = get_db_spreadsheet();
    const sheet_projects = spreadsheet.getSheetByName('Projects');
    const sheet_sprints = spreadsheet.getSheetByName('Sprints');
    const sheet_tasks = spreadsheet.getSheetByName('Tasks');
    const sheet_history = spreadsheet.getSheetByName('Task_History');
    const sheet_users = spreadsheet.getSheetByName('Users');

    if (!sheet_tasks || sheet_tasks.getLastRow() <= 1) {
      return { success: true, data: [], metadata: { total_tasks: 0, projects: [], sprints: [], users: [] } };
    }

    const f = filters || {};
    const filter_project_id = f.project_id ? String(f.project_id).trim() : '';
    const filter_sprint_id = f.sprint_id ? String(f.sprint_id).trim() : '';
    const filter_status = f.status ? String(f.status).toUpperCase().trim() : '';
    const filter_assignee_id = f.assignee_id ? String(f.assignee_id).trim() : '';
    const filter_keyword = f.search ? String(f.search).toLowerCase().trim() : '';

    // 1. Dynamic Lookup Projects
    const projects_map = {};
    if (sheet_projects && sheet_projects.getLastRow() > 1) {
      const p_vals = sheet_projects.getDataRange().getValues();
      const p_head = p_vals[0].map(h => String(h).trim().toLowerCase());
      const id_i = p_head.indexOf('id') !== -1 ? p_head.indexOf('id') : 0;
      const nm_i = p_head.indexOf('name') !== -1 ? p_head.indexOf('name') : 1;

      for (let i = 1; i < p_vals.length; i++) {
        const pid = String(p_vals[i][id_i]).trim();
        projects_map[pid] = {
          id: pid,
          name: String(p_vals[i][nm_i]).trim()
        };
      }
    }

    // 2. Dynamic Lookup Sprints
    const sprints_map = {};
    if (sheet_sprints && sheet_sprints.getLastRow() > 1) {
      const sp_vals = sheet_sprints.getDataRange().getValues();
      const sp_head = sp_vals[0].map(h => String(h).trim().toLowerCase());
      const id_i = sp_head.indexOf('id') !== -1 ? sp_head.indexOf('id') : 0;
      const prj_i = sp_head.indexOf('project_id') !== -1 ? sp_head.indexOf('project_id') : 1;
      const nm_i = sp_head.indexOf('name') !== -1 ? sp_head.indexOf('name') : 2;
      const st_i = sp_head.indexOf('status') !== -1 ? sp_head.indexOf('status') : 5;

      for (let i = 1; i < sp_vals.length; i++) {
        const sid = String(sp_vals[i][id_i]).trim();
        sprints_map[sid] = {
          id: sid,
          project_id: prj_i !== -1 ? String(sp_vals[i][prj_i]).trim() : '',
          name: nm_i !== -1 ? String(sp_vals[i][nm_i]).trim() : sid,
          status: st_i !== -1 && sp_vals[i][st_i] ? String(sp_vals[i][st_i]).toUpperCase().trim() : 'ACTIVE'
        };
      }
    }

    // 3. Dynamic Lookup Users
    const users_map = {};
    if (sheet_users && sheet_users.getLastRow() > 1) {
      const u_vals = sheet_users.getDataRange().getValues();
      const u_head = u_vals[0].map(h => String(h).trim().toLowerCase());
      const id_i = u_head.indexOf('id') !== -1 ? u_head.indexOf('id') : 0;
      const nm_i = u_head.indexOf('name') !== -1 ? u_head.indexOf('name') : 1;
      const rl_i = u_head.indexOf('role') !== -1 ? u_head.indexOf('role') : 3;

      for (let i = 1; i < u_vals.length; i++) {
        const uid = String(u_vals[i][id_i]).trim();
        users_map[uid] = {
          id: uid,
          name: String(u_vals[i][nm_i]).trim(),
          role: rl_i !== -1 ? String(u_vals[i][rl_i]).trim() : 'MEMBER'
        };
      }
    }

    // 4. Dynamic Lookup History & Group by Task
    const history_by_task = {};
    if (sheet_history && sheet_history.getLastRow() > 1) {
      const h_vals = sheet_history.getDataRange().getValues();
      const h_head = h_vals[0].map(h => String(h).trim().toLowerCase());
      const t_id_i = h_head.indexOf('task_id');
      const o_st_i = h_head.indexOf('old_status');
      const n_st_i = h_head.indexOf('new_status');
      const by_i = h_head.indexOf('changed_by');
      const ts_i = h_head.indexOf('timestamp');

      for (let r = 1; r < h_vals.length; r++) {
        const tid = String(h_vals[r][t_id_i]).trim();
        if (!history_by_task[tid]) history_by_task[tid] = [];
        history_by_task[tid].push({
          old_status: String(h_vals[r][o_st_i]).toUpperCase().trim(),
          new_status: String(h_vals[r][n_st_i]).toUpperCase().trim(),
          changed_by: by_i !== -1 ? h_vals[r][by_i] : '',
          timestamp: ts_i !== -1 ? h_vals[r][ts_i] : null
        });
      }
    }

    // 5. Baca Tasks & Proses Data
    const task_vals = sheet_tasks.getDataRange().getValues();
    const t_head = task_vals[0].map(h => String(h).trim().toLowerCase());
    const id_idx = t_head.indexOf('id') !== -1 ? t_head.indexOf('id') : 0;
    const sp_idx = t_head.indexOf('sprint_id') !== -1 ? t_head.indexOf('sprint_id') : 1;
    const title_idx = t_head.indexOf('title') !== -1 ? t_head.indexOf('title') : 2;
    const status_idx = t_head.indexOf('status') !== -1 ? t_head.indexOf('status') : 3;
    const assignee_idx = t_head.indexOf('assignee_id') !== -1 ? t_head.indexOf('assignee_id') : 4;
    const created_idx = t_head.indexOf('created_at') !== -1 ? t_head.indexOf('created_at') : 6;
    const updated_idx = t_head.indexOf('updated_at') !== -1 ? t_head.indexOf('updated_at') : 7;

    const now_ts = new Date().getTime();
    const report_rows = [];

    for (let r = 1; r < task_vals.length; r++) {
      const row = task_vals[r];
      const task_id = String(row[id_idx]).trim();
      const sprint_id = String(row[sp_idx] || '').trim();
      const title = String(row[title_idx] || '').trim();
      const current_status = String(row[status_idx] || 'TODO').toUpperCase().trim();
      const assignee_id = String(row[assignee_idx] || '').trim();
      const created_at_raw = row[created_idx];
      const updated_at_raw = row[updated_idx];

      // Resolve Project ID: jika sprint_id berformat BACKLOG-PRJ-001, extract PRJ-001
      let project_id = '';
      let sprint_name = sprint_id;

      if (sprints_map[sprint_id]) {
        project_id = sprints_map[sprint_id].project_id;
        sprint_name = sprints_map[sprint_id].name;
      } else if (sprint_id.startsWith('BACKLOG-')) {
        project_id = sprint_id.replace('BACKLOG-', '');
        sprint_name = 'Product Backlog';
      }

      const project_info = projects_map[project_id] || { id: project_id, name: project_id || '-' };

      // Evaluasi Filter
      if (filter_project_id && project_id !== filter_project_id) continue;
      if (filter_sprint_id && sprint_id !== filter_sprint_id) continue;
      if (filter_status && current_status !== filter_status) continue;
      if (filter_assignee_id && assignee_id !== filter_assignee_id) continue;
      if (filter_keyword && !task_id.toLowerCase().includes(filter_keyword) && !title.toLowerCase().includes(filter_keyword)) continue;

      // Safe Date Calculation
      const created_ts = parse_date_safe_ms(created_at_raw, now_ts);
      const t_histories = history_by_task[task_id] || [];
      t_histories.sort((a, b) => parse_date_safe_ms(a.timestamp, 0) - parse_date_safe_ms(b.timestamp, 0));

      let duration_todo_ms = 0;
      let duration_in_progress_ms = 0;
      let duration_review_ms = 0;
      let duration_done_ms = 0;

      let last_status = 'TODO';
      let last_ts = created_ts;

      for (let h = 0; h < t_histories.length; h++) {
        const trans = t_histories[h];
        const trans_ts = parse_date_safe_ms(trans.timestamp, last_ts);
        const delta = Math.max(0, trans_ts - last_ts);

        if (last_status === 'TODO') duration_todo_ms += delta;
        else if (last_status === 'IN_PROGRESS') duration_in_progress_ms += delta;
        else if (last_status === 'REVIEW') duration_review_ms += delta;
        else if (last_status === 'DONE') duration_done_ms += delta;

        last_status = trans.new_status;
        last_ts = trans_ts;
      }

      // Hitung segmen durasi aktif kolom saat ini
      const active_delta = Math.max(0, now_ts - last_ts);
      if (current_status === 'TODO') duration_todo_ms += active_delta;
      else if (current_status === 'IN_PROGRESS') duration_in_progress_ms += active_delta;
      else if (current_status === 'REVIEW') duration_review_ms += active_delta;
      else if (current_status === 'DONE') duration_done_ms += active_delta;

      // Cycle Time: Total pengerjaan aktif (IN_PROGRESS + REVIEW)
      const cycle_time_ms = duration_in_progress_ms + duration_review_ms;

      // Lead Time: Total waktu sejak dibuat hingga DONE atau hingga sekarang
      let lead_time_ms = 0;
      const first_done = t_histories.find(h => h.new_status === 'DONE');
      if (current_status === 'DONE') {
        const done_ts = first_done ? parse_date_safe_ms(first_done.timestamp, now_ts) : parse_date_safe_ms(updated_at_raw, now_ts);
        lead_time_ms = Math.max(0, done_ts - created_ts);
      } else {
        lead_time_ms = Math.max(0, now_ts - created_ts);
      }

      report_rows.push({
        id: task_id,
        key: task_id,
        summary: title,
        status: current_status,
        project_id: project_id,
        project_name: project_info.name || '-',
        sprint_id: sprint_id,
        sprint_name: sprint_name,
        assignee_id: assignee_id,
        assignee_name: users_map[assignee_id] ? users_map[assignee_id].name : (assignee_id || 'Unassigned'),
        created_at: format_date_str(created_at_raw),
        durations: {
          todo_ms: duration_todo_ms,
          todo_str: format_duration_human(duration_todo_ms),
          in_progress_ms: duration_in_progress_ms,
          in_progress_str: format_duration_human(duration_in_progress_ms),
          review_ms: duration_review_ms,
          review_str: format_duration_human(duration_review_ms),
          done_ms: duration_done_ms,
          done_str: format_duration_human(duration_done_ms),
          cycle_time_ms: cycle_time_ms,
          cycle_time_str: format_duration_human(cycle_time_ms),
          lead_time_ms: lead_time_ms,
          lead_time_str: format_duration_human(lead_time_ms)
        }
      });
    }

    return {
      success: true,
      data: report_rows,
      metadata: {
        total_tasks: report_rows.length,
        projects: Object.values(projects_map),
        sprints: Object.values(sprints_map),
        users: Object.values(users_map)
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Gagal mengambil data laporan Cycle Time: ' + error.message
    };
  }
}


