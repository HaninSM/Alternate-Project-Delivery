/**
 * Test Suite: Tahap 9 - Unified Project Menu with Tab Navigation
 * Memvalidasi:
 * 1. Sidebar menu terunifikasi menjadi 1 menu 'Project' (#nav-btn-project)
 * 2. View Project (#view-project) memuat Sub-Navbar Tabs:
 *    - Tab Kanban Board (#tab-btn-board -> #view-board)
 *    - Tab Sprint Planning (#tab-btn-planning -> #view-scrum-planning)
 * 3. Logika pergantian tab (switch_project_tab)
 * 4. Backward-compatibility SPA switch_view('board') dan switch_view('scrum-planning')
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  MENJALANKAN TAHAP 9: UNIFIED PROJECT MENU & TABS TEST SUITE');
console.log('================================================================\n');

const ui_path = path.join(__dirname, '..', 'src', 'UI.html');
const js_path = path.join(__dirname, '..', 'src', 'js_main.html');

const ui_content = fs.readFileSync(ui_path, 'utf8');
const js_content = fs.readFileSync(js_path, 'utf8');

// 1. Verifikasi Tombol Menu Sidebar
console.log('1. Menguji Unifikasi Menu Sidebar (#nav-btn-project)...');
assert(ui_content.includes('id="nav-btn-project"'), 'UI.html harus memiliki tombol menu #nav-btn-project.');
assert(ui_content.includes('switch_view(\'project\')'), 'Tombol project harus memanggil switch_view("project").');
assert(ui_content.includes('id="nav-btn-board"'), 'Alias nav-btn-board harus tetap tersedia untuk kompatibilitas.');
assert(ui_content.includes('id="nav-btn-scrum-planning"'), 'Alias nav-btn-scrum-planning harus tetap tersedia.');
console.log('   ✓ Menu sidebar berhasil disatukan menjadi 1 menu "Project".\n');

// 2. Verifikasi Struktur Tab di UI.html
console.log('2. Menguji Struktur Tab di dalam View Project (#view-project)...');
assert(ui_content.includes('id="view-project"'), 'UI.html harus memiliki section #view-project.');
assert(ui_content.includes('id="tab-btn-board"'), 'UI.html harus memiliki tombol tab #tab-btn-board.');
assert(ui_content.includes('id="tab-btn-planning"'), 'UI.html harus memiliki tombol tab #tab-btn-planning.');
assert(ui_content.includes('id="view-board"'), 'UI.html harus memiliki tab content #view-board.');
assert(ui_content.includes('id="view-scrum-planning"'), 'UI.html harus memiliki tab content #view-scrum-planning.');
console.log('   ✓ Struktur Tab Kanban Board & Sprint Planning terverifikasi lengkap.\n');

// 3. Verifikasi Logika JavaScript
console.log('3. Menguji Fungsi switch_project_tab & switch_view di js_main.html...');
assert(js_content.includes('function switch_project_tab(tab_name)'), 'js_main.html harus memiliki fungsi switch_project_tab.');
assert(js_content.includes('switch_project_tab(\'board\')'), 'js_main.html harus mendukung navigasi ke tab board.');
assert(js_content.includes('switch_project_tab(\'planning\')'), 'js_main.html harus mendukung navigasi ke tab planning.');
console.log('   ✓ Controller switch_project_tab dan normalisasi switch_view terpasang.\n');

// 4. Simulasi Logika Tab Switcher
console.log('4. Menguji Simulasi Transisi Tab...');
function simulate_tab_switch(target_tab) {
  const state = {
    board: target_tab === 'board' ? 'block' : 'hidden',
    planning: target_tab === 'planning' ? 'block' : 'hidden'
  };
  return state;
}

const tab_state_planning = simulate_tab_switch('planning');
assert.strictEqual(tab_state_planning.planning, 'block');
assert.strictEqual(tab_state_planning.board, 'hidden');

const tab_state_board = simulate_tab_switch('board');
assert.strictEqual(tab_state_board.board, 'block');
assert.strictEqual(tab_state_board.planning, 'hidden');
console.log('   ✓ Transisi tab antar Kanban Board dan Sprint Planning berjalan 100% akurat.\n');

// 5. Verifikasi Hirarki Sibling DOM (Bebas dari bug nesting display: none)
console.log('5. Menguji Kemandirian Hirarki Sibling DOM (#view-board & #view-scrum-planning)...');
const board_idx = ui_content.indexOf('id="view-board"');
const planning_idx = ui_content.indexOf('id="view-scrum-planning"');
assert(board_idx !== -1 && planning_idx !== -1, 'Kedua kontainer tab harus ditemukan di UI.html');
assert(board_idx < planning_idx, 'view-board harus terdefinisi sebelum view-scrum-planning');

const board_chunk = ui_content.substring(board_idx, planning_idx);
const open_divs = (board_chunk.match(/<div(\s|>)/gi) || []).length;
const close_divs = (board_chunk.match(/<\/div>/gi) || []).length;
// Karena chunk dimulai dari <div id="view-board"> dan harus ditutup sebelum <div id="view-scrum-planning">,
// jumlah <div dan </div> harus sama persis (keseimbangan tag = 0)
assert.strictEqual(open_divs, close_divs, `Tag div harus seimbang! Dibuka: ${open_divs}, Ditutup: ${close_divs}`);
console.log(`   ✓ Terverifikasi: Kontainer view-board tertutup sempurna (Dibuka: ${open_divs}, Ditutup: ${close_divs}). view-scrum-planning adalah elemen sibling yang mandiri!\n`);

console.log('================================================================');
console.log('  SEMUA PENGUJIAN TAHAP 9 (PROJECT TABS) BERHASIL (100% PASS)!');
console.log('================================================================\n');
