import { cn, formatFecha } from '@/lib/utils';
import { CalendarClock } from 'lucide-react';

export interface ActividadPlantel {
    grupos_en_curso: number;
    grupos_planeados: number;
    alumnos: number;
    proxima_apertura: string | null;
}

export interface PlantelDirigido extends ActividadPlantel {
    id: number;
    nombre: string;
    clave: string;
    activo: boolean;
}

function plural(n: number, uno: string, varios: string): string {
    return `${n} ${n === 1 ? uno : varios}`;
}

/** The planteles a director runs, each with what is going on there now. */
export function PlantelesDirector({ planteles }: { planteles: PlantelDirigido[] }) {
    if (planteles.length === 0) {
        return <p className="text-sm text-amber-700 dark:text-amber-300">No tiene planteles asignados: su inicio aparece vacío.</p>;
    }

    return (
        <ul className="space-y-2.5">
            {planteles.map((plantel) => {
                const porAbrir = plantel.grupos_en_curso === 0 && plantel.proxima_apertura;

                return (
                    <li key={plantel.id} className={cn('flex items-start gap-2.5', !plantel.activo && 'opacity-70')}>
                        <span className="bg-primary/10 text-primary mt-0.5 w-9 shrink-0 rounded-md py-0.5 text-center font-mono text-[11px] font-bold">
                            {plantel.clave}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                                {plantel.nombre}
                                {!plantel.activo && <span className="text-muted-foreground font-normal"> · inactivo</span>}
                            </p>
                            <p className="text-muted-foreground text-xs">
                                {porAbrir ? (
                                    <span className="flex flex-wrap items-center gap-x-1.5">
                                        <span className="flex items-center gap-1 text-sky-700 dark:text-sky-300">
                                            <CalendarClock className="size-3" />
                                            Abre el {formatFecha(plantel.proxima_apertura!)}
                                        </span>
                                        · {plural(plantel.grupos_planeados, 'grupo planeado', 'grupos planeados')} ·{' '}
                                        {plural(plantel.alumnos, 'inscrito', 'inscritos')}
                                    </span>
                                ) : (
                                    <>
                                        {plural(plantel.grupos_en_curso, 'grupo en curso', 'grupos en curso')}
                                        {plantel.grupos_planeados > 0 && ` · ${plantel.grupos_planeados} planeados`} ·{' '}
                                        {plural(plantel.alumnos, 'alumno', 'alumnos')}
                                    </>
                                )}
                            </p>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
