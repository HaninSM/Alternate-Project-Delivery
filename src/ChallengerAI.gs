/**
 * @fileoverview Controller untuk AI Product Challenger (Gemini API) dan Demand Management.
 * Alternate Project Delivery (LITE).
 */

/**
 * Mengambil API Key Gemini secara aman dari ScriptProperties (Environment Secret).
 * Konfigurasi via Google Apps Script:
 * Project Settings (ikon roda gigi) > Script Properties > Add script property:
 * Property: GEMINI_API_KEY
 * Value: <API Key Gemini Anda>
 *
 * @return {string} API key aktif
 */
function get_gemini_api_key() {
  let key = '';
  try {
    key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '';
  } catch (e) {}
  if (!key || key.trim() === '') {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di Script Properties. Silakan buka Project Settings (ikon ⚙️) di Google Apps Script > Script Properties > Add: GEMINI_API_KEY.');
  }
  return key.trim();
}

/**
 * Helper utilitas untuk menyimpan GEMINI_API_KEY ke ScriptProperties dari console Apps Script.
 * @param {string} api_key - API Key Gemini
 * @return {string} Pesan status
 */
function set_gemini_api_key_property(api_key) {
  if (api_key && api_key.trim()) {
    PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', api_key.trim());
    return 'GEMINI_API_KEY berhasil disimpan ke Script Properties.';
  }
  throw new Error('API Key tidak boleh kosong.');
}

/**
 * Jalankan fungsi ini satu kali di Apps Script Editor (pilih test_gemini_connection lalu klik Run ▶) untuk:
 * 1. Memicu dialog otorisasi izin jaringan Google (Review Permissions -> Allow script.external_request)
 * 2. Memverifikasi koneksi Gemini API aktif
 */
function test_gemini_connection() {
  const apiKey = get_gemini_api_key();
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=' + apiKey;
  const payload = {
    contents: [{ parts: [{ text: 'Halo' }] }]
  };
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  Logger.log('HTTP Status Code: ' + code);
  Logger.log('Response: ' + res.getContentText());
  if (code === 200) {
    Logger.log('✅ SUKSES: Izin UrlFetchApp aktif & Gemini API berhasil merespons!');
  } else {
    Logger.log('⚠️ GAGAL: Response Code ' + code);
  }
  return code === 200 ? 'SUKSES' : 'GAGAL';
}

/**
 * System prompt rahasia server-side: Senior Product Challenger (ex-CPO / Head of Product)
 * @return {string} System prompt
 */
function get_product_challenger_system_prompt() {
  return `Kamu bertindak sebagai Senior Product Challenger (ex-CPO / Head of Product) dengan pengalaman di perusahaan finansial / multifinance / enterprise system.

Peran kamu:
- Menantang (challenge) setiap inisiatif Product Owner secara kritis
- Tidak sungkan menyatakan "tidak ada value" jika memang lemah
- Fokus pada dampak bisnis, operasional, risiko, dan eksekusi
- Tidak menerima jawaban normatif atau jargon

Aturan interaksi:
- Ini adalah sesi tanya jawab dua arah (interactive)
- Kamu boleh dan harus bertanya balik untuk menguji kedalaman analisis PO
- Jika asumsi salah atau dangkal, koreksi langsung dan jelaskan seharusnya bagaimana
- Jawaban ringkas, tajam, dan to the point

Alur kerja WAJIB:
1. Minta penjelasan singkat inisiatif (1–2 paragraf)
2. Challenge secara keras dari sisi:
   - Problem validity
   - Target user & pain point
   - Business impact (revenue, cost, risk, efficiency)
   - Operasional & dependency
   - Apakah ini solusi atau cuma fitur   
   - Development cost (Total Engineer dan Durasi Real)
3. Jika inisiatif TIDAK punya value:
   - Katakan secara eksplisit bahwa inisiatif ini tidak layak
   - Jelaskan kenapa (dalam poin-poin)
   - Hentikan tanpa membuat PRD/FSD
4. Jika inisiatif PUNYA value:
   - Refine problem statement
   - Bantu breakdown solusi
   - Buatkan:
     a. PRD (tujuan, scope, non-scope, success metric)
     b. FSD (alur proses, rule utama, dependency)
     c. User Stories + Acceptance Criteria
5. Tutup dengan:
   - Risiko utama
   - Asumsi yang wajib divalidasi
   - Pertanyaan lanjutan ke Product Owner

Larangan:
- Jangan bersikap terlalu sopan
- Jangan mengiyakan ide yang lemah
- Jangan langsung lompat ke solusi sebelum problem tervalidasi
- Jangan pakai buzzword tanpa definisi jelas

Mulai sesi dengan:
"Silakan jelaskan inisiatif produk yang ingin kamu ajukan. Ringkas dan konkret."

FORMAT STATUS WAJIB:
Di akhir setiap responmu pada baris paling bawah, cantumkan status evaluasi menggunakan format tag persis:
Jika sesi masih tanya jawab / menantang PO:
<<<DECISION: IN_PROGRESS>>>
Jika inisiatif TIDAK punya value / ditolak:
<<<DECISION: REJECTED>>>
<<<NOTE: Alasan ringkas penolakan>>>
Jika inisiatif PUNYA value dan kamu telah menyetujui serta membuatkan PRD/FSD lengkap:
<<<DECISION: APPROVED>>>
<<<EST_ENGINEERS: [perkiraan total engineer, contoh: 3]>>>
<<<EST_DAYS: [perkiraan durasi hari kerja, contoh: 20]>>>
<<<NOTE: Ringkasan singkat value dan persetujuan inisiatif>>>`;
}

/**
 * Eksekusi pemanggilan Gemini REST API via UrlFetchApp.
 * @param {Array<Object>} contents_array - Array percakapan alternating user & model
 * @return {string} Respon mentah teks dari Gemini
 */
function call_gemini_api(contents_array) {
  const apiKey = get_gemini_api_key();

  const primaryModel = 'gemini-3.8-flash';
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + primaryModel + ':generateContent?key=' + apiKey;

  const payload = {
    system_instruction: {
      parts: [
        { text: get_product_challenger_system_prompt() }
      ]
    },
    contents: contents_array,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 3000
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  let response = UrlFetchApp.fetch(url, options);
  let code = response.getResponseCode();
  let responseText = response.getContentText();

  // Fallback ke model 2.5-flash jika 3.8-flash bermasalah
  if (code !== 200) {
    const fallbackUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
    const fallbackResp = UrlFetchApp.fetch(fallbackUrl, options);
    if (fallbackResp.getResponseCode() === 200) {
      response = fallbackResp;
      code = 200;
      responseText = fallbackResp.getContentText();
    }
  }

  if (code !== 200) {
    let errMsg = 'Gemini API Error (' + code + ')';
    try {
      const errObj = JSON.parse(responseText);
      if (errObj.error && errObj.error.message) {
        errMsg = errObj.error.message;
      }
    } catch (e) {}
    throw new Error(errMsg);
  }

  const data = JSON.parse(responseText);
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('Gemini tidak memberikan kandidat respon.');
  }
  const candidate = data.candidates[0];
  const parts = candidate.content && candidate.content.parts;
  if (!parts || parts.length === 0) {
    throw new Error('Format konten Gemini kosong.');
  }
  return parts.map(p => p.text || '').join('');
}

/**
 * Mengurai tag tersembunyi dari respon AI Challenger (DECISION, NOTE, EST_ENGINEERS, EST_DAYS).
 * @param {string} raw_ai_text - Teks respon asli AI
 * @return {Object} { cleanText, decision, note, estEngineers, estDays }
 */
function parse_challenger_decision(raw_ai_text) {
  const text = String(raw_ai_text || '');
  
  let decision = 'IN_PROGRESS';
  const decMatch = text.match(/<<<DECISION:\s*(APPROVED|REJECTED|IN_PROGRESS)>>>/i);
  if (decMatch) {
    decision = decMatch[1].toUpperCase();
  } else {
    // Heuristic fallback
    if (text.includes('tidak layak') || text.includes('tidak memiliki value') || text.includes('TIDAK punya value')) {
      decision = 'REJECTED';
    } else if (text.includes('PRD') && text.includes('FSD') && (text.includes('PUNYA value') || text.includes('layak') || text.includes('disetujui'))) {
      decision = 'APPROVED';
    }
  }

  let note = '';
  const noteMatch = text.match(/<<<NOTE:\s*([\s\S]*?)>>>/i);
  if (noteMatch) {
    note = noteMatch[1].trim();
  }

  let estEngineers = 3;
  const engMatch = text.match(/<<<EST_ENGINEERS:\s*(\d+)>>>/i);
  if (engMatch) {
    estEngineers = parseInt(engMatch[1], 10);
  }

  let estDays = 20;
  const daysMatch = text.match(/<<<EST_DAYS:\s*(\d+)>>>/i);
  if (daysMatch) {
    estDays = parseInt(daysMatch[1], 10);
  }

  // Bersihkan tag dari teks yang akan ditampilkan ke user di chat interface
  const cleanText = text.replace(/<<<(DECISION|NOTE|EST_ENGINEERS|EST_DAYS):[\s\S]*?>>>/gi, '').trim();

  return {
    cleanText: cleanText,
    decision: decision,
    note: note,
    estEngineers: estEngineers,
    estDays: estDays
  };
}

/**
 * Memulai sesi uji inisiatif baru dengan Challenger AI.
 * Kesan: AI yang bertanya pertama kali secara natural.
 *
 * @param {string} initiative_title - Judul inisiatif produk
 * @return {Object} Detail sesi baru
 */
function start_initiative_session(initiative_title) {
  try {
    const user_profile = get_user_role();
    const user_email = user_profile.data ? user_profile.data.email : 'unknown';
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (permissions.can_test_initiative === false) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk menguji inisiatif produk.' };
    }

    const title = (initiative_title && initiative_title.trim()) ? initiative_title.trim() : 'Inisiatif Produk Baru';
    const session_id = 'INIT-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    const now_iso = new Date().toISOString();

    const initial_greeting = "Silakan jelaskan inisiatif produk yang ingin kamu ajukan. Ringkas dan konkret.";
    const conversation_history = [
      {
        role: 'model',
        text: initial_greeting,
        timestamp: now_iso
      }
    ];

    const spreadsheet = get_db_spreadsheet();
    let sheet = spreadsheet.getSheetByName('Initiative_Tests');
    if (!sheet) {
      setup_database_schema(SPREADSHEET_ID);
      sheet = spreadsheet.getSheetByName('Initiative_Tests');
    }

    // Header: id, user_email, initiative_title, attempt_count, status, ai_summary_note, conversation_history, created_at, updated_at
    sheet.appendRow([
      session_id,
      user_email,
      title,
      0, // attempt_count awal
      'IN_PROGRESS',
      '',
      JSON.stringify(conversation_history),
      now_iso,
      now_iso
    ]);

    return {
      success: true,
      data: {
        id: session_id,
        initiative_title: title,
        user_email: user_email,
        attempt_count: 0,
        status: 'IN_PROGRESS',
        ai_summary_note: '',
        messages: conversation_history,
        created_at: now_iso,
        updated_at: now_iso
      }
    };
  } catch (error) {
    return { success: false, message: 'Gagal memulai sesi Challenger AI: ' + error.message };
  }
}

/**
 * Mengirim pesan / argumen PO ke AI Product Challenger dan menerima tantangan / keputusan balik.
 *
 * @param {string} session_id - ID sesi inisiatif (INIT-...)
 * @param {string} user_message - Pesan / penjelasan dari PO
 * @return {Object} Status respon dan sesi terkini
 */
function send_initiative_message(session_id, user_message) {
  try {
    const user_profile = get_user_role();
    const user_email = user_profile.data ? user_profile.data.email : 'unknown';
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (permissions.can_test_initiative === false) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk menguji inisiatif produk.' };
    }

    if (!session_id || !user_message || !user_message.trim()) {
      return { success: false, message: 'ID sesi dan pesan inisiatif wajib diisi.' };
    }

    const spreadsheet = get_db_spreadsheet();
    const sheet = spreadsheet.getSheetByName('Initiative_Tests');
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: false, message: 'Sesi inisiatif tidak ditemukan.' };
    }

    const values = sheet.getDataRange().getValues();
    const header = values[0].map(h => String(h).trim().toLowerCase());
    const id_idx = header.indexOf('id');
    const title_idx = header.indexOf('initiative_title');
    const attempt_idx = header.indexOf('attempt_count');
    const status_idx = header.indexOf('status');
    const note_idx = header.indexOf('ai_summary_note');
    const hist_idx = header.indexOf('conversation_history');
    const upd_idx = header.indexOf('updated_at');

    let row_index = -1;
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][id_idx]).trim() === session_id) {
        row_index = r + 1;
        break;
      }
    }

    if (row_index === -1) {
      return { success: false, message: 'Sesi inisiatif ' + session_id + ' tidak ditemukan.' };
    }

    const currentRow = values[row_index - 1];
    const currentStatus = String(currentRow[status_idx] || 'IN_PROGRESS');
    const initiative_title = String(currentRow[title_idx] || 'Inisiatif');
    let attempt_count = Number(currentRow[attempt_idx]) || 0;
    attempt_count += 1; // Tiap pengiriman pesan oleh user dihitung sebagai attempt testing

    let history = [];
    try {
      history = JSON.parse(currentRow[hist_idx] || '[]');
    } catch (e) {
      history = [];
    }

    const now_iso = new Date().toISOString();
    // Tambahkan input user ke riwayat
    history.push({
      role: 'user',
      text: user_message.trim(),
      timestamp: now_iso
    });

    // Susun alternating payload untuk Gemini generateContent API
    // Gemini mewajibkan giliran pertama role 'user', kemudian 'model', 'user', dsb.
    const api_contents = [
      {
        role: 'user',
        parts: [{ text: 'Halo, saya siap mengajukan dan mendiskusikan inisiatif produk.' }]
      },
      {
        role: 'model',
        parts: [{ text: 'Silakan jelaskan inisiatif produk yang ingin kamu ajukan. Ringkas dan konkret.' }]
      }
    ];

    // Sisipkan history sesungguhnya
    for (const msg of history) {
      // Lewatkan pesan greeting awal model karena sudah ada di synthetic pembuka di atas
      if (msg.role === 'model' && msg.text.includes('Silakan jelaskan inisiatif produk')) {
        continue;
      }
      api_contents.push({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      });
    }

    // Panggil Gemini API
    const raw_ai_response = call_gemini_api(api_contents);
    const parsed = parse_challenger_decision(raw_ai_response);

    // Tambahkan respon model yang bersih ke history
    history.push({
      role: 'model',
      text: parsed.cleanText,
      timestamp: new Date().toISOString()
    });

    const new_status = parsed.decision;
    const final_note = parsed.note || (new_status === 'APPROVED' ? 'Inisiatif disetujui & memenuhi kriteria bisnis.' : (new_status === 'REJECTED' ? 'Inisiatif ditolak oleh Challenger AI karena nilai bisnis tidak mencukupi.' : ''));

    // Update baris di sheet Initiative_Tests
    sheet.getRange(row_index, attempt_idx + 1).setValue(attempt_count);
    sheet.getRange(row_index, status_idx + 1).setValue(new_status);
    sheet.getRange(row_index, note_idx + 1).setValue(final_note);
    sheet.getRange(row_index, hist_idx + 1).setValue(JSON.stringify(history));
    sheet.getRange(row_index, upd_idx + 1).setValue(now_iso);

    // JIKA APPROVED: Otomatis daftarkan inisiatif ke sheet Demands untuk perhitungan kapasitas Admin
    if (new_status === 'APPROVED') {
      ensure_initiative_in_demands(
        session_id,
        initiative_title,
        user_email,
        parsed.cleanText,
        final_note,
        parsed.estEngineers,
        parsed.estDays
      );
    }

    return {
      success: true,
      data: {
        session_id: session_id,
        attempt_count: attempt_count,
        status: new_status,
        note: final_note,
        ai_message: parsed.cleanText,
        messages: history
      }
    };
  } catch (error) {
    return { success: false, message: 'Gagal mengirim pesan ke Challenger AI: ' + error.message };
  }
}

/**
 * Helper untuk mendaftarkan inisiatif yang APPROVED ke tabel Demands.
 */
function ensure_initiative_in_demands(session_id, title, user_email, full_text, note, est_eng, est_days) {
  try {
    const spreadsheet = get_db_spreadsheet();
    let sheet = spreadsheet.getSheetByName('Demands');
    if (!sheet) {
      setup_database_schema(SPREADSHEET_ID);
      sheet = spreadsheet.getSheetByName('Demands');
    }

    // Cek apakah sudah pernah didaftarkan
    if (sheet.getLastRow() > 1) {
      const d_values = sheet.getDataRange().getValues();
      const d_header = d_values[0].map(h => String(h).trim().toLowerCase());
      const s_idx = d_header.indexOf('initiative_test_id');
      if (s_idx !== -1) {
        for (let r = 1; r < d_values.length; r++) {
          if (String(d_values[r][s_idx]).trim() === session_id) {
            return; // Sudah ada, tidak perlu duplikasi
          }
        }
      }
    }

    const demand_id = 'DEM-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    const now_iso = new Date().toISOString();

    // Ekstrak ringkasan PRD & FSD dari teks utuh jika ada
    let prd_summary = note || 'PRD terlampir pada hasil evaluasi Challenger AI.';
    let fsd_summary = 'FSD terlampir pada hasil evaluasi Challenger AI.';
    if (full_text.includes('PRD')) {
      prd_summary = full_text.substring(full_text.indexOf('PRD'), full_text.indexOf('PRD') + 600) + '...';
    }
    if (full_text.includes('FSD')) {
      fsd_summary = full_text.substring(full_text.indexOf('FSD'), full_text.indexOf('FSD') + 600) + '...';
    }

    // Header: id, initiative_test_id, title, submitter_email, prd_summary, fsd_summary, est_engineers, est_duration_days, capacity_status, allocated_capacity_hours, capacity_notes, approved_at, created_at
    sheet.appendRow([
      demand_id,
      session_id,
      title,
      user_email,
      prd_summary,
      fsd_summary,
      est_eng || 3,
      est_days || 20,
      'PENDING_CAPACITY',
      0,
      '',
      now_iso,
      now_iso
    ]);
  } catch (e) {
    Logger.log('Gagal mendaftarkan inisiatif ke Demands: ' + e.message);
  }
}

/**
 * Mengambil riwayat daftar pengujian inisiatif untuk Admin (semua user) atau User (milik sendiri).
 *
 * @param {string} [filter_email] - Opsional filter email
 * @return {Object} Daftar pengujian inisiatif
 */
function get_initiatives_list(filter_email) {
  try {
    const user_profile = get_user_role();
    const user_email = user_profile.data ? user_profile.data.email : '';
    const user_role = user_profile.data ? user_profile.data.role : 'CLIENT';
    const is_admin_or_pm = user_role === 'ADMIN' || user_role === 'PM';

    const spreadsheet = get_db_spreadsheet();
    const sheet = spreadsheet.getSheetByName('Initiative_Tests');
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, data: [] };
    }

    const values = sheet.getDataRange().getValues();
    const header = values[0].map(h => String(h).trim().toLowerCase());
    const id_idx = header.indexOf('id');
    const email_idx = header.indexOf('user_email');
    const title_idx = header.indexOf('initiative_title');
    const attempt_idx = header.indexOf('attempt_count');
    const status_idx = header.indexOf('status');
    const note_idx = header.indexOf('ai_summary_note');
    const crt_idx = header.indexOf('created_at');
    const upd_idx = header.indexOf('updated_at');

    const list = [];
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const row_email = String(row[email_idx] || '').toLowerCase().trim();

      // Jika bukan Admin/PM, hanya tampilkan inisiatif miliknya sendiri
      if (!is_admin_or_pm && row_email !== user_email) {
        continue;
      }

      // Jika ada filter spesifik email
      if (filter_email && row_email !== filter_email.toLowerCase().trim()) {
        continue;
      }

      list.push({
        id: row[id_idx],
        user_email: row_email,
        title: row[title_idx],
        attempt_count: Number(row[attempt_idx]) || 0,
        status: String(row[status_idx] || 'IN_PROGRESS'),
        ai_summary_note: row[note_idx] || '',
        created_at: row[crt_idx],
        updated_at: row[upd_idx]
      });
    }

    // Urutkan berdasarkan waktu pembaruan terbaru
    list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return { success: true, data: list };
  } catch (error) {
    return { success: false, message: 'Gagal memuat daftar inisiatif: ' + error.message };
  }
}

/**
 * Mengambil detail pesan percakapan suatu sesi inisiatif.
 *
 * @param {string} session_id - ID sesi
 * @return {Object} Detail sesi beserta daftar pesan
 */
function get_initiative_session_details(session_id) {
  try {
    const spreadsheet = get_db_spreadsheet();
    const sheet = spreadsheet.getSheetByName('Initiative_Tests');
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: false, message: 'Data inisiatif tidak ditemukan.' };
    }

    const values = sheet.getDataRange().getValues();
    const header = values[0].map(h => String(h).trim().toLowerCase());
    const id_idx = header.indexOf('id');
    const email_idx = header.indexOf('user_email');
    const title_idx = header.indexOf('initiative_title');
    const attempt_idx = header.indexOf('attempt_count');
    const status_idx = header.indexOf('status');
    const note_idx = header.indexOf('ai_summary_note');
    const hist_idx = header.indexOf('conversation_history');
    const crt_idx = header.indexOf('created_at');
    const upd_idx = header.indexOf('updated_at');

    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      if (String(row[id_idx]).trim() === session_id) {
        let history = [];
        try {
          history = JSON.parse(row[hist_idx] || '[]');
        } catch (e) {
          history = [];
        }

        return {
          success: true,
          data: {
            id: row[id_idx],
            user_email: row[email_idx],
            title: row[title_idx],
            attempt_count: Number(row[attempt_idx]) || 0,
            status: row[status_idx],
            ai_summary_note: row[note_idx] || '',
            messages: history,
            created_at: row[crt_idx],
            updated_at: row[upd_idx]
          }
        };
      }
    }

    return { success: false, message: 'Sesi inisiatif ' + session_id + ' tidak ditemukan.' };
  } catch (error) {
    return { success: false, message: 'Gagal memuat detail inisiatif: ' + error.message };
  }
}

/**
 * Mengambil daftar Demand (Inisiatif yang lolos evaluasi Challenger AI) untuk dihitung kapasitasnya oleh Admin/PM.
 *
 * @return {Object} Daftar demand
 */
function get_demands_list() {
  try {
    const spreadsheet = get_db_spreadsheet();
    const sheet_demands = spreadsheet.getSheetByName('Demands');
    const sheet_tests = spreadsheet.getSheetByName('Initiative_Tests');

    const demands = [];
    if (sheet_demands && sheet_demands.getLastRow() > 1) {
      const values = sheet_demands.getDataRange().getValues();
      const header = values[0].map(h => String(h).trim().toLowerCase());
      const id_idx = header.indexOf('id');
      const init_idx = header.indexOf('initiative_test_id');
      const title_idx = header.indexOf('title');
      const email_idx = header.indexOf('submitter_email');
      const prd_idx = header.indexOf('prd_summary');
      const fsd_idx = header.indexOf('fsd_summary');
      const eng_idx = header.indexOf('est_engineers');
      const day_idx = header.indexOf('est_duration_days');
      const stat_idx = header.indexOf('capacity_status');
      const cap_idx = header.indexOf('allocated_capacity_hours');
      const notes_idx = header.indexOf('capacity_notes');
      const app_idx = header.indexOf('approved_at');
      const crt_idx = header.indexOf('created_at');

      for (let r = 1; r < values.length; r++) {
        const row = values[r];
        demands.push({
          id: row[id_idx],
          initiative_test_id: row[init_idx],
          title: row[title_idx],
          submitter_email: row[email_idx],
          prd_summary: row[prd_idx],
          fsd_summary: row[fsd_idx],
          est_engineers: Number(row[eng_idx]) || 0,
          est_duration_days: Number(row[day_idx]) || 0,
          capacity_status: String(row[stat_idx] || 'PENDING_CAPACITY'),
          allocated_capacity_hours: Number(row[cap_idx]) || 0,
          capacity_notes: row[notes_idx] || '',
          approved_at: row[app_idx],
          created_at: row[crt_idx]
        });
      }
    }

    // Ambil inisiatif yang ditolak dari sheet Initiative_Tests
    const rejected_initiatives = [];
    if (sheet_tests && sheet_tests.getLastRow() > 1) {
      const t_values = sheet_tests.getDataRange().getValues();
      const t_header = t_values[0].map(h => String(h).trim().toLowerCase());
      const t_id_idx = t_header.indexOf('id');
      const t_email_idx = t_header.indexOf('user_email');
      const t_title_idx = t_header.indexOf('initiative_title');
      const t_attempt_idx = t_header.indexOf('attempt_count');
      const t_status_idx = t_header.indexOf('status');
      const t_note_idx = t_header.indexOf('ai_summary_note');
      const t_upd_idx = t_header.indexOf('updated_at');

      for (let r = 1; r < t_values.length; r++) {
        const row = t_values[r];
        const status = String(row[t_status_idx] || '').toUpperCase().trim();
        if (status === 'REJECTED') {
          rejected_initiatives.push({
            id: row[t_id_idx],
            user_email: row[t_email_idx],
            title: row[t_title_idx],
            attempt_count: Number(row[t_attempt_idx]) || 0,
            status: 'REJECTED',
            ai_summary_note: row[t_note_idx] || 'Inisiatif ditolak oleh Challenger AI.',
            updated_at: row[t_upd_idx]
          });
        }
      }
    }

    // Urutkan berdasarkan waktu approve/update terbaru
    demands.sort((a, b) => new Date(b.approved_at || b.created_at).getTime() - new Date(a.approved_at || a.created_at).getTime());
    rejected_initiatives.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return {
      success: true,
      data: {
        demands: demands,
        rejected_initiatives: rejected_initiatives,
        stats: {
          total_demands: demands.length,
          pending: demands.filter(d => d.capacity_status === 'PENDING_CAPACITY').length,
          planned: demands.filter(d => d.capacity_status === 'CAPACITY_PLANNED').length,
          converted: demands.filter(d => d.capacity_status === 'CONVERTED_TO_PROJECT').length,
          rejected: rejected_initiatives.length
        }
      }
    };
  } catch (error) {
    return { success: false, message: 'Gagal memuat daftar demand: ' + error.message };
  }
}

/**
 * Menyimpan perhitungan alokasi kapasitas member untuk suatu Demand.
 *
 * @param {string} demand_id - ID Demand (DEM-...)
 * @param {number} capacity_hours - Total alokasi kapasitas dalam jam kerja member
 * @param {string} capacity_notes - Catatan pembagian beban kerja / role tim
 * @return {Object} Status keberhasilan
 */
function update_demand_capacity(demand_id, capacity_hours, capacity_notes) {
  try {
    const user_profile = get_user_role();
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (permissions.can_manage_demand === false) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk mengelola kapasitas demand.' };
    }

    if (!demand_id) {
      return { success: false, message: 'ID demand tidak valid.' };
    }

    const hours = Number(capacity_hours) || 0;
    const notes = String(capacity_notes || '').trim();

    const spreadsheet = get_db_spreadsheet();
    const sheet = spreadsheet.getSheetByName('Demands');
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: false, message: 'Data demand tidak ditemukan.' };
    }

    const values = sheet.getDataRange().getValues();
    const header = values[0].map(h => String(h).trim().toLowerCase());
    const id_idx = header.indexOf('id');
    const stat_idx = header.indexOf('capacity_status');
    const cap_idx = header.indexOf('allocated_capacity_hours');
    const notes_idx = header.indexOf('capacity_notes');

    let row_idx = -1;
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][id_idx]).trim() === demand_id) {
        row_idx = r + 1;
        break;
      }
    }

    if (row_idx === -1) {
      return { success: false, message: 'Demand ' + demand_id + ' tidak ditemukan.' };
    }

    sheet.getRange(row_idx, cap_idx + 1).setValue(hours);
    sheet.getRange(row_idx, notes_idx + 1).setValue(notes);
    sheet.getRange(row_idx, stat_idx + 1).setValue('CAPACITY_PLANNED');

    return {
      success: true,
      message: 'Kapasitas sebesar ' + hours + ' jam berhasil dialokasikan untuk demand ini.'
    };
  } catch (error) {
    return { success: false, message: 'Gagal memperbarui kapasitas demand: ' + error.message };
  }
}

/**
 * Mengonversi Demand yang kapasitasnya telah direncanakan menjadi Proyek aktif baru.
 *
 * @param {string} demand_id - ID Demand
 * @return {Object} Status konversi dan detail project baru
 */
function convert_demand_to_project(demand_id) {
  try {
    const user_profile = get_user_role();
    const current_user_id = user_profile.data ? user_profile.data.id : 'USR-001';
    const permissions = (user_profile.data && user_profile.data.permissions) 
      ? user_profile.data.permissions 
      : resolve_user_permissions(user_profile.data ? user_profile.data.role : 'CLIENT');

    if (!permissions.can_create_project) {
      return { success: false, message: 'Akses Ditolak: Anda tidak memiliki izin untuk membuat project baru.' };
    }

    const spreadsheet = get_db_spreadsheet();
    const sheet_demands = spreadsheet.getSheetByName('Demands');
    if (!sheet_demands || sheet_demands.getLastRow() <= 1) {
      return { success: false, message: 'Data demand tidak ditemukan.' };
    }

    const d_values = sheet_demands.getDataRange().getValues();
    const d_header = d_values[0].map(h => String(h).trim().toLowerCase());
    const id_idx = d_header.indexOf('id');
    const title_idx = d_header.indexOf('title');
    const stat_idx = d_header.indexOf('capacity_status');
    const cap_idx = d_header.indexOf('allocated_capacity_hours');

    let row_idx = -1;
    let demand_title = '';
    let allocated_hours = 0;

    for (let r = 1; r < d_values.length; r++) {
      if (String(d_values[r][id_idx]).trim() === demand_id) {
        row_idx = r + 1;
        demand_title = d_values[r][title_idx];
        allocated_hours = Number(d_values[r][cap_idx]) || 0;
        break;
      }
    }

    if (row_idx === -1) {
      return { success: false, message: 'Demand tidak ditemukan.' };
    }

    // Buat Project Baru
    const proj_result = create_new_project({
      name: demand_title,
      pm_id: current_user_id,
      project_mode: 'KANBAN'
    });

    if (!proj_result.success) {
      return { success: false, message: 'Gagal membuat proyek dari demand: ' + proj_result.message };
    }

    // Update status demand menjadi CONVERTED_TO_PROJECT
    sheet_demands.getRange(row_idx, stat_idx + 1).setValue('CONVERTED_TO_PROJECT');

    return {
      success: true,
      message: 'Demand "' + demand_title + '" berhasil dikonversi menjadi Proyek aktif!',
      project_id: proj_result.project_id
    };
  } catch (error) {
    return { success: false, message: 'Gagal mengonversi demand: ' + error.message };
  }
}
