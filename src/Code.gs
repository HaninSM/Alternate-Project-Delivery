/**
 * @fileoverview Entry point Google Apps Script Web App dan routing RBAC dasar.
 * Alternate Project Delivery (LITE).
 */

/**
 * ID Google Spreadsheet yang digunakan sebagai database.
 * Jika script dibuat sebagai Container-bound Script (Extensions > Apps Script di Sheets),
 * biarkan string kosong ('') agar otomatis memanggil SpreadsheetApp.getActiveSpreadsheet().
 * Jika Standalone Script, masukkan ID Spreadsheet di sini.
 */
const SPREADSHEET_ID = '';

/**
 * Helper untuk mengambil instance spreadsheet aktif atau berdasarkan SPREADSHEET_ID.
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet} Objek Spreadsheet.
 */
function get_db_spreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== '') {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  const active_ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!active_ss) {
    throw new Error('Spreadsheet tidak terdeteksi. Silakan isi SPREADSHEET_ID di Code.gs.');
  }
  return active_ss;
}

/**
 * Entry point HTTP GET untuk Web App HTML Service.
 *
 * @param {Object} e - Event parameter dari HTTP GET request.
 * @return {GoogleAppsScript.HTML.HtmlOutput} Halaman HTML yang telah dievaluasi.
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  
  // Set meta data & konfigurasi tampilan
  return template
    .evaluate()
    .setTitle('Alternate Project Delivery')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper untuk menyisipkan konten berkas HTML/CSS/JS lain ke dalam template utama.
 * Memungkinkan pemisahan modular UI (Index.html, UI.html, js_main.html).
 *
 * @param {string} filename - Nama file HTML (tanpa ekstensi .html).
 * @return {string} Konten file yang disisipkan.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Definisi Preset Izin Akses Bawaan (Default Permissions Matrix)
 */
const DEFAULT_PERMISSIONS = {
  ADMIN: {
    can_create_project: true,
    can_manage_sprint: true,
    can_create_task: true,
    can_move_task: true,
    can_view_insights: true,
    can_manage_users: true
  },
  PM: {
    can_create_project: true,
    can_manage_sprint: true,
    can_create_task: true,
    can_move_task: true,
    can_view_insights: true,
    can_manage_users: false
  },
  MEMBER: {
    can_create_project: false,
    can_manage_sprint: false,
    can_create_task: false,
    can_move_task: true,
    can_view_insights: true,
    can_manage_users: false
  },
  CLIENT: {
    can_create_project: false,
    can_manage_sprint: false,
    can_create_task: false,
    can_move_task: false,
    can_view_insights: true,
    can_manage_users: false
  }
};

/**
 * Helper untuk mengurai dan menggabungkan izin granular user
 *
 * @param {string} role - Role pengguna ('ADMIN', 'PM', 'MEMBER', 'CLIENT')
 * @param {string|Object} [permissions_input] - JSON string atau objek izin dari sheet Users
 * @return {Object} Objek izin granular lengkap
 */
function resolve_user_permissions(role, permissions_input) {
  const formatted_role = String(role || 'CLIENT').toUpperCase().trim();
  const base_perms = Object.assign({}, DEFAULT_PERMISSIONS[formatted_role] || DEFAULT_PERMISSIONS.CLIENT);
  if (!permissions_input) return base_perms;

  let parsed = null;
  if (typeof permissions_input === 'object' && permissions_input !== null) {
    parsed = permissions_input;
  } else if (typeof permissions_input === 'string' && permissions_input.trim() !== '') {
    try {
      parsed = JSON.parse(permissions_input);
    } catch (e) {
      return base_perms;
    }
  }

  if (parsed && typeof parsed === 'object') {
    return Object.assign({}, base_perms, parsed);
  }
  return base_perms;
}

/**
 * Mengidentifikasi email Google pengguna aktif dan mencocokkannya dengan sheet Users.
 * Mengembalikan informasi profil pengguna beserta role aksesnya dan izin granular.
 *
 * @return {Object} Objek profil pengguna { success: boolean, data: { id, name, email, role, permissions } }
 */
function get_user_role() {
  try {
    const user_email = Session.getActiveUser().getEmail().toLowerCase().trim();
    const spreadsheet = get_db_spreadsheet();
    const sheet_users = spreadsheet.getSheetByName('Users');

    if (!sheet_users) {
      return {
        success: false,
        message: 'Sheet "Users" belum ditemukan. Jalankan setup_database_schema terlebih dahulu.'
      };
    }

    const data_values = sheet_users.getDataRange().getValues();
    if (data_values.length <= 1) {
      // Tidak ada data user selain header baris 1
      return {
        success: true,
        data: {
          id: 'GUEST',
          name: user_email || 'Tamu Google',
          email: user_email,
          role: 'CLIENT',
          permissions: DEFAULT_PERMISSIONS.CLIENT
        }
      };
    }

    const header = data_values[0].map(h => String(h).trim().toLowerCase());
    const email_index = header.indexOf('email');
    const id_index = header.indexOf('id');
    const name_index = header.indexOf('name');
    const role_index = header.indexOf('role');
    const perm_index = header.indexOf('permissions');

    // Cari baris yang cocok dengan email pengguna aktif
    for (let row_idx = 1; row_idx < data_values.length; row_idx++) {
      const row = data_values[row_idx];
      const registered_email = String(row[email_index]).toLowerCase().trim();

      if (user_email && registered_email === user_email) {
        const user_role = String(row[role_index]).toUpperCase().trim();
        const raw_perm = perm_index !== -1 ? row[perm_index] : null;
        return {
          success: true,
          data: {
            id: row[id_index],
            name: row[name_index],
            email: registered_email,
            role: user_role,
            permissions: resolve_user_permissions(user_role, raw_perm)
          }
        };
      }
    }

    // Jika email pengguna belum terdaftar di database Users
    return {
      success: true,
      data: {
        id: 'UNREGISTERED',
        name: user_email || 'Pengguna Tidak Terdaftar',
        email: user_email,
        role: 'CLIENT',
        permissions: DEFAULT_PERMISSIONS.CLIENT
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Gagal mendapatkan data user role: ' + error.message
    };
  }
}
