import { EstadoActivoBadge } from '@/components/estado-activo-badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, ChevronDown, Clock, ListOrdered } from 'lucide-react';
import { type ReactNode } from 'react';

/** Weeks per month used to show (and pick) durations in months; 78 semanas ≈ 18 meses. */
export const SEMANAS_POR_MES = 4.345;

export function mesesAprox(semanas: number): number {
    return Math.max(1, Math.round(semanas / SEMANAS_POR_MES));
}

/** "78 semanas · ≈ 18 meses", or null when the curso has no duration. */
export function describirDuracion(semanas: number | null): string | null {
    if (!semanas) return null;

    const meses = mesesAprox(semanas);

    return `${semanas} ${semanas === 1 ? 'semana' : 'semanas'} · ≈ ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
}

export interface PlantelOfertado {
    nombre: string;
    clave: string;
}

export interface CursoResumen {
    nombre: string;
    clave: string;
    descripcion: string | null;
    duracion_semanas: number | null;
    activo: boolean;
    planteles: PlantelOfertado[];
    /** The study plan, in order (left out where it isn't shown). */
    modulos?: { nombre: string; duracion_semanas: number }[];
}

export interface EstadisticasCurso {
    grupos_en_curso: number;
    grupos_planeados: number;
    alumnos: number;
}

/** The curso's clave as a square badge, the same one grupos use. */
export function CursoClaveChip({ clave, className }: { clave: string; className?: string }) {
    return (
        <div
            className={cn(
                'bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold tracking-wide',
                clave.length > 4 && 'text-[10px] tracking-normal',
                className,
            )}
        >
            {clave || '—'}
        </div>
    );
}

/**
 * One curso of the catalog: clave, name, duration, description, where it is offered and, for staff who run
 * grupos, its current grupos and alumnos. Shared by the list and the form's preview.
 */
export function CursoTarjeta({
    curso,
    estadisticas,
    acciones,
    className,
}: {
    curso: CursoResumen;
    estadisticas?: EstadisticasCurso | null;
    acciones?: ReactNode;
    className?: string;
}) {
    const duracion = describirDuracion(curso.duracion_semanas);

    return (
        <article className={cn('bg-card flex h-full flex-col rounded-xl border transition-shadow hover:shadow-sm', className)}>
            <div className="flex flex-1 flex-col gap-4 p-4">
                <div className="flex items-start gap-3">
                    <CursoClaveChip clave={curso.clave} className={cn(!curso.activo && 'bg-muted text-muted-foreground')} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="leading-snug font-semibold">{curso.nombre || 'Nombre del curso'}</h3>
                            <EstadoActivoBadge activo={curso.activo} className="mt-0.5 shrink-0" />
                        </div>
                        <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                            <Clock className="size-3.5 shrink-0" />
                            {duracion ?? 'Duración sin definir'}
                        </p>
                    </div>
                </div>

                {curso.modulos &&
                    (curso.modulos.length === 0 ? (
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <ListOrdered className="size-3.5 shrink-0" />
                            Sin plan de estudios
                        </p>
                    ) : (
                        <details className="group text-sm">
                            <summary className="text-primary flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium select-none [&::-webkit-details-marker]:hidden">
                                <ListOrdered className="size-3.5 shrink-0" />
                                {curso.modulos.length} {curso.modulos.length === 1 ? 'módulo' : 'módulos'}
                                <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
                            </summary>
                            <ol className="mt-2 space-y-1 border-l pl-3">
                                {curso.modulos.map((modulo, indice) => (
                                    <li key={`${indice}-${modulo.nombre}`} className="flex items-baseline justify-between gap-3 text-xs">
                                        <span className="min-w-0">
                                            <span className="text-muted-foreground tabular-nums">{indice + 1}.</span> {modulo.nombre}
                                        </span>
                                        <span className="text-muted-foreground shrink-0 tabular-nums">{modulo.duracion_semanas} sem</span>
                                    </li>
                                ))}
                            </ol>
                        </details>
                    ))}

                {curso.descripcion ? (
                    <p className="text-muted-foreground line-clamp-3 text-sm" title={curso.descripcion}>
                        {curso.descripcion}
                    </p>
                ) : (
                    <p className="text-muted-foreground/70 text-sm italic">Sin descripción.</p>
                )}

                <div className="mt-auto">
                    {curso.planteles.length > 0 ? (
                        <ul className="flex flex-wrap gap-1.5" aria-label="Planteles donde se imparte">
                            {curso.planteles.map((plantel) => (
                                <li
                                    key={plantel.clave}
                                    className="bg-muted/60 flex items-center gap-1.5 rounded-md py-0.5 pr-2 pl-1 text-xs"
                                    title={plantel.nombre}
                                >
                                    <span className="bg-background text-foreground rounded px-1 font-mono text-[10px] font-semibold">
                                        {plantel.clave}
                                    </span>
                                    {plantel.nombre.replace(/^CICCIS\s+/i, '')}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="size-3.5 shrink-0" />
                            No se imparte en ningún plantel
                        </p>
                    )}
                </div>
            </div>

            {estadisticas && (
                <dl className="grid grid-cols-3 divide-x border-t text-center">
                    <Cifra etiqueta="En curso" valor={estadisticas.grupos_en_curso} />
                    <Cifra etiqueta="Planeados" valor={estadisticas.grupos_planeados} />
                    <Cifra etiqueta="Alumnos" valor={estadisticas.alumnos} />
                </dl>
            )}

            {acciones && <div className="flex items-center gap-2 border-t px-3 py-2.5">{acciones}</div>}
        </article>
    );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: number }) {
    return (
        <div className="flex flex-col-reverse px-2 py-2.5">
            <dt className="text-muted-foreground mt-1 text-[11px]">{etiqueta}</dt>
            <dd className={cn('text-lg leading-none font-semibold tabular-nums', valor === 0 && 'text-muted-foreground')}>{valor}</dd>
        </div>
    );
}
