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

    // Lookup sprint aktif pertama per project
    const project_sprint_map = {};
    if (sheet_sprints && sheet_sprints.getLastRow() > 1) {
      const sp_values = sheet_sprints.getDataRange().getValues();
      for (let r = 1; r < sp_values.length; r++) {
        const sp_id = sp_values[r][0];
        const prj_id = String(sp_values[r][1]).trim();
        const sp_name = sp_values[r][2];
        if (!project_sprint_map[prj_id]) {
          project_sprint_map[prj_id] = { id: sp_id, name: sp_name };
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
    const current_user_role = user_profile.data ? user_profile.data.role : 'CLIENT';
    const current_user_id = user_profile.data ? user_profile.data.id : 'USR-001';

    if (current_user_role !== 'ADMIN' && current_user_role !== 'PM') {
      return { success: false, message: 'Akses Ditolak: Hanya PM/Admin yang dapat membuat project baru.' };
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
    if (sheet_sprints) {
      const duration_days = (Number(project_input.sprint_duration_weeks) || 2) * 7;
      const today = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + duration_days * 86400000).toISOString().split('T')[0];
      sheet_sprints.appendRow([sprint_id, project_id, sprint_name, today, endDate]);
    }

    return {
      success: true,
      message: 'Project baru berhasil dibuat.',
      data: {
        id: project_id,
        name: project_name,
        sprint_id: sprint_id,
        sprint_name: sprint_name,
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
    const current_user_role = user_profile.data ? user_profile.data.role : 'CLIENT';
    const current_user_email = user_profile.data ? user_profile.data.email : 'unknown';

    if (current_user_role !== 'ADMIN' && current_user_role !== 'PM') {
      return { success: false, message: 'Akses Ditolak: Hanya PM/Admin yang dapat membuat task.' };
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
    const current_user_role = user_profile.data ? user_profile.data.role : 'CLIENT';
    const current_user_email = user_profile.data ? user_profile.data.email : 'unknown';

    if (current_user_role === 'CLIENT') {
      return { success: false, message: 'Akses Ditolak: Klien Eksternal memiliki hak akses Read-only.' };
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
 * Mengambil seluruh task Backlog dan daftar Sprint Buckets untuk suatu Project
 *
 * @param {string} project_id - ID unik proyek (contoh: 'PRJ-001').
 * @return {Object} Payload { success: boolean, data: { backlog_tasks: [], sprints: [] } }
 */
function get_project_backlog_and_sprints(project_id) {
  try {
    const spreadsheet = get_db_spreadsheet();
    const sheet_projects = spreadsheet.getSheetByName('Projects');
    const sheet_sprints = spreadsheet.getSheetByName('Sprints');
    const sheet_tasks = spreadsheet.getSheetByName('Tasks');
    const sheet_users = spreadsheet.getSheetByName('Users');

    const prj_id = String(project_id || '').trim();
    if (!prj_id) return { success: false, message: 'Project ID tidak valid.' };

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
      for (let r = 1; r < sp_values.length; r++) {
        if (String(sp_values[r][1]).trim() === prj_id) {
          const sp_id = String(sp_values[r][0]).trim();
          sprint_ids.push(sp_id);
          sprints.push({
            id: sp_id,
            project_id: prj_id,
            name: sp_values[r][2],
            start_date: sp_values[r][3],
            end_date: sp_values[r][4],
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
          created_at: row[crt_idx],
          updated_at: row[upd_idx]
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
    const current_user_role = user_profile.data ? user_profile.data.role : 'CLIENT';
    if (current_user_role !== 'ADMIN' && current_user_role !== 'PM') {
      return { success: false, message: 'Akses Ditolak: Hanya PM/Admin yang dapat membuat sprint baru.' };
    }

    const prj_id = String(project_id || '').trim();
    if (!prj_id) return { success: false, message: 'Project ID tidak valid.' };

    const spreadsheet = get_db_spreadsheet();
    const sheet_sprints = spreadsheet.getSheetByName('Sprints');
    if (!sheet_sprints) return { success: false, message: 'Sheet Sprints tidak ditemukan.' };

    const next_sp_num = sheet_sprints.getLastRow();
    const sprint_id = 'SPR-' + ('000' + next_sp_num).slice(-3);
    const final_name = sprint_name && sprint_name.trim() !== '' 
      ? sprint_name.trim() 
      : 'Sprint ' + next_sp_num + ' (Planning)';

    // Tanggal default planning
    const today = new Date().toISOString().split('T')[0];
    const default_end = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    sheet_sprints.appendRow([sprint_id, prj_id, final_name, today, default_end]);

    return {
      success: true,
      message: 'Bucket sprint baru berhasil dibuat.',
      data: {
        id: sprint_id,
        project_id: prj_id,
        name: final_name,
        start_date: today,
        end_date: default_end
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
    const current_user_role = user_profile.data ? user_profile.data.role : 'CLIENT';
    if (current_user_role === 'CLIENT') {
      return { success: false, message: 'Akses Ditolak: Client memiliki akses Read-only.' };
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
    const current_user_role = user_profile.data ? user_profile.data.role : 'CLIENT';
    if (current_user_role !== 'ADMIN' && current_user_role !== 'PM') {
      return { success: false, message: 'Akses Ditolak: Hanya PM/Admin yang dapat memulai sprint.' };
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

    // Update baris sprint
    sheet_sprints.getRange(target_row_index, name_idx + 1).setValue(sprint_name);
    sheet_sprints.getRange(target_row_index, start_idx + 1).setValue(today);
    sheet_sprints.getRange(target_row_index, end_idx + 1).setValue(end_date);

    return {
      success: true,
      message: 'Sprint ' + sprint_name + ' berhasil dimulai!',
      data: {
        sprint_id: input.sprint_id,
        sprint_name: sprint_name,
        start_date: today,
        end_date: end_date
      }
    };
  } catch (e) {
    return { success: false, message: 'Gagal memulai sprint: ' + e.message };
  }
}