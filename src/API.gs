/**
 * @fileoverview API Controller untuk operasi data Project, Task dan alur Time-in-Status Engine.
 * Alternate Project Delivery (LITE).
 */

const VALID_TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

/**
 * Mengambil daftar user untuk pilihan dropdown assignee & PIC
 */
function get_assignee_options() {
  try {
    const spreadsheet = get_db_spreadsheet();
    const sheet_users = spreadsheet.getSheetByName('Users');
    if (!sheet_users || sheet_users.getLastRow() <= 1) return { success: true, data: [] };

    const values = sheet_users.getDataRange().getValues();
    const users = [];
    for (let r = 1; r < values.length; r++) {
      users.push({ id: values[r][0], name: values[r][1], role: values[r][3] });
    }
    return { success: true, data: users };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Mengambil daftar proyek dari sheet Projects untuk ditampilkan di Dashboard
 * Lengkap dengan sprint aktif dan jumlah task per project masing-masing.
 */
function get_projects_list() {
  try {
    const spreadsheet = get_db_spreadsheet();
    const sheet_projects = spreadsheet.getSheetByName('Projects');
    const sheet_sprints = spreadsheet.getSheetByName('Sprints');
    const sheet_tasks = spreadsheet.getSheetByName('Tasks');
    const sheet_users = spreadsheet.getSheetByName('Users');

    if (!sheet_projects || sheet_projects.getLastRow() <= 1) {
      return { success: true, data: [] };
    }

    // Lookup user name
    const user_name_map = {};
    if (sheet_users && sheet_users.getLastRow() > 1) {
      const u_values = sheet_users.getDataRange().getValues();
      for (let i = 1; i < u_values.length; i++) {
        user_name_map[u_values[i][0]] = u_values[i][1];
      }
    }

    // Lookup sprint aktif per project (prioritaskan status ACTIVE)
    const project_sprint_map = {};
    if (sheet_sprints && sheet_sprints.getLastRow() > 1) {
      const sp_values = sheet_sprints.getDataRange().getValues();
      const sp_header = sp_values[0].map(h => String(h).trim().toLowerCase());
      const sp_status_idx = sp_header.indexOf('status');

      for (let r = 1; r < sp_values.length; r++) {
        const sp_id = sp_values[r][0];
        const prj_id = String(sp_values[r][1]).trim();
        const sp_name = sp_values[r][2];
        const sp_status = sp_status_idx !== -1 && sp_values[r][sp_status_idx]
          ? String(sp_values[r][sp_status_idx]).trim().toUpperCase()
          : (sp_values[r][5] ? String(sp_values[r][5]).trim().toUpperCase() : 'ACTIVE');

        if (!project_sprint_map[prj_id]) {
          project_sprint_map[prj_id] = { id: sp_id, name: sp_name, status: sp_status };
        } else if (sp_status === 'ACTIVE') {
          // Prioritaskan sprint yang sedang aktif berjalan
          project_sprint_map[prj_id] = { id: sp_id, name: sp_name, status: sp_status };
        }
      }
    }

    // Peta hitungan task yang terisolasi per sprint
    const sprint_task_stats = {};
    if (sheet_tasks && sheet_tasks.getLastRow() > 1) {
      const t_values = sheet_tasks.getDataRange().getValues();
      const sp_idx = t_values[0].map(h => String(h).trim().toLowerCase()).indexOf('sprint_id');
      const status_idx = t_values[0].map(h => String(h).trim().toLowerCase()).indexOf('status');

      for (let r = 1; r < t_values.length; r++) {
        const s_id = String(t_values[r][sp_idx]).trim();
        const status = String(t_values[r][status_idx]).toUpperCase().trim();

        if (!sprint_task_stats[s_id]) {
          sprint_task_stats[s_id] = { total: 0, done: 0 };
        }
        sprint_task_stats[s_id].total++;
        if (status === 'DONE') {
          sprint_task_stats[s_id].done++;
        }
      }
    }

    const prj_values = sheet_projects.getDataRange().getValues();
    const projects = [];
    for (let r = 1; r < prj_values.length; r++) {
      const project_id = prj_values[r][0];
      const pm_id = prj_values[r][2];
      const active_sp = project_sprint_map[project_id] || { id: 'SPR-001', name: 'Sprint 1' };
      const stats = sprint_task_stats[active_sp.id] || { total: 0, done: 0 };

      projects.push({
        id: project_id,
        name: prj_values[r][1],
        pm_id: pm_id,
        pm_name: user_name_map[pm_id] || pm_id || 'Project Manager',
        active_sprint_id: active_sp.id,
        active_sprint_name: active_sp.name,
        active_sprint_status: active_sp.status || 'ACTIVE',
        total_tasks: stats.total,
        done_tasks: stats.done
      });
    }

    return { success: true, data: projects };
  } catch (error) {
    return { success: false, message: 'Gagal memuat daftar project: ' + error.message };
  }
}

/**
 * Membuat Project Baru dan Sprint pertamanya di Google Sheets
 *
 * @param {Object} project_input - { name, mode, sprint_name, sprint_duration_weeks, sprint_goal }
 * @return {Object} Status respon dan data project baru.
 */
function create_new_project(project_input) {
  try {
    const user_profile = get_user_role();
    const current_user_id = user_profile.data ? user_profile.data.id : 'USR-001';
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (!permissions.can_create_project) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk membuat project baru.' };
    }

    if (!project_input || !project_input.name || project_input.name.trim() === '') {
      return { success: false, message: 'Nama project wajib diisi.' };
    }

    const spreadsheet = get_db_spreadsheet();
    const sheet_projects = spreadsheet.getSheetByName('Projects');
    const sheet_sprints = spreadsheet.getSheetByName('Sprints');

    const project_id = 'PRJ-' + ('000' + sheet_projects.getLastRow()).slice(-3);
    const project_name = project_input.name.trim();

    // 1. Tambah baris ke sheet Projects: id, name, pm_id
    sheet_projects.appendRow([project_id, project_name, current_user_id]);

    // 2. Tambah sprint default ke sheet Sprints khusus untuk project ini
    let sprint_id = 'SPR-' + ('000' + (sheet_sprints ? sheet_sprints.getLastRow() : 1)).slice(-3);
    const sprint_name = project_input.sprint_name ? project_input.sprint_name.trim() : 'Sprint 1 - Foundations';
    const is_scrum = String(project_input.mode || '').toUpperCase() === 'SCRUM';
    const initial_sp_status = is_scrum ? 'PLANNING' : 'ACTIVE';
    if (sheet_sprints) {
      const duration_days = (Number(project_input.sprint_duration_weeks) || 2) * 7;
      const today = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + duration_days * 86400000).toISOString().split('T')[0];
      sheet_sprints.appendRow([sprint_id, project_id, sprint_name, today, endDate, initial_sp_status]);
    }

    return {
      success: true,
      message: 'Project baru berhasil dibuat.',
      data: {
        id: project_id,
        name: project_name,
        sprint_id: sprint_id,
        sprint_name: sprint_name,
        sprint_status: initial_sp_status,
        mode: project_input.mode || 'KANBAN'
      }
    };
  } catch (error) {
    return { success: false, message: 'Gagal membuat project: ' + error.message };
  }
}

/**
 * Mengambil task KHUSUS untuk sprint tertentu.
 * ISOLASI KETAT: Jika sprint belum memiliki task, MENGEMBALIKAN ARRAY KOSONG []
 * TIDAK ADA FALLBACK AGGRESIF KE SELURUH SHEET TASKS!
 *
 * @param {string} sprint_id - ID unik sprint aktif.
 * @return {Object} Payload { success: boolean, data: Array<Object> }
 */
function get_sprint_tasks(sprint_id) {
  try {
    const spreadsheet = get_db_spreadsheet();
    const sheet_tasks = spreadsheet.getSheetByName('Tasks');
    const sheet_users = spreadsheet.getSheetByName('Users');

    if (!sheet_tasks || sheet_tasks.getLastRow() <= 1) {
      return { success: true, data: [] };
    }

    if (!sprint_id || sprint_id.trim() === '') {
      return { success: true, data: [] };
    }

    // Lookup nama assignee
    const user_name_map = {};
    if (sheet_users && sheet_users.getLastRow() > 1) {
      const u_values = sheet_users.getDataRange().getValues();
      for (let i = 1; i < u_values.length; i++) {
        user_name_map[u_values[i][0]] = u_values[i][1];
      }
    }

    const task_values = sheet_tasks.getDataRange().getValues();
    const header = task_values[0].map(h => String(h).trim().toLowerCase());
    const id_idx = header.indexOf('id');
    const sp_idx = header.indexOf('sprint_id');
    const title_idx = header.indexOf('title');
    const status_idx = header.indexOf('status');
    const ass_idx = header.indexOf('assignee_id');
    const est_idx = header.indexOf('estimate_hours');
    const crt_idx = header.indexOf('created_at');
    const upd_idx = header.indexOf('updated_at');

    const tasks = [];
    const target_sprint = String(sprint_id).trim();

    for (let r = 1; r < task_values.length; r++) {
      const row = task_values[r];
      const row_sprint = String(row[sp_idx]).trim();

      // Hanya masukkan task yang sprint_id nya COCOK PERSIS!
      if (row_sprint === target_sprint) {
        const assignee_id = row[ass_idx];
        tasks.push({
          id: row[id_idx],
          sprint_id: row_sprint,
          title: row[title_idx],
          status: String(row[status_idx]).toUpperCase().trim(),
          assignee_id: assignee_id,
          assignee_name: user_name_map[assignee_id] || assignee_id || 'Belum Ditugaskan',
          estimate_hours: Number(row[est_idx]) || 0,
          created_at: row[crt_idx],
          updated_at: row[upd_idx]
        });
      }
    }

    // PENTING: Jika tasks.length === 0, tetap kembalikan [] (Board bersih)!
    return { success: true, data: tasks };
  } catch (error) {
    return { success: false, message: 'Gagal memuat daftar task: ' + error.message };
  }
}

/**
 * Membuat task baru di sheet Tasks dan mencatat audit trail di Task_History
 */
function create_new_task(task_input) {
  try {
    const user_profile = get_user_role();
    const current_user_email = user_profile.data ? user_profile.data.email : 'unknown';
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (!permissions.can_create_task) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk membuat task baru.' };
    }

    if (!task_input || !task_input.title) return { success: false, message: 'Judul task wajib diisi.' };

    const spreadsheet = get_db_spreadsheet();
    const sheet_tasks = spreadsheet.getSheetByName('Tasks');
    const sheet_history = spreadsheet.getSheetByName('Task_History');

    const current_timestamp = new Date().toISOString();
    const task_id = 'TSK-' + ('000' + sheet_tasks.getLastRow()).slice(-3);
    const sprint_id = task_input.sprint_id || 'SPR-001';
    const title = task_input.title.trim();
    const assignee_id = task_input.assignee_id || '';
    const estimate_hours = Number(task_input.estimate_hours) || 8;

    sheet_tasks.appendRow([
      task_id, sprint_id, title, 'TODO', assignee_id, estimate_hours, current_timestamp, current_timestamp
    ]);

    const history_id = 'HIS-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    sheet_history.appendRow([
      history_id, task_id, 'NONE', 'TODO', current_user_email, current_timestamp
    ]);

    return { success: true, message: 'Task berhasil dibuat.' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Memperbarui status task dan mencatat riwayat ke sheet Task_History.
 */
function update_task_status(task_id, new_status) {
  try {
    const formatted_status = String(new_status).toUpperCase().trim();
    if (!VALID_TASK_STATUSES.includes(formatted_status)) {
      return { success: false, message: 'Status tidak valid.' };
    }

    const user_profile = get_user_role();
    const current_user_email = user_profile.data ? user_profile.data.email : 'unknown';
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (!permissions.can_move_task) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk menggeser status task.' };
    }

    const spreadsheet = get_db_spreadsheet();
    const sheet_tasks = spreadsheet.getSheetByName('Tasks');
    const sheet_history = spreadsheet.getSheetByName('Task_History');

    const task_values = sheet_tasks.getDataRange().getValues();
    const header = task_values[0].map(h => String(h).trim().toLowerCase());
    const id_idx = header.indexOf('id');
    const status_idx = header.indexOf('status');
    const updated_idx = header.indexOf('updated_at');

    let target_row_index = -1;
    let old_status = '';

    for (let r = 1; r < task_values.length; r++) {
      if (String(task_values[r][id_idx]).trim() === String(task_id).trim()) {
        target_row_index = r + 1;
        old_status = String(task_values[r][status_idx]).toUpperCase().trim();
        break;
      }
    }

    if (target_row_index === -1) {
      return { success: false, message: 'Task tidak ditemukan.' };
    }

    if (old_status === formatted_status) {
      return { success: true, message: 'Status sama.' };
    }

    const current_timestamp = new Date().toISOString();

    sheet_tasks.getRange(target_row_index, status_idx + 1).setValue(formatted_status);
    sheet_tasks.getRange(target_row_index, updated_idx + 1).setValue(current_timestamp);

    const history_id = 'HIS-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    sheet_history.appendRow([
      history_id,
      task_id,
      old_status,
      formatted_status,
      current_user_email,
      current_timestamp
    ]);

    return {
      success: true,
      message: 'Status task berhasil diperbarui.',
      data: { task_id, old_status, new_status: formatted_status }
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Helper format tanggal aman untuk serialisasi GAS ke client
 */
function format_gas_date(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = ('0' + (val.getMonth() + 1)).slice(-2);
    const d = ('0' + val.getDate()).slice(-2);
    return y + '-' + m + '-' + d;
  }
  return String(val).trim();
}

/**
 * Mengambil seluruh task Backlog dan daftar Sprint Buckets untuk suatu Project
 *
 * @param {string} project_id - ID unik proyek atau nama proyek
 * @return {Object} Payload { success: boolean, data: { backlog_tasks: [], sprints: [] } }
 */
function get_project_backlog_and_sprints(project_id) {
  try {
    const spreadsheet = get_db_spreadsheet();
    const sheet_projects = spreadsheet.getSheetByName('Projects');
    const sheet_sprints = spreadsheet.getSheetByName('Sprints');
    const sheet_tasks = spreadsheet.getSheetByName('Tasks');
    const sheet_users = spreadsheet.getSheetByName('Users');

    let prj_id = String(project_id || '').trim();
    if (!prj_id) return { success: false, message: 'Project ID tidak valid.' };

    // Resolusi otomatis jika input berupa nama project atau ID
    if (sheet_projects && sheet_projects.getLastRow() > 1) {
      const p_values = sheet_projects.getDataRange().getValues();
      for (let r = 1; r < p_values.length; r++) {
        if (String(p_values[r][0]).trim().toLowerCase() === prj_id.toLowerCase() ||
            String(p_values[r][1]).trim().toLowerCase() === prj_id.toLowerCase()) {
          prj_id = String(p_values[r][0]).trim();
          break;
        }
      }
    }

    // Lookup User Name
    const user_name_map = {};
    if (sheet_users && sheet_users.getLastRow() > 1) {
      const u_values = sheet_users.getDataRange().getValues();
      for (let i = 1; i < u_values.length; i++) {
        user_name_map[u_values[i][0]] = u_values[i][1];
      }
    }

    // 1. Ambil daftar Sprints milik project ini
    const sprints = [];
    const sprint_ids = [];
    if (sheet_sprints && sheet_sprints.getLastRow() > 1) {
      const sp_values = sheet_sprints.getDataRange().getValues();
      const sp_header = sp_values[0].map(h => String(h).trim().toLowerCase());
      const sp_status_idx = sp_header.indexOf('status');

      for (let r = 1; r < sp_values.length; r++) {
        if (String(sp_values[r][1]).trim().toLowerCase() === prj_id.toLowerCase()) {
          const sp_id = String(sp_values[r][0]).trim();
          const sp_status = sp_status_idx !== -1 && sp_values[r][sp_status_idx]
            ? String(sp_values[r][sp_status_idx]).trim().toUpperCase()
            : (sp_values[r][5] ? String(sp_values[r][5]).trim().toUpperCase() : 'ACTIVE');

          sprint_ids.push(sp_id);
          sprints.push({
            id: sp_id,
            project_id: prj_id,
            name: String(sp_values[r][2] || ''),
            start_date: format_gas_date(sp_values[r][3]),
            end_date: format_gas_date(sp_values[r][4]),
            status: sp_status,
            tasks: [],
            total_hours: 0
          });
        }
      }
    }

    // 2. Ambil seluruh tasks yang terafiliasi dengan project ini
    const backlog_tasks = [];
    const backlog_identifier = 'BACKLOG-' + prj_id;

    if (sheet_tasks && sheet_tasks.getLastRow() > 1) {
      const t_values = sheet_tasks.getDataRange().getValues();
      const header = t_values[0].map(h => String(h).trim().toLowerCase());
      const id_idx = header.indexOf('id');
      const sp_idx = header.indexOf('sprint_id');
      const title_idx = header.indexOf('title');
      const status_idx = header.indexOf('status');
      const ass_idx = header.indexOf('assignee_id');
      const est_idx = header.indexOf('estimate_hours');
      const crt_idx = header.indexOf('created_at');
      const upd_idx = header.indexOf('updated_at');

      for (let r = 1; r < t_values.length; r++) {
        const row = t_values[r];
        const row_sprint = String(row[sp_idx]).trim();
        const assignee_id = row[ass_idx];
        const task_obj = {
          id: row[id_idx],
          sprint_id: row_sprint,
          title: row[title_idx],
          status: String(row[status_idx]).toUpperCase().trim(),
          assignee_id: assignee_id,
          assignee_name: user_name_map[assignee_id] || assignee_id || 'Belum Ditugaskan',
          estimate_hours: Number(row[est_idx]) || 0,
          created_at: format_gas_date(row[crt_idx]),
          updated_at: format_gas_date(row[upd_idx])
        };

        // Cek apakah masuk bucket Backlog
        if (row_sprint === backlog_identifier || row_sprint === 'BACKLOG') {
          backlog_tasks.push(task_obj);
        } else {
          // Cek apakah masuk salah satu Sprint milik project ini
          const target_sp = sprints.find(s => s.id === row_sprint);
          if (target_sp) {
            target_sp.tasks.push(task_obj);
            target_sp.total_hours += task_obj.estimate_hours;
          }
        }
      }
    }

    return {
      success: true,
      data: {
        project_id: prj_id,
        backlog_id: backlog_identifier,
        backlog_tasks: backlog_tasks,
        sprints: sprints
      }
    };
  } catch (e) {
    return { success: false, message: 'Gagal memuat Scrum Backlog: ' + e.message };
  }
}

/**
 * Membuat Bucket Sprint Baru (Sprint 2, 3, dst.) untuk Project
 *
 * @param {string} project_id - ID proyek
 * @param {string} [sprint_name] - Nama sprint baru opsional
 * @return {Object} Status respon dan data sprint baru
 */
function create_new_sprint_bucket(project_id, sprint_name) {
  try {
    const user_profile = get_user_role();
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (!permissions.can_manage_sprint) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk membuat sprint baru.' };
    }

    let prj_id = String(project_id || '').trim();
    if (!prj_id) return { success: false, message: 'Project ID tidak valid.' };

    const spreadsheet = get_db_spreadsheet();
    const sheet_projects = spreadsheet.getSheetByName('Projects');
    const sheet_sprints = spreadsheet.getSheetByName('Sprints');
    if (!sheet_sprints) return { success: false, message: 'Sheet Sprints tidak ditemukan.' };

    // Resolusi otomatis jika input berupa nama project
    if (sheet_projects && sheet_projects.getLastRow() > 1) {
      const p_values = sheet_projects.getDataRange().getValues();
      for (let r = 1; r < p_values.length; r++) {
        if (String(p_values[r][0]).trim().toLowerCase() === prj_id.toLowerCase() ||
            String(p_values[r][1]).trim().toLowerCase() === prj_id.toLowerCase()) {
          prj_id = String(p_values[r][0]).trim();
          break;
        }
      }
    }

    const next_sp_num = sheet_sprints.getLastRow();
    const sprint_id = 'SPR-' + ('000' + next_sp_num).slice(-3);
    const final_name = sprint_name && sprint_name.trim() !== '' 
      ? sprint_name.trim() 
      : 'Sprint ' + next_sp_num + ' (Planning)';

    // Tanggal default planning
    const today = new Date().toISOString().split('T')[0];
    const default_end = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    sheet_sprints.appendRow([sprint_id, prj_id, final_name, today, default_end, 'PLANNING']);

    return {
      success: true,
      message: 'Bucket sprint baru berhasil dibuat.',
      data: {
        id: sprint_id,
        project_id: prj_id,
        name: final_name,
        start_date: today,
        end_date: default_end,
        status: 'PLANNING'
      }
    };
  } catch (e) {
    return { success: false, message: 'Gagal membuat bucket sprint: ' + e.message };
  }
}

/**
 * Memindahkan task antar bucket (Backlog ke Sprint, atau sebaliknya)
 *
 * @param {string} task_id - ID task yang dipindahkan
 * @param {string} target_sprint_id - ID sprint tujuan (atau 'BACKLOG-PRJ-xxx')
 * @return {Object} Status respon
 */
function move_task_to_sprint(task_id, target_sprint_id) {
  try {
    const user_profile = get_user_role();
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (!permissions.can_move_task) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk memindahkan task.' };
    }

    const spreadsheet = get_db_spreadsheet();
    const sheet_tasks = spreadsheet.getSheetByName('Tasks');
    if (!sheet_tasks || sheet_tasks.getLastRow() <= 1) {
      return { success: false, message: 'Sheet Tasks kosong.' };
    }

    const task_values = sheet_tasks.getDataRange().getValues();
    const header = task_values[0].map(h => String(h).trim().toLowerCase());
    const id_idx = header.indexOf('id');
    const sp_idx = header.indexOf('sprint_id');
    const updated_idx = header.indexOf('updated_at');

    let target_row_index = -1;
    for (let r = 1; r < task_values.length; r++) {
      if (String(task_values[r][id_idx]).trim() === String(task_id).trim()) {
        target_row_index = r + 1;
        break;
      }
    }

    if (target_row_index === -1) {
      return { success: false, message: 'Task tidak ditemukan.' };
    }

    const now_ts = new Date().toISOString();
    sheet_tasks.getRange(target_row_index, sp_idx + 1).setValue(target_sprint_id);
    sheet_tasks.getRange(target_row_index, updated_idx + 1).setValue(now_ts);

    return {
      success: true,
      message: 'Task berhasil dialokasikan ke bucket.',
      data: { task_id, target_sprint_id }
    };
  } catch (e) {
    return { success: false, message: 'Gagal memindahkan task: ' + e.message };
  }
}

/**
 * Menjalankan Sprint (Start Sprint) dengan target tanggal dan Goal
 *
 * @param {Object} input - { sprint_id, sprint_name, duration_weeks, sprint_goal }
 * @return {Object} Status respon
 */
function start_sprint(input) {
  try {
    const user_profile = get_user_role();
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (!permissions.can_manage_sprint) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk memulai sprint.' };
    }

    if (!input || !input.sprint_id) return { success: false, message: 'Sprint ID tidak valid.' };

    const spreadsheet = get_db_spreadsheet();
    const sheet_sprints = spreadsheet.getSheetByName('Sprints');
    if (!sheet_sprints || sheet_sprints.getLastRow() <= 1) {
      return { success: false, message: 'Sheet Sprints kosong.' };
    }

    const sp_values = sheet_sprints.getDataRange().getValues();
    const id_idx = 0;
    const name_idx = 2;
    const start_idx = 3;
    const end_idx = 4;

    let target_row_index = -1;
    for (let r = 1; r < sp_values.length; r++) {
      if (String(sp_values[r][id_idx]).trim() === String(input.sprint_id).trim()) {
        target_row_index = r + 1;
        break;
      }
    }

    if (target_row_index === -1) {
      return { success: false, message: 'Sprint tidak ditemukan.' };
    }

    const duration_days = (Number(input.duration_weeks) || 2) * 7;
    const today = new Date().toISOString().split('T')[0];
    const end_date = new Date(Date.now() + duration_days * 86400000).toISOString().split('T')[0];
    const sprint_name = input.sprint_name && input.sprint_name.trim() !== '' ? input.sprint_name.trim() : sp_values[target_row_index - 1][name_idx];

    const sp_header = sp_values[0].map(h => String(h).trim().toLowerCase());
    let sp_status_idx = sp_header.indexOf('status');
    if (sp_status_idx === -1) {
      sp_status_idx = 5;
      sheet_sprints.getRange(1, 6).setValue('status');
    }

    // Update baris sprint
    sheet_sprints.getRange(target_row_index, name_idx + 1).setValue(sprint_name);
    sheet_sprints.getRange(target_row_index, start_idx + 1).setValue(today);
    sheet_sprints.getRange(target_row_index, end_idx + 1).setValue(end_date);
    sheet_sprints.getRange(target_row_index, sp_status_idx + 1).setValue('ACTIVE');

    return {
      success: true,
      message: 'Sprint ' + sprint_name + ' berhasil dimulai!',
      data: {
        sprint_id: input.sprint_id,
        sprint_name: sprint_name,
        start_date: today,
        end_date: end_date,
        status: 'ACTIVE'
      }
    };
  } catch (e) {
    return { success: false, message: 'Gagal memulai sprint: ' + e.message };
  }
}

/**
 * Menyelesaikan Sprint (Complete / End Sprint)
 * - Menandai status sprint menjadi 'COMPLETED'
 * - Mempertahankan task yang berstatus 'DONE' di dalam sprint yang selesai (sebagai arsip historis dan pelaporan)
 * - Memindahkan task yang BELUM SELESAI ('TODO', 'IN_PROGRESS', 'REVIEW') ke:
 *     (A) Sprint Berikutnya (existing draft sprint atau buat baru otomatis)
 *     (B) Product Backlog ('BACKLOG-[project_id]')
 * - Mencatat audit trail ke Task_History
 *
 * @param {Object} input - { sprint_id, rollover_destination: 'NEXT_SPRINT'|'BACKLOG', target_sprint_id, new_sprint_name }
 * @return {Object} Status respon dan ringkasan rollover
 */
function complete_sprint(input) {
  try {
    const user_profile = get_user_role();
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (!permissions.can_manage_sprint) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk menyelesaikan sprint.' };
    }

    if (!input || !input.sprint_id) {
      return { success: false, message: 'Sprint ID tidak valid.' };
    }

    const target_sprint_id = String(input.sprint_id).trim();
    const rollover_destination = input.rollover_destination || 'NEXT_SPRINT';

    const spreadsheet = get_db_spreadsheet();
    const sheet_sprints = spreadsheet.getSheetByName('Sprints');
    const sheet_tasks = spreadsheet.getSheetByName('Tasks');
    const sheet_history = spreadsheet.getSheetByName('Task_History');

    if (!sheet_sprints || sheet_sprints.getLastRow() <= 1) {
      return { success: false, message: 'Sheet Sprints kosong.' };
    }

    // 1. Cari Sprint yang akan diselesaikan
    const sp_values = sheet_sprints.getDataRange().getValues();
    const sp_header = sp_values[0].map(h => String(h).trim().toLowerCase());
    let sp_status_idx = sp_header.indexOf('status');
    if (sp_status_idx === -1) {
      sp_status_idx = 5;
      sheet_sprints.getRange(1, 6).setValue('status');
    }

    let sprint_row_idx = -1;
    let project_id = '';
    let sprint_name = '';

    for (let r = 1; r < sp_values.length; r++) {
      if (String(sp_values[r][0]).trim() === target_sprint_id) {
        sprint_row_idx = r + 1;
        project_id = String(sp_values[r][1]).trim();
        sprint_name = String(sp_values[r][2]).trim();
        break;
      }
    }

    if (sprint_row_idx === -1) {
      return { success: false, message: 'Sprint dengan ID ' + target_sprint_id + ' tidak ditemukan.' };
    }

    // 2. Tentukan tujuan rollover untuk task yang belum selesai
    let destination_sprint_id = '';
    let destination_name = '';

    if (rollover_destination === 'BACKLOG') {
      destination_sprint_id = 'BACKLOG-' + project_id;
      destination_name = 'Product Backlog';
    } else {
      // NEXT_SPRINT: cek apakah target_sprint_id diberikan dan ada
      if (input.target_sprint_id && String(input.target_sprint_id).trim() !== '') {
        destination_sprint_id = String(input.target_sprint_id).trim();
        for (let r = 1; r < sp_values.length; r++) {
          if (String(sp_values[r][0]).trim() === destination_sprint_id) {
            destination_name = String(sp_values[r][2]).trim();
            break;
          }
        }
        if (!destination_name) destination_name = destination_sprint_id;
      } else {
        // Buat Sprint Baru otomatis
        const next_sp_num = sheet_sprints.getLastRow();
        destination_sprint_id = 'SPR-' + ('000' + next_sp_num).slice(-3);
        destination_name = input.new_sprint_name && input.new_sprint_name.trim() !== ''
          ? input.new_sprint_name.trim()
          : 'Sprint ' + next_sp_num + ' (Planning)';

        const today = new Date().toISOString().split('T')[0];
        const default_end = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
        sheet_sprints.appendRow([destination_sprint_id, project_id, destination_name, today, default_end, 'PLANNING']);
      }
    }

    // 3. Proses task dalam sheet Tasks
    let completed_count = 0;
    let incomplete_count = 0;
    const rollover_task_ids = [];
    const now_iso = new Date().toISOString();

    if (sheet_tasks && sheet_tasks.getLastRow() > 1) {
      const t_values = sheet_tasks.getDataRange().getValues();
      const t_header = t_values[0].map(h => String(h).trim().toLowerCase());
      const t_id_idx = t_header.indexOf('id');
      const t_sp_idx = t_header.indexOf('sprint_id');
      const t_status_idx = t_header.indexOf('status');
      const t_updated_idx = t_header.indexOf('updated_at');

      for (let r = 1; r < t_values.length; r++) {
        const row_sp_id = String(t_values[r][t_sp_idx]).trim();
        if (row_sp_id === target_sprint_id) {
          const t_id = String(t_values[r][t_id_idx]).trim();
          const t_status = String(t_values[r][t_status_idx]).trim().toUpperCase();

          if (t_status === 'DONE') {
            // Task selesai tetap di sprint ini sebagai arsip historis
            completed_count++;
          } else {
            // Task belum selesai (TODO, IN_PROGRESS, REVIEW) dipindahkan ke destinasi
            incomplete_count++;
            rollover_task_ids.push(t_id);

            // Update row di sheet Tasks
            sheet_tasks.getRange(r + 1, t_sp_idx + 1).setValue(destination_sprint_id);
            if (t_updated_idx !== -1) {
              sheet_tasks.getRange(r + 1, t_updated_idx + 1).setValue(now_iso);
            }

            // Catat audit trail di Task_History
            if (sheet_history) {
              const audit_id = (typeof Utilities !== 'undefined' && Utilities.getUuid) 
                ? Utilities.getUuid() 
                : 'AUD-' + Math.random().toString(36).substring(2, 9).toUpperCase();
              sheet_history.appendRow([
                audit_id,
                t_id,
                t_status,
                t_status,
                'Rollover: ' + target_sprint_id + ' -> ' + destination_sprint_id,
                now_iso
              ]);
            }
          }
        }
      }
    }

    // 4. Ubah status sprint yang selesai menjadi 'COMPLETED'
    sheet_sprints.getRange(sprint_row_idx, sp_status_idx + 1).setValue('COMPLETED');

    return {
      success: true,
      message: 'Sprint "' + sprint_name + '" berhasil diselesaikan! ' + 
               completed_count + ' task selesai diarsipkan, ' + 
               incomplete_count + ' task belum selesai dialihkan ke ' + destination_name + '.',
      data: {
        sprint_id: target_sprint_id,
        sprint_name: sprint_name,
        completed_tasks_count: completed_count,
        incomplete_tasks_count: incomplete_count,
        rollover_destination: rollover_destination,
        destination_sprint_id: destination_sprint_id,
        destination_name: destination_name,
        rollover_task_ids: rollover_task_ids
      }
    };
  } catch (e) {
    return { success: false, message: 'Gagal menyelesaikan sprint: ' + e.message };
  }
}

/**
 * =========================================================================
 * USER MANAGEMENT CONTROLLER (RBAC OPSI 2: HYBRID + MODULAR PERMISSIONS)
 * =========================================================================
 */

/**
 * Mengambil daftar seluruh pengguna beserta role dan granular permissions
 * Khusus untuk Administrator / Pengguna dengan hak can_manage_users.
 *
 * @return {Object} Status respon dan data daftar pengguna
 */
function get_users_management_list() {
  try {
    const user_profile = get_user_role();
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (!permissions.can_manage_users) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk mengelola pengguna.' };
    }

    const spreadsheet = get_db_spreadsheet();
    const sheet_users = spreadsheet.getSheetByName('Users');
    if (!sheet_users || sheet_users.getLastRow() <= 1) {
      return { success: true, data: [] };
    }

    const values = sheet_users.getDataRange().getValues();
    const header = values[0].map(h => String(h).trim().toLowerCase());
    const id_idx = header.indexOf('id');
    const name_idx = header.indexOf('name');
    const email_idx = header.indexOf('email');
    const role_idx = header.indexOf('role');
    const perm_idx = header.indexOf('permissions');

    const users = [];
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const role = String(row[role_idx] || 'CLIENT').toUpperCase().trim();
      const raw_perm = perm_idx !== -1 ? row[perm_idx] : null;
      users.push({
        id: row[id_idx],
        name: row[name_idx],
        email: row[email_idx],
        role: role,
        permissions: resolve_user_permissions(role, raw_perm)
      });
    }

    return { success: true, data: users };
  } catch (error) {
    return { success: false, message: 'Gagal memuat daftar pengguna: ' + error.message };
  }
}

/**
 * Membuat data pengguna baru dengan role & hak akses granular
 *
 * @param {Object} user_input - { name, email, role, permissions }
 * @return {Object} Status respon dan data pengguna baru
 */
function create_new_user(user_input) {
  try {
    const user_profile = get_user_role();
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (!permissions.can_manage_users) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk membuat pengguna baru.' };
    }

    if (!user_input || !user_input.name || !user_input.name.trim()) {
      return { success: false, message: 'Nama pengguna wajib diisi.' };
    }
    if (!user_input.email || !user_input.email.trim()) {
      return { success: false, message: 'Email pengguna wajib diisi.' };
    }

    const name = user_input.name.trim();
    const email = user_input.email.toLowerCase().trim();
    const role = String(user_input.role || 'MEMBER').toUpperCase().trim();
    const user_perms = resolve_user_permissions(role, user_input.permissions);

    const spreadsheet = get_db_spreadsheet();
    let sheet_users = spreadsheet.getSheetByName('Users');
    if (!sheet_users) {
      sheet_users = spreadsheet.insertSheet('Users');
      sheet_users.appendRow(['id', 'name', 'email', 'role', 'permissions']);
    }

    const values = sheet_users.getDataRange().getValues();
    const header = values[0].map(h => String(h).trim().toLowerCase());
    const email_idx = header.indexOf('email');

    // Validasi duplikasi email
    if (email_idx !== -1) {
      for (let r = 1; r < values.length; r++) {
        if (String(values[r][email_idx]).toLowerCase().trim() === email) {
          return { success: false, message: 'Email "' + email + '" sudah terdaftar.' };
        }
      }
    }

    // Generate User ID otomatis USR-001, USR-002, dst.
    const next_id_num = values.length;
    const user_id = 'USR-' + ('000' + next_id_num).slice(-3);

    sheet_users.appendRow([
      user_id,
      name,
      email,
      role,
      JSON.stringify(user_perms)
    ]);

    return {
      success: true,
      message: 'Pengguna baru berhasil ditambahkan.',
      data: {
        id: user_id,
        name: name,
        email: email,
        role: role,
        permissions: user_perms
      }
    };
  } catch (error) {
    return { success: false, message: 'Gagal membuat pengguna: ' + error.message };
  }
}

/**
 * Memperbarui data pengguna yang ada (nama, email, role, dan izin granular)
 * Proteksi anti-lockout: Admin aktif tidak bisa mencabut can_manage_users dari dirinya sendiri.
 *
 * @param {Object} user_input - { id, name, email, role, permissions }
 * @return {Object} Status respon
 */
function update_existing_user(user_input) {
  try {
    const user_profile = get_user_role();
    const active_email = (user_profile.data ? user_profile.data.email : '').toLowerCase().trim();
    const active_id = user_profile.data ? user_profile.data.id : '';
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (!permissions.can_manage_users) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk mengubah data pengguna.' };
    }

    if (!user_input || !user_input.id) {
      return { success: false, message: 'ID pengguna tidak valid.' };
    }
    if (!user_input.name || !user_input.name.trim()) {
      return { success: false, message: 'Nama pengguna wajib diisi.' };
    }
    if (!user_input.email || !user_input.email.trim()) {
      return { success: false, message: 'Email pengguna wajib diisi.' };
    }

    const target_id = String(user_input.id).trim();
    const new_name = user_input.name.trim();
    const new_email = user_input.email.toLowerCase().trim();
    const new_role = String(user_input.role || 'MEMBER').toUpperCase().trim();
    const resolved_perms = resolve_user_permissions(new_role, user_input.permissions);

    const spreadsheet = get_db_spreadsheet();
    const sheet_users = spreadsheet.getSheetByName('Users');
    if (!sheet_users || sheet_users.getLastRow() <= 1) {
      return { success: false, message: 'Data pengguna tidak ditemukan.' };
    }

    const values = sheet_users.getDataRange().getValues();
    const header = values[0].map(h => String(h).trim().toLowerCase());
    const id_idx = header.indexOf('id');
    const name_idx = header.indexOf('name');
    const email_idx = header.indexOf('email');
    const role_idx = header.indexOf('role');
    const perm_idx = header.indexOf('permissions');

    let target_row_index = -1;
    let old_email = '';

    for (let r = 1; r < values.length; r++) {
      if (String(values[r][id_idx]).trim() === target_id) {
        target_row_index = r + 1;
        old_email = String(values[r][email_idx]).toLowerCase().trim();
        break;
      }
    }

    if (target_row_index === -1) {
      return { success: false, message: 'Pengguna dengan ID ' + target_id + ' tidak ditemukan.' };
    }

    // Proteksi Anti-Lockout: Jangan izinkan user aktif mencabut can_manage_users dari dirinya sendiri
    const is_self = (active_email && old_email === active_email) || (active_id && target_id === active_id);
    if (is_self && resolved_perms.can_manage_users !== true) {
      return {
        success: false,
        message: 'Akses Ditolak: Anda tidak dapat mencabut hak akses manajemen pengguna dari akun Anda sendiri demi mencegah lockout sistem.'
      };
    }

    // Validasi jika email diubah agar tidak bentrok dengan user lain
    if (new_email !== old_email) {
      for (let r = 1; r < values.length; r++) {
        if (r + 1 !== target_row_index && String(values[r][email_idx]).toLowerCase().trim() === new_email) {
          return { success: false, message: 'Email "' + new_email + '" sudah digunakan oleh akun lain.' };
        }
      }
    }

    // Update baris
    sheet_users.getRange(target_row_index, name_idx + 1).setValue(new_name);
    sheet_users.getRange(target_row_index, email_idx + 1).setValue(new_email);
    sheet_users.getRange(target_row_index, role_idx + 1).setValue(new_role);
    if (perm_idx !== -1) {
      sheet_users.getRange(target_row_index, perm_idx + 1).setValue(JSON.stringify(resolved_perms));
    } else {
      // Jika kolom permissions belum ada, tambahkan kolom di akhir
      sheet_users.getRange(1, 5).setValue('permissions').setFontWeight('bold').setBackground('#E2E8F0');
      sheet_users.getRange(target_row_index, 5).setValue(JSON.stringify(resolved_perms));
    }

    return {
      success: true,
      message: 'Data pengguna ' + new_name + ' berhasil diperbarui.',
      data: {
        id: target_id,
        name: new_name,
        email: new_email,
        role: new_role,
        permissions: resolved_perms
      }
    };
  } catch (error) {
    return { success: false, message: 'Gagal memperbarui pengguna: ' + error.message };
  }
}

/**
 * Menghapus akun pengguna dari sheet Users
 * Proteksi anti-lockout: Admin tidak bisa menghapus akun dirinya sendiri yang sedang aktif.
 *
 * @param {string} user_id - ID unik pengguna yang akan dihapus
 * @return {Object} Status respon
 */
function delete_existing_user(user_id) {
  try {
    const user_profile = get_user_role();
    const active_email = (user_profile.data ? user_profile.data.email : '').toLowerCase().trim();
    const active_id = user_profile.data ? user_profile.data.id : '';
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (!permissions.can_manage_users) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk menghapus pengguna.' };
    }

    if (!user_id || !String(user_id).trim()) {
      return { success: false, message: 'ID pengguna tidak valid.' };
    }

    const target_id = String(user_id).trim();
    const spreadsheet = get_db_spreadsheet();
    const sheet_users = spreadsheet.getSheetByName('Users');
    if (!sheet_users || sheet_users.getLastRow() <= 1) {
      return { success: false, message: 'Data pengguna tidak ditemukan.' };
    }

    const values = sheet_users.getDataRange().getValues();
    const header = values[0].map(h => String(h).trim().toLowerCase());
    const id_idx = header.indexOf('id');
    const email_idx = header.indexOf('email');
    const name_idx = header.indexOf('name');

    let target_row_index = -1;
    let target_email = '';
    let target_name = '';

    for (let r = 1; r < values.length; r++) {
      if (String(values[r][id_idx]).trim() === target_id) {
        target_row_index = r + 1;
        target_email = String(values[r][email_idx]).toLowerCase().trim();
        target_name = String(values[r][name_idx]).trim();
        break;
      }
    }

    if (target_row_index === -1) {
      return { success: false, message: 'Pengguna dengan ID ' + target_id + ' tidak ditemukan.' };
    }

    // Proteksi Anti-Lockout: Dilarang menghapus akun sendiri yang sedang aktif
    const is_self = (active_email && target_email === active_email) || (active_id && target_id === active_id);
    if (is_self) {
      return {
        success: false,
        message: 'Akses Ditolak: Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.'
      };
    }

    sheet_users.deleteRow(target_row_index);

    return {
      success: true,
      message: 'Pengguna ' + target_name + ' berhasil dihapus.'
    };
  } catch (error) {
    return { success: false, message: 'Gagal menghapus pengguna: ' + error.message };
  }
}