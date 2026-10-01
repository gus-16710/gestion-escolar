import { cn } from '@/lib/utils';
import { ChevronDown, GraduationCap } from 'lucide-react';

/** Lowest passing grade (Calificacion::APROBATORIA). */
export const APROBATORIA = 6;

/** One module of a report card (App\Support\Calificaciones\Boleta). */
export interface BoletaModulo {
    modulo_id: number;
    calificacion: number | null;
    recuperacion: number | null;
    final: number | null;
    aprobada: boolean | null;
    orden?: number;
    nombre?: string;
    estado?: 'terminado' | 'actual' | 'proximo';
}

export type SituacionBoleta = 'sin_calificaciones' | 'en_curso' | 'aprobado' | 'reprobado';

export interface Boleta {
    modulos: BoletaModulo[];
    promedio_parcial: number | null;
    promedio_final: number | null;
    calificados: number;
    total: number;
    reprobados: number;
    situacion: SituacionBoleta;
}

/** Grades always show one decimal, like the official report cards: 8 → "8.0". */
export function formatCalificacion(valor: number | null | undefined): string {
    return valor === null || valor === undefined ? '—' : valor.toFixed(1);
}

/** Text color for a grade: green when passing, red when failing. */
export function colorCalificacion(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return 'text-muted-foreground';

    return valor >= APROBATORIA ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400';
}

/** A grade as a small pill; a retake is marked with an "R" and the original in the tooltip. */
export function CalificacionChip({
    final,
    calificacion,
    recuperacion,
    className,
}: {
    final: number | null;
    calificacion?: number | null;
    recuperacion?: number | null;
    className?: string;
}) {
    if (final === null) {
        return <span className={cn('text-muted-foreground/60 inline-block min-w-10 text-center text-sm', className)}>—</span>;
    }

    const aprobada = final >= APROBATORIA;
    const conRecuperacion = recuperacion !== null && recuperacion !== undefined;

    return (
        <span
            className={cn(
                'relative inline-flex min-w-10 items-center justify-center rounded-md px-1.5 py-0.5 text-sm font-semibold tabular-nums',
                aprobada ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'bg-red-500/10 text-red-800 dark:text-red-300',
                className,
            )}
            title={conRecuperacion ? `Recuperación ${formatCalificacion(recuperacion)} (original ${formatCalificacion(calificacion)})` : undefined}
        >
            {formatCalificacion(final)}
            {conRecuperacion && (
                <span className="bg-background text-muted-foreground absolute -top-1.5 -right-1.5 rounded-full border px-1 text-[9px] leading-tight font-bold">
                    R
                </span>
            )}
        </span>
    );
}

const SITUACIONES: Record<SituacionBoleta, { etiqueta: string; clase: string }> = {
    sin_calificaciones: { etiqueta: 'Sin calificaciones', clase: 'bg-muted text-muted-foreground' },
    en_curso: { etiqueta: 'En curso', clase: 'bg-sky-500/10 text-sky-800 dark:text-sky-300' },
    aprobado: { etiqueta: 'Aprobado', clase: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' },
    reprobado: { etiqueta: 'Reprobado', clase: 'bg-red-500/10 text-red-800 dark:text-red-300' },
};

export function SituacionBadge({ situacion, className }: { situacion: SituacionBoleta; className?: string }) {
    const { etiqueta, clase } = SITUACIONES[situacion];

    return (
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', clase, className)}>
            {etiqueta}
        </span>
    );
}

/** "8.4" big with "promedio parcial · 3 de 6 módulos" or "promedio final" below. */
export function PromedioBoleta({ boleta, className }: { boleta: Boleta; className?: string }) {
    const promedio = boleta.promedio_final ?? boleta.promedio_parcial;

    return (
        <div className={cn('flex items-baseline gap-2', className)}>
            <span className={cn('text-2xl font-semibold tabular-nums', colorCalificacion(promedio))}>{formatCalificacion(promedio)}</span>
            <span className="text-muted-foreground text-xs">
                {boleta.promedio_final !== null
                    ? 'promedio final'
                    : boleta.calificados === 0
                      ? 'sin calificaciones aún'
                      : `promedio parcial · ${boleta.calificados} de ${boleta.total} módulos`}
            </span>
        </div>
    );
}

/** The report card folded in a <details>: the average as the summary, each module with its grade inside. */
export function BoletaDesplegable({ boleta, titulo = 'Calificaciones' }: { boleta: Boleta; titulo?: string }) {
    if (boleta.total === 0) return null;

    const promedio = boleta.promedio_final ?? boleta.promedio_parcial;

    return (
        <details className="group rounded-lg border">
            <summary className="hover:bg-muted/40 flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
                <GraduationCap className="text-muted-foreground size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                    <span className="font-medium">{titulo}</span>
                    <span className="text-muted-foreground block text-xs">
                        {boleta.calificados === 0
                            ? 'Aún sin calificaciones'
                            : boleta.promedio_final !== null
                              ? 'Promedio final'
                              : `Promedio parcial · ${boleta.calificados} de ${boleta.total} módulos`}
                    </span>
                </span>
                <span className={cn('text-lg font-semibold tabular-nums', colorCalificacion(promedio))}>{formatCalificacion(promedio)}</span>
                <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <ol className="divide-y border-t">
                {boleta.modulos.map((modulo) => (
                    <li key={modulo.modulo_id} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <span
                            className={cn(
                                'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                                modulo.estado === 'actual' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                            )}
                        >
                            {modulo.orden}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate">{modulo.nombre}</span>
                            {modulo.recuperacion !== null && (
                                <span className="text-muted-foreground text-xs">
                                    Recuperación · original {formatCalificacion(modulo.calificacion)}
                                </span>
                            )}
                            {modulo.final === null && modulo.estado && (
                                <span className="text-muted-foreground text-xs">
                                    {modulo.estado === 'proximo' ? 'Próximo' : modulo.estado === 'actual' ? 'En curso' : 'Sin calificar'}
                                </span>
                            )}
                        </span>
                        <CalificacionChip final={modulo.final} calificacion={modulo.calificacion} recuperacion={modulo.recuperacion} />
                    </li>
                ))}
            </ol>
        </details>
    );
}
