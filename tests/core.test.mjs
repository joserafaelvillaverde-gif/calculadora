import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemo, emptyData, validateData, parseAmount, projectStats, deleteProject, validDate, shiftDate, expensesCSV } from '../core.mjs';
const date = '2026-10-29';
test('datos de ejemplo y espacio vacío pasan la validación', () => {
  assert.deepEqual(validateData(createDemo(date)), createDemo(date));
  assert.deepEqual(validateData(emptyData()), emptyData());
});
test('importes se convierten a céntimos exactos', () => {
  assert.equal(parseAmount('0.29'), 29);
  assert.equal(parseAmount('123,45'), 12345);
  assert.equal(parseAmount(' 7 '), 700);
  assert.equal(parseAmount('999999999.99'), 99999999999);
});
test('rechaza cantidades negativas, ambiguas y no finitas', () => {
  for (const amount of ['-5', '1.234', 'Infinity', 'NaN', '', '1e4', '1,000.00', '1000000000']) assert.throws(() => parseAmount(amount));
});
test('valida fechas reales y años bisiestos', () => {
  assert.equal(validDate('2024-02-29'), true);
  for (const value of ['2025-02-29', '2026-02-30', '2026-13-01', '2026-1-01', '', '0000-01-01']) assert.equal(validDate(value), false, value);
  assert.equal(shiftDate('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftDate('2026-03-01', -1), '2026-02-28');
});
test('progreso y gastos reflejan tareas y movimientos reales', () => {
  const data = createDemo(date);
  assert.deepEqual(projectStats(data, 'p-web'), { total: 3, done: 1, progress: 33, spent: 50000 });
  data.tasks.find(t => t.id === 't1').status = 'done';
  assert.equal(projectStats(data, 'p-web').progress, 67);
  assert.equal(projectStats(data, 'p-unknown').progress, 0);
});
test('eliminar un proyecto borra solo sus relaciones', () => {
  const data = deleteProject(createDemo(date), 'p-web');
  assert.equal(data.projects.length, 2);
  for (const items of [data.tasks, data.expenses, data.notes]) assert.ok(items.every(i => i.projectId !== 'p-web'));
  assert.equal(data.tasks.length, 4);
  assert.equal(data.expenses.length, 2);
  assert.equal(data.notes.length, 1);
  assert.deepEqual(validateData(data), data);
});
test('rechaza relaciones huérfanas y duplicados en las copias', () => {
  for (const collection of ['tasks', 'expenses', 'notes']) {
    const data = createDemo(date); data[collection][0].projectId = 'inexistente'; assert.throws(() => validateData(data));
  }
  for (const collection of ['projects', 'tasks', 'expenses', 'notes']) {
    const data = createDemo(date); data[collection].push(data[collection][0]); assert.throws(() => validateData(data));
  }
});
test('rechaza estados, importes y estructuras corruptos', () => {
  const mutations = [d => d.version = 2, d => d.projects = null, d => d.tasks[0].status = '__proto__', d => d.expenses[0].amount = -5, d => d.expenses[0].amount = 1.5, d => d.expenses[0].amount = 0, d => d.notes[0].body = null, d => d.projects[0].color = 'red;display:none', d => d.projects[0].due = '2026-02-30'];
  for (const change of mutations) { const data = createDemo(date); change(data); assert.throws(() => validateData(data)); }
  for (const value of [null, [], {}, 'text']) assert.throws(() => validateData(value));
});
test('importación elimina campos desconocidos sin modificar el original', () => {
  const data = createDemo(date); data.unknown = true; data.projects[0].extra = '<script>';
  const parsed = validateData(data);
  assert.equal(parsed.unknown, undefined); assert.equal(parsed.projects[0].extra, undefined);
  assert.equal(data.projects[0].extra, '<script>');
});
test('CSV escapa comillas, separadores y fórmulas', () => {
  const data = createDemo(date);
  data.expenses[0].title = '=SUM(1,2)';
  data.expenses[1].title = 'Foto "Especial", marca';
  const csv = expensesCSV(data.expenses, data.projects);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=SUM(1,2)"'));
  assert.ok(csv.includes('"Foto ""Especial"", marca"'));
  assert.ok(csv.includes('"320.00"'));
  assert.equal(csv.split('\r\n').length, 5);
});
