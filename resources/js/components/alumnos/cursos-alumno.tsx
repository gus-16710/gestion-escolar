import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';

export interface AsistenciaInscripcion {
    porcentaje: number | null;
    registros: number;
    faltas: number;
    en_riesgo: boolean;
}

/** An enrollment as AlumnoController::resumenInscripcion() sends it. */
export interface CursoInscrito {
    inscripcion_id: number;
    grupo_id: number;
    grupo_clave: string;
    grupo_estado: string;
    curso: string;
    curso_clave: string;
    plantel: string;
    plantel_clave: string;
    asistencia: AsistenciaInscripcion;
}

/**
 * The alumno's attendance in one grupo: "92%" with a small bar, red with an icon when at risk,
 * "Por iniciar" while the grupo is planned and "Sin registros" before the first roll call.
 */
export function AsistenciaCompacta({ grupoEstado, asistencia }: { grupoEstado: string; asistencia: AsistenciaInscripcion }) {
    if (grupoEstado === 'planeado') {
        return <span className="text-xs whitespace-nowrap text-sky-700 dark:text-sky-300">Por iniciar</span>;
    }

    if (asistencia.porcentaje === null) {
        return <span className="text-muted-foreground text-xs whitespace-nowrap">Sin registros</span>;
    }

    return (
        <span
            className={cn('flex items-center gap-1.5 text-xs font-medium tabular-nums', asistencia.en_riesgo && 'text-destructive')}
            title={`${asistencia.faltas} ${asistencia.faltas === 1 ? 'falta' : 'faltas'} en ${asistencia.registros} ${asistencia.registros === 1 ? 'clase' : 'clases'}`}
        >
            {asistencia.en_riesgo && <AlertTriangle className="size-3.5 shrink-0" aria-label="En riesgo" />}
            <span
                className={cn('h-1.5 w-10 overflow-hidden rounded-full', asistencia.en_riesgo ? 'bg-destructive/20' : 'bg-emerald-500/20')}
                aria-hidden="true"
            >
                <span
                    className={cn('block h-full rounded-full', asistencia.en_riesgo ? 'bg-destructive' : 'bg-emerald-500')}
                    style={{ width: `${asistencia.porcentaje}%` }}
                />
            </span>
            <span className="w-9 text-right">{asistencia.porcentaje}%</span>
        </span>
    );
}

/** One line per current course: curso clave, name, plantel and attendance; the name opens the grupo when allowed. */
export function CursosAlumno({ cursos, enlazar, mostrarPlantel }: { cursos: CursoInscrito[]; enlazar: boolean; mostrarPlantel: boolean }) {
    if (cursos.length === 0) {
        return <p className="text-muted-foreground text-sm">Sin grupo activo</p>;
    }

    return (
        <ul className="space-y-1.5">
            {cursos.map((curso) => (
                <li key={curso.inscripcion_id} className="flex min-w-0 items-center gap-2">
                    <span className="bg-primary/10 text-primary w-10 shrink-0 rounded-md py-0.5 text-center text-[11px] font-bold tracking-wide">
                        {curso.curso_clave}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm" title={`${curso.curso} · ${curso.grupo_clave} · ${curso.plantel}`}>
                        {enlazar ? (
                            <Link href={route('grupos.show', curso.grupo_id)} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                                {curso.curso}
                            </Link>
                        ) : (
                            curso.curso
                        )}
                        {mostrarPlantel && <span className="text-muted-foreground"> · {curso.plantel_clave}</span>}
                    </span>
                    <AsistenciaCompacta grupoEstado={curso.grupo_estado} asistencia={curso.asistencia} />
                </li>
            ))}
        </ul>
    );
}
