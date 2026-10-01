import { type GrupoEnCurso } from '@/components/dashboard/types';
import { describirHorario } from '@/components/grupos/grupo-labels';
import { PersonaAvatar } from '@/components/persona-avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ChevronRight, Clock, UserRound } from 'lucide-react';

export function haceDias(dias: number | null): string {
    if (dias === null) return 'Sin pase de lista';
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Ayer';

    return `Hace ${dias} días`;
}

/** Seats taken vs. cupo as a meter on the same hue; turns amber past 90% and always shows the numbers. */
export function OcupacionBar({ inscritos, cupo }: { inscritos: number; cupo: number | null }) {
    if (!cupo) {
        return <span className="text-sm tabular-nums">{inscritos} inscritos</span>;
    }

    const porcentaje = Math.min(100, Math.round((100 * inscritos) / cupo));
    const casiLleno = porcentaje >= 90;

    return (
        <div className="min-w-28 space-y-1">
            <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium tabular-nums">
                    {inscritos}/{cupo}
                </span>
                <span className={cn('tabular-nums', casiLleno ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                    {porcentaje}%
                </span>
            </div>
            <div
                className="bg-primary/15 h-1.5 overflow-hidden rounded-full"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={cupo}
                aria-valuenow={inscritos}
                aria-label="Ocupación"
            >
                <div className={cn('h-full rounded-full', casiLleno ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${porcentaje}%` }} />
            </div>
        </div>
    );
}

function Asistencia({ porcentaje }: { porcentaje: number | null }) {
    if (porcentaje === null) return <span className="text-muted-foreground">—</span>;

    return <span className={cn('font-medium tabular-nums', porcentaje < 80 && 'text-destructive')}>{porcentaje}%</span>;
}

function UltimaLista({ dias, atrasada }: { dias: number | null; atrasada: boolean }) {
    return <span className={cn('text-xs', atrasada ? 'text-destructive font-medium' : 'text-muted-foreground')}>{haceDias(dias)}</span>;
}

/** The operational table: every in-progress grupo with teacher, schedule, occupancy and attendance health. */
interface GruposEnCursoCardProps {
    grupos: GrupoEnCurso[];
    mostrarPlantel: boolean;
    /** Hidden on the profesor dashboard, where every grupo is their own. */
    mostrarProfesor?: boolean;
    titulo?: string;
}

export function GruposEnCursoCard({ grupos, mostrarPlantel, mostrarProfesor = true, titulo = 'Grupos en curso' }: GruposEnCursoCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
                <div className="space-y-1">
                    <CardTitle className="text-base">{titulo}</CardTitle>
                    <p className="text-muted-foreground text-xs">Ocupación, asistencia de los últimos 30 días y último pase de lista</p>
                </div>
                <Link href={route('grupos.index', { estado: 'en_curso' })} className="text-primary shrink-0 text-sm font-medium hover:underline">
                    Ver todos
                </Link>
            </CardHeader>
            <CardContent>
                {grupos.length === 0 ? (
                    <p className="text-muted-foreground py-10 text-center text-sm">No hay grupos en curso.</p>
                ) : (
                    <>
                        {/* Wide screens: table (from lg, since the sidebar takes room on a tablet) */}
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-muted-foreground border-b text-xs">
                                        <th className="pb-2 font-medium">Grupo</th>
                                        {mostrarProfesor && <th className="pb-2 font-medium">Profesor</th>}
                                        <th className="pb-2 font-medium">Ocupación</th>
                                        <th className="pb-2 pl-3 text-right font-medium">Asistencia</th>
                                        <th className="pb-2 pl-3 text-right font-medium whitespace-nowrap">Último pase</th>
                                        <th className="pb-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {grupos.map((grupo) => (
                                        <tr key={grupo.id} className="hover:bg-muted/40 border-b last:border-0">
                                            <td className="min-w-48 py-3 pr-3">
                                                <Link href={route('grupos.show', grupo.id)} className="font-medium hover:underline">
                                                    {grupo.curso}
                                                </Link>
                                                <p className="text-muted-foreground font-mono text-xs">{grupo.clave}</p>
                                                {/* The schedule lives under the grupo (not in its own column) so the table fits next to the side panel. */}
                                                <p className="text-muted-foreground text-xs">
                                                    {describirHorario(grupo)}
                                                    {mostrarPlantel && ` · ${grupo.plantel}`}
                                                </p>
                                            </td>
                                            {mostrarProfesor && (
                                                <td className="py-3 pr-3">
                                                    {grupo.profesor ? (
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <PersonaAvatar
                                                                nombre={grupo.profesor}
                                                                fotoUrl={grupo.profesor_foto_url}
                                                                className="size-7"
                                                            />
                                                            <span>{grupo.profesor}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-destructive text-xs font-medium">Sin asignar</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="py-3 pr-3">
                                                <OcupacionBar inscritos={grupo.inscritos} cupo={grupo.cupo} />
                                            </td>
                                            <td className="py-3 pr-3 text-right">
                                                <Asistencia porcentaje={grupo.asistencia} />
                                            </td>
                                            <td className="py-3 text-right">
                                                <UltimaLista dias={grupo.dias_sin_lista} atrasada={grupo.lista_atrasada} />
                                            </td>
                                            <td className="py-3 pl-2 text-right">
                                                <Link
                                                    href={route('grupos.show', grupo.id)}
                                                    className="text-muted-foreground hover:text-foreground"
                                                    aria-label={`Abrir ${grupo.clave}`}
                                                >
                                                    <ChevronRight className="size-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Phones and tablets: cards */}
                        <div className="flex flex-col gap-3 lg:hidden">
                            {grupos.map((grupo) => (
                                <Link key={grupo.id} href={route('grupos.show', grupo.id)} className="hover:bg-muted/40 rounded-lg border p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-medium">{grupo.curso}</p>
                                            <p className="text-muted-foreground font-mono text-xs">{grupo.clave}</p>
                                        </div>
                                        <Asistencia porcentaje={grupo.asistencia} />
                                    </div>
                                    <div className="text-muted-foreground mt-2 space-y-1 text-xs">
                                        {mostrarProfesor && (
                                            <p className="flex items-center gap-1.5">
                                                <UserRound className="size-3.5" />
                                                {grupo.profesor ?? 'Sin profesor asignado'}
                                            </p>
                                        )}
                                        <p className="flex items-center gap-1.5">
                                            <Clock className="size-3.5" />
                                            {describirHorario(grupo)}
                                        </p>
                                    </div>
                                    <div className="mt-3 flex items-end justify-between gap-4">
                                        <div className="flex-1">
                                            <OcupacionBar inscritos={grupo.inscritos} cupo={grupo.cupo} />
                                        </div>
                                        <UltimaLista dias={grupo.dias_sin_lista} atrasada={grupo.lista_atrasada} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
