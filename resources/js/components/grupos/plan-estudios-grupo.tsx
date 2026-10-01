import { colorCalificacion, formatCalificacion } from '@/components/calificaciones/calificacion';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { Check, ListOrdered } from 'lucide-react';

/** A module of the curso placed on the grupo's calendar (CalendarioGrupo::modulos() in PHP). */
export interface ModuloCalendario {
    id: number;
    orden: number;
    nombre: string;
    descripcion: string | null;
    semanas: number;
    inicio: string;
    fin: string;
    estado: 'terminado' | 'actual' | 'proximo';
    /** Active alumnos graded in the module, and their average (grupo page only). */
    calificadas?: number;
    alumnos?: number;
    promedio?: number | null;
}

/** "14 nov" (with the year only when it isn't this year). */
function fechaCorta(fecha: string): string {
    const [y, m, d] = fecha.split('-').map(Number);
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', ...(y !== new Date().getFullYear() && { year: 'numeric' }) };

    return new Intl.DateTimeFormat('es-MX', opciones).format(new Date(y, m - 1, d));
}

export function moduloActual(modulos: ModuloCalendario[]): ModuloCalendario | undefined {
    return modulos.find((modulo) => modulo.estado === 'actual');
}

/** The grupo's study plan as a vertical timeline: finished, current and upcoming modules with their dates. */
export function PlanEstudiosGrupo({
    modulos,
    cursoId,
    puedeEditarCurso,
    grupoId,
    puedeVerCalificaciones = false,
}: {
    modulos: ModuloCalendario[];
    cursoId: number;
    puedeEditarCurso: boolean;
    grupoId?: number;
    puedeVerCalificaciones?: boolean;
}) {
    const actual = moduloActual(modulos);
    const terminados = modulos.filter((modulo) => modulo.estado === 'terminado').length;

    return (
        <Card className="gap-0 p-0">
            <div className="border-b px-5 py-4">
                <h2 className="flex items-center gap-2 font-semibold">
                    <ListOrdered className="text-muted-foreground size-4" />
                    Plan de estudios
                </h2>
                {modulos.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                        {actual
                            ? `Módulo ${actual.orden} de ${modulos.length} · termina el ${fechaCorta(actual.fin)}`
                            : terminados === modulos.length
                              ? `${modulos.length} módulos terminados`
                              : `${modulos.length} módulos · el primero inicia el ${fechaCorta(modulos[0].inicio)}`}
                    </p>
                )}
            </div>

            {modulos.length === 0 ? (
                <div className="text-muted-foreground space-y-2 px-5 py-4 text-sm">
                    <p>Este curso aún no tiene módulos.</p>
                    {puedeEditarCurso && (
                        <Link href={route('cursos.edit', cursoId)} className="text-primary font-medium hover:underline">
                            Definir el plan de estudios
                        </Link>
                    )}
                </div>
            ) : (
                <ol className="px-5 py-4">
                    {modulos.map((modulo, indice) => {
                        const ultimo = indice === modulos.length - 1;

                        return (
                            <li key={modulo.id} className="relative flex gap-3 pb-4 last:pb-0">
                                {!ultimo && (
                                    <span
                                        className={cn(
                                            'absolute top-6 bottom-0 left-[11px] w-0.5',
                                            modulo.estado === 'terminado' ? 'bg-emerald-500/60' : 'bg-border',
                                        )}
                                        aria-hidden="true"
                                    />
                                )}
                                <span
                                    className={cn(
                                        'relative flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                                        modulo.estado === 'terminado' && 'bg-emerald-600 text-white dark:bg-emerald-500',
                                        modulo.estado === 'actual' && 'bg-primary text-primary-foreground ring-primary/25 ring-4',
                                        modulo.estado === 'proximo' && 'bg-muted text-muted-foreground border',
                                    )}
                                >
                                    {modulo.estado === 'terminado' ? <Check className="size-3.5" aria-label="Terminado" /> : modulo.orden}
                                </span>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <p className={cn('text-sm leading-snug', modulo.estado === 'actual' ? 'font-semibold' : 'font-medium')}>
                                        {modulo.nombre}
                                        {modulo.estado === 'actual' && (
                                            <span className="bg-primary/10 text-primary ml-2 inline-block rounded-full px-1.5 py-px text-[10px] font-medium whitespace-nowrap">
                                                En curso
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-muted-foreground text-xs tabular-nums">
                                        {fechaCorta(modulo.inicio)} – {fechaCorta(modulo.fin)} · {modulo.semanas} sem
                                    </p>
                                    {modulo.descripcion && <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{modulo.descripcion}</p>}
                                    {puedeVerCalificaciones &&
                                        grupoId &&
                                        modulo.estado !== 'proximo' &&
                                        modulo.alumnos !== undefined &&
                                        modulo.alumnos > 0 && (
                                            <Link
                                                href={route('calificaciones.edit', [grupoId, modulo.id])}
                                                className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                                            >
                                                {modulo.calificadas === 0 ? (
                                                    <span
                                                        className={
                                                            modulo.estado === 'terminado'
                                                                ? 'text-amber-700 dark:text-amber-400'
                                                                : 'text-muted-foreground'
                                                        }
                                                    >
                                                        {modulo.estado === 'terminado' ? 'Sin calificar' : 'Calificar'}
                                                    </span>
                                                ) : (
                                                    <>
                                                        <span className="text-muted-foreground font-normal">Promedio</span>
                                                        <span className={cn('tabular-nums', colorCalificacion(modulo.promedio))}>
                                                            {formatCalificacion(modulo.promedio)}
                                                        </span>
                                                        {modulo.calificadas! < modulo.alumnos && (
                                                            <span className="font-normal text-amber-700 dark:text-amber-400">
                                                                · faltan {modulo.alumnos - modulo.calificadas!}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </Link>
                                        )}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </Card>
    );
}
