// Optional integration suite: requires Playwright and a Chromium installation.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = new Set(['index.html', 'app.mjs', 'core.mjs', 'styles.css', 'icon.svg']);
const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const key = 'orbita.workspace.v1';
let browser, server, completed = 0;
async function check(name, action) { await action(); completed++; console.log(`✓ ${name}`); }
(async () => {
  server = http.createServer(async (req, res) => {
    const filename = new URL(req.url, 'http://localhost').pathname.replace(/^\/calculadora\//, '') || 'index.html';
    if (!files.has(filename)) { res.writeHead(404).end(); return; }
    try { res.setHeader('Content-Type', types[path.extname(filename)]); res.end(await fs.readFile(path.join(root, filename))); }
    catch { res.writeHead(500).end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  const base = `http://127.0.0.1:${server.address().port}/calculadora/`;
  const state = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
  const nav = async view => { await page.locator(`nav [data-view="${view}"]`).click(); await page.waitForFunction(v => document.title.startsWith(v), ({ projects: 'Proyectos', tasks: 'Tablero', finances: 'Finanzas', notes: 'Notas', overview: 'Resumen' })[view]); };
  const modal = () => page.locator('#editor');
  const save = async () => { await modal().getByRole('button', { name: /^Guardar/ }).click(); await page.waitForFunction(() => !document.querySelector('#editor').open); };
  const settings = async () => page.locator('.topbar').getByRole('button', { name: 'Datos y configuración', exact: true }).click();
  await page.goto(base);
  await check('inicio desde una subcarpeta como GitHub Pages', async () => {
    await page.getByRole('heading', { name: /Un buen día/ }).waitFor();
    assert.equal((await state()).projects.length, 3);
    assert.equal(await page.locator('.project-card').count(), 3);
    await page.screenshot({ path: '/tmp/orbita-desktop.png', fullPage: true });
  });
  let projectId;
  await check('crear y editar proyectos con presupuesto', async () => {
    await nav('projects'); await page.getByRole('button', { name: /Nuevo proyecto/ }).click();
    await modal().getByLabel('Nombre del proyecto').fill('Proyecto de prueba');
    await modal().getByLabel('Descripción').fill('Un flujo real de principio a fin.');
    await modal().getByLabel('Presupuesto').fill('1000');
    await modal().getByLabel('Fecha objetivo').fill('2030-12-01');
    await save();
    projectId = (await state()).projects.find(p => p.name === 'Proyecto de prueba').id;
    await page.getByRole('button', { name: 'Editar Proyecto de prueba', exact: true }).click();
    await modal().getByLabel('Nombre del proyecto').fill('Proyecto actualizado'); await save();
    assert.equal((await state()).projects.find(p => p.id === projectId).budget, 100000);
    assert.ok(await page.getByRole('button', { name: 'Proyecto actualizado', exact: true }).isVisible());
  });
  await check('crear tarea y moverla con arrastre y selector', async () => {
    await nav('tasks'); await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
    await modal().getByLabel('Título de la tarea').fill('Tarea de integración');
    await modal().getByLabel('Proyecto', { exact: true }).selectOption(projectId);
    await modal().getByLabel('Prioridad').selectOption('high'); await save();
    const task = (await state()).tasks.find(t => t.title === 'Tarea de integración');
    await page.locator(`[data-task="${task.id}"]`).dragTo(page.locator('[data-drop="doing"] .column-heading'));
    assert.equal((await state()).tasks.find(t => t.id === task.id).status, 'doing');
    await page.locator(`[data-move="${task.id}"]`).selectOption('done');
    assert.equal((await state()).tasks.find(t => t.id === task.id).status, 'done');
  });
  await check('filtros y búsquedas en el tablero', async () => {
    await page.locator('#project-filter').selectOption(projectId);
    assert.equal(await page.locator('.task-card').count(), 1);
    await page.getByRole('searchbox').fill('no existe este texto');
    assert.equal(await page.locator('.task-card').count(), 0);
    await page.getByRole('searchbox').fill('integración');
    assert.equal(await page.locator('.task-card').count(), 1);
  });
  await check('gastos con coma decimal y actualización del presupuesto', async () => {
    await nav('finances'); await page.getByRole('button', { name: /Registrar gasto/ }).first().click();
    await modal().getByLabel('Concepto').fill('Gasto de integración');
    await modal().getByLabel('Importe').fill('12,34');
    await modal().getByLabel('Proyecto', { exact: true }).selectOption(projectId); await save();
    assert.equal((await state()).expenses.find(e => e.title === 'Gasto de integración').amount, 1234);
    await page.getByRole('button', { name: 'Editar Gasto de integración' }).click();
    await modal().getByLabel('Importe').fill('-1');
    await modal().getByRole('button', { name: /^Guardar/ }).click();
    assert.ok(await page.locator('#form-error').isVisible());
    await modal().getByLabel('Importe').fill('25.50'); await save();
    assert.equal((await state()).expenses.find(e => e.title === 'Gasto de integración').amount, 2550);
  });
  await check('exportación CSV del registro', async () => {
    const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: /Exportar CSV/ }).click();
    const download = await downloadEvent; const contents = await fs.readFile(await download.path(), 'utf8');
    assert.ok(contents.includes('Gasto de integración')); assert.ok(contents.includes('25.50'));
  });
  await check('notas, edición y texto protegido frente a HTML', async () => {
    await nav('notes'); await page.getByRole('button', { name: /Nueva nota/ }).click();
    await modal().getByLabel('Título', { exact: true }).fill('Nota de integración');
    await modal().getByLabel('Tu nota').fill('<img src=x onerror="window.injected=true">\nTexto seguro');
    await modal().getByLabel('Proyecto', { exact: true }).selectOption(projectId); await save();
    assert.equal(await page.locator('.note-card img').count(), 0);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    await page.getByRole('button', { name: 'Editar Nota de integración' }).click();
    await modal().getByLabel('Título', { exact: true }).fill('Nota actualizada'); await save();
    assert.equal((await state()).notes.find(n => n.title === 'Nota actualizada').projectId, projectId);
  });
  await check('persistencia después de recargar', async () => {
    await page.reload(); await page.getByRole('heading', { name: /Que no se escape/ }).waitFor();
    assert.ok(await page.getByRole('button', { name: 'Nota actualizada', exact: true }).isVisible());
  });
  let backup;
  await check('copia JSON, borrado y restauración completa', async () => {
    await settings(); const downloadEvent = page.waitForEvent('download'); await modal().getByRole('button', { name: 'Exportar', exact: true }).click();
    backup = await (await downloadEvent).path();
    const before = await state();
    await modal().getByRole('button', { name: 'Borrar datos', exact: true }).click();
    assert.equal((await state()).projects.length, 0);
    await settings(); await modal().getByRole('button', { name: 'Importar', exact: true }).click();
    await page.locator('#import-file').setInputFiles(backup);
    await page.waitForFunction(() => !document.querySelector('#editor').open);
    assert.deepEqual(await state(), before);
  });
  await check('rechaza una copia inválida y conserva los datos', async () => {
    const before = await state(); await settings(); await modal().getByRole('button', { name: 'Importar', exact: true }).click();
    await page.locator('#import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":99}') });
    await page.getByRole('status').filter({ hasText: /no es válida/ }).waitFor();
    assert.deepEqual(await state(), before); await modal().getByRole('button', { name: 'Cerrar', exact: true }).click();
  });
  await check('eliminar proyecto elimina sus datos relacionados', async () => {
    await nav('projects'); await page.getByRole('button', { name: 'Editar Proyecto actualizado', exact: true }).click();
    await modal().getByRole('button', { name: 'Eliminar', exact: true }).click();
    const data = await state();
    assert.ok(!data.projects.some(p => p.id === projectId));
    for (const collection of ['tasks', 'expenses', 'notes']) assert.ok(!data[collection].some(i => i.projectId === projectId));
  });
  await check('edición y eliminación individual de tareas, gastos y notas', async () => {
    for (const [view, collection, editAction] of [['tasks', 'tasks', 'edit-task'], ['finances', 'expenses', 'edit-expense'], ['notes', 'notes', 'edit-note']]) {
      await nav(view); const before = (await state())[collection].length;
      await page.locator(`[data-action="${editAction}"]`).first().click();
      await modal().getByRole('button', { name: 'Eliminar', exact: true }).click();
      assert.equal((await state())[collection].length, before - 1);
    }
  });
  await check('diseño móvil sin desbordamiento y configuración accesible', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const view of ['overview', 'projects', 'tasks', 'finances', 'notes']) {
      await nav(view);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), view);
    }
    await settings(); assert.ok(await modal().isVisible());
    await modal().getByRole('button', { name: 'Cerrar', exact: true }).click();
    await nav('overview'); await page.locator('#toast').waitFor({ state: 'hidden' });
    await page.screenshot({ path: '/tmp/orbita-mobile.png', fullPage: true });
  });
  await check('espacio vacío permite crear el primer proyecto desde tareas', async () => {
    await settings(); await modal().getByRole('button', { name: 'Borrar datos', exact: true }).click();
    await nav('tasks'); await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
    await modal().getByRole('heading', { name: 'Nuevo proyecto' }).waitFor();
    await modal().getByRole('button', { name: 'Cancelar', exact: true }).click();
  });
  await check('datos corruptos no se sobrescriben al iniciar', async () => {
    await page.evaluate(k => localStorage.setItem(k, '{datos rotos'), key); await page.reload();
    await page.locator('#storage-warning').waitFor();
    assert.equal(await page.evaluate(k => localStorage.getItem(k), key), '{datos rotos');
    await settings(); assert.ok(await modal().getByRole('button', { name: 'Descargar original' }).isVisible());
    await modal().getByRole('button', { name: 'Cargar ejemplo' }).click();
    assert.equal((await state()).projects.length, 3);
  });
  await check('acceso al contenido y atajos sin cambiar de vista', async () => {
    await nav('tasks'); await page.locator('.skip-link').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
    assert.equal(new URL(page.url()).hash, '#tasks');
    await page.keyboard.press('/'); assert.ok(await page.getByRole('searchbox').evaluate(el => document.activeElement === el));
    await page.getByRole('searchbox').blur(); await page.keyboard.press('n');
    await modal().getByRole('heading', { name: 'Nueva tarea' }).waitFor();
    await page.keyboard.press('Escape'); assert.equal(await modal().isVisible(), false);
  });
  await check('sin errores JavaScript durante los flujos', async () => assert.deepEqual(errors, []));
  console.log(`\n${completed} comprobaciones de navegador correctas.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve));
});
