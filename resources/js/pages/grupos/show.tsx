import { UMBRAL_RIESGO } from '@/components/dashboard/bloques';
import { haceDias, OcupacionBar } from '@/components/dashboard/grupos-en-curso';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { BajaDialog } from '@/components/grupos/baja-dialog';
import { ClasesSinImpartirCard, type MotivosSuspension, type SinClase } from '@/components/grupos/clases-sin-impartir';
import { describirDiasYHoras, EstadoGrupoBadge, TURNOS } from '@/components/grupos/grupo-labels';
import { InscribirAlumno, type AlumnoDisponible } from '@/components/grupos/inscribir-alumno';
import { moduloActual, PlanEstudiosGrupo, type ModuloCalendario } from '@/components/grupos/plan-estudios-grupo';
import { PersonaAvatar } from '@/components/persona-avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn, formatFecha } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    CalendarClock,
    CalendarDays,
    ChevronDown,
    ClipboardCheck,
    Clock,
    Gauge,
    GraduationCap,
    Pencil,
    Search,
    TrendingUp,
    UserPlus,
    UserRound,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState, type ReactNode } from 'react';

interface Avance {
    semana?: number;
    semanas?: number;
    porcentaje?: number;
    dias_para_inicio?: number;
}

interface GrupoDetalle {
    id: number;
    clave: string;
    curso: string;
    curso_clave: string;
    plantel: string;
    profesor: string | null;
    profesor_foto_url: string | null;
    profesor_especialidad: string | null;
    turno: string;
    dias: string | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    fecha_inicio: string;
    fecha_fin: string | null;
    fecha_fin_estimada: string | null;
    semanas_recorridas: number;
    avance: Avance | null;
    asistencia_30: number | null;
    registros_30: number;
    dias_sin_lista: number | null;
    lista_atrasada: boolean;
    cupo: number | null;
    inscritos: number;
    estado: string;
    admite_inscripciones: boolean;
    curso_id: number;
}

interface InscripcionRow {
    id: number;
    alumno_id: number;
    matricula: string;
    nombre_completo: string;
    foto_url: string | null;
    telefono: string | null;
    estado: 'activo' | 'baja' | 'egresado';
    fecha_inscripcion: string;
    fecha_baja: string | null;
    motivo_baja: string | null;
    inscrito_por: string | null;
    asistencia: { porcentaje: number | null; registros: number; faltas: number; retardos: number };
}

interface GrupoShowProps {
    grupo: GrupoDetalle;
    modulos: ModuloCalendario[];
    clasesSinImpartir: SinClase[];
    motivosSuspension: MotivosSuspension;
    canEditCurso: boolean;
    inscripciones: InscripcionRow[];
    alumnosDisponibles: AlumnoDisponible[];
    canManage: boolean;
    canEnroll: boolean;
    canViewAttendance: boolean;
    canTakeAttendance: boolean;
    canSuspend: boolean;
    canViewGrades: boolean;
}

/** Same rule as the dashboards: below the threshold with at least 3 roll calls. */
const enRiesgo = (asistencia: InscripcionRow['asistencia']) =>
    asistencia.porcentaje !== null && asistencia.registros >= 3 && asistencia.porcentaje < UMBRAL_RIESGO;

const DIAS_JS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** The next date (today included) that falls on one of the grupo's days. */
function proximaClase(dias: string | null): Date | null {
    if (!dias) return null;
    const lista = dias.split(',');

    for (let i = 0; i < 7; i++) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + i);

        if (lista.includes(DIAS_JS[fecha.getDay()])) return fecha;
    }

    return null;
}

export default function GrupoShow({
    grupo,
    modulos,
    clasesSinImpartir,
    motivosSuspension,
    canEditCurso,
    inscripciones,
    alumnosDisponibles,
    canManage,
    canEnroll,
    canViewAttendance,
    canTakeAttendance,
    canSuspend,
    canViewGrades,
}: GrupoShowProps) {
    const [error, setError] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [inscribiendo, setInscribiendo] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Grupos', href: '/grupos' },
        { title: grupo.clave, href: `/grupos/${grupo.id}` },
    ];

    const activos = inscripciones.filter((i) => i.estado === 'activo');
    const inactivos = inscripciones.filter((i) => i.estado !== 'activo');
    const riesgo = activos.filter((i) => enRiesgo(i.asistencia)).length;
    const lleno = grupo.cupo !== null && grupo.inscritos >= grupo.cupo;
    const puedeInscribir = canEnroll && grupo.admite_inscripciones && !lleno;

    const activosFiltrados = useMemo(() => {
        const termino = busqueda.trim().toLowerCase();

        return termino
            ? activos.filter((i) => i.nombre_completo.toLowerCase().includes(termino) || i.matricula.toLowerCase().includes(termino))
            : activos;
    }, [activos, busqueda]);

    const handleDelete = () => {
        setError(null);
        router.delete(route('grupos.destroy', grupo.id), {
            onError: (errors) => setError(errors.grupo ?? 'No se pudo eliminar el grupo.'),
        });
    };

    const listaAtrasada = grupo.lista_atrasada;
    const proxima = grupo.estado === 'en_curso' ? proximaClase(grupo.dias) : null;
    // The scheduled end pushed by the classes lost (see CalendarioGrupo).
    const fin = grupo.fecha_fin_estimada;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${grupo.curso} ${grupo.clave}`} />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col gap-6 p-4 sm:p-6"
            >
                {/* Header: curso, estado, clave and plantel, with the grupo's actions. */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                        <div className="bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center rounded-2xl text-sm font-bold tracking-wide">
                            {grupo.curso_clave}
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-semibold tracking-tight">{grupo.curso}</h1>
                                <EstadoGrupoBadge estado={grupo.estado} />
                            </div>
                            <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
                                <span className="font-mono">{grupo.clave}</span>
                                <span aria-hidden="true">·</span>
                                <span className="flex items-center gap-1">
                                    <Building2 className="size-3.5" />
                                    {grupo.plantel}
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {canViewAttendance && (
                            <Button asChild className="flex-1 shadow-sm sm:flex-none">
                                <Link href={route('asistencias.edit', grupo.id)}>
                                    <ClipboardCheck className="size-4" />
                                    {canTakeAttendance ? 'Pasar lista' : 'Ver asistencias'}
                                </Link>
                            </Button>
                        )}
                        {canViewGrades && modulos.length > 0 && (
                            <Button variant="outline" asChild className="flex-1 sm:flex-none">
                                <Link href={route('calificaciones.index', grupo.id)}>
                                    <GraduationCap className="size-4" />
                                    Calificaciones
                                </Link>
                            </Button>
                        )}
                        {canManage && (
                            <>
                                <Button variant="outline" asChild className="flex-1 sm:flex-none">
                                    <Link href={route('grupos.edit', grupo.id)}>
                                        <Pencil className="size-4" />
                                        Editar
                                    </Link>
                                </Button>
                                <DeleteConfirmDialog
                                    title={`¿Eliminar el grupo ${grupo.clave}?`}
                                    description="El grupo se marcará como eliminado; sus inscripciones y asistencias se conservan. Si solo no se abrirá, mejor márcalo como cancelado."
                                    onConfirm={handleDelete}
                                />
                            </>
                        )}
                    </div>
                </div>

                {error && <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-2 text-sm">{error}</div>}

                {/* Health at a glance. */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <Indicador icono={Users} titulo="Ocupación">
                        <p className="text-2xl font-semibold tabular-nums">
                            {grupo.inscritos}
                            {grupo.cupo && <span className="text-muted-foreground text-base font-normal"> / {grupo.cupo}</span>}
                        </p>
                        {grupo.cupo ? (
                            <>
                                <BarraSimple
                                    porcentaje={(100 * grupo.inscritos) / grupo.cupo}
                                    alerta={lleno || grupo.inscritos / grupo.cupo >= 0.9}
                                />
                                <p className="text-muted-foreground text-xs">
                                    {lleno
                                        ? 'Grupo lleno'
                                        : `${grupo.cupo - grupo.inscritos} ${grupo.cupo - grupo.inscritos === 1 ? 'lugar libre' : 'lugares libres'}`}
                                </p>
                            </>
                        ) : (
                            <p className="text-muted-foreground text-xs">Sin límite de cupo</p>
                        )}
                    </Indicador>

                    <Indicador icono={Gauge} titulo="Asistencia 30 días">
                        <p
                            className={cn(
                                'text-2xl font-semibold tabular-nums',
                                grupo.asistencia_30 !== null && grupo.asistencia_30 < UMBRAL_RIESGO && 'text-destructive',
                            )}
                        >
                            {grupo.asistencia_30 === null ? '—' : `${grupo.asistencia_30}%`}
                        </p>
                        <p className="text-muted-foreground text-xs">
                            {grupo.registros_30 > 0 ? `${grupo.registros_30} registros` : 'Sin pases de lista recientes'}
                            {riesgo > 0 && <span className="text-destructive font-medium"> · {riesgo} en riesgo</span>}
                        </p>
                    </Indicador>

                    <Indicador icono={TrendingUp} titulo="Avance del curso">
                        {grupo.avance?.semana && grupo.avance.semanas ? (
                            <>
                                <p className="text-2xl font-semibold tabular-nums">
                                    {grupo.avance.semana}
                                    <span className="text-muted-foreground text-base font-normal"> / {grupo.avance.semanas} sem.</span>
                                </p>
                                <BarraSimple porcentaje={grupo.avance.porcentaje ?? 0} color="bg-sidebar-primary" pista="bg-sidebar-primary/20" />
                                {moduloActual(modulos) ? (
                                    <p className="text-muted-foreground truncate text-xs" title={moduloActual(modulos)!.nombre}>
                                        Módulo {moduloActual(modulos)!.orden}: {moduloActual(modulos)!.nombre}
                                    </p>
                                ) : (
                                    fin && <p className="text-muted-foreground text-xs">Termina {formatFecha(fin)}</p>
                                )}
                            </>
                        ) : grupo.avance?.dias_para_inicio !== undefined ? (
                            <>
                                <p className="text-2xl font-semibold text-sky-700 tabular-nums dark:text-sky-300">
                                    {grupo.avance.dias_para_inicio === 0 ? 'Hoy' : `${grupo.avance.dias_para_inicio} días`}
                                </p>
                                <p className="text-muted-foreground text-xs">Inicia {formatFecha(grupo.fecha_inicio)}</p>
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-semibold">{formatFecha(grupo.fecha_inicio)}</p>
                                {fin && <p className="text-muted-foreground text-xs">al {formatFecha(fin)}</p>}
                            </>
                        )}
                    </Indicador>

                    <Indicador icono={CalendarClock} titulo="Pase de lista" alerta={listaAtrasada}>
                        <p className={cn('text-2xl font-semibold', listaAtrasada && 'text-destructive')}>{haceDias(grupo.dias_sin_lista)}</p>
                        <p className="text-muted-foreground text-xs">
                            {proxima
                                ? `Próxima clase: ${new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }).format(proxima)}`
                                : grupo.estado === 'planeado'
                                  ? 'Aún no inicia'
                                  : 'Sin clases pendientes'}
                        </p>
                    </Indicador>
                </div>

                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
                    {/* Alumnos */}
                    <Card className="gap-0 overflow-hidden p-0">
                        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="font-semibold">Alumnos</h2>
                                <p className="text-muted-foreground text-sm">
                                    {grupo.inscritos} {grupo.inscritos === 1 ? 'inscrito' : 'inscritos'}
                                    {inactivos.length > 0 && ` · ${inactivos.length} con baja o egresados`}
                                </p>
                            </div>
                            {canEnroll &&
                                (puedeInscribir ? (
                                    <Dialog open={inscribiendo} onOpenChange={setInscribiendo}>
                                        <DialogTrigger asChild>
                                            <Button size="sm" className="w-full sm:w-auto">
                                                <UserPlus className="size-4" />
                                                Inscribir alumno
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-lg">
                                            <DialogHeader>
                                                <DialogTitle>Inscribir alumno</DialogTitle>
                                                <DialogDescription>
                                                    Busca al alumno por nombre o matrícula y selecciónalo para inscribirlo en {grupo.clave}.
                                                    {grupo.cupo && ` Quedan ${grupo.cupo - grupo.inscritos} lugares.`}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <InscribirAlumno
                                                grupoId={grupo.id}
                                                alumnos={alumnosDisponibles}
                                                autoFocus
                                                onInscrito={() => setInscribiendo(false)}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                ) : (
                                    <p className="bg-muted text-muted-foreground rounded-md px-3 py-1.5 text-xs">
                                        {lleno
                                            ? 'Grupo lleno: aumenta el cupo desde Editar para inscribir más.'
                                            : 'Solo se inscribe en grupos planeados o en curso.'}
                                    </p>
                                ))}
                        </div>

                        {activos.length > 6 && (
                            <div className="border-b px-5 py-3">
                                <div className="relative">
                                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                    <Input
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        placeholder="Filtrar por nombre o matrícula..."
                                        className="h-9 pl-9"
                                        aria-label="Filtrar alumnos del grupo"
                                    />
                                </div>
                            </div>
                        )}

                        {activos.length === 0 ? (
                            <div className="flex flex-col items-center px-6 py-12 text-center">
                                <div className="bg-muted text-muted-foreground mb-3 flex size-11 items-center justify-center rounded-full">
                                    <Users className="size-5" />
                                </div>
                                <p className="font-medium">Aún no hay alumnos inscritos</p>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    {puedeInscribir ? 'Usa «Inscribir alumno» para agregar al primero.' : 'Cuando se inscriban aparecerán aquí.'}
                                </p>
                            </div>
                        ) : activosFiltrados.length === 0 ? (
                            <p className="text-muted-foreground px-6 py-10 text-center text-sm">Ningún alumno coincide con «{busqueda}».</p>
                        ) : (
                            <ul className="divide-y">
                                {activosFiltrados.map((inscripcion) => (
                                    <li key={inscripcion.id} className="hover:bg-muted/30 flex items-center gap-3 px-5 py-3 transition-colors">
                                        <PersonaAvatar nombre={inscripcion.nombre_completo} fotoUrl={inscripcion.foto_url} />
                                        <div className="min-w-0 flex-1">
                                            <p className="flex items-start gap-2 text-sm leading-snug font-medium">
                                                <span className="line-clamp-2">{inscripcion.nombre_completo}</span>
                                                {enRiesgo(inscripcion.asistencia) && (
                                                    <span className="text-destructive bg-destructive/10 inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium">
                                                        <AlertTriangle className="size-3" />
                                                        <span className="sr-only sm:not-sr-only">En riesgo</span>
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-muted-foreground truncate text-xs">
                                                <span className="font-mono">{inscripcion.matricula}</span>
                                                {inscripcion.telefono && ` · ${inscripcion.telefono}`}
                                                <span className="hidden sm:inline"> · desde {formatFecha(inscripcion.fecha_inscripcion)}</span>
                                            </p>
                                        </div>
                                        <AsistenciaAlumno asistencia={inscripcion.asistencia} />
                                        {canEnroll && <BajaDialog inscripcionId={inscripcion.id} alumno={inscripcion.nombre_completo} compacto />}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {inactivos.length > 0 && (
                            <Collapsible className="border-t">
                                <CollapsibleTrigger className="group text-muted-foreground hover:text-foreground flex w-full items-center justify-between px-5 py-3 text-sm font-medium transition-colors">
                                    Bajas y egresados ({inactivos.length})
                                    <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <ul className="bg-muted/20 divide-y border-t">
                                        {inactivos.map((inscripcion) => (
                                            <li key={inscripcion.id} className="flex items-center gap-3 px-5 py-3">
                                                <PersonaAvatar
                                                    nombre={inscripcion.nombre_completo}
                                                    fotoUrl={inscripcion.foto_url}
                                                    className="opacity-60 grayscale"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">{inscripcion.nombre_completo}</p>
                                                    <p className="text-muted-foreground truncate text-xs">
                                                        <span className="font-mono">{inscripcion.matricula}</span>
                                                        {inscripcion.motivo_baja && <span className="italic"> · {inscripcion.motivo_baja}</span>}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="bg-muted text-muted-foreground rounded-full border px-2 py-0.5 text-xs font-medium">
                                                        {inscripcion.estado === 'egresado' ? 'Egresado' : 'Baja'}
                                                    </span>
                                                    {inscripcion.fecha_baja && (
                                                        <p className="text-muted-foreground mt-1 text-xs">{formatFecha(inscripcion.fecha_baja)}</p>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </CollapsibleContent>
                            </Collapsible>
                        )}
                    </Card>

                    {/* Details and study plan */}
                    <div className="flex flex-col gap-6">
                        <Card className="gap-0 p-0">
                            <div className="border-b px-5 py-4">
                                <h2 className="font-semibold">Detalles</h2>
                            </div>
                            <div className="space-y-4 p-5 text-sm">
                                <Detalle etiqueta="Profesor">
                                    {grupo.profesor ? (
                                        <div className="flex items-center gap-2.5">
                                            <PersonaAvatar nombre={grupo.profesor} fotoUrl={grupo.profesor_foto_url} className="size-8" />
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{grupo.profesor}</p>
                                                {grupo.profesor_especialidad && (
                                                    <p className="text-muted-foreground truncate text-xs">{grupo.profesor_especialidad}</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-destructive flex items-center gap-1.5 font-medium">
                                            <UserRound className="size-4" />
                                            Sin profesor asignado
                                        </p>
                                    )}
                                </Detalle>
                                <Detalle etiqueta="Horario" icono={Clock}>
                                    <p className="font-medium">{describirDiasYHoras(grupo)}</p>
                                    <p className="text-muted-foreground text-xs">Turno {(TURNOS[grupo.turno] ?? grupo.turno).toLowerCase()}</p>
                                </Detalle>
                                <Detalle etiqueta="Periodo" icono={CalendarDays}>
                                    <p className="font-medium">
                                        {formatFecha(grupo.fecha_inicio)}
                                        {fin && ` – ${formatFecha(fin)}`}
                                    </p>
                                    {grupo.semanas_recorridas > 0 ? (
                                        <p className="text-xs text-amber-700 dark:text-amber-400">
                                            +{grupo.semanas_recorridas} {grupo.semanas_recorridas === 1 ? 'semana' : 'semanas'} por clases sin
                                            impartir
                                        </p>
                                    ) : (
                                        !grupo.fecha_fin &&
                                        fin && <p className="text-muted-foreground text-xs">Fin estimado por la duración del curso</p>
                                    )}
                                </Detalle>
                                <Detalle etiqueta="Plantel" icono={Building2}>
                                    <p className="font-medium">{grupo.plantel}</p>
                                </Detalle>
                                <Detalle etiqueta="Cupo" icono={Users}>
                                    <OcupacionBar inscritos={grupo.inscritos} cupo={grupo.cupo} />
                                </Detalle>
                            </div>
                        </Card>

                        <ClasesSinImpartirCard
                            grupoId={grupo.id}
                            clases={clasesSinImpartir}
                            motivos={motivosSuspension}
                            semanasRecorridas={grupo.semanas_recorridas}
                            puedeSuspender={canSuspend}
                            min={grupo.fecha_inicio}
                            finCurso={grupo.fecha_fin_estimada}
                        />

                        <PlanEstudiosGrupo
                            modulos={modulos}
                            cursoId={grupo.curso_id}
                            puedeEditarCurso={canEditCurso}
                            grupoId={grupo.id}
                            puedeVerCalificaciones={canViewGrades}
                        />
                    </div>
                </div>
            </motion.div>
        </AppLayout>
    );
}

function Indicador({ icono: Icono, titulo, alerta = false, children }: { icono: LucideIcon; titulo: string; alerta?: boolean; children: ReactNode }) {
    return (
        <Card className={cn('gap-2 p-4', alerta && 'border-destructive/40')}>
            <div className="text-muted-foreground flex items-center justify-between text-sm">
                <span>{titulo}</span>
                <span
                    className={cn(
                        'flex size-8 items-center justify-center rounded-lg',
                        alerta ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
                    )}
                >
                    <Icono className="size-4" />
                </span>
            </div>
            {children}
        </Card>
    );
}

function BarraSimple({
    porcentaje,
    alerta = false,
    color = 'bg-primary',
    pista = 'bg-primary/15',
}: {
    porcentaje: number;
    alerta?: boolean;
    color?: string;
    pista?: string;
}) {
    return (
        <div className={cn('h-1.5 overflow-hidden rounded-full', pista)} aria-hidden="true">
            <div
                className={cn('h-full rounded-full', alerta ? 'bg-amber-500' : color)}
                style={{ width: `${Math.min(100, Math.round(porcentaje))}%` }}
            />
        </div>
    );
}

/** The alumno's attendance: %, a small bar and the faltas/retardos behind it. */
function AsistenciaAlumno({ asistencia }: { asistencia: InscripcionRow['asistencia'] }) {
    if (asistencia.porcentaje === null) {
        return <span className="text-muted-foreground w-24 text-right text-xs">Sin registros</span>;
    }

    const riesgo = enRiesgo(asistencia);

    return (
        <div className="w-20 shrink-0 space-y-1 text-right sm:w-32">
            <p className={cn('text-sm font-semibold tabular-nums', riesgo && 'text-destructive')}>{asistencia.porcentaje}%</p>
            <div className="bg-muted h-1 overflow-hidden rounded-full" aria-hidden="true">
                <div
                    className={cn('h-full rounded-full', riesgo ? 'bg-destructive' : 'bg-emerald-500')}
                    style={{ width: `${asistencia.porcentaje}%` }}
                />
            </div>
            <p className="text-muted-foreground text-[11px] whitespace-nowrap">
                {asistencia.faltas} {asistencia.faltas === 1 ? 'falta' : 'faltas'}
                <span className="hidden sm:inline">
                    {' '}
                    · {asistencia.retardos} {asistencia.retardos === 1 ? 'retardo' : 'retardos'}
                </span>
            </p>
        </div>
    );
}

function Detalle({ etiqueta, icono: Icono, children }: { etiqueta: string; icono?: LucideIcon; children: ReactNode }) {
    return (
        <div className="space-y-1.5">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                {Icono && <Icono className="size-3.5" />}
                {etiqueta}
            </p>
            {children}
        </div>
    );
}
