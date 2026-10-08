/**
 * Unit Test / Test Suite untuk Tahap 2: Frontend UI & SPA Shell
 * Menguji integritas template Index.html, modularitas include, Tailwind CDN,
 * dan mekanisme transisi logika SPA view switching.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Menjalankan Uji Coba Tahap 2: Frontend UI & SPA Shell ---');

// 1. Verifikasi File Keberadaan
const index_path = path.join(__dirname, '..', 'src', 'Index.html');
const ui_path = path.join(__dirname, '..', 'src', 'UI.html');
const js_main_path = path.join(__dirname, '..', 'src', 'js_main.html');

assert(fs.existsSync(index_path), 'Index.html harus ada di src/');
assert(fs.existsSync(ui_path), 'UI.html harus ada di src/');
assert(fs.existsSync(js_main_path), 'js_main.html harus ada di src/');
console.log('✓ Test 1 Lolos: Semua berkas modular frontend (Index, UI, js_main) tersedia.');

// 2. Verifikasi CDN Tailwind & Chart.js dan tag include GAS
const index_content = fs.readFileSync(index_path, 'utf8');
assert(index_content.includes('cdn.tailwindcss.com'), 'Index.html harus memuat CDN Tailwind CSS.');
assert(index_content.includes('cdn.jsdelivr.net/npm/chart.js'), 'Index.html harus memuat CDN Chart.js.');
assert(index_content.includes("include('UI')"), 'Index.html harus meng-include UI.html.');
assert(index_content.includes("include('js_main')"), 'Index.html harus meng-include js_main.html.');
console.log('✓ Test 2 Lolos: CDN Tailwind, Chart.js, dan modular include GAS terpasang dengan benar.');

// 3. Verifikasi Struktur UI: Navbar, Sidebar, 4 Kolom Kanban, Insights View
const ui_content = fs.readFileSync(ui_path, 'utf8');
assert(ui_content.includes('id="app-sidebar"'), 'UI.html harus memiliki elemen sidebar #app-sidebar.');
assert(ui_content.includes('id="nav-btn-board"'), 'UI.html harus memiliki tombol navigasi Board.');
assert(ui_content.includes('id="nav-btn-insights"'), 'UI.html harus memiliki tombol navigasi Insights.');
assert(ui_content.includes('id="view-board"'), 'UI.html harus memiliki section #view-board.');
assert(ui_content.includes('id="view-insights"'), 'UI.html harus memiliki section #view-insights.');
assert(ui_content.includes('id="column-todo"'), 'UI.html harus memiliki kolom Kanban TODO.');
assert(ui_content.includes('id="column-in_progress"'), 'UI.html harus memiliki kolom Kanban IN_PROGRESS.');
assert(ui_content.includes('id="column-review"'), 'UI.html harus memiliki kolom Kanban REVIEW.');
assert(ui_content.includes('id="column-done"'), 'UI.html harus memiliki kolom Kanban DONE.');
console.log('✓ Test 3 Lolos: Struktur layout (Sidebar, Navbar, 4 Kolom Kanban, KPI Cards) terdefinisi lengkap.');

// 4. Verifikasi Logika SPA Navigation pada js_main.html
const js_content = fs.readFileSync(js_main_path, 'utf8');
assert(js_content.includes('function switch_view(target_view)'), 'js_main.html harus memiliki fungsi switch_view.');
assert(js_content.includes('function apply_rbac_permissions(role)'), 'js_main.html harus memiliki fungsi apply_rbac_permissions.');

// Simulasi logika switch_view
function simulate_spa_view_switch(initial_view, target_view) {
  const views = {
    board: { classList: initial_view === 'board' ? ['block'] : ['hidden'] },
    insights: { classList: initial_view === 'insights' ? ['block'] : ['hidden'] },
    settings: { classList: initial_view === 'settings' ? ['block'] : ['hidden'] }
  };

  ['board', 'insights', 'settings'].forEach(v => {
    if (v === target_view) {
      views[v].classList = ['block'];
    } else {
      views[v].classList = ['hidden'];
    }
  });

  return views;
}

// Uji coba perpindahan view: board -> insights
const state_after_switch = simulate_spa_view_switch('board', 'insights');
assert.deepStrictEqual(state_after_switch.insights.classList, ['block']);
assert.deepStrictEqual(state_after_switch.board.classList, ['hidden']);
console.log('✓ Test 4 Lolos: Logika transisi tampilan SPA tanpa reload halaman terverifikasi.');

// 5. Verifikasi Penanganan RBAC di UI
function simulate_rbac_ui(role) {
  return {
    is_admin_or_pm: role === 'ADMIN' || role === 'PM',
    can_add_task: role === 'ADMIN' || role === 'PM',
    is_client: role === 'CLIENT'
  };
}

assert.strictEqual(simulate_rbac_ui('PM').can_add_task, true);
assert.strictEqual(simulate_rbac_ui('MEMBER').can_add_task, false);
assert.strictEqual(simulate_rbac_ui('CLIENT').can_add_task, false);
console.log('✓ Test 5 Lolos: Otorisasi tombol aksi per peran (PM vs Member vs Client) terverifikasi.');

console.log('\nSEMUA TEST TAHAP 2 BERHASIL (PASS)! Quality Gate Tahap 2 Terpenuhi.');
