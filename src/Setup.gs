/**
 * @fileoverview Setup helper script & Seed Data Simulator
 * Alternate Project Delivery (LITE).
 */

const SPREADSHEET_SCHEMA = {
  Users: ['id', 'name', 'email', 'role', 'permissions'],
  Projects: ['id', 'name', 'pm_id'],
  Sprints: ['id', 'project_id', 'name', 'start_date', 'end_date'],
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
      // Pastikan kolom baru (seperti permissions di Users) ditambahkan jika sheet sudah ada sebelumnya
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

  // 2. Data Dummy Users
  const users_data = [
    ['USR-001', 'Admin Utama', 'admin@example.com', 'ADMIN'],
    ['USR-002', 'Budi PM', 'pm@example.com', 'PM'],
    ['USR-003', 'Siti Developer', 'dev@example.com', 'MEMBER'],
    ['USR-004', 'Rian QA Engineer', 'qa@example.com', 'MEMBER'],
    ['USR-005', 'Klien Eksternal PT ABC', 'client@example.com', 'CLIENT']
  ];

  // 3. Data Dummy Projects
  const projects_data = [
    ['PRJ-001', 'Website Redesign & Portal Delivery', 'USR-002']
  ];

  // 4. Data Dummy Sprints
  const sprints_data = [
    ['SPR-001', 'PRJ-001', 'Sprint 1 - Foundations & Core Flow', '2026-10-01', '2026-10-10']
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
