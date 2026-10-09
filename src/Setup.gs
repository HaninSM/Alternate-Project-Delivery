/**
 * @fileoverview Setup helper script & Seed Data Simulator
 * Alternate Project Delivery (LITE).
 */

const SPREADSHEET_SCHEMA = {
  Users: ['id', 'name', 'email', 'role', 'permissions'],
  Projects: ['id', 'name', 'pm_id'],
  Sprints: ['id', 'project_id', 'name', 'start_date', 'end_date', 'status'],
  Tasks: ['id', 'sprint_id', 'title', 'status', 'assignee_id', 'estimate_hours', 'created_at', 'updated_at'],
  Task_History: ['id', 'task_id', 'old_status', 'new_status', 'changed_by', 'timestamp']
};

function setup_database_schema(target_spreadsheet_id) {
  let spreadsheet = (target_spreadsheet_id && target_spreadsheet_id.trim() !== '') 
    ? SpreadsheetApp.openById(target_spreadsheet_id) 
    : get_db_spreadsheet();

  for (const [sheet_name, headers] of Object.entries(SPREADSHEET_SCHEMA)) {
    let sheet = spreadsheet.getSheetByName(sheet_name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheet_name);
      sheet.appendRow(headers);
      const header_range = sheet.getRange(1, 1, 1, headers.length);
      header_range.setFontWeight('bold');
      header_range.setBackground('#E2E8F0');
    } else {
      // Pastikan kolom baru (seperti permissions di Users dan status di Sprints) ditambahkan jika sheet sudah ada sebelumnya
      const existing_headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(h => String(h).trim().toLowerCase());
      headers.forEach((h_name, idx) => {
        if (!existing_headers.includes(h_name.toLowerCase())) {
          const col_idx = idx + 1;
          const cell = sheet.getRange(1, col_idx);
          cell.setValue(h_name);
          cell.setFontWeight('bold');
          cell.setBackground('#E2E8F0');
        }
      });
    }

    // Khusus sheet Users: jika ada baris data yang kolom permissions-nya kosong, backfill otomatis
    if (sheet_name === 'Users' && sheet.getLastRow() > 1) {
      const u_values = sheet.getDataRange().getValues();
      const u_header = u_values[0].map(h => String(h).trim().toLowerCase());
      const role_idx = u_header.indexOf('role');
      const perm_idx = u_header.indexOf('permissions');
      if (role_idx !== -1 && perm_idx !== -1) {
        for (let r = 1; r < u_values.length; r++) {
          const current_perm_val = u_values[r][perm_idx];
          if (!current_perm_val || String(current_perm_val).trim() === '') {
            const row_role = String(u_values[r][role_idx] || 'MEMBER').toUpperCase().trim();
            const perm_obj = (typeof DEFAULT_PERMISSIONS !== 'undefined' && DEFAULT_PERMISSIONS[row_role]) 
              ? DEFAULT_PERMISSIONS[row_role] 
              : { can_create_project: false, can_manage_sprint: false, can_create_task: false, can_move_task: true, can_view_insights: true, can_view_cycle_time: true, can_manage_users: false };
            sheet.getRange(r + 1, perm_idx + 1).setValue(JSON.stringify(perm_obj));
          }
        }
      }
    }

    // Khusus sheet Sprints: jika ada baris yang kolom status-nya kosong, beri status 'ACTIVE'
    if (sheet_name === 'Sprints' && sheet.getLastRow() > 1) {
      const sp_values = sheet.getDataRange().getValues();
      const sp_header = sp_values[0].map(h => String(h).trim().toLowerCase());
      const sp_status_idx = sp_header.indexOf('status');
      if (sp_status_idx !== -1) {
        for (let r = 1; r < sp_values.length; r++) {
          const current_sp_status = sp_values[r][sp_status_idx];
          if (!current_sp_status || String(current_sp_status).trim() === '') {
            sheet.getRange(r + 1, sp_status_idx + 1).setValue('ACTIVE');
          }
        }
      }
    }
  }

  // Hapus sheet default jika ada (baik 'Sheet1' maupun 'Sheet 1')
  try {
    const default_sheet = spreadsheet.getSheetByName('Sheet1') || spreadsheet.getSheetByName('Sheet 1');
    if (default_sheet && spreadsheet.getSheets().length > 1 && default_sheet.getLastRow() === 0) {
      spreadsheet.deleteSheet(default_sheet);
    }
  } catch (e) {
    // Abaikan jika tidak bisa dihapus
  }
}

function seed_dummy_data(target_spreadsheet_id) {
  let spreadsheet = (target_spreadsheet_id && target_spreadsheet_id.trim() !== '') 
    ? SpreadsheetApp.openById(target_spreadsheet_id) 
    : get_db_spreadsheet();

  // 1. Buat tab dan header terlebih dahulu
  setup_database_schema(target_spreadsheet_id);

  // Ambil email akun Google aktif yang mengeksekusi seed data
  let active_email = '';
  try {
    if (typeof get_active_user_email === 'function') {
      active_email = get_active_user_email();
    } else {
      active_email = Session.getActiveUser().getEmail().toLowerCase().trim();
    }
  } catch (e) {}

  const default_admin_perm = (typeof DEFAULT_PERMISSIONS !== 'undefined' && DEFAULT_PERMISSIONS.ADMIN) 
    ? JSON.stringify(DEFAULT_PERMISSIONS.ADMIN) 
    : '{"can_create_project":true,"can_manage_sprint":true,"can_create_task":true,"can_move_task":true,"can_view_insights":true,"can_view_cycle_time":true,"can_manage_users":true}';
  const default_pm_perm = (typeof DEFAULT_PERMISSIONS !== 'undefined' && DEFAULT_PERMISSIONS.PM) 
    ? JSON.stringify(DEFAULT_PERMISSIONS.PM) 
    : '{"can_create_project":true,"can_manage_sprint":true,"can_create_task":true,"can_move_task":true,"can_view_insights":true,"can_view_cycle_time":true,"can_manage_users":false}';
  const default_member_perm = (typeof DEFAULT_PERMISSIONS !== 'undefined' && DEFAULT_PERMISSIONS.MEMBER) 
    ? JSON.stringify(DEFAULT_PERMISSIONS.MEMBER) 
    : '{"can_create_project":false,"can_manage_sprint":false,"can_create_task":false,"can_move_task":true,"can_view_insights":true,"can_view_cycle_time":true,"can_manage_users":false}';
  const default_client_perm = (typeof DEFAULT_PERMISSIONS !== 'undefined' && DEFAULT_PERMISSIONS.CLIENT) 
    ? JSON.stringify(DEFAULT_PERMISSIONS.CLIENT) 
    : '{"can_create_project":false,"can_manage_sprint":false,"can_create_task":false,"can_move_task":false,"can_view_insights":true,"can_view_cycle_time":true,"can_manage_users":false}';

  // 2. Data Dummy Users (5 Kolom Lengkap)
  const users_data = [
    ['USR-001', 'Admin Utama', 'admin@example.com', 'ADMIN', default_admin_perm],
    ['USR-002', 'Budi PM', 'pm@example.com', 'PM', default_pm_perm],
    ['USR-003', 'Siti Developer', 'dev@example.com', 'MEMBER', default_member_perm],
    ['USR-004', 'Rian QA Engineer', 'qa@example.com', 'MEMBER', default_member_perm],
    ['USR-005', 'Klien Eksternal PT ABC', 'client@example.com', 'CLIENT', default_client_perm]
  ];

  // Jika akun Google aktif terdeteksi dan belum ada di daftar, daftarkan sebagai ADMIN utama!
  if (active_email && !users_data.some(u => u[2] === active_email)) {
    const admin_display_name = 'Admin (' + (active_email.split('@')[0] || 'User') + ')';
    users_data.unshift([
      'USR-000',
      admin_display_name,
      active_email,
      'ADMIN',
      default_admin_perm
    ]);
  }

  // 3. Data Dummy Projects
  const projects_data = [
    ['PRJ-001', 'Website Redesign & Portal Delivery', 'USR-002']
  ];

  // 4. Data Dummy Sprints
  const sprints_data = [
    ['SPR-001', 'PRJ-001', 'Sprint 1 - Foundations & Core Flow', '2026-10-01', '2026-10-10', 'ACTIVE']
  ];

  // 5. Data Dummy Tasks
  const tasks_data = [
    ['TSK-001', 'SPR-001', 'Setup Database Schema & Google Sheets Tabs', 'DONE', 'USR-003', 8, '2026-10-01T08:00:00Z', '2026-10-02T16:00:00Z'],
    ['TSK-002', 'SPR-001', 'Implementasi Shell UI Tailwind CSS & SPA', 'DONE', 'USR-003', 12, '2026-10-01T09:00:00Z', '2026-10-03T18:00:00Z'],
    ['TSK-003', 'SPR-001', 'Time-in-Status Engine & Audit Trail', 'REVIEW', 'USR-003', 16, '2026-10-02T10:00:00Z', '2026-10-05T14:00:00Z'],
    ['TSK-004', 'SPR-001', 'Integrasi API Gateway Payment Provider', 'IN_PROGRESS', 'USR-004', 14, '2026-10-02T11:00:00Z', '2026-10-04T09:00:00Z'],
    ['TSK-005', 'SPR-001', 'Burndown Chart Visualization & Metrics', 'IN_PROGRESS', 'USR-003', 10, '2026-10-06T08:00:00Z', '2026-10-07T10:00:00Z'],
    ['TSK-006', 'SPR-001', 'UAT Bersama Klien Eksternal & Release Notes', 'TODO', 'USR-002', 8, '2026-10-01T08:00:00Z', '2026-10-01T08:00:00Z']
  ];

  // 6. Data Dummy Task_History
  const history_data = [
    ['HIS-001', 'TSK-001', 'TODO', 'IN_PROGRESS', 'dev@example.com', '2026-10-01T10:00:00Z'],
    ['HIS-002', 'TSK-001', 'IN_PROGRESS', 'DONE', 'pm@example.com', '2026-10-02T16:00:00Z'],
    ['HIS-003', 'TSK-002', 'TODO', 'IN_PROGRESS', 'dev@example.com', '2026-10-02T08:00:00Z'],
    ['HIS-004', 'TSK-002', 'IN_PROGRESS', 'DONE', 'pm@example.com', '2026-10-03T18:00:00Z'],
    ['HIS-005', 'TSK-003', 'TODO', 'IN_PROGRESS', 'dev@example.com', '2026-10-03T09:00:00Z'],
    ['HIS-006', 'TSK-003', 'IN_PROGRESS', 'REVIEW', 'dev@example.com', '2026-10-05T14:00:00Z'],
    ['HIS-007', 'TSK-004', 'TODO', 'IN_PROGRESS', 'qa@example.com', '2026-10-04T09:00:00Z'],
    ['HIS-008', 'TSK-005', 'TODO', 'IN_PROGRESS', 'dev@example.com', '2026-10-06T10:00:00Z']
  ];

  populate_sheet(spreadsheet, 'Users', users_data);
  populate_sheet(spreadsheet, 'Projects', projects_data);
  populate_sheet(spreadsheet, 'Sprints', sprints_data);
  populate_sheet(spreadsheet, 'Tasks', tasks_data);
  populate_sheet(spreadsheet, 'Task_History', history_data);

  Logger.log('Injeksi Seed Dummy Data Sukses!');
}

function populate_sheet(spreadsheet, sheet_name, rows) {
  const sheet = spreadsheet.getSheetByName(sheet_name);
  if (!sheet) return;
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}
