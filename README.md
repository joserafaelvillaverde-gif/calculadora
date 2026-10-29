# Órbita · Espacio de trabajo

Aplicación web en español para organizar proyectos, tareas, presupuestos y notas. Reemplaza la calculadora original y funciona en GitHub Pages, sin compilación, dependencias de producción ni claves de acceso.

## Abrir la aplicación

Con GitHub Pages configurado para `main` y `/ (root)`, la dirección es:

https://joserafaelvillaverde-gif.github.io/calculadora/

GitHub publica los cambios después de cada subida. El despliegue puede tardar unos minutos; su estado aparece en la pestaña **Actions** del repositorio.

Para ejecutar localmente, necesitas Python 3:

```sh
cd /workspace/calculadora
python3 -m http.server 8000 --bind 127.0.0.1
```

Abre `http://127.0.0.1:8000` en tu navegador. También puedes usar `npm start`. Abre la aplicación a través de HTTP, porque utiliza módulos JavaScript y abrir el archivo HTML directamente puede impedir su carga.

## Funciones

- **Resumen:** proyectos activos, tareas pendientes y vencidas, avance y gastos. Acceso rápido a los siguientes vencimientos y a completar tareas.
- **Proyectos:** creación, edición, eliminación, estados, colores, fecha objetivo, presupuesto y progreso calculado a partir de sus tareas. Pulsa el nombre de un proyecto para abrir sus tareas.
- **Tablero Kanban:** tareas con descripción, prioridad, fecha y proyecto. Arrastra entre columnas o utiliza el selector de estado; esta alternativa también funciona con teclado y pantallas táctiles.
- **Finanzas:** registro y edición de gastos por proyecto y categoría, saldos, alertas de presupuesto y exportación CSV. Todos los importes están en soles peruanos (PEN); admite punto o coma decimal.
- **Notas:** apuntes personales o vinculados a proyectos, con colores y búsqueda. El contenido se muestra como texto, sin interpretar HTML.
- **Búsqueda y filtros:** búsqueda en la vista actual, estado de proyectos y filtros de proyecto y prioridad en el tablero.
- **Copias:** exportación e importación completa en JSON con validación de formato, relaciones e importes. La importación reemplaza el espacio actual y pide confirmación.
- **Configuración:** cargar la demostración o empezar desde cero, con confirmación previa. Accesible mediante el engranaje superior también en móviles.
- **Atajos:** `/` busca; `N` crea un elemento en la sección actual; `Escape` cierra los formularios.

## Datos y límites

La primera visita crea datos de ejemplo editables. Puedes borrarlos en **Datos y configuración → Borrar datos**.

La información se guarda en `localStorage` bajo `orbita.workspace.v1`. No se envía a ningún servidor, no hay autenticación, cuentas compartidas ni sincronización entre equipos. Cambiar de navegador, dominio o perfil implica otro espacio. Borrar los datos del navegador elimina la información: **exporta copias regularmente**. Evita utilizarlo como único registro de información sensible o contable.

Si el almacenamiento está bloqueado o lleno, aparece un aviso y debes exportar antes de salir. Si hay datos corruptos, no se sobrescriben automáticamente y puedes descargar el original en Configuración. Las pestañas del mismo navegador reciben los cambios guardados; una actualización externa cierra los formularios abiertos para evitar sobrescribir con una edición anterior.

Eliminar un proyecto también elimina sus tareas, gastos y notas. Se pide confirmación; no existe papelera. Las notas personales y gastos generales no vinculados se conservan. Las copias importadas admiten como máximo 5 MB y 10 000 elementos de cada tipo.

Los presupuestos son orientativos, las fechas de gastos se usan tal como se registran y se permiten gastos generales sin proyecto. Marcar un proyecto como completado no modifica automáticamente sus tareas: el estado del proyecto y el avance de tareas son independientes.

## Comprobaciones

Node.js 20 o superior, sin instalar paquetes:

```sh
npm test
```

Las pruebas unitarias cubren importes, fechas, progreso, eliminación en cascada, validación de copias y exportación CSV. Para mostrar cada caso individualmente:

```sh
node tests/core.test.mjs
```

La integración con navegador requiere Playwright y Chromium. En el entorno de desarrollo utilizado ya están disponibles. En otro equipo puedes instalarlos para esta comprobación:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
CHROMIUM_PATH="$(node -p "require('playwright').chromium.executablePath()")" node tests/browser.cjs
```

Si Chromium está instalado en `/usr/bin/chromium`, basta con `node tests/browser.cjs`. La prueba inicia y detiene su propio servidor local y navegador. Verifica los flujos de creación, edición y borrado, movimiento de tareas, persistencia, importación/exportación, texto seguro y adaptación móvil desde una subcarpeta, como GitHub Pages. Genera capturas en `/tmp/orbita-desktop.png` y `/tmp/orbita-mobile.png`.

## Estructura

- `index.html`, `styles.css`, `icon.svg`: interfaz adaptable, navegación y estilos.
- `app.mjs`: vistas, formularios, almacenamiento local, interacciones y copias.
- `core.mjs`: modelo de datos, validación, estadísticas, importes y CSV.
- `tests/`: pruebas de lógica e integración.

No se necesitan servicios externos, fuentes remotas, bibliotecas de interfaz ni un proceso de construcción. Para mantener GitHub Pages funcionando, conserva los archivos de la aplicación en la raíz del repositorio.
