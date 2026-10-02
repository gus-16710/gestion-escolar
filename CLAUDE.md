# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Laravel 12 (PHP ^8.2) + Inertia.js v2 + React 19 + TypeScript, built with Vite 6 and Tailwind CSS v4. Based on the official `laravel/react-starter-kit`. UI primitives are shadcn/ui (Radix) components in `resources/js/components/ui`. Tests use Pest 3. Local DB is MySQL (`laravel_ciccis`, `utf8mb4_unicode_ci`); tests use in-memory SQLite.

The domain is a school management system (gestión escolar) for CICCIS. UI text, table and model names are in Spanish; permission names are in English. There is no public registration: staff create accounts (and enroll students) from the admin screens. `/` is the public site (`WelcomeController`, page `welcome`, sections in `components/welcome/`): active cursos with their study plan, upcoming `planeado` grupos with the places left (cupo − active enrollments), active planteles with an embedded Google map, a document-verification box and catalog-only figures (nothing about alumnos). Signed-in users see it too, with "Ir a mi panel". "Pedir informes" / "Apartar mi lugar" open WhatsApp with a prefilled message when `CICCIS_WHATSAPP` (digits with country code, `config/ciccis.php`) is set, and point to the planteles section otherwise. Each curso's icon and accent come from its clave in `components/welcome/comun.tsx` (`estiloCurso`).

## Localization

- `APP_LOCALE=es`. Server messages (validation, auth, passwords, pagination) come from `lang/es*`, which `laravel-lang/common` generated via `php artisan lang:add es`.
- Readable names for CICCIS form fields live at the bottom of `attributes` in `lang/es/validation.php`; add new fields there. `php artisan lang:update` keeps custom keys.
- Hard-coded UI text is written directly in Spanish; there is no frontend i18n layer. Use "correo electrónico" rather than "email" in labels.
- Permission names stay in English internally. Show them with `etiquetaPermiso()` from `resources/js/lib/permisos.ts`.
- When the seeder gets a new permission, also add its label to `ETIQUETAS` and its module to `MODULOS_PERMISOS` in `resources/js/lib/permisos.ts`.
  - `MODULOS_PERMISOS` drives the role form (`PermisosPorModuloField`: one "Sin acceso / Ver / Gestionar" switch per module, via `nivelEnModulo` / `conNivelEnModulo`; managing also grants seeing), the permissions matrix and the "lo que podrá hacer" summaries (`components/admin/resumen-permisos.tsx`, with `IconoRol` and `NivelChip`). System role descriptions live in `DESCRIPCION_ROLES`.
  - A permission missing from `MODULOS_PERMISOS` still shows up, under "Otros".
- Don't match on translated strings in the frontend. For example, `pagination.tsx` finds the previous/next links by position, not by label.

## Domain CRUD pattern

School entities follow the Planteles CRUD, which mirrors the sibling `physio-clinic` project:
- `routes/<entidad>.php`, required from `web.php`. Use `->parameters()` when Laravel singularizes a Spanish plural badly, e.g. `planteles` → `plantel`.
- The controller calls `$this->authorize()` against a Policy in `app/Policies` (auto-discovered). The Policy maps `view*` to a `view <x>` permission and create/update/delete to `manage <x>`.
- `index` offers search, `per_page` of 10, 15 or 20 and `paginate()->through()`, and passes a `canManage` flag.
- Pages live in `resources/js/pages/<entidad>/{index,create,edit}.tsx`. The index shows a table on desktop and cards on mobile, with `motion` animations and the shared `Pagination` and `DeleteConfirmDialog`. The form shared by create and edit lives in `components/<entidad>/`.
- Form data types passed to `useForm` must be `type` aliases, not interfaces, or TypeScript rejects them against `FormDataType`.
- Person photos (alumnos, profesores) share code:
  - Backend: the `Concerns\ManagesPhotos` trait (`photoRules()`, `photoMessages()`, `applyPhoto()`, `deleteReplacedPhoto()`).
  - Form section: `components/foto-persona-fields.tsx`.
  - Display: `components/persona-avatar.tsx`, which shows the photo or falls back to initials. Use `PersonaAvatar` wherever a person is listed.
- File uploads (e.g. the alumno `foto`) follow the physio-clinic pattern:
  - Frontend: `components/photo-upload-field.tsx` checks type and size in the browser. Edit pages send `post()` with `transform(... _method: 'put')` + `forceFormData`, because PHP doesn't parse multipart PUT.
  - Backend: files go to the `public` disk and need `php artisan storage:link`. On update, the old file is deleted after the new state is saved.
  - URLs come from `asset('storage/...')`, not `Storage::url()`, because `APP_URL` is `http://localhost` without the dev port.
- A sidebar entry is gated on `auth.permissions`: add new modules to `moduleNavItems` in `components/app-sidebar.tsx` with their `permission` and `seccion` ("Académico" or "Personas"). The sidebar renders labeled sections (Inicio, Académico, Personas, and Administración for Admin only) through `NavMain`, which marks an item active on its own URL and on any page under it (`isActiveUrl`) and shows tooltips when collapsed. The logo mark is `components/app-logo-icon.tsx`: the CICCIS emblem `public/images/logo-ciccis-emblema.png` applied as a CSS mask over `bg-current`, so `text-*` classes color it (green in the sidebar, `text-primary` on the login page). It and `logo-ciccis.png` (full logo with the name) and `favicon.png` were cleaned from the uploaded `logo_ciccis.png` (white on transparent, with background specks and the name), which is kept as the original. Blocked deletes return `back()->withErrors([...])`, which the page shows in an error banner.

## Domain model

```
planteles ──< curso_plantel >── cursos        (curso = global catalog; pivot = which courses a plantel offers)
    └──────────< grupos >────────┘             (grupo = one opening of a curso at a plantel; one profesor per grupo)
                  │ └─ profesor_id → profesores ─→ users (optional login)
             inscripciones ── alumnos ─→ users (optional login)
                  │ (inscrito_por → users)
             asistencias                       (one per inscripcion + fecha)
planteles ──< plantel_user >── users ←─ directores   (the planteles a Director runs; directores = their record, always with an account)
```

- The offer (`curso_plantel`, just the pair plus timestamps) is edited **only from Cursos** ("¿Dónde se imparte?", checkboxes of plantel ids). The plantel form shows it read-only with a link to Cursos. `CursoController::update` refuses to remove a plantel where the curso still has grupos in `Grupo::ESTADOS_ACTIVOS`.
- Study plan (`curso_modulos`, `Curso::modulos()` ordered by `orden`): each curso's modules in order with `duracion_semanas`, the base for grades.
  - Edited in the curso form ("Plan de estudios", `components/cursos/plan-estudios-field.tsx`); `CursoController::sincronizarModulos()` deletes the missing ones, updates by id, creates the new and renumbers `orden` (first shifted by +1000 so the `(curso_id, orden)` unique index never collides). Names are kept distinct by validation, not by an index, so two modules can swap names in one save.
  - Every grupo inherits the plan; `App\Support\CalendarioGrupo::modulos()` lays it over the grupo's real calendar with estado terminado/actual/proximo, shown by `components/grupos/plan-estudios-grupo.tsx`. Nothing is stored per grupo.
- Grades (`calificaciones`, `Calificacion`): one row per inscripción + módulo (unique), 0–10 with one decimal, `APROBATORIA` = 6. A retake (`recuperacion` + `fecha_recuperacion`, only for a failed grade) is what counts (`final()`); the original stays. The FK to the module restricts, and `CursoController::sincronizarModulos()` refuses to drop a graded module.
  - `App\Support\Calificaciones\Boleta::de(modulos, calificaciones)` is the single report-card calculation: per module grade, `promedio_parcial` (modules graded so far), `promedio_final` (only with every module graded), `situacion` sin_calificaciones/en_curso/aprobado/reprobado (pass = final average ≥ 6; failed modules are only a warning).
  - `CalificacionController`: `grupos/{grupo}/calificaciones` is the sheet (alumnos × modules, `pages/calificaciones/sabana.tsx`); `grupos/{grupo}/calificaciones/{modulo}` captures one module (`capturar.tsx`: one exam date, grade per active alumno, retake box when < 6; empty removes the grade; a `proximo` module can't be graded). `GrupoPolicy::viewGrades` (`view grades` + view) / `gradeStudents` (like `takeAttendance`: the grupo's teacher or an unrestricted Admin; Directors only review).
  - Also shown in the grupo page (button + per-module average in the study plan), the alumno record and the alumno dashboard (`BoletaDesplegable` from `components/calificaciones/calificacion.tsx`, which also holds `formatCalificacion`, `CalificacionChip`, `SituacionBadge`), and the profesor dashboard (`ResumenEscolar::calificacionesPendientes()`: finished modules with active alumnos still ungraded).
- Closing a grupo (`CierreGrupoController`, `grupos/{grupo}/cierre`, page `grupos/cierre`): the review lists each active alumno's final average and result; it can only be concluded once every active alumno has every module graded. Concluding sets each active inscripción to `egresado` (final average ≥ 6) or `no_acreditado`, freezes `promedio_final` and `fecha_cierre`, and marks the grupo `concluido` with `concluido_en` / `concluido_por`. `GrupoPolicy::close` (whoever runs the grupo: Admin or its Director) and `reopen` (unrestricted Admin only; puts grupo and alumnos back). A concluded grupo is read-only: no grades, roll calls or suspensions. The grupo form can't set or leave `concluido` (validation + the select hides it); only the flow does.
- Reports (PDF via `barryvdh/laravel-dompdf`, Blade views in `resources/views/reportes/`; `view reports` = Admin, and Directors within their planteles, through `GrupoPolicy::report`):
  - `App\Support\Reportes\DatosReporte` gathers each report's data as plain arrays (boleta, constancia, concentrado, monthly roll-call sheet from `CalendarioGrupo`, with holidays/suspensions marked and make-up days); `ImpresionPdf` renders a view (letter, inline) and draws "Página N de M" on the canvas, since dompdf has no `counter(pages)`. The print logo is `public/images/logo-ciccis-impresion.png` (the white logo tinted brand blue).
  - Grupo reports (concentrado, asistencia `?mes=Y-m&en_blanco=`) are printed on demand with no folio (`ReporteController`, `grupos/{grupo}/reportes/*`), from the grupo page's "Reportes" menu or the reports center.
  - Boleta and constancia are issued documents (`documentos_emitidos`, `DocumentoEmitido`, `DocumentoController`): issuing takes a folio consecutive per type and year (`BOL-2026-0001`, `CON-…`, voided ones counted), a random `codigo` for the QR (`chillerlan/php-qrcode`) and a copy of what was printed in `datos`; re-downloading renders from that copy without a new folio. A constancia requires `egresado`. The signer is the plantel's active director (`DatosReporte::firmantes`, asked when there are several). Only the unrestricted Admin voids (`DocumentoEmitidoPolicy::void`), and reopening a grupo voids its constancias.
  - Issuing is a plain form post with `target="_blank"` (the PDF opens in a new tab), so pages pass `csrf` in `ReporteController::datosEmision()`; UI in `components/reportes/documentos.tsx`, used by `pages/reportes/index.tsx` (tabs Por grupo / Por alumno / Documentos emitidos) and the alumno record.
  - `verificar/{codigo}` is public (throttled) and shows Válido/Anulado with what the paper says (`pages/verificar.tsx`). The QR holds the absolute URL, so `APP_URL`/the host the system is reached by must be the real domain in production.
- Days without class (`CalendarioGrupo` is the single source; build it with a prefetched `DiaSinClase::all()` when looping over grupos):
  - `dias_sin_clase`: holidays/vacations of the school calendar (`plantel_id` null = whole school; max 62 days), managed in Académico → Calendario (`DiaSinClaseController`, `pages/calendario/index.tsx`, `DiaSinClasePolicy`: seen with `view groups`; Directors add/edit only their planteles' days, school-wide ones are Admin-only).
  - `clases_suspendidas`: one grupo's class not given (`motivo` profesor/salud/evento/otro), optionally made up on `fecha_reposicion`. Recorded from the grupo ("Clases sin impartir" card) or the roll call ("¿No hubo clase?") via `ClaseSuspendidaController` (upsert per date; only a class day without a roll call), authorized by `GrupoPolicy::suspendClass` (whoever takes its attendance or runs its plantel). UI: `components/grupos/clases-sin-impartir.tsx`.
  - The calendar walks 7-day blocks from `fecha_inicio`: a stretch of N weeks needs N × (class days per week) classes held, so with nothing lost it is exactly N weeks, and each lost class not made up pushes what follows a week. Grupos without `dias` keep plain weeks. `grupos.fecha_fin` stays the scheduled end; `finAjustado()` / `semanasRecorridas()` add the lost weeks (shown as "+N semanas"), and the listing, avance, roll-call range and `fecha_fin_estimada` use the adjusted end.
  - A holiday or suspension also counts as "up to date" for the overdue roll call (`ResumenEscolar::sinListaReciente()`, rows carry `lista_atrasada`), `clasesDeHoy()` flags `sin_clase_hoy` and includes make-up classes, and the roll call opens on the latest day actually held and explains a day without class.
- Cursos UI:
  - The list is a card catalog (`components/cursos/curso-tarjeta.tsx`, also the form's live preview) with Todos/Activos/Inactivos tabs (`?estado=`). Users with `manage groups` (Admin, Director) also get per-curso `estadisticas` (grupos en curso/planeados, active alumnos via `Curso::inscripciones()`), counted within `plantelesAlcance()`, plus a "Ver grupos" link (grupos search by curso name).
  - The form shows durations in months (`SEMANAS_POR_MES` = 4.345) but stores weeks. On create the clave follows the name (`sugerirClave`) until edited by hand; `clavesUsadas` (other cursos, trashed included, like the unique rule) warns before submitting. In edit, planteles with `grupos_activos` > 0 can't be unticked, mirroring the server check.
  - Numbered form sections and selectable cards (`Seccion`, `OpcionTarjeta`) are shared from `components/form-seccion.tsx` by the grupo, curso and plantel forms; the Activo/Inactivo pill is `components/estado-activo-badge.tsx`.
- Alumnos UI: the list has situación tabs (`?situacion=` inscritos / en_riesgo / sin_grupo / inactivos; the last two only for `manage students`), plantel and curso filters, and per row the active courses with the alumno's attendance there (`AlumnoController::resumenInscripcion`, shown by `components/alumnos/cursos-alumno.tsx`). The "en riesgo" tab uses `Inscripcion::scopeEnRiesgo()`, the SQL twin of `ResumenEscolar::alumnosEnRiesgo()` (integer form of round(%) < UMBRAL); keep both in step. The form takes birth date and sex from a complete CURP on request (`datosDeCurp`), `create` previews `matriculaPrevista` (assigned for real on save), and edit lists every visible enrollment with attendance. `CuentaAccesoFields` / `FotoPersonaFields` accept `conTitulo={false}` inside a `Seccion`; `formatTelefono` lives in `lib/utils`.
- Profesores UI: the list is a card directory with situación tabs (`?situacion=` con_grupos / sin_grupo / inactivos) and a plantel filter. Each card lists the profesor's planned/running grupos within reach (`ProfesorController::resumenGrupo`, shown by `components/profesores/grupos-profesor.tsx`) and figures: inscritos, weekly class hours of running grupos (from `dias` × hours), 30-day attendance and overdue roll calls, both taken from `ResumenEscolar::gruposEnCurso()` / `listaAtrasada()` so they match the dashboards. The specialty field offers the active curso names as toggles; edit lists every grupo (current and past).
- Directores UI: cards with each plantel they run and its activity (`DirectorController::actividadDePlanteles`, shown by `components/directores/planteles-director.tsx`), a "También es profesor" link when a profesor record has the same full name (matched in PHP ignoring accents and case, since the two roles use separate accounts), a warning listing active planteles nobody runs (`plantelesSinDirector`), and no delete on your own record (`es_yo`). `PlantelesAsignadosField` is a grid of `OpcionTarjeta` checkboxes that names the other directors of each plantel.
- Person forms (alumno, profesor, director) share `components/persona-campos.tsx`: `CampoCurp` + `datosDeCurp` (birth date/sex from the CURP), `edad`, `AyudaTelefono`, the side `FichaDato` and `useObjectUrl` for the photo preview.
- Planteles UI: the list is a card per sede (`components/planteles/plantel-tarjeta.tsx`, also the form's preview) with address and "Ver en el mapa" (Google Maps search link), contact, directors (from `plantel_user`), offered curso claves, a "Abre el …" banner while it has no running grupos but a future `planeado` one (`proxima_apertura`), and figures (grupos en curso/planeados, active alumnos via `Plantel::inscripciones()`, distinct profesores of active grupos). The form suggests the clave from the name's initials without "CICCIS" (`sugerirClavePlantel`) and warns with `clavesUsadas`; edit adds "Este plantel hoy" (activity, directors, read-only offer).
- Sign-in pages use `layouts/auth/auth-ciccis-layout.tsx` (brand panel + form; a header strip on phones). The login has a Cloudflare Turnstile "no soy un robot" check (`App\Rules\Turnstile`, `components/turnstile.tsx`, field `cf-turnstile-response`), active only when `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are set (`config/services.php`); `phpunit.xml` blanks them, and `tests/Feature/Auth/TurnstileTest.php` fakes Cloudflare. Cloudflare's test keys (`1x00000000000000000000AA` / `1x0000000000000000000000000000000AA`) always pass, for trying it locally.
- Settings (`layouts/settings/layout.tsx`, sections in `components/settings/tarjeta-ajustes.tsx`): there is no self-service account deletion (accounts are created and removed by the school). In Perfil, `User::seAdministraDesdeFicha()` (not Admin and has a director/profesor/alumno record, `User::ficha()`) makes name and email read-only, showing the record's data instead; `ProfileController::update` returns 403 for those accounts. Password inputs with show/hide use `components/campo-contrasena.tsx`; role names for people come from `ETIQUETA_ROLES` in `lib/permisos.ts`.
- Login accounts for profesores and alumnos are created from their own CRUD with a `crear_cuenta` + `password` option.
  - Backend: the `Concerns\ManagesLoginAccounts` trait (`accountRules()` + `syncAccount()`).
  - Frontend: `components/cuenta-acceso-fields.tsx`.
  - While a record is linked, its email is the account's login, and updates keep `users.name` and `users.email` in sync. Deleting the record keeps the user but removes the role.
  - "Dar acceso al sistema" (`crear_cuenta`) always creates a new user, so the email must be unused. A Director who also teaches uses two separate accounts: their Director account, plus the account of their profesor record, created from Profesores with a different email.
  - Each person is registered in one place:
    - Admin → Usuarios holds administrator accounts and custom roles. It offers every role except `UserController::ROLES_CON_FICHA` (Director, Profesor, Alumno), and validation rejects those three.
    - Directores (`Admin\DirectorController`, `pages/admin/directores/*`, routes `admin.directores.*` under `/admin` guarded by the `manage directors` permission, which only Admin holds) is a top-level sidebar module next to Profesores. It registers a director with their record (`directores` table, same shape as `profesores` minus `especialidad`), photo, account and planteles in one form.
      - The account is mandatory: the controller forces `crear_cuenta` and reuses `ManagesLoginAccounts`.
      - Planteles are required (min. 1) and are stored against the account in `plantel_user` via `Director::planteles()`, so plantel scoping reads them unchanged.
      - Deleting a director soft-deletes the record, removes the role and the planteles, and keeps the account.
      - The migration created records for accounts that already had the Director role.
    - On update, any Profesor/Alumno role the account already had is kept.
    - Accounts tied to a director, profesor or alumno record show "Ver ficha" in the listing. `edit` redirects to the record, and update/delete return an error; they are managed from the record. Admin accounts are always managed in Usuarios, even if they also have a record.
- Matrícula format is `{YEAR}-{0001}`, school-wide and generated by `Alumno::siguienteMatricula()`. It carries no plantel, because an alumno can take courses at both planteles. The sequence restarts yearly and counts trashed alumnos. Older formats (`SM-2026-0001`, the demo `A2026####`) are kept as-is and don't affect the sequence. Registering an alumno asks for no plantel.
- Grupos:
  - `Grupo::ESTADOS_ACTIVOS` (`planeado`, `en_curso`) is the single source for "active": it decides which grupos accept enrollments and which block deleting a plantel, curso, profesor or grupo.
  - `Grupo::scopeVisiblePara($user)` / `GrupoPolicy::view` let `manage groups` users see the grupos within their plantel reach (see Plantel scoping) and profesores only their own.
  - Clave is auto-generated by `Grupo::siguienteClave()` (`BAR-RL-2026-A`) when left blank. A grupo's curso must be in its plantel's `curso_plantel` offer, and the grupo form lists only active cursos (plus the grupo's own).
- Enrollments (`InscripcionController`) never delete rows (estados `activo`, `baja`, `egresado`, `no_acreditado`; the last two only via closing the grupo). A drop sets `estado = baja`, and re-enrolling reactivates the same row, because the pair `(alumno_id, grupo_id)` is unique. The cupo check locks the grupo row.
- Attendance:
  - Taken per grupo and date at `grupos/{grupo}/asistencias` (`AsistenciaController`, page `asistencias/pase-lista`), authorized by `GrupoPolicy::viewAttendance` / `takeAttendance`. Profesores take attendance only in their own grupos; Directors can only review it.
  - Saving a date upserts one row per inscripción and looks rows up with `whereDate('fecha', ...)`. The date cast stores a time part on SQLite, so a plain `where('fecha', 'Y-m-d')` misses rows in tests.
  - Attendance % = (records − faltas) / records. Retardos and justificadas don't count against it.
  - Without `?fecha=` the roll call opens on the grupo's latest class day actually held (today if it meets today, skipping days without class, counting make-up dates); an explicit date is kept, and the page warns when it is not a class day and offers prev/next class buttons.
  - Attendance states and their status colors (presente emerald, retardo amber, falta red, justificada sky, each with icon and label) live in `components/asistencias/estados.ts` and are shared by the roll call and the alumno dashboard.
- Dashboards:
  - `DashboardController` picks the page by role:
    - Admin gets `dashboard/admin`, over every plantel, with an optional `?plantel_id=`.
    - Director gets `dashboard/director`, limited to their `plantel_user` planteles. `?plantel_id=` is honored only for one of those. With no plantel assigned, the page gets `sinPlantel: true` and shows a notice.
    - Profesor gets `dashboard/profesor`, built from `new ResumenEscolar(profesorId: ...)`, which narrows every figure to the grupos they teach:
      - `clasesDeHoy()`: in-progress grupos whose `dias` include today, with `lista_tomada`;
      - `listasPendientes()`: the `sin_lista` pendientes;
      - "Mis grupos" (`GruposEnCursoCard` with `mostrarProfesor={false}`);
      - alumnos at risk, weekly attendance and planned grupos.
    - A Profesor account without a profesor record gets `sinFicha: true` and a notice.
    - Alumno gets `dashboard/alumno`, built by `App\Support\Dashboard\ResumenAlumno`. Alumnos can't open grupos or roll calls, so the page is self-contained:
      - current courses with teacher, schedule, weekly progress (from `fecha_fin`, or `fecha_inicio` + `curso.duracion_semanas`) and their own attendance breakdown with the risk warning;
      - today's classes with today's attendance state;
      - the latest attendance records;
      - past courses (dropped, graduated, ended or cancelled).
      - An Alumno account without an alumno record gets `sinFicha: true`.
    - Roles are checked in the order Admin → Director → Profesor → Alumno. Accounts without a role get the simple start page `dashboard`.
  - Directors' planteles are assigned in Admin → Directores (`PlantelesAsignadosField`).
  - All figures come from `App\Support\Dashboard\ResumenEscolar`:
    - It takes `?array $plantelIds`, where null means every plantel.
    - `datos()` is shared by both dashboards. `proximosGrupos()` and `profesores()` are director-only.
    - It aggregates in SQL and buckets weeks and months in PHP from `date(...)`, so it works on MySQL and SQLite.
  - Shared page blocks (header with plantel filter, KPI grid, chart cards, `UMBRAL_RIESGO`) live in `components/dashboard/bloques.tsx`. Director-only blocks live in `components/dashboard/director.tsx`.
  - Attendance % is always `Asistencia::porcentaje()`. The risk threshold (80%, ≥3 records) is duplicated as `UMBRAL_RIESGO` in `bloques.tsx`.
  - Charts use Recharts (`components/dashboard/charts.tsx`), styled with the `--chart-1`/`--chart-2` tokens. Those tokens were validated with the dataviz palette checker (CVD and contrast) in light and dark; re-run it if they change.
  - Every chart sits in `ChartCard`, which provides the empty state and a "Ver tabla" accessible fallback.
- Profesores and alumnos have no `plantel_id`; their plantel comes from their grupos, so one person can be in several planteles.
- Plantel scoping (Directors):
  - `User::plantelesAlcance()` returns null (every plantel) for Admins and other unrestricted users. For a Director without Admin it returns the ids of their `plantel_user` planteles, which may be `[]`. `User::alcanzaPlantel($id)` checks one plantel.
  - Every listing and policy goes through a `visiblePara($user)` / `alcanceDe($user)` scope:
    - `Grupo::visiblePara`: a Director sees the grupos of their planteles; a profesor sees their own.
    - `Alumno::visiblePara`: a Director sees alumnos enrolled (in any estado) in their planteles, plus alumnos with no enrollment. A user without `manage students` (a Profesor) sees only the alumnos of the grupos they teach.
    - `Profesor::visiblePara`: a Director sees profesores with a grupo in their planteles, plus profesores with no grupo.
    - `Plantel::alcanceDe`: the planteles within reach, used for filters and form selects.
  - If a director account ever has a profesor record (`User::profesorId()`; normally they use two accounts), it additionally sees the grupos they teach, those grupos' alumnos and their own profesor record, at any plantel. Teaching a grupo doesn't let them edit it, enroll in it or delete it; that still requires running its plantel.
  - `GrupoPolicy::takeAttendance`: only the grupo's own teacher, or an unrestricted `manage groups` user (Admin). So a Director account that is wrongly given the Profesor role still can't take attendance across their plantel; it only reviews it.
  - The Alumno, Profesor, Grupo and Plantel policies check the same scopes, so a record outside the reach returns 403. The `plantel_id` validation of grupos adds `Rule::in(alcance)`.
  - The enrollment picker (`grupos.show`) and the grupo form's profesor select intentionally list every active alumno or profesor, because people can study or teach at both planteles.
  - Directors can't manage cursos: the catalog and each plantel's offer are Admin-only.
- `Inscripcion` extends `Pivot` (it is the `using()` model for `Alumno::grupos()` / `Grupo::alumnos()`), so relations through it need explicit keys (see `Grupo::asistencias()`).
- Irregular Spanish plurals need `$table` (`planteles`, `profesores`, `inscripciones`). Main entities use `SoftDeletes`, so FK `restrictOnDelete` (e.g. deleting a curso or plantel that has grupos) only applies on `forceDelete()`.
- Seeders hold realistic data, rebuilt one table at a time with the user. `DatabaseSeeder` seeds the bootstrap (roles, permissions and `admin@example.com` / `password`) and `PlantelSeeder` (the real planteles CICCIS Rafael Lucio `RL` and CICCIS Tlacolulan `TL`, both active; re-running refreshes them via `updateOrCreate`), `CursoSeeder` (the 5 courses with description and `duracion_semanas` converted from their official length in months, offered at every plantel) and `CursoModuloSeeder` (the real study plans of Alto Estilismo — 6 modules from their official months, converted to weeks by rounding where each module ends so they add up to the curso's 78, Barbería (6), Informática Administrativa (11), Auxiliar de Enfermería (14) and Inglés (12), the last four given in weeks; a curso left out would keep what was captured on screen) and `DirectorSeeder` (`director@example.com`, Nicolás Ramírez Ortega, running both planteles) and `ProfesorSeeder` (the 4 real teachers, each with an account: `nicolas@` — the director's second account, since he teaches Informática —, `beatriz@`, `eduardo@`, `lupita@example.com`; surnames, birth dates and phones are placeholders) and `GrupoSeeder` (the real schedule: 5 grupos at Rafael Lucio `en_curso` since June 2026 — Inglés on Friday, the rest on Sunday — and 5 at Tlacolulan `planeado` for Saturday 24 October 2026; cupo 10, `fecha_fin` = start + curso duration, updated in place on re-run) and `AlumnoSeeder` (57 fictitious alumnos from a seeded Faker with fixed matrículas `2026-0001`…: 7–10 active per Rafael Lucio grupo plus 2 drop-outs, 2 alumnos taking Barbería and Estilismo — the first is `alumno@example.com` —, and 3 early sign-ups per Tlacolulan grupo) and `AsistenciaSeeder` (roll calls for every `en_curso` grupo from its first class until yesterday, upserted on `inscripcion_id + fecha`: mostly present, 3 alumnos at ~67% so the risk lists have data, drop-outs only until `fecha_baja`, and the latest class of ENF-RL-2026-A left without a list so it shows as pending; re-run it to catch up with the classes held since) and `CalificacionSeeder` (fictitious grades for every finished module of the `en_curso` grupos, exam on the module's last class: mostly 7–10, lower for `AsistenciaSeeder::EN_RIESGO` alumnos with a retake a week later when failed, drop-outs only before leaving, and the latest finished module of INF-RL-2026-A left ungraded so it shows as pending; upserted, re-run it to grade the modules finished since); it is idempotent and covered by `tests/Feature/DatabaseSeederTest.php`, which grows with each step. `EscolarDemoSeeder` is still in the project but not called until they are reviewed and added back. Faker has no `es_MX` locale; factories use `fake('es_ES')`.

## Commands

```bash
composer dev              # runs php artisan serve + queue:listen + vite concurrently
npm run dev               # vite only
npm run build             # production assets (npm run build:ssr for SSR bundle)

./vendor/bin/pest                                   # all tests
./vendor/bin/pest tests/Feature/Auth/AuthenticationTest.php   # single file
./vendor/bin/pest --filter "users can authenticate"        # single test by name

vendor/bin/pint           # PHP formatting (Laravel Pint)
npm run format            # Prettier on resources/ (format:check to verify only)
npm run lint              # ESLint with --fix
php artisan migrate
```

CI (`.github/workflows`) runs Pint, Prettier, ESLint, then `npm run build` followed by Pest. Feature tests that render Inertia pages need built assets (or a running Vite dev server — `public/hot`) to exist.

Tests run against in-memory SQLite with array cache/session/mail and sync queue (see `phpunit.xml`); `tests/Pest.php` applies `RefreshDatabase` to everything under `tests/Feature` automatically.

## Architecture

- **Server-driven routing, client-rendered pages.** There is no client-side router or API layer. Routes in `routes/web.php` (which `require`s `routes/settings.php` and `routes/auth.php`) return `Inertia::render('<page>')`, and the name maps to `resources/js/pages/<page>.tsx` (resolved in `resources/js/app.tsx` via `import.meta.glob`). Page props come from the controller; forms submit with Inertia's `useForm` back to Laravel routes, and validation errors flow back as `errors`.
- **Shared props** are defined in `app/Http/Middleware/HandleInertiaRequests.php::share()` (`name`, `quote`, `auth.user`, `auth.roles`, `auth.permissions`). Their TS shape is `SharedData` in `resources/js/types/index.ts` — keep the two in sync and read them with `usePage<SharedData>().props`.
- **Route helpers**: Ziggy exposes Laravel named routes to the frontend as a global `route()` function (declared in `app.tsx`). Prefer `route('name')` over hard-coded URLs.
- **Layouts**: pages wrap themselves in a layout. `layouts/app-layout.tsx` is a thin wrapper that selects the actual template (`layouts/app/app-sidebar-layout.tsx` or `app-header-layout.tsx`) and accepts `breadcrumbs: BreadcrumbItem[]`. Auth pages use `layouts/auth-layout.tsx` (which similarly picks one of `layouts/auth/*`). Settings pages nest `SettingsLayout` inside `AppLayout`. Sidebar nav items live in `components/app-sidebar.tsx`.
- **Controllers** are grouped by area (`app/Http/Controllers/Auth`, `Settings`) with Form Requests in `app/Http/Requests`. Middleware is registered in `bootstrap/app.php` (no `Kernel.php`).
- **Authorization** uses `spatie/laravel-permission` (`HasRoles` on `User`). Roles: Admin, Director, Profesor, Alumno. Roles and permissions are defined in `database/seeders/RolePermissionSeeder.php` (idempotent: `firstOrCreate` + `syncPermissions`); add new permissions there. Protect routes with the `role:`, `permission:` or `role_or_permission:` middleware aliases; on the frontend check `auth.roles` / `auth.permissions`. Admin screens live in `routes/admin.php` (`role:Admin`, prefix `admin.`) → `app/Http/Controllers/Admin` → `resources/js/pages/admin/*`, and use the shared `CheckboxList` and `DeleteConfirmDialog` components; Administración (Usuarios, Roles, Permisos) is its own sidebar section. Tests seed `RolePermissionSeeder` in `beforeEach` and use the `actingAsAdmin()` helper from `tests/Pest.php`. `php artisan db:seed` creates `admin@`, `director@` and the profesores `nicolas@`, `beatriz@`, `eduardo@` and `lupita@example.com` and the alumno `alumno@example.com`, all with `password`.
  - `RoleController::ROLES_DEL_SISTEMA` (Admin, Director, Profesor, Alumno) are relied on by name. They can't be renamed or deleted; only their permissions change. The Admin role is always re-synced to every permission.
  - Custom roles (e.g. Recepción) are created in Roles and assigned in Usuarios.
  - Admin → Usuarios lists accounts filtered by `?tipo=`. The default is `administracion`, meaning admins plus accounts without a director, profesor or alumno record. The other values are `directores`, `profesores`, `alumnos` and `todas`. It has search and pagination, the photo of the record behind each account and its last activity, read from the database session store (`UserController::ultimaActividad`; empty with other session drivers). The user form previews the effective permissions (`permisosEfectivos`) from `permisosDeRoles` and shows roles that come from a record (`roles_de_ficha`) read-only.
  - Admin → Roles shows a card per role (description, what it can do by module, accounts and where they are registered); Admin → Permisos is a read-only Módulo × Rol matrix whose headers link to each role.
  - Direct permissions sit under "Opciones avanzadas" in the user form (`PermisosDirectosField`).
- **Theming**: light/dark/system appearance is handled client-side by `hooks/use-appearance.tsx` (`initializeTheme()` on load); CSS variables and Tailwind v4 config live in `resources/css/app.css` (there is no `tailwind.config.js`). The palette comes from the CICCIS logo: brand blue as `primary`, leaf green as `secondary` and `sidebar-primary`, and a blue sidebar in light mode. Use theme tokens (`bg-primary`, `text-sidebar-foreground`, …) rather than hard-coded `neutral-*`, `black` or `white` classes.
- Import alias `@/` → `resources/js/`.

## Conventions

- Prettier: 4-space indent, single quotes, semicolons, `printWidth` 150; imports are auto-organized and Tailwind classes auto-sorted (including inside `cn()`/`clsx()`).
- Frontend file names are kebab-case; page file paths must match the string passed to `Inertia::render`.
