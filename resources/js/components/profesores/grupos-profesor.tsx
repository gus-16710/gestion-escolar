import { describirDiasYHoras, EstadoGrupoBadge } from '@/components/grupos/grupo-labels';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { AlertTriangle, Users } from 'lucide-react';

/** A grupo as ProfesorController::resumenGrupo() sends it. */
export interface GrupoProfesor {
    id: number;
    clave: string;
    estado: string;
    curso: string;
    curso_clave: string;
    plantel: string;
    plantel_clave: string;
    dias: string[];
    hora_inicio: string | null;
    hora_fin: string | null;
    fecha_inicio: string;
    horas_semana: number;
    inscritos: number;
    /** Last 30 days, only while the grupo runs. */
    asistencia: number | null;
    lista_atrasada: boolean;
    dias_sin_lista: number | null;
}

/** "24 oct", adding the year only when it is not the current one. */
function fechaCorta(fecha: string): string {
    const [y, m, d] = fecha.split('-').map(Number);
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', ...(y !== new Date().getFullYear() && { year: 'numeric' }) };

    return new Intl.DateTimeFormat('es-MX', opciones).format(new Date(y, m - 1, d));
}

/** What to say about the grupo right now: overdue roll call, attendance, its start date, or its estado. */
function EstadoActual({ grupo }: { grupo: GrupoProfesor }) {
    if (grupo.lista_atrasada) {
        return (
            <span className="text-destructive flex items-center gap-1 text-xs font-medium whitespace-nowrap">
                <AlertTriangle className="size-3.5 shrink-0" />
                {grupo.dias_sin_lista === null ? 'Sin pase de lista' : `${grupo.dias_sin_lista} días sin lista`}
            </span>
        );
    }

    if (grupo.estado === 'en_curso') {
        return (
            <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums" title="Asistencia de los últimos 30 días">
                {grupo.asistencia === null ? 'Sin registros' : `${grupo.asistencia}% asist.`}
            </span>
        );
    }

    if (grupo.estado === 'planeado') {
        return <span className="text-xs whitespace-nowrap text-sky-700 dark:text-sky-300">Inicia {fechaCorta(grupo.fecha_inicio)}</span>;
    }

    return <EstadoGrupoBadge estado={grupo.estado} />;
}

/** The grupos a profesor teaches, one line each: curso, plantel, schedule, alumnos and how it is going. */
export function GruposProfesor({
    grupos,
    mostrarPlantel,
    vacio = 'Sin grupos asignados',
}: {
    grupos: GrupoProfesor[];
    mostrarPlantel: boolean;
    vacio?: string;
}) {
    if (grupos.length === 0) {
        return <p className="text-muted-foreground text-sm">{vacio}</p>;
    }

    return (
        <ul className="space-y-2.5">
            {grupos.map((grupo) => (
                <li key={grupo.id} className={cn('flex items-start gap-2.5', !['en_curso', 'planeado'].includes(grupo.estado) && 'opacity-70')}>
                    <span className="bg-primary/10 text-primary mt-0.5 w-10 shrink-0 rounded-md py-0.5 text-center text-[11px] font-bold">
                        {grupo.curso_clave}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                            <Link href={route('grupos.show', grupo.id)} className="truncate text-sm font-medium hover:underline" title={grupo.clave}>
                                {grupo.curso}
                                {mostrarPlantel && <span className="text-muted-foreground font-normal"> · {grupo.plantel_clave}</span>}
                            </Link>
                            <EstadoActual grupo={grupo} />
                        </div>
                        <p className="text-muted-foreground flex items-center gap-2 text-xs">
                            <span className="truncate">{describirDiasYHoras({ ...grupo, dias: grupo.dias.join(',') })}</span>
                            <span className="flex shrink-0 items-center gap-1">
                                <Users className="size-3" />
                                {grupo.inscritos}
                            </span>
                        </p>
                    </div>
                </li>
            ))}
        </ul>
    );
}
