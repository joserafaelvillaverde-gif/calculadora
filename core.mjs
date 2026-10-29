export const STORAGE_KEY = 'orbita.workspace.v1';
export const TASK_STATUS = { todo: 'Pendiente', doing: 'En curso', done: 'Completada' };
export const PRIORITY = { low: 'Baja', medium: 'Media', high: 'Alta' };
export const PROJECT_STATUS = { active: 'En marcha', planned: 'Planificado', completed: 'Completado' };
export const CATEGORIES = ['Herramientas', 'Servicios', 'Marketing', 'Equipo', 'Otros'];
export const COLORS = ['purple', 'blue', 'orange', 'green', 'pink'];
export const money = cents => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(cents / 100);
export function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '9999-12-31') return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function parseAmount(value) {
  const normalized = String(value).trim().replace(',', '.');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(normalized)) throw new Error('Escribe un importe positivo con un máximo de dos decimales.');
  return Math.round(Number(normalized) * 100);
}
export const uid = () => crypto.randomUUID();
export function emptyData() { return { version: 1, projects: [], tasks: [], expenses: [], notes: [] }; }
export function createDemo(date = today()) {
  return {
    version: 1,
    projects: [
      { id: 'p-web', name: 'Nueva página web', description: 'Una presencia digital que cuenta nuestra historia.', status: 'active', color: 'purple', budget: 450000, due: shiftDate(date, 14) },
      { id: 'p-brand', name: 'Identidad de marca', description: 'Encontrar una voz propia, desde el primer detalle.', status: 'active', color: 'orange', budget: 280000, due: shiftDate(date, 8) },
      { id: 'p-launch', name: 'Próximo lanzamiento', description: 'Preparar el camino para lo que viene.', status: 'planned', color: 'blue', budget: 600000, due: shiftDate(date, 30) }
    ],
    tasks: [
      { id: 't1', title: 'Diseñar la página de inicio', projectId: 'p-web', status: 'doing', priority: 'high', due: date, description: 'Preparar una propuesta para escritorio y móvil.' },
      { id: 't2', title: 'Definir la paleta de colores', projectId: 'p-brand', status: 'doing', priority: 'medium', due: shiftDate(date, 1), description: 'Explorar tres rutas visuales y elegir una.' },
      { id: 't3', title: 'Revisar los textos de la web', projectId: 'p-web', status: 'todo', priority: 'medium', due: shiftDate(date, 3), description: '' },
      { id: 't4', title: 'Preparar calendario de contenidos', projectId: 'p-launch', status: 'todo', priority: 'high', due: shiftDate(date, 5), description: 'Incluir publicaciones y correo de lanzamiento.' },
      { id: 't5', title: 'Investigar referencias visuales', projectId: 'p-brand', status: 'done', priority: 'low', due: shiftDate(date, -2), description: '' },
      { id: 't6', title: 'Definir estructura y navegación', projectId: 'p-web', status: 'done', priority: 'high', due: shiftDate(date, -3), description: '' },
      { id: 't7', title: 'Confirmar proveedores', projectId: 'p-launch', status: 'todo', priority: 'medium', due: shiftDate(date, -1), description: 'Comparar presupuesto y disponibilidad.' }
    ],
    expenses: [
      { id: 'e1', title: 'Dominio y alojamiento', projectId: 'p-web', amount: 32000, category: 'Herramientas', date: shiftDate(date, -3) },
      { id: 'e2', title: 'Fotografía de marca', projectId: 'p-brand', amount: 85000, category: 'Servicios', date: shiftDate(date, -2) },
      { id: 'e3', title: 'Licencia de diseño', projectId: 'p-web', amount: 18000, category: 'Herramientas', date: date },
      { id: 'e4', title: 'Reserva de espacio', projectId: 'p-launch', amount: 120000, category: 'Servicios', date: date }
    ],
    notes: [
      { id: 'n1', title: 'Ideas que merecen una oportunidad', body: '• Una web más humana, con historias reales.\n• Menos secciones, más claridad.\n• Una experiencia que funcione igual de bien en el teléfono.\n\nLa próxima gran idea empieza con una nota pequeña.', projectId: 'p-web', color: 'purple', updated: date },
      { id: 'n2', title: 'Antes del lanzamiento', body: 'Revisar los enlaces y el formulario de contacto.\nConfirmar el calendario con los proveedores.\nPreparar un correo para nuestros primeros clientes.', projectId: 'p-launch', color: 'orange', updated: date }
    ]
  };
}
export function projectStats(data, projectId) {
  const tasks = data.tasks.filter(task => task.projectId === projectId);
  const done = tasks.filter(task => task.status === 'done').length;
  return { total: tasks.length, done, progress: tasks.length ? Math.round(done / tasks.length * 100) : 0,
    spent: data.expenses.filter(expense => expense.projectId === projectId).reduce((sum, expense) => sum + expense.amount, 0) };
}
export function deleteProject(data, id) {
  data.projects = data.projects.filter(project => project.id !== id);
  data.tasks = data.tasks.filter(task => task.projectId !== id);
  data.expenses = data.expenses.filter(expense => expense.projectId !== id);
  data.notes = data.notes.filter(note => note.projectId !== id);
  return data;
}
// Imports are untrusted. Reconstruct only recognized fields and check relationships.
export function validateData(raw) {
  const fail = () => { throw new Error('La copia no es válida o contiene datos incompatibles.'); };
  if (!raw || raw.version !== 1) fail();
  const text = (value, max, required = false) => typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);
  const date = value => value === '' || (typeof value === 'string' && validDate(value));
  const amount = value => Number.isSafeInteger(value) && value >= 0 && value <= 99999999999;
  for (const key of ['projects', 'tasks', 'expenses', 'notes']) {
    if (!Array.isArray(raw[key]) || raw[key].length > 10000) fail();
    const ids = new Set();
    for (const item of raw[key]) {
      if (!item || !text(item.id, 100, true) || ids.has(item.id)) fail();
      ids.add(item.id);
    }
  }
  const projectIds = new Set(raw.projects.map(project => project.id));
  const link = value => value === '' || projectIds.has(value);
  const result = emptyData();
  for (const p of raw.projects) {
    if (!text(p.name, 100, true) || !text(p.description, 2000) || !Object.hasOwn(PROJECT_STATUS, p.status) || !COLORS.includes(p.color) || !amount(p.budget) || !date(p.due)) fail();
    result.projects.push({ id: p.id, name: p.name, description: p.description, status: p.status, color: p.color, budget: p.budget, due: p.due });
  }
  for (const t of raw.tasks) {
    if (!text(t.title, 160, true) || !text(t.description, 5000) || !projectIds.has(t.projectId) || !Object.hasOwn(TASK_STATUS, t.status) || !Object.hasOwn(PRIORITY, t.priority) || !date(t.due)) fail();
    result.tasks.push({ id: t.id, title: t.title, description: t.description, projectId: t.projectId, status: t.status, priority: t.priority, due: t.due });
  }
  for (const e of raw.expenses) {
    if (!text(e.title, 160, true) || !link(e.projectId) || !amount(e.amount) || e.amount === 0 || !CATEGORIES.includes(e.category) || !validDate(e.date)) fail();
    result.expenses.push({ id: e.id, title: e.title, projectId: e.projectId, amount: e.amount, category: e.category, date: e.date });
  }
  for (const n of raw.notes) {
    if (!text(n.title, 160, true) || !text(n.body, 20000) || !link(n.projectId) || !COLORS.includes(n.color) || !validDate(n.updated)) fail();
    result.notes.push({ id: n.id, title: n.title, body: n.body, projectId: n.projectId, color: n.color, updated: n.updated });
  }
  return result;
}
export function expensesCSV(expenses, projects) {
  const cell = value => {
    let text = String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return '\uFEFF' + [['Fecha', 'Concepto', 'Proyecto', 'Categoría', 'Importe (PEN)'], ...expenses.map(e => [e.date, e.title, projects.find(p => p.id === e.projectId)?.name || 'General', e.category, (e.amount / 100).toFixed(2)])].map(row => row.map(cell).join(',')).join('\r\n');
}
