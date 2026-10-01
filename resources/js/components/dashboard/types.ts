/** Shapes returned by App\Support\Dashboard\ResumenEscolar. */

export interface Kpis {
    alumnos_activos: number;
    inscritos_mes: number;
    grupos_en_curso: number;
    grupos_planeados: number;
    profesores_activos: number;
    profesores_sin_grupo: number | null;
    asistencia: number | null;
    asistencia_anterior: number | null;
    ocupacion: number | null;
    lugares_libres: number;
    bajas_mes: number;
    bajas_mes_anterior: number;
}

export interface PlantelResumen {
    id: number;
    nombre: string;
    localidad: string;
    activo: boolean;
    alumnos: number;
    grupos_activos: number;
    profesores: number;
    cursos: number;
}

export interface AlumnosPorCurso {
    curso: string;
    alumnos: number;
}

export interface AsistenciaSemana {
    semana: string;
    etiqueta: string;
    total: number;
    faltas: number;
    porcentaje: number | null;
}

export interface MovimientoMensual {
    mes: string;
    etiqueta: string;
    inscripciones: number;
    bajas: number;
}

export interface GrupoEnCurso {
    id: number;
    clave: string;
    curso: string;
    plantel: string;
    profesor_id: number | null;
    profesor: string | null;
    profesor_foto_url: string | null;
    turno: string;
    dias: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    fecha_inicio: string;
    inscritos: number;
    cupo: number | null;
    registros_30: number;
    faltas_30: number;
    asistencia: number | null;
    ultima_lista: string | null;
    dias_sin_lista: number | null;
    /** The latest class day without class (holiday or suspension), which also keeps the roll call up to date. */
    ultima_sin_clase: string | null;
    lista_atrasada: boolean;
    hay_clase_hoy: boolean;
    /** Why today's class isn't given, when it falls on a holiday or was suspended. */
    sin_clase_hoy: { tipo: 'festivo' | 'suspendida'; motivo: string } | null;
}

export interface AlumnoEnRiesgo {
    inscripcion_id: number;
    alumno_id: number;
    nombre_completo: string;
    matricula: string;
    foto_url: string | null;
    grupo_id: number;
    grupo: string;
    curso: string;
    faltas: number;
    total: number;
    porcentaje: number;
}

export interface Pendiente {
    tipo: 'sin_profesor' | 'sin_iniciar' | 'sin_lista' | 'lleno';
    mensaje: string;
    grupo_id: number;
    clave: string;
}

export interface BajaReciente {
    inscripcion_id: number;
    nombre_completo: string;
    foto_url: string | null;
    grupo_id: number;
    grupo: string;
    curso: string;
    fecha_baja: string | null;
    motivo: string | null;
}

export interface ProximoGrupo {
    id: number;
    clave: string;
    curso: string;
    plantel: string;
    profesor: string | null;
    fecha_inicio: string;
    /** Negative when the start date already passed. */
    dias_para_inicio: number;
    inscritos: number;
    cupo: number | null;
}

export interface ProfesorResumen {
    id: number;
    nombre_completo: string;
    foto_url: string | null;
    especialidad: string | null;
    grupos_activos: number;
    alumnos: number;
    asistencia: number | null;
    grupos_sin_lista: number;
}
