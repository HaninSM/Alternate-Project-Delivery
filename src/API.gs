/**
 * @fileoverview API Controller untuk operasi data Project, Task dan alur Time-in-Status Engine.
 * Alternate Project Delivery (LITE).
 */

const VALID_TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

const WORK_TYPES = {
  INITIATIVE: { type: 'INITIATIVE', level: 1, label: 'Inisiatif' },
  USER_STORY: { type: 'USER_STORY', level: 0, label: 'User Story' },
  TASK: { type: 'TASK', level: 0, label: 'Task' },
  BUG: { type: 'BUG', level: 0, label: 'BUG' },
  SUBTASK: { type: 'SUBTASK', level: -1, label: 'Subtask' }
};

/**
 * Mendapatkan level angka hirarki (-1, 0, 1) dari suatu work type
 * @param {string} type_str
 * @return {number} -1 untuk Subtask, 1 untuk Inisiatif, 0 untuk Task/Story/Bug
 */
function get_work_type_level(type_str) {
  const t = String(type_str || 'TASK').toUpperCase().trim();
  if (t === 'INITIATIVE') return 1;
  if (t === 'SUBTASK') return -1;
  return 0; // TASK, USER_STORY, BUG default ke 0
}

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
        if (u_values[i] && u_values[i][0]) {
          user_name_map[String(u_values[i][0]).trim()] = String(u_values[i][1] || u_values[i][0]).trim();
        }
      }
    }

    // Lookup sprint aktif per project (prioritaskan status ACTIVE)
    const project_sprint_map = {};
    if (sheet_sprints && sheet_sprints.getLastRow() > 1) {
      const sp_values = sheet_sprints.getDataRange().getValues();
      const sp_header = sp_values[0].map(h => String(h).trim().toLowerCase());
      const sp_status_idx = sp_header.indexOf('status');

      for (let r = 1; r < sp_values.length; r++) {
        if (!sp_values[r] || !sp_values[r][0]) continue;
        const sp_id = String(sp_values[r][0]).trim();
        const prj_id = String(sp_values[r][1] || '').trim();
        const sp_name = String(sp_values[r][2] || sp_id).trim();
        const sp_status = sp_status_idx !== -1 && sp_values[r][sp_status_idx]
          ? String(sp_values[r][sp_status_idx]).trim().toUpperCase()
          : (sp_values[r][5] ? String(sp_values[r][5]).trim().toUpperCase() : 'ACTIVE');

        if (!prj_id) continue;

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

      if (sp_idx !== -1 && status_idx !== -1) {
        for (let r = 1; r < t_values.length; r++) {
          if (!t_values[r] || !t_values[r][sp_idx]) continue;
          const s_id = String(t_values[r][sp_idx]).trim();
          const status = String(t_values[r][status_idx] || '').toUpperCase().trim();

          if (!sprint_task_stats[s_id]) {
            sprint_task_stats[s_id] = { total: 0, done: 0 };
          }
          sprint_task_stats[s_id].total++;
          if (status === 'DONE') {
            sprint_task_stats[s_id].done++;
          }
        }
      }
    }

    const prj_values = sheet_projects.getDataRange().getValues();
    const prj_header = prj_values[0].map(h => String(h).trim().toLowerCase());
    const id_idx = prj_header.indexOf('id') !== -1 ? prj_header.indexOf('id') : 0;
    const name_idx = prj_header.indexOf('name') !== -1 ? prj_header.indexOf('name') : 1;
    const pm_idx = prj_header.indexOf('pm_id') !== -1 ? prj_header.indexOf('pm_id') : 2;

    const projects = [];
    for (let r = 1; r < prj_values.length; r++) {
      if (!prj_values[r] || !prj_values[r][id_idx]) continue;
      const project_id = String(prj_values[r][id_idx]).trim();
      if (!project_id) continue;

      const project_name = String(prj_values[r][name_idx] || project_id).trim();
      const pm_id = String(prj_values[r][pm_idx] || '').trim();
      const active_sp = project_sprint_map[project_id] || { id: 'SPR-' + project_id.replace('PRJ-', ''), name: 'Sprint 1 - Foundations' };
      const stats = sprint_task_stats[active_sp.id] || { total: 0, done: 0 };

      projects.push({
        id: project_id,
        name: project_name,
        pm_id: pm_id,
        pm_name: user_name_map[pm_id] || pm_id || 'Project Manager',
        active_sprint_id: active_sp.id,
        active_sprint_name: active_sp.name || 'Sprint 1',
        active_sprint_status: active_sp.status || 'ACTIVE',
        total_tasks: stats.total || 0,
        done_tasks: stats.done || 0
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
    const type_idx = header.indexOf('work_type');
    const level_idx = header.indexOf('hierarchy_level');
    const parent_idx = header.indexOf('parent_id');
    const desc_idx = header.indexOf('description');
    const pts_idx = header.indexOf('story_points');

    const tasks = [];
    const target_sprint = String(sprint_id).trim();

    for (let r = 1; r < task_values.length; r++) {
      const row = task_values[r];
      const row_sprint = String(row[sp_idx]).trim();

      // Hanya masukkan task yang sprint_id nya COCOK PERSIS!
      if (row_sprint === target_sprint) {
        const assignee_id = row[ass_idx];
        const raw_type = type_idx !== -1 ? String(row[type_idx] || 'TASK').toUpperCase().trim() : 'TASK';
        const raw_level = level_idx !== -1 && row[level_idx] !== '' ? Number(row[level_idx]) : get_work_type_level(raw_type);
        const raw_parent = parent_idx !== -1 ? String(row[parent_idx] || '').trim() : '';
        const raw_desc = desc_idx !== -1 ? String(row[desc_idx] || '') : '';
        const raw_pts = pts_idx !== -1 ? String(row[pts_idx] || '').trim() : '';

        tasks.push({
          id: row[id_idx],
          sprint_id: row_sprint,
          title: row[title_idx],
          status: String(row[status_idx]).toUpperCase().trim(),
          assignee_id: assignee_id,
          assignee_name: user_name_map[assignee_id] || assignee_id || 'Belum Ditugaskan',
          estimate_hours: Number(row[est_idx]) || 0,
          created_at: row[crt_idx],
          updated_at: row[upd_idx],
          work_type: raw_type,
          hierarchy_level: raw_level,
          parent_id: raw_parent,
          description: raw_desc,
          story_points: raw_pts,
          subtask_count: 0,
          subtask_done_count: 0
        });
      }
    }

    // Hitung agregasi subtask untuk parent task dalam sprint ini
    const task_map = {};
    tasks.forEach(t => { task_map[t.id] = t; });
    tasks.forEach(t => {
      if (t.parent_id && task_map[t.parent_id]) {
        task_map[t.parent_id].subtask_count += 1;
        if (t.status === 'DONE') {
          task_map[t.parent_id].subtask_done_count += 1;
        }
      }
    });

    // PENTING: Jika tasks.length === 0, tetap kembalikan [] (Board bersih)!
    return { success: true, data: tasks };
  } catch (error) {
    return { success: false, message: 'Gagal memuat daftar task: ' + error.message };
  }
}

/**
 * Membuat task baru di sheet Tasks dan mencatat audit trail di Task_History
 * Mendukung hirarki work type:
 * - INITIATIVE (Level 1): Tidak boleh memiliki parent
 * - TASK, USER_STORY, BUG (Level 0): Opsional memiliki parent berlevel 1 (Inisiatif)
 * - SUBTASK (Level -1): Wajib memiliki parent berlevel 0 (Task/User Story/Bug)
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

    let work_type = String(task_input.work_type || 'TASK').toUpperCase().trim();
    if (!['INITIATIVE', 'USER_STORY', 'TASK', 'BUG', 'SUBTASK'].includes(work_type)) {
      work_type = 'TASK';
    }
    const hierarchy_level = get_work_type_level(work_type);
    let parent_id = task_input.parent_id ? String(task_input.parent_id).trim() : '';

    // Validasi aturan hirarki
    if (hierarchy_level === 1) {
      // Inisiatif tidak boleh memiliki parent
      parent_id = '';
    } else if (hierarchy_level === -1) {
      // Subtask WAJIB memiliki parent berlevel 0 (Task / User Story / Bug)
      if (!parent_id) {
        return { success: false, message: 'Validasi Hirarki Gagal: Subtask (Level -1) wajib memilih parent work item Level 0 (Task, User Story, atau Bug).' };
      }
      
      const all_tasks_data = sheet_tasks.getDataRange().getValues();
      const t_hdr = all_tasks_data[0].map(h => String(h).trim().toLowerCase());
      const p_id_idx = t_hdr.indexOf('id');
      const p_type_idx = t_hdr.indexOf('work_type');
      const p_lvl_idx = t_hdr.indexOf('hierarchy_level');

      let parent_row = null;
      for (let r = 1; r < all_tasks_data.length; r++) {
        if (String(all_tasks_data[r][p_id_idx]).trim() === parent_id) {
          parent_row = all_tasks_data[r];
          break;
        }
      }

      if (!parent_row) {
        return { success: false, message: 'Validasi Hirarki Gagal: Parent dengan ID "' + parent_id + '" tidak ditemukan.' };
      }

      const p_raw_type = p_type_idx !== -1 ? String(parent_row[p_type_idx] || 'TASK').toUpperCase().trim() : 'TASK';
      const parent_level = p_lvl_idx !== -1 && parent_row[p_lvl_idx] !== '' ? Number(parent_row[p_lvl_idx]) : get_work_type_level(p_raw_type);
      if (parent_level !== 0) {
        return { success: false, message: 'Validasi Hirarki Gagal: Parent dari Subtask harus berlevel 0 (Task, User Story, atau Bug), tidak boleh berlevel ' + parent_level + '.' };
      }
    } else if (hierarchy_level === 0) {
      // Work item level 0 opsional memiliki parent berlevel 1 (Inisiatif)
      if (parent_id) {
        const all_tasks_data = sheet_tasks.getDataRange().getValues();
        const t_hdr = all_tasks_data[0].map(h => String(h).trim().toLowerCase());
        const p_id_idx = t_hdr.indexOf('id');
        const p_type_idx = t_hdr.indexOf('work_type');
        const p_lvl_idx = t_hdr.indexOf('hierarchy_level');

        let parent_row = null;
        for (let r = 1; r < all_tasks_data.length; r++) {
          if (String(all_tasks_data[r][p_id_idx]).trim() === parent_id) {
            parent_row = all_tasks_data[r];
            break;
          }
        }

        if (!parent_row) {
          return { success: false, message: 'Validasi Hirarki Gagal: Inisiatif parent dengan ID "' + parent_id + '" tidak ditemukan.' };
        }

        const p_raw_type = p_type_idx !== -1 ? String(parent_row[p_type_idx] || 'TASK').toUpperCase().trim() : 'TASK';
        const parent_level = p_lvl_idx !== -1 && parent_row[p_lvl_idx] !== '' ? Number(parent_row[p_lvl_idx]) : get_work_type_level(p_raw_type);
        if (parent_level !== 1) {
          return { success: false, message: 'Validasi Hirarki Gagal: Parent dari item Level 0 harus berupa Inisiatif (Level 1).' };
        }
      }
    }

    const description = task_input.description ? String(task_input.description) : '';
    // Story point hanya berlaku di work item hirarki 0 saja
    const story_points = (hierarchy_level === 0 && task_input.story_points !== undefined && task_input.story_points !== null)
      ? String(task_input.story_points).trim()
      : '';

    // Pastikan header kolom story_points ada di sheet Tasks jika method didukung
    try {
      if (typeof sheet_tasks.getLastColumn === 'function' && typeof sheet_tasks.getRange === 'function') {
        const lastCol = sheet_tasks.getLastColumn();
        if (lastCol > 0) {
          const t_hdr_vals = sheet_tasks.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim().toLowerCase());
          if (!t_hdr_vals.includes('story_points')) {
            const col_pts = t_hdr_vals.length + 1;
            const cell = sheet_tasks.getRange(1, col_pts);
            cell.setValue('story_points');
            if (typeof cell.setFontWeight === 'function') cell.setFontWeight('bold');
            if (typeof cell.setBackground === 'function') cell.setBackground('#E2E8F0');
          }
        }
      }
    } catch (ignore) {}

    sheet_tasks.appendRow([
      task_id, sprint_id, title, 'TODO', assignee_id, estimate_hours, current_timestamp, current_timestamp, work_type, hierarchy_level, parent_id, description, story_points
    ]);

    const history_id = 'HIS-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    sheet_history.appendRow([
      history_id, task_id, 'NONE', 'TODO', current_user_email, current_timestamp
    ]);

    return { 
      success: true, 
      message: 'Task berhasil dibuat.',
      data: {
        id: task_id,
        sprint_id: sprint_id,
        title: title,
        work_type: work_type,
        hierarchy_level: hierarchy_level,
        parent_id: parent_id,
        description: description
      }
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Mengambil daftar parent yang memenuhi syarat sesuai aturan hirarki work type
 *
 * @param {string} project_id - ID Project aktif
 * @param {string} target_work_type - Tipe work item yang akan dibuat ('SUBTASK', 'TASK', 'USER_STORY', 'BUG', 'INITIATIVE')
 * @return {Object} Payload { success: boolean, data: Array<Object> }
 */
function get_eligible_parents_for_task(project_id, target_work_type) {
  try {
    const spreadsheet = get_db_spreadsheet();
    const sheet_tasks = spreadsheet.getSheetByName('Tasks');
    const sheet_sprints = spreadsheet.getSheetByName('Sprints');

    if (!sheet_tasks || sheet_tasks.getLastRow() <= 1) {
      return { success: true, data: [] };
    }

    const type = String(target_work_type || 'TASK').toUpperCase().trim();
    const target_level = get_work_type_level(type);

    if (target_level === 1) {
      // Inisiatif tidak punya parent
      return { success: true, data: [] };
    }

    // Tentukan level parent yang dicari:
    // Jika target_level === -1 (Subtask) -> cari item berlevel 0 (Task, User Story, Bug)
    // Jika target_level === 0 (Story, Task, Bug) -> cari item berlevel 1 (Inisiatif)
    const required_parent_level = target_level === -1 ? 0 : 1;

    // Ambil daftar sprint milik project_id ini
    const prj_sprint_ids = new Set(['BACKLOG-' + project_id, 'BACKLOG']);
    if (sheet_sprints && sheet_sprints.getLastRow() > 1) {
      const sp_values = sheet_sprints.getDataRange().getValues();
      const sp_hdr = sp_values[0].map(h => String(h).trim().toLowerCase());
      const sp_id_idx = sp_hdr.indexOf('id');
      const sp_prj_idx = sp_hdr.indexOf('project_id');
      for (let s = 1; s < sp_values.length; s++) {
        if (!project_id || String(sp_values[s][sp_prj_idx]).trim() === project_id) {
          prj_sprint_ids.add(String(sp_values[s][sp_id_idx]).trim());
        }
      }
    }

    const t_values = sheet_tasks.getDataRange().getValues();
    const t_hdr = t_values[0].map(h => String(h).trim().toLowerCase());
    const id_idx = t_hdr.indexOf('id');
    const sp_idx = t_hdr.indexOf('sprint_id');
    const title_idx = t_hdr.indexOf('title');
    const type_idx = t_hdr.indexOf('work_type');
    const level_idx = t_hdr.indexOf('hierarchy_level');

    const parents = [];
    for (let r = 1; r < t_values.length; r++) {
      const row = t_values[r];
      const row_sprint = String(row[sp_idx]).trim();

      // Hanya task yang berada dalam lingkup project ini
      if (prj_sprint_ids.size > 0 && !prj_sprint_ids.has(row_sprint)) {
        continue;
      }

      const row_type = type_idx !== -1 ? String(row[type_idx] || 'TASK').toUpperCase().trim() : 'TASK';
      const row_level = level_idx !== -1 && row[level_idx] !== '' ? Number(row[level_idx]) : get_work_type_level(row_type);

      if (row_level === required_parent_level) {
        parents.push({
          id: row[id_idx],
          title: row[title_idx],
          work_type: row_type,
          hierarchy_level: row_level,
          sprint_id: row_sprint
        });
      }
    }

    return { success: true, data: parents };
  } catch (error) {
    return { success: false, message: 'Gagal mengambil opsi parent: ' + error.message };
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
 * Memperbarui rincian work item (Judul, Deskripsi WYSIWYG, Estimasi Jam, Assignee, Work Type, Parent)
 *
 * @param {Object} task_input - { id, title, description, estimate_hours, assignee_id, work_type, parent_id }
 * @return {Object} Payload { success: boolean, message: string, data?: Object }
 */
function update_task_details(task_input) {
  try {
    if (!task_input || !task_input.id) {
      return { success: false, message: 'ID task tidak valid.' };
    }

    const user_profile = get_user_role();
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (!permissions.can_create_task && !permissions.can_move_task) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk mengubah rincian task.' };
    }

    const spreadsheet = get_db_spreadsheet();
    const sheet_tasks = spreadsheet.getSheetByName('Tasks');
    if (!sheet_tasks || sheet_tasks.getLastRow() <= 1) {
      return { success: false, message: 'Sheet Tasks tidak ditemukan atau kosong.' };
    }

    const task_values = sheet_tasks.getDataRange().getValues();
    const header = task_values[0].map(h => String(h).trim().toLowerCase());
    const id_idx = header.indexOf('id');
    const title_idx = header.indexOf('title');
    const ass_idx = header.indexOf('assignee_id');
    const est_idx = header.indexOf('estimate_hours');
    const upd_idx = header.indexOf('updated_at');
    const type_idx = header.indexOf('work_type');
    const level_idx = header.indexOf('hierarchy_level');
    const parent_idx = header.indexOf('parent_id');
    const desc_idx = header.indexOf('description');

    let target_row_index = -1;
    let current_row = null;

    for (let r = 1; r < task_values.length; r++) {
      if (String(task_values[r][id_idx]).trim() === String(task_input.id).trim()) {
        target_row_index = r + 1;
        current_row = task_values[r];
        break;
      }
    }

    if (target_row_index === -1) {
      return { success: false, message: 'Task dengan ID "' + task_input.id + '" tidak ditemukan.' };
    }

    const title = task_input.title ? task_input.title.trim() : String(current_row[title_idx] || '');
    if (!title) {
      return { success: false, message: 'Judul task tidak boleh kosong.' };
    }

    const estimate_hours = task_input.estimate_hours !== undefined 
      ? (Number(task_input.estimate_hours) || 0) 
      : (Number(current_row[est_idx]) || 0);

    const assignee_id = task_input.assignee_id !== undefined 
      ? String(task_input.assignee_id).trim() 
      : String(current_row[ass_idx] || '');

    const description = task_input.description !== undefined 
      ? String(task_input.description) 
      : (desc_idx !== -1 ? String(current_row[desc_idx] || '') : '');

    let work_type = task_input.work_type 
      ? String(task_input.work_type).toUpperCase().trim() 
      : (type_idx !== -1 ? String(current_row[type_idx] || 'TASK').toUpperCase().trim() : 'TASK');

    if (!['INITIATIVE', 'USER_STORY', 'TASK', 'BUG', 'SUBTASK'].includes(work_type)) {
      work_type = 'TASK';
    }

    const hierarchy_level = get_work_type_level(work_type);
    let parent_id = task_input.parent_id !== undefined 
      ? String(task_input.parent_id).trim() 
      : (parent_idx !== -1 ? String(current_row[parent_idx] || '').trim() : '');

    // Validasi aturan hirarki jika work_type atau parent berubah
    if (hierarchy_level === 1) {
      parent_id = '';
    } else if (hierarchy_level === -1) {
      if (!parent_id) {
        return { success: false, message: 'Validasi Hirarki Gagal: Subtask (Level -1) wajib memilih parent work item Level 0 (Task, User Story, atau Bug).' };
      }
      if (parent_id === String(task_input.id).trim()) {
        return { success: false, message: 'Validasi Hirarki Gagal: Work item tidak bisa menjadi parent untuk dirinya sendiri.' };
      }
    }

    const current_timestamp = new Date().toISOString();

    if (title_idx !== -1) sheet_tasks.getRange(target_row_index, title_idx + 1).setValue(title);
    if (est_idx !== -1) sheet_tasks.getRange(target_row_index, est_idx + 1).setValue(estimate_hours);
    if (ass_idx !== -1) sheet_tasks.getRange(target_row_index, ass_idx + 1).setValue(assignee_id);
    if (type_idx !== -1) sheet_tasks.getRange(target_row_index, type_idx + 1).setValue(work_type);
    if (level_idx !== -1) sheet_tasks.getRange(target_row_index, level_idx + 1).setValue(hierarchy_level);
    if (parent_idx !== -1) sheet_tasks.getRange(target_row_index, parent_idx + 1).setValue(parent_id);
    if (upd_idx !== -1) sheet_tasks.getRange(target_row_index, upd_idx + 1).setValue(current_timestamp);
    if (desc_idx !== -1) {
      sheet_tasks.getRange(target_row_index, desc_idx + 1).setValue(description);
    } else {
      const new_col_idx = sheet_tasks.getLastColumn() + 1;
      sheet_tasks.getRange(1, new_col_idx).setValue('description');
      sheet_tasks.getRange(target_row_index, new_col_idx).setValue(description);
    }

    const pts_idx = header.indexOf('story_points');
    const story_points = (hierarchy_level === 0 && task_input.story_points !== undefined && task_input.story_points !== null)
      ? String(task_input.story_points).trim()
      : (hierarchy_level !== 0 ? '' : (pts_idx !== -1 ? String(current_row[pts_idx] || '') : ''));

    if (pts_idx !== -1) {
      sheet_tasks.getRange(target_row_index, pts_idx + 1).setValue(story_points);
    } else {
      const new_col_idx = sheet_tasks.getLastColumn() + 1;
      sheet_tasks.getRange(1, new_col_idx).setValue('story_points');
      sheet_tasks.getRange(target_row_index, new_col_idx).setValue(story_points);
    }

    return {
      success: true,
      message: 'Rincian work item berhasil diperbarui.',
      data: {
        id: task_input.id,
        title: title,
        estimate_hours: estimate_hours,
        assignee_id: assignee_id,
        work_type: work_type,
        hierarchy_level: hierarchy_level,
        parent_id: parent_id,
        description: description,
        story_points: story_points,
        updated_at: current_timestamp
      }
    };
  } catch (error) {
    return { success: false, message: 'Gagal memperbarui rincian task: ' + error.message };
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
      const type_idx = header.indexOf('work_type');
      const level_idx = header.indexOf('hierarchy_level');
      const parent_idx = header.indexOf('parent_id');
      const desc_idx = header.indexOf('description');

      for (let r = 1; r < t_values.length; r++) {
        const row = t_values[r];
        const row_sprint = String(row[sp_idx]).trim();
        const assignee_id = row[ass_idx];
        const raw_type = type_idx !== -1 ? String(row[type_idx] || 'TASK').toUpperCase().trim() : 'TASK';
        const raw_level = level_idx !== -1 && row[level_idx] !== '' ? Number(row[level_idx]) : get_work_type_level(raw_type);
        const raw_parent = parent_idx !== -1 ? String(row[parent_idx] || '').trim() : '';
        const raw_desc = desc_idx !== -1 ? String(row[desc_idx] || '') : '';
        const pts_idx = header.indexOf('story_points');
        const raw_pts = pts_idx !== -1 ? String(row[pts_idx] || '').trim() : '';

        const task_obj = {
          id: row[id_idx],
          sprint_id: row_sprint,
          title: row[title_idx],
          status: String(row[status_idx]).toUpperCase().trim(),
          assignee_id: assignee_id,
          assignee_name: user_name_map[assignee_id] || assignee_id || 'Belum Ditugaskan',
          estimate_hours: Number(row[est_idx]) || 0,
          created_at: format_gas_date(row[crt_idx]),
          updated_at: format_gas_date(row[upd_idx]),
          work_type: raw_type,
          hierarchy_level: raw_level,
          parent_id: raw_parent,
          description: raw_desc,
          story_points: raw_pts
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

    // Hitung agregasi subtask untuk seluruh task dalam project ini
    const subtask_counts = {};
    const subtask_done_counts = {};
    const all_project_tasks = [...backlog_tasks];
    sprints.forEach(sp => (sp.tasks || []).forEach(t => all_project_tasks.push(t)));

    all_project_tasks.forEach(t => {
      if (t.parent_id) {
        subtask_counts[t.parent_id] = (subtask_counts[t.parent_id] || 0) + 1;
        if (t.status === 'DONE') {
          subtask_done_counts[t.parent_id] = (subtask_done_counts[t.parent_id] || 0) + 1;
        }
      }
    });

    all_project_tasks.forEach(t => {
      t.subtask_count = subtask_counts[t.id] || 0;
      t.subtask_done_count = subtask_done_counts[t.id] || 0;
    });

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
 * Mendukung Pemindahan Sepaket (Bundled Hierarchy Move):
 * - Jika memindahkan item Level 0 (Story, Task, Bug), seluruh subtask (Level -1) ikut dipindahkan ke bucket tujuan
 * - Jika memindahkan item Level 1 (Inisiatif), seluruh anak Level 0 dan subtask Level -1 ikut dipindahkan
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
    const type_idx = header.indexOf('work_type');
    const level_idx = header.indexOf('hierarchy_level');
    const parent_idx = header.indexOf('parent_id');

    // 1. Temukan baris task utama
    let main_row_index = -1;
    let main_task_level = 0;
    let main_task_type = 'TASK';

    for (let r = 1; r < task_values.length; r++) {
      if (String(task_values[r][id_idx]).trim() === String(task_id).trim()) {
        main_row_index = r + 1;
        main_task_type = type_idx !== -1 ? String(task_values[r][type_idx] || 'TASK').toUpperCase().trim() : 'TASK';
        main_task_level = level_idx !== -1 && task_values[r][level_idx] !== '' ? Number(task_values[r][level_idx]) : get_work_type_level(main_task_type);
        break;
      }
    }

    if (main_row_index === -1) {
      return { success: false, message: 'Task tidak ditemukan.' };
    }

    // 2. Kumpulkan baris-baris task yang harus ikut dipindahkan (sepaket)
    const rows_to_update = [main_row_index];
    const moved_task_ids = [String(task_id).trim()];

    if (parent_idx !== -1) {
      if (main_task_level === 1) {
        // Level 1 (Inisiatif): Temukan semua anak Level 0
        const child_l0_ids = [];
        for (let r = 1; r < task_values.length; r++) {
          const p_id = String(task_values[r][parent_idx] || '').trim();
          if (p_id === String(task_id).trim()) {
            rows_to_update.push(r + 1);
            const cid = String(task_values[r][id_idx]).trim();
            child_l0_ids.push(cid);
            moved_task_ids.push(cid);
          }
        }
        // Temukan subtask dari anak-anak Level 0 tersebut
        if (child_l0_ids.length > 0) {
          for (let r = 1; r < task_values.length; r++) {
            const p_id = String(task_values[r][parent_idx] || '').trim();
            if (child_l0_ids.includes(p_id)) {
              rows_to_update.push(r + 1);
              moved_task_ids.push(String(task_values[r][id_idx]).trim());
            }
          }
        }
      } else if (main_task_level === 0) {
        // Level 0: Temukan semua subtask langsung (Level -1)
        for (let r = 1; r < task_values.length; r++) {
          const p_id = String(task_values[r][parent_idx] || '').trim();
          if (p_id === String(task_id).trim()) {
            rows_to_update.push(r + 1);
            moved_task_ids.push(String(task_values[r][id_idx]).trim());
          }
        }
      }
    }

    // 3. Update sprint_id dan updated_at pada semua baris yang relevan
    const now_ts = new Date().toISOString();
    rows_to_update.forEach(rowIndex => {
      sheet_tasks.getRange(rowIndex, sp_idx + 1).setValue(target_sprint_id);
      sheet_tasks.getRange(rowIndex, updated_idx + 1).setValue(now_ts);
    });

    const sub_count = moved_task_ids.length - 1;
    const msg = sub_count > 0
      ? `Task ${task_id} beserta ${sub_count} subtask/turunan berhasil dialokasikan ke bucket.`
      : `Task ${task_id} berhasil dialokasikan ke bucket.`;

    return {
      success: true,
      message: msg,
      data: {
        task_id: task_id,
        moved_task_ids: moved_task_ids,
        target_sprint_id: target_sprint_id
      }
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

/**
 * Mengambil rincian lengkap suatu work item beserta audit trail & kalkulasi Time-in-Status
 * untuk kebutuhan Modern Jira-Style Task Detail Modal.
 *
 * @param {string} task_id - ID unik task (contoh: 'TSK-001')
 * @return {Object} Payload { success: boolean, data?: Object, message?: string }
 */
function get_task_audit_detail(task_id) {
  try {
    if (!task_id || !String(task_id).trim()) {
      return { success: false, message: 'ID task tidak valid.' };
    }

    const spreadsheet = get_db_spreadsheet();
    const sheet_tasks = spreadsheet.getSheetByName('Tasks');
    const sheet_history = spreadsheet.getSheetByName('Task_History');
    const sheet_users = spreadsheet.getSheetByName('Users');
    const sheet_sprints = spreadsheet.getSheetByName('Sprints');

    if (!sheet_tasks) {
      return { success: false, message: 'Sheet Tasks tidak ditemukan.' };
    }

    const task_values = sheet_tasks.getDataRange().getValues();
    const t_hdr = task_values[0].map(h => String(h).trim().toLowerCase());
    const id_idx = t_hdr.indexOf('id');
    const sp_idx = t_hdr.indexOf('sprint_id');
    const title_idx = t_hdr.indexOf('title');
    const status_idx = t_hdr.indexOf('status');
    const assignee_idx = t_hdr.indexOf('assignee_id');
    const est_idx = t_hdr.indexOf('estimate_hours');
    const created_idx = t_hdr.indexOf('created_at');
    const updated_idx = t_hdr.indexOf('updated_at');
    const type_idx = t_hdr.indexOf('work_type');
    const lvl_idx = t_hdr.indexOf('hierarchy_level');
    const parent_idx = t_hdr.indexOf('parent_id');
    const desc_idx = t_hdr.indexOf('description');
    const pts_idx = t_hdr.indexOf('story_points');

    let found_row = null;
    for (let r = 1; r < task_values.length; r++) {
      if (String(task_values[r][id_idx]).trim() === String(task_id).trim()) {
        found_row = task_values[r];
        break;
      }
    }

    if (!found_row) {
      return { success: false, message: 'Task dengan ID ' + task_id + ' tidak ditemukan.' };
    }

    // Lookup users map
    const user_map = {};
    if (sheet_users && sheet_users.getLastRow() > 1) {
      const u_vals = sheet_users.getDataRange().getValues();
      for (let u = 1; u < u_vals.length; u++) {
        user_map[String(u_vals[u][0]).trim()] = {
          id: u_vals[u][0],
          name: u_vals[u][1],
          role: u_vals[u][3] || 'MEMBER',
          email: u_vals[u][2]
        };
      }
    }

    // Lookup sprint name & project
    const sprint_id = String(found_row[sp_idx] || '').trim();
    let sprint_name = sprint_id;
    let project_name = 'Enterprise Banking Core';
    if (sheet_sprints && sheet_sprints.getLastRow() > 1) {
      const sp_vals = sheet_sprints.getDataRange().getValues();
      const sp_h = sp_vals[0].map(h => String(h).trim().toLowerCase());
      const s_id_idx = sp_h.indexOf('id');
      const s_name_idx = sp_h.indexOf('name');
      const s_prj_idx = sp_h.indexOf('project_id');
      for (let s = 1; s < sp_vals.length; s++) {
        if (String(sp_vals[s][s_id_idx]).trim() === sprint_id) {
          sprint_name = sp_vals[s][s_name_idx] || sprint_id;
          if (s_prj_idx !== -1 && sp_vals[s][s_prj_idx]) {
            project_name = sp_vals[s][s_prj_idx];
          }
          break;
        }
      }
    }

    const assignee_id = String(found_row[assignee_idx] || '').trim();
    const assignee_user = user_map[assignee_id] || { name: assignee_id || 'Unassigned', role: 'ENGINEERING' };
    
    // Parent info
    const parent_id = parent_idx !== -1 && found_row[parent_idx] ? String(found_row[parent_idx]).trim() : '';
    let parent_title = '';
    let parent_type = '';
    if (parent_id) {
      for (let r = 1; r < task_values.length; r++) {
        if (String(task_values[r][id_idx]).trim() === parent_id) {
          parent_title = task_values[r][title_idx];
          parent_type = type_idx !== -1 ? task_values[r][type_idx] : 'TASK';
          break;
        }
      }
    }

    // Audit logs from Task_History
    const task_histories = [];
    if (sheet_history && sheet_history.getLastRow() > 1) {
      const h_vals = sheet_history.getDataRange().getValues();
      const h_hdr = h_vals[0].map(h => String(h).trim().toLowerCase());
      const h_t_idx = h_hdr.indexOf('task_id');
      const h_old_idx = h_hdr.indexOf('old_status');
      const h_new_idx = h_hdr.indexOf('new_status');
      const h_by_idx = h_hdr.indexOf('changed_by');
      const h_time_idx = h_hdr.indexOf('timestamp');

      for (let h = 1; h < h_vals.length; h++) {
        if (String(h_vals[h][h_t_idx]).trim() === String(task_id).trim()) {
          task_histories.push({
            old_status: String(h_vals[h][h_old_idx]).toUpperCase().trim(),
            new_status: String(h_vals[h][h_new_idx]).toUpperCase().trim(),
            changed_by: h_vals[h][h_by_idx],
            timestamp: h_vals[h][h_time_idx]
          });
        }
      }
    }

    // Sort histories ascending
    task_histories.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate time in each status
    const created_at_str = found_row[created_idx] || new Date().toISOString();
    const created_time = new Date(created_at_str);
    const now = new Date();

    const durations = {
      TODO: 0,
      IN_PROGRESS: 0,
      REVIEW: 0,
      DONE: 0
    };

    let prev_status = 'TODO';
    let prev_time = created_time;

    for (let i = 0; i < task_histories.length; i++) {
      const h = task_histories[i];
      const h_time = new Date(h.timestamp);
      const diff_hours = Math.max(0, (h_time.getTime() - prev_time.getTime()) / (1000 * 3600));
      if (durations[prev_status] !== undefined) {
        durations[prev_status] += diff_hours;
      }
      prev_status = h.new_status;
      prev_time = h_time;
    }

    // Duration in final status until now (or if DONE, up to final update)
    const current_status = String(found_row[status_idx]).toUpperCase().trim();
    const final_end_time = current_status === 'DONE' ? prev_time : now;
    const final_diff = Math.max(0, (final_end_time.getTime() - prev_time.getTime()) / (1000 * 3600));
    if (durations[current_status] !== undefined) {
      durations[current_status] += final_diff;
    }

    // Fallback if no history exists yet: entire duration since creation is in current status
    const total_task_hours = Object.values(durations).reduce((a, b) => a + b, 0);
    if (total_task_hours === 0) {
      const diff_since_create = Math.max(0, (now.getTime() - created_time.getTime()) / (1000 * 3600));
      durations[current_status] = diff_since_create;
    }

    const todo_h = Number(durations.TODO.toFixed(1));
    const in_prog_h = Number(durations.IN_PROGRESS.toFixed(1));
    const review_h = Number(durations.REVIEW.toFixed(1));
    const done_h = Number(durations.DONE.toFixed(1));
    const total_h = Number((todo_h + in_prog_h + review_h + done_h).toFixed(1));

    const raw_type = type_idx !== -1 ? String(found_row[type_idx] || 'TASK').toUpperCase().trim() : 'TASK';
    const raw_level = lvl_idx !== -1 && found_row[lvl_idx] !== '' ? Number(found_row[lvl_idx]) : get_work_type_level(raw_type);

    return {
      success: true,
      data: {
        task: {
          id: String(found_row[id_idx]),
          title: String(found_row[title_idx]),
          status: current_status,
          work_type: raw_type,
          hierarchy_level: raw_level,
          estimate_hours: Number(found_row[est_idx]) || 0,
          story_points: pts_idx !== -1 && found_row[pts_idx] !== '' ? String(found_row[pts_idx]) : '',
          description: desc_idx !== -1 ? String(found_row[desc_idx] || '') : '',
          parent_id: parent_id,
          parent_title: parent_title,
          parent_type: parent_type,
          sprint_id: sprint_id,
          sprint_name: sprint_name,
          project_name: project_name,
          created_at: created_at_str,
          updated_at: found_row[updated_idx] || created_at_str,
          assignee: {
            id: assignee_id,
            name: assignee_user.name,
            role: assignee_user.role || 'Senior Developer',
            initials: get_user_initials(assignee_user.name)
          },
          reporter: {
            name: 'Budi Hartono',
            role: 'Product Lead / PM',
            initials: 'BH'
          }
        },
        audit: {
          total_hours: total_h,
          todo_hours: todo_h,
          in_progress_hours: in_prog_h,
          review_hours: review_h,
          done_hours: done_h,
          histories: task_histories
        }
      }
    };
  } catch (error) {
    return { success: false, message: 'Gagal mengambil detail audit task: ' + error.message };
  }
}

/**
 * Helper untuk mendapatkan inisial 2 huruf dari nama user
 * @param {string} name
 * @return {string} Inisial 2 karakter kapital
 */
function get_user_initials(name) {
  if (!name || typeof name !== 'string') return 'NA';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}