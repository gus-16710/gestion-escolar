import { type GrupoEnCurso } from '@/components/dashboard/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFecha } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { CalendarCheck, CalendarOff, CalendarX2, CheckCircle2, ClipboardCheck, Clock, GraduationCap, IdCard, MapPin, Users } from 'lucide-react';

export type ClaseDeHoy = GrupoEnCurso & { lista_tomada: boolean };

/** Today as YYYY-MM-DD, so the roll call opens on today (also for a make-up class on another weekday). */
function hoy(): string {
    const fecha = new Date();

    return [fecha.getFullYear(), String(fecha.getMonth() + 1).padStart(2, '0'), String(fecha.getDate()).padStart(2, '0')].join('-');
}

function horas(clase: ClaseDeHoy): string | null {
    if (!clase.hora_inicio) return null;

    return clase.hora_fin ? `${clase.hora_inicio}–${clase.hora_fin}` : clase.hora_inicio;
}

/** Today's classes, earliest first, each with its roll-call action: the first thing a teacher needs. */
export function ClasesDeHoyCard({ clases, mostrarPlantel }: { clases: ClaseDeHoy[]; mostrarPlantel: boolean }) {
    const pendientes = clases.filter((clase) => !clase.lista_tomada && !clase.sin_clase_hoy).length;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarCheck className="text-primary size-4" />
                    Clases de hoy
                    {clases.length > 0 && (
                        <span className="text-muted-foreground text-sm font-normal">
                            · {pendientes === 0 ? 'todas con lista' : `${pendientes} por pasar lista`}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {clases.length === 0 ? (
                    <p className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
                        <CalendarX2 className="size-4" />
                        Hoy no tienes clases programadas.
                    </p>
                ) : (
                    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {clases.map((clase) => (
                            <li key={clase.id} className="flex flex-col gap-3 rounded-lg border p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <Link href={route('grupos.show', clase.id)} className="font-medium hover:underline">
                                            {clase.curso}
                                        </Link>
                                        <p className="text-muted-foreground font-mono text-xs">{clase.clave}</p>
                                    </div>
                                    {clase.lista_tomada && (
                                        <Badge variant="secondary" className="shrink-0 gap-1">
                                            <CheckCircle2 className="size-3" />
                                            Lista tomada
                                        </Badge>
                                    )}
                                    {!clase.lista_tomada && clase.sin_clase_hoy && (
                                        <Badge variant="outline" className="shrink-0 gap-1 border-amber-500/40 text-amber-800 dark:text-amber-300">
                                            <CalendarOff className="size-3" />
                                            Sin clase
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-muted-foreground space-y-1 text-xs">
                                    {horas(clase) && (
                                        <p className="flex items-center gap-1.5">
                                            <Clock className="size-3.5" />
                                            {horas(clase)}
                                        </p>
                                    )}
                                    <p className="flex items-center gap-1.5">
                                        <Users className="size-3.5" />
                                        {clase.inscritos} {clase.inscritos === 1 ? 'alumno' : 'alumnos'}
                                    </p>
                                    {mostrarPlantel && (
                                        <p className="flex items-center gap-1.5">
                                            <MapPin className="size-3.5" />
                                            {clase.plantel}
                                        </p>
                                    )}
                                    {!clase.lista_tomada && clase.sin_clase_hoy && (
                                        <p className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300">
                                            <CalendarOff className="size-3.5" />
                                            {clase.sin_clase_hoy.motivo}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    asChild
                                    variant={clase.lista_tomada || clase.sin_clase_hoy ? 'outline' : 'default'}
                                    size="sm"
                                    className="mt-auto"
                                >
                                    <Link href={route('asistencias.edit', { grupo: clase.id, fecha: hoy() })}>
                                        <ClipboardCheck className="size-4" />
                                        {clase.lista_tomada ? 'Revisar lista' : clase.sin_clase_hoy ? 'Ver detalle' : 'Pasar lista'}
                                    </Link>
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

/** Shown to a Profesor account that isn't linked to a profesor record, so it has no grupos. */
export function SinFichaCard() {
    return (
        <Card className="mx-auto max-w-lg p-8 text-center">
            <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-full">
                <IdCard className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Tu cuenta aún no está ligada a una ficha de profesor</h2>
            <p className="text-muted-foreground mt-2 text-sm">
                Para ver tus grupos y pasar lista, pide a la administración que te registre en Profesores con la opción «Dar acceso al sistema».
            </p>
        </Card>
    );
}

export interface CalificacionPendiente {
    grupo_id: number;
    clave: string;
    curso: string;
    modulo_id: number;
    orden: number;
    modulo: string;
    fin: string;
    alumnos: number;
    faltan: number;
}

/** Finished modules of the teacher's grupos with alumnos still without a grade, each linking to its capture. */
export function CalificacionesPendientesCard({ pendientes }: { pendientes: CalificacionPendiente[] }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <GraduationCap className="text-primary size-4" />
                    Calificaciones pendientes
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                        {pendientes.length}
                    </span>
                </CardTitle>
                <p className="text-muted-foreground text-xs">Módulos que ya terminaron y aún tienen alumnos sin calificación</p>
            </CardHeader>
            <CardContent>
                <ul className="-mx-2 space-y-1">
                    {pendientes.map((pendiente) => (
                        <li key={`${pendiente.grupo_id}-${pendiente.modulo_id}`}>
                            <Link
                                href={route('calificaciones.edit', [pendiente.grupo_id, pendiente.modulo_id])}
                                className="hover:bg-muted/60 flex items-center gap-3 rounded-md px-2 py-2"
                            >
                                <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                                    {pendiente.orden}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{pendiente.modulo}</p>
                                    <p className="text-muted-foreground truncate text-xs">
                                        {pendiente.curso} · terminó el {formatFecha(pendiente.fin)}
                                    </p>
                                </div>
                                <span className="text-xs font-medium whitespace-nowrap text-amber-800 dark:text-amber-300">
                                    {pendiente.faltan === pendiente.alumnos ? 'Sin calificar' : `Faltan ${pendiente.faltan}`}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
