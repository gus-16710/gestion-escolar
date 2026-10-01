import { UMBRAL_RIESGO } from '@/components/dashboard/bloques';
import { OcupacionBar } from '@/components/dashboard/grupos-en-curso';
import { type ProfesorResumen, type ProximoGrupo } from '@/components/dashboard/types';
import { PersonaAvatar } from '@/components/persona-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatFecha } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Building2, CalendarDays, ClipboardX, Plus, UserPlus } from 'lucide-react';

/** Shortcuts to the director's most frequent tasks, shown only when their role allows them. */
export function AccionesRapidas() {
    const { auth } = usePage<SharedData>().props;
    const puede = (permiso: string) => auth.permissions.includes(permiso);

    return (
        <>
            {puede('manage students') && (
                <Button asChild variant="outline">
                    <Link href={route('alumnos.create')}>
                        <UserPlus className="size-4" />
                        Nuevo alumno
                    </Link>
                </Button>
            )}
            {puede('manage groups') && (
                <Button asChild>
                    <Link href={route('grupos.create')}>
                        <Plus className="size-4" />
                        Nuevo grupo
                    </Link>
                </Button>
            )}
        </>
    );
}

function cuandoInicia(dias: number): { texto: string; atrasado: boolean } {
    if (dias < 0) return { texto: `Debió iniciar hace ${-dias} ${dias === -1 ? 'día' : 'días'}`, atrasado: true };
    if (dias === 0) return { texto: 'Inicia hoy', atrasado: false };
    if (dias === 1) return { texto: 'Inicia mañana', atrasado: false };

    return { texto: `Inicia en ${dias} días`, atrasado: false };
}

/** Planned grupos, soonest first, so the director can push enrollment before they start. */
export function ProximosGruposCard({ grupos, mostrarPlantel }: { grupos: ProximoGrupo[]; mostrarPlantel: boolean }) {
    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Próximos grupos</CardTitle>
                <p className="text-muted-foreground text-xs">Grupos planeados y cuántos lugares llevan ocupados</p>
            </CardHeader>
            <CardContent>
                {grupos.length === 0 ? (
                    <p className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
                        <CalendarDays className="text-primary size-4" />
                        No hay grupos planeados.
                    </p>
                ) : (
                    <ul className="-mx-2 space-y-1">
                        {grupos.map((grupo) => {
                            const inicio = cuandoInicia(grupo.dias_para_inicio);

                            return (
                                <li key={grupo.id}>
                                    <Link
                                        href={route('grupos.show', grupo.id)}
                                        className="hover:bg-muted/60 flex flex-col gap-2 rounded-md px-2 py-2 sm:flex-row sm:items-center sm:gap-4"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{grupo.curso}</p>
                                            <p className="text-muted-foreground text-xs">
                                                <span className="font-mono">{grupo.clave}</span>
                                                {mostrarPlantel && ` · ${grupo.plantel}`} · {grupo.profesor ?? 'Sin profesor'}
                                            </p>
                                            <p
                                                className={cn(
                                                    'text-xs',
                                                    inicio.atrasado ? 'font-medium text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
                                                )}
                                            >
                                                {inicio.texto} · {formatFecha(grupo.fecha_inicio)}
                                            </p>
                                        </div>
                                        <div className="sm:w-32">
                                            <OcupacionBar inscritos={grupo.inscritos} cupo={grupo.cupo} />
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

/** Teachers with active grupos: load, 30-day attendance of their grupos and overdue roll calls. */
export function ProfesoresCard({ profesores }: { profesores: ProfesorResumen[] }) {
    const { auth } = usePage<SharedData>().props;
    const puedeEditar = auth.permissions.includes('manage teachers');

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Profesores</CardTitle>
                <p className="text-muted-foreground text-xs">Con grupo activo · asistencia de sus grupos en 30 días</p>
            </CardHeader>
            <CardContent>
                {profesores.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-sm">Ningún profesor tiene grupos activos.</p>
                ) : (
                    <ul className="-mx-2 space-y-1">
                        {profesores.map((profesor) => {
                            const contenido = (
                                <>
                                    <PersonaAvatar nombre={profesor.nombre_completo} fotoUrl={profesor.foto_url} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{profesor.nombre_completo}</p>
                                        <p className="text-muted-foreground text-xs">
                                            {profesor.grupos_activos} {profesor.grupos_activos === 1 ? 'grupo' : 'grupos'} · {profesor.alumnos}{' '}
                                            {profesor.alumnos === 1 ? 'alumno' : 'alumnos'}
                                            {profesor.especialidad && ` · ${profesor.especialidad}`}
                                        </p>
                                        {profesor.grupos_sin_lista > 0 && (
                                            <p className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                                                <ClipboardX className="size-3" />
                                                {profesor.grupos_sin_lista === 1
                                                    ? '1 grupo sin pase de lista reciente'
                                                    : `${profesor.grupos_sin_lista} grupos sin pase de lista reciente`}
                                            </p>
                                        )}
                                    </div>
                                    <span
                                        className={cn(
                                            'text-sm font-semibold tabular-nums',
                                            profesor.asistencia !== null && profesor.asistencia < UMBRAL_RIESGO && 'text-destructive',
                                            profesor.asistencia === null && 'text-muted-foreground font-normal',
                                        )}
                                        title="Asistencia de sus grupos en los últimos 30 días"
                                    >
                                        {profesor.asistencia === null ? '—' : `${profesor.asistencia}%`}
                                    </span>
                                </>
                            );

                            return (
                                <li key={profesor.id}>
                                    {puedeEditar ? (
                                        <Link
                                            href={route('profesores.edit', profesor.id)}
                                            className="hover:bg-muted/60 flex items-center gap-3 rounded-md px-2 py-2"
                                        >
                                            {contenido}
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-3 px-2 py-2">{contenido}</div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

/** Shown to a director who hasn't been assigned a plantel yet. */
export function SinPlantelCard() {
    return (
        <Card className="mx-auto max-w-lg p-8 text-center">
            <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-full">
                <Building2 className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Aún no tienes un plantel asignado</h2>
            <p className="text-muted-foreground mt-2 text-sm">
                Tu panel mostrará los alumnos, grupos y asistencia del plantel que diriges. Pide a un administrador que te asigne uno desde
                Administración → Usuarios.
            </p>
        </Card>
    );
}
