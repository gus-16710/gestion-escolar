import { type AlumnoEnRiesgo, type BajaReciente, type Pendiente } from '@/components/dashboard/types';
import { PersonaAvatar } from '@/components/persona-avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFecha } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { CalendarClock, CheckCircle2, ClipboardX, type LucideIcon, UserX, UsersRound } from 'lucide-react';

/** Alumnos whose attendance dropped below the threshold, worst first, linking to their grupo's roll call. */
export function AlumnosEnRiesgoCard({ alumnos, umbral }: { alumnos: AlumnoEnRiesgo[]; umbral: number }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Alumnos en riesgo</CardTitle>
                <p className="text-muted-foreground text-xs">Asistencia menor a {umbral}% en su grupo actual</p>
            </CardHeader>
            <CardContent>
                {alumnos.length === 0 ? (
                    <Vacio icon={CheckCircle2} texto="Ningún alumno está por debajo del umbral." />
                ) : (
                    <ul className="-mx-2 space-y-1">
                        {alumnos.map((alumno) => (
                            <li key={alumno.inscripcion_id}>
                                <Link
                                    href={route('asistencias.edit', alumno.grupo_id)}
                                    className="hover:bg-muted/60 flex items-center gap-3 rounded-md px-2 py-2"
                                >
                                    <PersonaAvatar nombre={alumno.nombre_completo} fotoUrl={alumno.foto_url} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{alumno.nombre_completo}</p>
                                        <p className="text-muted-foreground text-xs">
                                            {alumno.curso} · {alumno.faltas} {alumno.faltas === 1 ? 'falta' : 'faltas'} de {alumno.total}
                                        </p>
                                    </div>
                                    <span className="text-destructive text-sm font-semibold tabular-nums">{alumno.porcentaje}%</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

const PENDIENTE_ICONO: Record<Pendiente['tipo'], LucideIcon> = {
    sin_profesor: UserX,
    sin_iniciar: CalendarClock,
    sin_lista: ClipboardX,
    lleno: UsersRound,
};

/** Actionable issues (no teacher, overdue start, no recent roll call, full grupo), each linking to its grupo. */
export function PendientesCard({ pendientes }: { pendientes: Pendiente[] }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    Pendientes
                    {pendientes.length > 0 && (
                        <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 text-xs font-medium">{pendientes.length}</span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {pendientes.length === 0 ? (
                    <Vacio icon={CheckCircle2} texto="Todo en orden por ahora." />
                ) : (
                    <ul className="-mx-2 space-y-1">
                        {pendientes.map((pendiente, i) => {
                            const Icon = PENDIENTE_ICONO[pendiente.tipo];

                            return (
                                <li key={`${pendiente.tipo}-${pendiente.grupo_id}-${i}`}>
                                    <Link
                                        href={route('grupos.show', pendiente.grupo_id)}
                                        className="hover:bg-muted/60 flex items-start gap-3 rounded-md px-2 py-2"
                                    >
                                        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">
                                            <Icon className="size-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm">{pendiente.mensaje}</p>
                                            <p className="text-muted-foreground font-mono text-xs">{pendiente.clave}</p>
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

/** Latest drops with their reason. */
export function BajasRecientesCard({ bajas }: { bajas: BajaReciente[] }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Bajas recientes</CardTitle>
            </CardHeader>
            <CardContent>
                {bajas.length === 0 ? (
                    <Vacio icon={CheckCircle2} texto="No hay bajas registradas." />
                ) : (
                    <ul className="-mx-2 space-y-1">
                        {bajas.map((baja) => (
                            <li key={baja.inscripcion_id}>
                                <Link
                                    href={route('grupos.show', baja.grupo_id)}
                                    className="hover:bg-muted/60 flex items-start gap-3 rounded-md px-2 py-2"
                                >
                                    <PersonaAvatar nombre={baja.nombre_completo} fotoUrl={baja.foto_url} className="size-8" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className="truncate text-sm font-medium">{baja.nombre_completo}</p>
                                            {baja.fecha_baja && (
                                                <span className="text-muted-foreground shrink-0 text-xs">{formatFecha(baja.fecha_baja)}</span>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground truncate text-xs">{baja.curso}</p>
                                        {baja.motivo && <p className="text-muted-foreground truncate text-xs italic">“{baja.motivo}”</p>}
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

function Vacio({ icon: Icon, texto }: { icon: LucideIcon; texto: string }) {
    return (
        <p className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
            <Icon className="text-primary size-4" />
            {texto}
        </p>
    );
}
