import { STORAGE_KEY, TASK_STATUS, PRIORITY, PROJECT_STATUS, CATEGORIES, COLORS, money, today, shiftDate, uid, emptyData, createDemo, projectStats, deleteProject, validateData, parseAmount, expensesCSV } from './core.mjs';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const labels = { overview: 'Resumen', projects: 'Proyectos', tasks: 'Tablero de tareas', finances: 'Finanzas', notes: 'Notas' };
const formatDate = value => value ? new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`)) : 'Sin fecha';
const dateLabel = value => value === today() ? 'Hoy' : value === shiftDate(today(), 1) ? 'Mañana' : formatDate(value);
const project = id => data.projects.find(p => p.id === id);
let data, loadFailed = false, storageBlocked = false, toastTimer;
let view = 'overview', query = '', filterProject = '', filterPriority = '', filterStatus = 'all';
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  data = saved === null ? createDemo() : validateData(JSON.parse(saved));
  if (saved === null) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
} catch {
  data = emptyData(); loadFailed = true;
  $('#storage-warning').hidden = false;
  $('#storage-warning').textContent = 'No se pudieron cargar los datos guardados. No se sobrescribirán automáticamente. Abre Datos y configuración para descargar los datos originales o restablecer este espacio.';
}
function save() {
  if (loadFailed) { notify('Primero descarga o restablece los datos desde Configuración.'); return false; }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    storageBlocked = false; $('#storage-warning').hidden = true;
  } catch {
    storageBlocked = true; $('#storage-warning').hidden = false;
    $('#storage-warning').textContent = 'No se pueden guardar los cambios. Descarga una copia antes de cerrar la página.';
  }
  return true;
}
function notify(message) {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4500);
}
function matches(...values) { return values.some(value => String(value ?? '').toLocaleLowerCase('es').includes(query)); }
function empty(message, action = '', label = '') {
  return `<div class="empty-state"><span aria-hidden="true">◌</span><h3>${escape(message)}</h3><p>${query ? 'Prueba con otra búsqueda o cambia los filtros.' : 'Dale espacio a tu próxima buena idea.'}</p>${action ? `<button class="button primary" data-action="${action}">${label}</button>` : ''}</div>`;
}
function pageHeader(title, subtitle, action, button) {
  return `<div class="page-heading"><div><p class="eyebrow">TU ESPACIO, A TU RITMO</p><h1>${title}</h1><p>${subtitle}</p></div>${action ? `<button class="button primary" data-action="${action}"><span aria-hidden="true">＋</span> ${button}</button>` : ''}</div>`;
}
function stat(label, value, detail, icon, color = 'purple') {
  return `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon ${color}" aria-hidden="true">${icon}</span></div><strong>${value}</strong><small>${detail}</small></article>`;
}
function progress(value, color = 'purple') {
  return `<div class="progress" role="progressbar" aria-label="Progreso" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100"><span class="${color}" style="width:${Math.min(100, Math.max(0, value))}%"></span></div>`;
}
function projectCard(p) {
  const stats = projectStats(data, p.id);
  return `<article class="project-card"><div class="card-top"><span class="project-icon ${p.color}" aria-hidden="true">${escape(p.name.charAt(0).toUpperCase())}</span><span class="pill ${p.status}">${PROJECT_STATUS[p.status]}</span><button class="icon-button" data-action="edit-project" data-id="${escape(p.id)}" aria-label="Editar ${escape(p.name)}">⋯</button></div><h3><button class="title-button" data-action="project-tasks" data-id="${escape(p.id)}">${escape(p.name)}</button></h3><p class="project-description">${escape(p.description || 'Un nuevo proyecto por hacer realidad.')}</p><div class="progress-label"><span>Progreso de tareas</span><strong>${stats.progress}%</strong></div>${progress(stats.progress, p.color)}<div class="card-meta"><span>☑ ${stats.done}/${stats.total} tareas</span><span>◷ ${formatDate(p.due)}</span></div><div class="project-budget"><span>${money(stats.spent)} <small>/ ${money(p.budget)}</small></span>${stats.spent > p.budget ? '<span class="over-budget">Sobre presupuesto</span>' : '<span>gastados</span>'}</div></article>`;
}
function overview() {
  const done = data.tasks.filter(t => t.status === 'done').length;
  const pending = data.tasks.filter(t => t.status !== 'done');
  const overdue = pending.filter(t => t.due && t.due < today()).length;
  const spent = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const budget = data.projects.reduce((sum, p) => sum + p.budget, 0);
  const completion = data.tasks.length ? Math.round(done / data.tasks.length * 100) : 0;
  const focus = pending.filter(t => matches(t.title, project(t.projectId)?.name)).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')).slice(0, 5);
  const projects = data.projects.filter(p => matches(p.name, p.description)).slice(0, 3);
  const date = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return pageHeader('Un buen día para avanzar<span class="heading-dot">.</span>', `${escape(date)} · Así va tu espacio de trabajo.`, 'new-project', 'Nuevo proyecto') +
    `<section class="welcome-banner"><div><span class="banner-label">MENOS RUIDO. MÁS ENFOQUE.</span><h2>Todo lo que necesitas,<br>en tu propia órbita.</h2><p>Convierte las ideas en proyectos y los proyectos en avances.</p><a href="#tasks" class="banner-link">Organizar mi día <span aria-hidden="true">↗</span></a></div><div class="orbit-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit-core">✦</div><span class="orbit-dot one"></span><span class="orbit-dot two"></span><span class="orbit-dot three"></span><div class="float-label">Un paso a la vez ↗</div></div></section>` +
    `<section class="stats-grid" aria-label="Estadísticas">${stat('Proyectos activos', data.projects.filter(p => p.status === 'active').length, `${data.projects.length} proyectos en total`, '◫')}${stat('Tareas por hacer', pending.length, `${overdue} vencidas · ${done} completadas`, '☑', 'orange')}${stat('Gastos registrados', money(spent), `${money(budget)} de presupuesto total`, '↗', 'green')}${stat('Tareas completadas', completion + '%', `${done} de ${data.tasks.length} tareas`, '◉', 'blue')}</section>` +
    `<div class="section-heading"><h2>Proyectos en tu órbita <span>${data.projects.length}</span></h2><a href="#projects">Ver todos <span aria-hidden="true">↗</span></a></div><section class="projects-grid">${projects.map(projectCard).join('') || empty('Sin proyectos que mostrar', 'new-project', 'Crear proyecto')}</section>` +
    `<div class="overview-bottom"><section class="panel"><div class="section-heading"><h2>Tu próximo paso</h2><a href="#tasks">Ver tablero ↗</a></div>${focus.map(t => `<div class="focus-task"><button class="check-button" data-action="complete-task" data-id="${escape(t.id)}" aria-label="Completar ${escape(t.title)}">✓</button><div><button class="title-button" data-action="edit-task" data-id="${escape(t.id)}">${escape(t.title)}</button><small>${escape(project(t.projectId)?.name)}</small></div><span class="due ${t.due && t.due < today() ? 'overdue' : ''}">${dateLabel(t.due)}</span></div>`).join('') || empty('Todo al día', 'new-task', 'Crear tarea')}</section><section class="panel distribution"><h2>El panorama completo</h2><p>Cada tarea terminada cuenta.</p><div class="donut" style="--percent:${completion}%"><div><strong>${completion}%</strong><small>completado</small></div></div><div class="legend">${Object.entries(TASK_STATUS).map(([key, label]) => `<div><span class="legend-dot ${key}"></span>${label}<strong>${data.tasks.filter(t => t.status === key).length}</strong></div>`).join('')}</div></section></div>`;
}
function projectsView() {
  const list = data.projects.filter(p => matches(p.name, p.description) && (filterStatus === 'all' || p.status === filterStatus));
  return pageHeader('Ideas con dirección.', 'Planifica, conecta y sigue el progreso de cada proyecto.', 'new-project', 'Nuevo proyecto') +
    `<div class="toolbar"><div class="filter-tabs" aria-label="Filtrar proyectos">${[['all', 'Todos'], ...Object.entries(PROJECT_STATUS)].map(([key, label]) => `<button data-action="filter-status" data-value="${key}" class="${filterStatus === key ? 'selected' : ''}" aria-pressed="${filterStatus === key}">${label}</button>`).join('')}</div><span class="result-count">${list.length} proyectos</span></div><section class="projects-grid">${list.map(projectCard).join('') || empty('Aquí empieza tu próximo proyecto', 'new-project', 'Crear proyecto')}</section>`;
}
function projectOptions(selected = '', optional = true) {
  return (optional ? '<option value="">Todos los proyectos</option>' : '') + data.projects.map(p => `<option value="${escape(p.id)}" ${selected === p.id ? 'selected' : ''}>${escape(p.name)}</option>`).join('');
}
function taskCard(t) {
  const p = project(t.projectId);
  return `<article class="task-card" draggable="true" data-task="${escape(t.id)}"><div class="task-top"><span class="priority ${t.priority}"><span aria-hidden="true">●</span> ${PRIORITY[t.priority]}</span><button class="icon-button" data-action="edit-task" data-id="${escape(t.id)}" aria-label="Editar ${escape(t.title)}">⋯</button></div><h3><button class="title-button" data-action="edit-task" data-id="${escape(t.id)}">${escape(t.title)}</button></h3>${t.description ? `<p class="task-description">${escape(t.description)}</p>` : ''}<span class="project-tag ${p.color}">${escape(p.name)}</span><div class="task-bottom"><span class="due ${t.status !== 'done' && t.due && t.due < today() ? 'overdue' : ''}">◷ ${dateLabel(t.due)}</span><label class="sr-only" for="move-${escape(t.id)}">Estado de ${escape(t.title)}</label><select id="move-${escape(t.id)}" class="move-select" data-move="${escape(t.id)}">${Object.entries(TASK_STATUS).map(([key, label]) => `<option value="${key}" ${key === t.status ? 'selected' : ''}>${label}</option>`).join('')}</select></div></article>`;
}
function tasksView() {
  const list = data.tasks.filter(t => matches(t.title, t.description, project(t.projectId)?.name) && (!filterProject || t.projectId === filterProject) && (!filterPriority || t.priority === filterPriority));
  return pageHeader('Un paso a la vez.', 'Arrastra las tareas entre columnas o utiliza su selector de estado.', 'new-task', 'Nueva tarea') +
    `<div class="toolbar"><div class="filters"><label>Proyecto <select id="project-filter">${projectOptions(filterProject)}</select></label><label>Prioridad <select id="priority-filter"><option value="">Todas las prioridades</option>${Object.entries(PRIORITY).map(([key, label]) => `<option value="${key}" ${filterPriority === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div><span class="result-count">${list.length} tareas</span></div>` +
    `${!data.projects.length ? empty('Crea un proyecto para organizar tus tareas', 'new-project', 'Crear proyecto') : `<section class="kanban">${Object.entries(TASK_STATUS).map(([key, label]) => `<section class="kanban-column" data-drop="${key}" aria-label="${label}"><div class="column-heading"><h2><span class="legend-dot ${key}"></span>${label} <b>${list.filter(t => t.status === key).length}</b></h2><button class="icon-button" data-action="new-task" data-status="${key}" aria-label="Añadir tarea ${label.toLowerCase()}">＋</button></div>${list.filter(t => t.status === key).map(taskCard).join('') || '<p class="column-empty">Sin tareas en esta columna.</p>'}<button class="add-task" data-action="new-task" data-status="${key}">＋ Añadir tarea</button></section>`).join('')}</section>`}`;
}
function financesView() {
  const list = data.expenses.filter(e => matches(e.title, e.category, project(e.projectId)?.name) && (!filterProject || e.projectId === filterProject)).sort((a, b) => b.date.localeCompare(a.date));
  const spent = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const budget = data.projects.reduce((sum, p) => sum + p.budget, 0);
  const monthly = data.expenses.filter(e => e.date.slice(0, 7) === today().slice(0, 7)).reduce((sum, e) => sum + e.amount, 0);
  return pageHeader('Tus números, claros.', 'Registra gastos en soles y mantén los presupuestos bajo control.', 'new-expense', 'Registrar gasto') +
    `<section class="stats-grid three">${stat('Presupuesto de proyectos', money(budget), 'Suma de todos tus proyectos', '◫')}${stat('Gastos totales', money(spent), `${money(monthly)} con fecha de este mes`, '↗', 'orange')}${stat('Saldo del presupuesto', money(budget - spent), spent > budget ? 'Has superado el presupuesto total' : 'Presupuesto menos todos los gastos', '◈', 'green')}</section>` +
    `<div class="finance-layout"><section class="panel expenses-panel"><div class="section-heading"><h2>Registro de gastos</h2><button class="text-button" data-action="csv">Exportar CSV ↗</button></div><div class="toolbar"><label class="filter-label">Proyecto <select id="project-filter">${projectOptions(filterProject)}</select></label><span class="result-count">${list.length} gastos · ${money(list.reduce((sum, e) => sum + e.amount, 0))}</span></div><div class="table-scroll"><table><thead><tr><th>Concepto / Proyecto</th><th>Fecha</th><th>Categoría</th><th class="number">Importe</th><th><span class="sr-only">Acciones</span></th></tr></thead><tbody>${list.map(e => `<tr><td><strong>${escape(e.title)}</strong><small>${escape(project(e.projectId)?.name || 'General')}</small></td><td>${formatDate(e.date)}</td><td><span class="pill">${escape(e.category)}</span></td><td class="number">${money(e.amount)}</td><td><button class="icon-button" data-action="edit-expense" data-id="${escape(e.id)}" aria-label="Editar ${escape(e.title)}">⋯</button></td></tr>`).join('')}</tbody></table></div>${!list.length ? empty('Sin gastos que mostrar', 'new-expense', 'Registrar gasto') : ''}</section><section class="panel"><h2>Presupuesto por proyecto</h2><p class="muted">Gastos registrados frente al límite previsto.</p>${data.projects.map(p => { const spent = projectStats(data, p.id).spent; const percent = p.budget ? Math.round(spent / p.budget * 100) : (spent ? 100 : 0); return `<div class="budget-row"><strong>${escape(p.name)}</strong><div class="progress-label"><span>${money(spent)}</span><span>${money(p.budget)}</span></div>${progress(percent, p.color)}<small class="${spent > p.budget ? 'overdue' : ''}">${spent > p.budget ? 'Presupuesto superado' : `${percent}% utilizado`}</small></div>`; }).join('') || '<p>Añade un proyecto con presupuesto para ver su seguimiento.</p>'}</section></div>`;
}
function notesView() {
  const list = data.notes.filter(n => matches(n.title, n.body, project(n.projectId)?.name)).sort((a, b) => b.updated.localeCompare(a.updated));
  return pageHeader('Que no se escape la idea.', 'Un lugar para tus apuntes, decisiones y próximas grandes cosas.', 'new-note', 'Nueva nota') +
    `<section class="notes-grid">${list.map(n => `<article class="note-card ${n.color}"><div class="card-top"><span class="note-symbol" aria-hidden="true">▤</span><span>${formatDate(n.updated)}</span><button class="icon-button" data-action="edit-note" data-id="${escape(n.id)}" aria-label="Editar ${escape(n.title)}">⋯</button></div><h2><button class="title-button" data-action="edit-note" data-id="${escape(n.id)}">${escape(n.title)}</button></h2><p class="note-body">${escape(n.body)}</p><span class="note-project">${escape(project(n.projectId)?.name || 'Nota personal')}</span></article>`).join('') || empty('Tu próxima idea empieza aquí', 'new-note', 'Crear nota')}</section>`;
}
function render() {
  $('#main').innerHTML = ({ overview, projects: projectsView, tasks: tasksView, finances: financesView, notes: notesView })[view]();
  $('#breadcrumb').textContent = labels[view];
  $('#project-count').textContent = data.projects.length;
  document.title = `${labels[view]} · Órbita`;
  document.querySelectorAll('[data-view]').forEach(link => {
    link.classList.toggle('active', link.dataset.view === view);
    if (link.dataset.view === view) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
}
function route() {
  const requested = location.hash.slice(1);
  view = Object.hasOwn(labels, requested) ? requested : 'overview';
  query = ''; filterProject = ''; filterPriority = ''; filterStatus = 'all'; $('#search').value = ''; render();
}
function openDialog(title, body, subtitle = '') {
  $('#dialog-content').innerHTML = `<div class="dialog-heading"><div><p class="eyebrow">SEAMOS UN POCO MÁS ORGANIZADOS</p><h2 id="dialog-title">${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div><button class="icon-button" data-action="close-dialog" aria-label="Cerrar">×</button></div>${body}`;
  if (!$('#editor').open) $('#editor').showModal();
}
const field = (label, name, value = '', options = {}) => `<label class="form-field">${label}<input name="${name}" value="${escape(value)}" ${options.type ? `type="${options.type}"` : 'type="text"'} ${options.required ? 'required' : ''} ${options.max ? `maxlength="${options.max}"` : ''} ${options.type === 'date' ? 'min="1900-01-01" max="9999-12-31"' : ''} ${options.amount ? 'inputmode="decimal" placeholder="0.00"' : ''} ${options.auto ? 'autofocus' : ''}></label>`;
const selectField = (label, name, entries, value) => `<div class="form-field"><label for="field-${name}">${label}</label><select id="field-${name}" name="${name}">${entries.map(([key, text]) => `<option value="${escape(key)}" ${key === value ? 'selected' : ''}>${escape(text)}</option>`).join('')}</select></div>`;
const textarea = (label, name, value, max) => `<label class="form-field">${label}<textarea name="${name}" rows="5" maxlength="${max}">${escape(value)}</textarea></label>`;
function edit(kind, id = '', status = 'todo') {
  if (loadFailed) return notify('Restablece o recupera los datos en Configuración antes de editar.');
  if (kind === 'task' && !data.projects.length) { notify('Crea primero un proyecto para esta tarea.'); return edit('project'); }
  const collection = { project: 'projects', task: 'tasks', expense: 'expenses', note: 'notes' }[kind];
  const item = data[collection].find(x => x.id === id);
  if (id && !item) return;
  const value = item || {};
  const projects = [['', 'Sin proyecto / General'], ...data.projects.map(p => [p.id, p.name])];
  let fields = '';
  if (kind === 'project') fields = field('Nombre del proyecto', 'name', value.name, { required: true, max: 100, auto: true }) + textarea('Descripción', 'description', value.description, 2000) + `<div class="form-grid">${selectField('Estado', 'status', Object.entries(PROJECT_STATUS), value.status || 'active')}${field('Fecha objetivo', 'due', value.due, { type: 'date' })}${field('Presupuesto (S/)', 'budget', (value.budget || 0) / 100, { required: true, amount: true })}${selectField('Color', 'color', COLORS.map((c, i) => [c, ['Violeta', 'Azul', 'Naranja', 'Verde', 'Rosa'][i]]), value.color || 'purple')}</div>`;
  if (kind === 'task') fields = field('Título de la tarea', 'title', value.title, { required: true, max: 160, auto: true }) + textarea('Descripción', 'description', value.description, 5000) + `<div class="form-grid">${selectField('Proyecto', 'projectId', projects.slice(1), value.projectId || filterProject || data.projects[0].id)}${selectField('Estado', 'status', Object.entries(TASK_STATUS), value.status || status)}${selectField('Prioridad', 'priority', Object.entries(PRIORITY), value.priority || 'medium')}${field('Fecha límite', 'due', value.due, { type: 'date' })}</div>`;
  if (kind === 'expense') fields = field('Concepto', 'title', value.title, { required: true, max: 160, auto: true }) + `<div class="form-grid">${field('Importe (S/)', 'amount', value.amount ? value.amount / 100 : '', { required: true, amount: true })}${field('Fecha', 'date', value.date || today(), { type: 'date', required: true })}${selectField('Proyecto', 'projectId', projects, value.projectId || filterProject)}${selectField('Categoría', 'category', CATEGORIES.map(c => [c, c]), value.category || 'Otros')}</div>`;
  if (kind === 'note') fields = field('Título', 'title', value.title, { required: true, max: 160, auto: true }) + textarea('Tu nota', 'body', value.body, 20000) + `<div class="form-grid">${selectField('Proyecto', 'projectId', projects, value.projectId || '')}${selectField('Color', 'color', COLORS.map((c, i) => [c, ['Violeta', 'Azul', 'Naranja', 'Verde', 'Rosa'][i]]), value.color || 'purple')}</div>`;
  const nouns = { project: ['Nuevo proyecto', 'Editar proyecto'], task: ['Nueva tarea', 'Editar tarea'], expense: ['Registrar gasto', 'Editar gasto'], note: ['Nueva nota', 'Editar nota'] };
  openDialog(nouns[kind][item ? 1 : 0], `<form id="entity-form" data-kind="${kind}" data-id="${escape(id)}">${fields}<p id="form-error" class="form-error" role="alert" hidden></p><div class="dialog-actions">${item ? `<button type="button" class="button danger subtle" data-action="delete-${kind}" data-id="${escape(id)}">Eliminar</button>` : ''}<span class="spacer"></span><button type="button" class="button secondary" data-action="close-dialog">Cancelar</button><button class="button primary" type="submit">Guardar ${kind === 'note' || kind === 'task' ? 'cambios' : ''}</button></div></form>`);
}
function submitEntity(event) {
  event.preventDefault();
  const form = event.target;
  const input = Object.fromEntries(new FormData(form));
  for (const key in input) input[key] = input[key].trim();
  const kind = form.dataset.kind, id = form.dataset.id || uid();
  const collection = { project: 'projects', task: 'tasks', expense: 'expenses', note: 'notes' }[kind];
  try {
    if ((kind === 'project' ? !input.name : !input.title)) throw new Error('Escribe un nombre o título.');
    let item = { id, ...input };
    if (kind === 'project') item.budget = parseAmount(input.budget);
    if (kind === 'expense') { item.amount = parseAmount(input.amount); if (item.amount === 0) throw new Error('El gasto debe ser mayor que cero.'); }
    if (kind === 'note') item.updated = today();
    const next = structuredClone(data);
    const index = next[collection].findIndex(x => x.id === id);
    if (index === -1) next[collection].push(item); else next[collection][index] = item;
    data = validateData(next);
    save(); $('#editor').close(); render(); notify(storageBlocked ? 'Cambio realizado. Descarga una copia: el guardado local no está disponible.' : 'Cambios guardados en este navegador.');
  } catch (error) { $('#form-error').textContent = error.message; $('#form-error').hidden = false; }
}
function remove(kind, id) {
  const collection = { project: 'projects', task: 'tasks', expense: 'expenses', note: 'notes' }[kind];
  const message = kind === 'project' ? '¿Eliminar este proyecto y TODAS sus tareas, gastos y notas? Esta acción no se puede deshacer.' : '¿Eliminar este elemento? Esta acción no se puede deshacer.';
  if (!confirm(message)) return;
  if (kind === 'project') deleteProject(data, id); else data[collection] = data[collection].filter(item => item.id !== id);
  if (filterProject === id) filterProject = '';
  save(); $('#editor').close(); render(); notify('Elemento eliminado.');
}
function moveTask(id, status) {
  if (loadFailed || !Object.hasOwn(TASK_STATUS, status)) return;
  const task = data.tasks.find(t => t.id === id); if (!task) return;
  task.status = status; save(); render(); notify(`Tarea: ${TASK_STATUS[status].toLowerCase()}.`);
}
function download(contents, type, filename) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function settings() {
  openDialog('Tu espacio, tus datos.', `<p class="dialog-intro">Órbita guarda la información en este navegador, sin enviarla a un servidor. No se sincroniza entre dispositivos. Si borras los datos del navegador, perderás lo que no hayas exportado.</p><div class="setting-row"><div><strong>Copia de seguridad</strong><p>Descarga todos los proyectos, tareas, gastos y notas en JSON.</p></div><button class="button secondary" data-action="export">Exportar</button></div><div class="setting-row"><div><strong>Restaurar una copia</strong><p>Reemplaza el espacio actual con una copia de Órbita.</p></div><button class="button secondary" data-action="import">Importar</button></div>${loadFailed ? '<div class="setting-row"><div><strong>Recuperar datos originales</strong><p>Descarga el contenido que no pudo cargarse antes de restablecer.</p></div><button class="button secondary" data-action="raw-export">Descargar original</button></div>' : ''}<div class="setting-row"><div><strong>Explorar datos de ejemplo</strong><p>Reemplaza todos los datos actuales por la demostración.</p></div><button class="button secondary" data-action="demo">Cargar ejemplo</button></div><div class="setting-row"><div><strong>Empezar desde cero</strong><p>Elimina todos los datos de Órbita de este navegador.</p></div><button class="button danger" data-action="reset">Borrar datos</button></div><p class="muted">Moneda: soles peruanos (PEN). Atajos: / para buscar y N para crear un elemento en la sección actual.</p>`);
}
function help() {
  openDialog('Un espacio para avanzar.', `<div class="help-content"><p><strong>1. Crea un proyecto.</strong> Define su presupuesto, estado y fecha objetivo.</p><p><strong>2. Divide el trabajo.</strong> Añade tareas y muévelas de Pendiente a En curso y Completada. También puedes cambiar su estado con el selector.</p><p><strong>3. Lleva tus cuentas.</strong> Registra gastos en soles, revisa el saldo y exporta tu registro a CSV.</p><p><strong>4. Guarda las ideas.</strong> Vincula notas a tus proyectos o déjalas como apuntes personales.</p><p><strong>5. Conserva una copia.</strong> En Datos y configuración puedes exportar o importar el espacio completo.</p><p>Los datos iniciales son ejemplos editables. Puedes eliminarlos en Configuración. Esta es una herramienta personal: no incluye usuarios compartidos ni sincronización.</p></div><button class="button primary" data-action="close-dialog">Entendido</button>`);
}
const actions = {
  'new-project': () => edit('project'), 'new-task': el => edit('task', '', el.dataset.status),
  'new-expense': () => edit('expense'), 'new-note': () => edit('note'),
  'edit-project': el => edit('project', el.dataset.id), 'edit-task': el => edit('task', el.dataset.id),
  'edit-expense': el => edit('expense', el.dataset.id), 'edit-note': el => edit('note', el.dataset.id),
  'delete-project': el => remove('project', el.dataset.id), 'delete-task': el => remove('task', el.dataset.id),
  'delete-expense': el => remove('expense', el.dataset.id), 'delete-note': el => remove('note', el.dataset.id),
  'close-dialog': () => $('#editor').close(), 'complete-task': el => moveTask(el.dataset.id, 'done'),
  'filter-status': el => { filterStatus = el.dataset.value; render(); },
  'project-tasks': el => { if (location.hash !== '#tasks') location.hash = 'tasks'; setTimeout(() => { filterProject = el.dataset.id; render(); }, 0); },
  export: () => download(JSON.stringify(data, null, 2), 'application/json', `orbita-${today()}.json`),
  csv: () => download(expensesCSV(data.expenses, data.projects), 'text/csv;charset=utf-8', `orbita-gastos-${today()}.csv`),
  import: () => { $('#import-file').value = ''; $('#import-file').click(); },
  'raw-export': () => { try { download(localStorage.getItem(STORAGE_KEY) || '', 'application/json', 'orbita-original.json'); } catch { notify('El navegador no permite leer los datos originales.'); } },
  settings, help,
  reset: () => reset(false), demo: () => reset(true)
};
function reset(demo) {
  if (!confirm(demo ? '¿Reemplazar TODOS los datos actuales con el ejemplo? Exporta antes si quieres conservarlos.' : '¿Borrar TODOS los proyectos, tareas, gastos y notas? Exporta antes si quieres conservarlos.')) return;
  data = demo ? createDemo() : emptyData(); loadFailed = false; filterProject = ''; save(); $('#editor').close(); render(); notify(demo ? 'Datos de ejemplo cargados.' : 'Tu espacio está listo para empezar.');
}
document.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (target && Object.hasOwn(actions, target.dataset.action)) actions[target.dataset.action](target);
});
document.addEventListener('submit', event => { if (event.target.id === 'entity-form') submitEntity(event); });
$('#search').addEventListener('input', event => { query = event.target.value.trim().toLocaleLowerCase('es'); render(); });
document.addEventListener('change', event => {
  if (event.target.id === 'project-filter') { filterProject = event.target.value; render(); }
  if (event.target.id === 'priority-filter') { filterPriority = event.target.value; render(); }
  if (event.target.dataset.move) moveTask(event.target.dataset.move, event.target.value);
});
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('La copia supera el límite de 5 MB.');
    const imported = validateData(JSON.parse(await file.text()));
    if (!confirm('La importación reemplazará TODOS los datos actuales. ¿Continuar?')) return;
    data = imported; loadFailed = false; filterProject = ''; save(); $('#editor').close(); render(); notify('Copia importada correctamente.');
  } catch (error) { notify(error instanceof SyntaxError ? 'El archivo no contiene JSON válido.' : error.message); }
});
document.addEventListener('dragstart', event => {
  const card = event.target.closest('[data-task]'); if (!card) return;
  event.dataTransfer.setData('text/plain', card.dataset.task); event.dataTransfer.effectAllowed = 'move';
});
document.addEventListener('dragover', event => { const column = event.target.closest('[data-drop]'); if (column) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } });
document.addEventListener('drop', event => {
  const column = event.target.closest('[data-drop]'); if (!column) return;
  event.preventDefault(); moveTask(event.dataTransfer.getData('text/plain'), column.dataset.drop);
});
document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || $('#editor').open || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (event.key === '/') { event.preventDefault(); $('#search').focus(); }
  if (event.key.toLowerCase() === 'n') { event.preventDefault(); actions[({ overview: 'new-project', projects: 'new-project', tasks: 'new-task', finances: 'new-expense', notes: 'new-note' })[view]]({ dataset: {} }); }
});
// Avoid silent overwrites when this workspace is open in multiple tabs.
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY) return;
  try {
    const updated = event.newValue === null ? emptyData() : validateData(JSON.parse(event.newValue));
    if ($('#editor').open) $('#editor').close();
    data = updated; loadFailed = false; filterProject = ''; render(); notify('Espacio actualizado desde otra pestaña.');
  } catch { loadFailed = true; $('#storage-warning').hidden = false; notify('Los datos de otra pestaña no son válidos. Revisa Configuración.'); }
});
window.addEventListener('hashchange', route);
$('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  $('#main').focus();
});
route();
