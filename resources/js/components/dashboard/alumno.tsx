import { ESTADOS_ASISTENCIA, type EstadoAsistencia } from '@/components/asistencias/estados';
import { type Boleta, BoletaDesplegable, colorCalificacion, formatCalificacion } from '@/components/calificaciones/calificacion';
import { UMBRAL_RIESGO } from '@/components/dashboard/bloques';
import { describirHorario } from '@/components/grupos/grupo-labels';
import { PersonaAvatar } from '@/components/persona-avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatFecha } from '@/lib/utils';
import { AlertTriangle, CalendarCheck, CalendarX2, Clock, History, IdCard, MapPin } from 'lucide-react';

export type { EstadoAsistencia };

export interface AsistenciaCurso {
    porcentaje: number | null;
    total: number;
    presentes: number;
    faltas: number;
    retardos: number;
    justificadas: number;
    en_riesgo: boolean;
}

export interface CursoAlumno {
    inscripcion_id: number;
    clave: string;
    curso: string;
    plantel: string;
    profesor: string | null;
    profesor_foto_url: string | null;
    turno: string;
    dias: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    estado_grupo: 'planeado' | 'en_curso';
    fecha_inicio: string;
    fecha_fin: string | null;
    avance: { semana: number; semanas: number; porcentaje: number } | { dias_para_inicio: number } | null;
    asistencia: AsistenciaCurso;
    calificaciones: Boleta;
}

export interface ClaseAlumno {
    inscripcion_id: number;
    curso: string;
    plantel: string;
    profesor: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    asistencia_hoy: EstadoAsistencia | null;
}

export interface RegistroAsistencia {
    id: number;
    fecha: string;
    curso: string;
    estado: EstadoAsistencia;
    observaciones: string | null;
}

export interface CursoAnterior {
    inscripcion_id: number;
    curso: string;
    clave: string;
    plantel: string;
    resultado: 'concluido' | 'baja' | 'cancelado';
    fecha: string | null;
    asistencia: number | null;
    promedio: number | null;
    promedio_completo: boolean;
}

/** Same colors as the roll call screen, always with the word so color is never the only cue. */
const ESTADOS = ESTADOS_ASISTENCIA;

export function EstadoAsistenciaBadge({ estado }: { estado: EstadoAsistencia }) {
    return <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', ESTADOS[estado].solido)}>{ESTADOS[estado].etiqueta}</span>;
}

function horas(inicio: string | null, fin: string | null): string | null {
    if (!inicio) return null;

    return fin ? `${inicio}–${fin}` : inicio;
}

/** The alumno's classes today, with their attendance once the teacher has taken it. */
export function ClasesDeHoyAlumno({ clases }: { clases: ClaseAlumno[] }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarCheck className="text-primary size-4" />
                    Hoy tienes clase de
                </CardTitle>
            </CardHeader>
            <CardContent>
                {clases.length === 0 ? (
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        <CalendarX2 className="size-4" />
                        Hoy no tienes clases.
                    </p>
                ) : (
                    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {clases.map((clase) => (
                            <li key={clase.inscripcion_id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                                <div className="min-w-0 space-y-1">
                                    <p className="font-medium">{clase.curso}</p>
                                    <div className="text-muted-foreground space-y-0.5 text-xs">
                                        {horas(clase.hora_inicio, clase.hora_fin) && (
                                            <p className="flex items-center gap-1.5">
                                                <Clock className="size-3.5" />
                                                {horas(clase.hora_inicio, clase.hora_fin)}
                                            </p>
                                        )}
                                        <p className="flex items-center gap-1.5">
                                            <MapPin className="size-3.5" />
                                            {clase.plantel}
                                        </p>
                                    </div>
                                </div>
                                {clase.asistencia_hoy && <EstadoAsistenciaBadge estado={clase.asistencia_hoy} />}
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

function Avance({ curso }: { curso: CursoAlumno }) {
    const avance = curso.avance;

    if (avance && 'dias_para_inicio' in avance) {
        return (
            <p className="text-muted-foreground text-xs">
                Inicia {avance.dias_para_inicio === 0 ? 'hoy' : avance.dias_para_inicio === 1 ? 'mañana' : `en ${avance.dias_para_inicio} días`} ·{' '}
                {formatFecha(curso.fecha_inicio)}
            </p>
        );
    }

    if (!avance) {
        return <p className="text-muted-foreground text-xs">Inició el {formatFecha(curso.fecha_inicio)}</p>;
    }

    return (
        <div className="space-y-1">
            <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium">
                    Semana {avance.semana} de {avance.semanas}
                </span>
                {curso.fecha_fin && <span className="text-muted-foreground">Termina {formatFecha(curso.fecha_fin)}</span>}
            </div>
            <div
                className="bg-primary/15 h-1.5 overflow-hidden rounded-full"
                role="progressbar"
                aria-valuenow={avance.porcentaje}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Avance del curso ${curso.curso}`}
            >
                <div className="bg-primary h-full rounded-full" style={{ width: `${avance.porcentaje}%` }} />
            </div>
        </div>
    );
}

function Desglose({ asistencia }: { asistencia: AsistenciaCurso }) {
    const filas: { estado: EstadoAsistencia; valor: number }[] = [
        { estado: 'presente', valor: asistencia.presentes },
        { estado: 'retardo', valor: asistencia.retardos },
        { estado: 'justificada', valor: asistencia.justificadas },
        { estado: 'falta', valor: asistencia.faltas },
    ];

    return (
        <div className="grid grid-cols-4 gap-2 text-center">
            {filas.map(({ estado, valor }) => (
                <div key={estado} className="bg-muted/40 rounded-md px-1 py-1.5" title={`${valor} ${ESTADOS[estado].etiqueta.toLowerCase()}`}>
                    <p className="text-base font-semibold tabular-nums">{valor}</p>
                    <p className="text-muted-foreground text-[11px]">{estado === 'justificada' ? 'Justif.' : ESTADOS[estado].etiqueta}</p>
                </div>
            ))}
        </div>
    );
}

/** One current course: teacher, schedule, progress and the alumno's own attendance. */
export function CursoCard({ curso }: { curso: CursoAlumno }) {
    const { asistencia } = curso;
    const planeado = curso.estado_grupo === 'planeado';

    return (
        <Card className="flex h-full flex-col gap-4 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-semibold">{curso.curso}</p>
                    <p className="text-muted-foreground font-mono text-xs">{curso.clave}</p>
                </div>
                {planeado ? (
                    <Badge variant="secondary">Por iniciar</Badge>
                ) : (
                    <div className="text-right">
                        <p className={cn('text-2xl font-semibold tabular-nums', asistencia.en_riesgo && 'text-destructive')}>
                            {asistencia.porcentaje === null ? '—' : `${asistencia.porcentaje}%`}
                        </p>
                        <p className="text-muted-foreground text-[11px]">asistencia</p>
                    </div>
                )}
            </div>

            <div className="text-muted-foreground space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                    {curso.profesor ? (
                        <>
                            <PersonaAvatar nombre={curso.profesor} fotoUrl={curso.profesor_foto_url} className="size-6" />
                            <span className="text-foreground">{curso.profesor}</span>
                        </>
                    ) : (
                        <span>Profesor por asignar</span>
                    )}
                </div>
                <p className="flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {describirHorario(curso)}
                </p>
                <p className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {curso.plantel}
                </p>
            </div>

            <Avance curso={curso} />

            {!planeado &&
                (asistencia.total === 0 ? (
                    <p className="text-muted-foreground text-xs">Aún no hay pases de lista en este curso.</p>
                ) : (
                    <Desglose asistencia={asistencia} />
                ))}

            {!planeado && <BoletaDesplegable boleta={curso.calificaciones} titulo="Mis calificaciones" />}

            {asistencia.en_riesgo && (
                <p className="bg-destructive/10 text-destructive mt-auto flex items-start gap-2 rounded-md px-3 py-2 text-xs">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    Tu asistencia está por debajo del {UMBRAL_RIESGO}%. Habla con tu profesor para ponerte al corriente.
                </p>
            )}
        </Card>
    );
}

/** The latest roll-call records across the alumno's courses. */
export function HistorialCard({ registros }: { registros: RegistroAsistencia[] }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <History className="text-primary size-4" />
                    Asistencia reciente
                </CardTitle>
            </CardHeader>
            <CardContent>
                {registros.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-sm">Todavía no hay pases de lista.</p>
                ) : (
                    <ul className="divide-y">
                        {registros.map((registro) => (
                            <li key={registro.id} className="flex items-start justify-between gap-3 py-2">
                                <div className="min-w-0">
                                    <p className="text-sm">{registro.curso}</p>
                                    <p className="text-muted-foreground text-xs">{formatFecha(registro.fecha)}</p>
                                    {registro.observaciones && <p className="text-muted-foreground text-xs italic">“{registro.observaciones}”</p>}
                                </div>
                                <EstadoAsistenciaBadge estado={registro.estado} />
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

const RESULTADOS: Record<CursoAnterior['resultado'], string> = {
    concluido: 'Concluido',
    baja: 'Baja',
    cancelado: 'Grupo cancelado',
};

/** Courses the alumno finished or left. */
export function AnterioresCard({ cursos }: { cursos: CursoAnterior[] }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Cursos anteriores</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="divide-y">
                    {cursos.map((curso) => (
                        <li key={curso.inscripcion_id} className="flex items-start justify-between gap-3 py-2">
                            <div className="min-w-0">
                                <p className="text-sm">{curso.curso}</p>
                                <p className="text-muted-foreground text-xs">
                                    {curso.plantel}
                                    {curso.fecha && ` · ${formatFecha(curso.fecha)}`}
                                    {curso.asistencia !== null && ` · ${curso.asistencia}% de asistencia`}
                                </p>
                            </div>
                            {curso.promedio !== null && (
                                <span
                                    className="ml-auto text-right"
                                    title={curso.promedio_completo ? 'Promedio final' : 'Promedio de los módulos calificados'}
                                >
                                    <span className={cn('block text-sm font-semibold tabular-nums', colorCalificacion(curso.promedio))}>
                                        {formatCalificacion(curso.promedio)}
                                    </span>
                                    <span className="text-muted-foreground text-[10px]">{curso.promedio_completo ? 'promedio' : 'parcial'}</span>
                                </span>
                            )}
                            <Badge variant={curso.resultado === 'concluido' ? 'default' : 'secondary'}>{RESULTADOS[curso.resultado]}</Badge>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

/** Shown to an Alumno account that isn't linked to an alumno record. */
export function SinFichaAlumnoCard() {
    return (
        <Card className="mx-auto max-w-lg p-8 text-center">
            <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-full">
                <IdCard className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Tu cuenta aún no está ligada a tu registro de alumno</h2>
            <p className="text-muted-foreground mt-2 text-sm">
                Pide a la administración que te registre en Alumnos con la opción «Dar acceso al sistema».
            </p>
        </Card>
    );
}
