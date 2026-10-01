/**
 * Spanish labels for permission names. Permissions keep their English internal names
 * (see RolePermissionSeeder); only what the user sees is translated.
 */
const ETIQUETAS: Record<string, string> = {
    'manage users': 'Gestionar usuarios',
    'manage roles': 'Gestionar roles',
    'view users': 'Ver usuarios',
    'manage planteles': 'Gestionar planteles',
    'view planteles': 'Ver planteles',
    'manage directors': 'Gestionar directores',
    'manage teachers': 'Gestionar profesores',
    'view teachers': 'Ver profesores',
    'manage students': 'Gestionar alumnos',
    'view students': 'Ver alumnos',
    'manage courses': 'Gestionar cursos',
    'view courses': 'Ver cursos',
    'manage groups': 'Gestionar grupos e inscripciones',
    'view groups': 'Ver grupos',
    'manage grades': 'Registrar calificaciones',
    'view grades': 'Ver calificaciones',
    'manage attendance': 'Pasar lista',
    'view attendance': 'Ver asistencias',
    'view reports': 'Ver reportes',
};

/** Spanish label for a permission, falling back to its internal name for new, untranslated ones. */
export function etiquetaPermiso(nombre: string): string {
    return ETIQUETAS[nombre] ?? nombre;
}

export interface ModuloPermisos {
    modulo: string;
    /** Permission that lets the role see the module, if the module has one. */
    ver?: string;
    /** Permission that lets the role change things in the module. */
    gestionar?: string;
    /** Label for the "gestionar" level when "Gestionar" doesn't fit (e.g. attendance). */
    etiquetaGestionar?: string;
    /** The module isn't built yet: its permissions exist but give no access so far. */
    proximamente?: boolean;
    /** Extra explanation shown in the permissions matrix. */
    nota?: string;
}

/**
 * Permissions grouped by module, in sidebar order. Used by the role form and the permissions matrix;
 * add a new permission here as well as in the seeder and ETIQUETAS.
 */
export const MODULOS_PERMISOS: ModuloPermisos[] = [
    { modulo: 'Grupos e inscripciones', ver: 'view groups', gestionar: 'manage groups' },
    { modulo: 'Asistencia', ver: 'view attendance', gestionar: 'manage attendance', etiquetaGestionar: 'Pasar lista' },
    { modulo: 'Alumnos', ver: 'view students', gestionar: 'manage students' },
    { modulo: 'Profesores', ver: 'view teachers', gestionar: 'manage teachers' },
    { modulo: 'Directores', gestionar: 'manage directors' },
    { modulo: 'Cursos', ver: 'view courses', gestionar: 'manage courses' },
    { modulo: 'Planteles', ver: 'view planteles', gestionar: 'manage planteles' },
    { modulo: 'Calificaciones', ver: 'view grades', gestionar: 'manage grades', etiquetaGestionar: 'Registrar' },
    { modulo: 'Reportes', ver: 'view reports', proximamente: true },
    { modulo: 'Usuarios', ver: 'view users', gestionar: 'manage users', nota: 'Por ahora esta sección es solo del rol Admin' },
    { modulo: 'Roles', gestionar: 'manage roles', nota: 'Por ahora esta sección es solo del rol Admin' },
];

/**
 * The known modules plus an "Otros" row with any permission not listed in MODULOS_PERMISOS,
 * so a permission added to the seeder never goes missing from the screens.
 */
export function permisosPorModulo(todos: string[]): { modulos: ModuloPermisos[]; otros: string[] } {
    const conocidos = new Set(MODULOS_PERMISOS.flatMap((modulo) => [modulo.ver, modulo.gestionar]).filter(Boolean));

    return {
        modulos: MODULOS_PERMISOS.filter((modulo) => [modulo.ver, modulo.gestionar].some((permiso) => permiso && todos.includes(permiso))),
        otros: todos.filter((permiso) => !conocidos.has(permiso)),
    };
}

/** How much a set of permissions allows in one module. */
export type NivelPermiso = 'ninguno' | 'ver' | 'gestionar';

export function nivelEnModulo(modulo: ModuloPermisos, permisos: string[]): NivelPermiso {
    if (modulo.gestionar && permisos.includes(modulo.gestionar)) return 'gestionar';
    if (modulo.ver && permisos.includes(modulo.ver)) return 'ver';

    return 'ninguno';
}

/** The permissions with the module set to the given level; managing a module also grants seeing it. */
export function conNivelEnModulo(modulo: ModuloPermisos, permisos: string[], nivel: NivelPermiso): string[] {
    const sinModulo = permisos.filter((permiso) => permiso !== modulo.ver && permiso !== modulo.gestionar);
    const nuevos = nivel === 'gestionar' ? [modulo.gestionar, modulo.ver] : nivel === 'ver' ? [modulo.ver] : [];

    return [...sinModulo, ...nuevos.filter((permiso): permiso is string => Boolean(permiso))];
}

/** Label of a level in a module ("Pasar lista" instead of "Gestionar" for attendance). */
export function etiquetaNivel(modulo: ModuloPermisos, nivel: NivelPermiso): string {
    return nivel === 'gestionar' ? (modulo.etiquetaGestionar ?? 'Gestionar') : nivel === 'ver' ? 'Ver' : 'Sin acceso';
}

/** What each system role is for, shown on the role cards and forms. */
export const DESCRIPCION_ROLES: Record<string, string> = {
    Admin: 'Control total: catálogo, planteles, personal, cuentas y roles.',
    Director: 'Lleva sus planteles: inscripciones, grupos, alumnos y profesores.',
    Profesor: 'Ve sus grupos y alumnos, y pasa lista.',
    Alumno: 'Consulta sus cursos, horario y asistencia.',
};

/** Permissions an account ends up with: those of its roles plus the direct ones. */
export function permisosEfectivos(roles: string[], permisosDeRoles: Record<string, string[]>, directos: string[]): string[] {
    return [...new Set([...roles.flatMap((rol) => permisosDeRoles[rol] ?? []), ...directos])];
}
