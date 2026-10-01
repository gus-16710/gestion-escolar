import { ESTADOS_ASISTENCIA, ORDEN_ESTADOS, type EstadoAsistencia } from '@/components/asistencias/estados';
import { UMBRAL_RIESGO } from '@/components/dashboard/bloques';
import {
    AvisoSinClase,
    deshacerSuspension,
    SuspenderClaseDialog,
    type MotivosSuspension,
    type SinClase,
} from '@/components/grupos/clases-sin-impartir';
import InputError from '@/components/input-error';
import { PersonaAvatar } from '@/components/persona-avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn, formatFecha } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CalendarDays,
    CalendarOff,
    CalendarX2,
    CheckCheck,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    History,
    LoaderCircle,
    MessageSquareText,
    Pencil,
    Save,
    Undo2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler, useState } from 'react';

interface AlumnoPaseLista {
    inscripcion_id: number;
    matricula: string;
    nombre_completo: string;
    foto_url: string | null;
    inscripcion_activa: boolean;
    estado: EstadoAsistencia | null;
    observaciones: string | null;
    resumen: { total: number; faltas: number; retardos: number; porcentaje: number | null };
}

interface DiaHistorial {
    fecha: string;
    total: number;
    presentes: number;
    faltas: number;
    retardos: number;
}

interface PaseListaProps {
    grupo: {
        id: number;
        clave: string;
        curso: string;
        estado: string;
        dias: string[];
        horario: string | null;
        fecha_inicio: string;
        fecha_fin: string | null;
    };
    fecha: string;
    hoy: string;
    alumnos: AlumnoPaseLista[];
    historial: DiaHistorial[];
    sinClase: SinClase | null;
    reposicionDe: string[];
    clasesSinImpartir: SinClase[];
    motivosSuspension: MotivosSuspension;
    canTake: boolean;
    canSuspend: boolean;
}

// Type aliases (not interfaces) so they satisfy Inertia's FormDataType index signature.
type Registro = {
    inscripcion_id: number;
    estado: EstadoAsistencia | '';
    observaciones: string;
};

type PaseListaForm = {
    fecha: string;
    registros: Registro[];
};

const DIAS_JS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function aFecha(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);

    return new Date(y, m - 1, d);
}

function aIso(fecha: Date): string {
    return [fecha.getFullYear(), String(fecha.getMonth() + 1).padStart(2, '0'), String(fecha.getDate()).padStart(2, '0')].join('-');
}

/** The previous (-1) or next (+1) class day (or make-up date) from `desde`, within [min, max]; null when there is none. */
function claseVecina(desde: string, paso: -1 | 1, dias: string[], extras: string[], min: string, max: string): string | null {
    if (dias.length === 0 && extras.length === 0) return null;
    const fecha = aFecha(desde);

    for (let i = 0; i < 14; i++) {
        fecha.setDate(fecha.getDate() + paso);
        const iso = aIso(fecha);

        if (iso < min || iso > max) return null;
        if (dias.includes(DIAS_JS[fecha.getDay()]) || extras.includes(iso)) return iso;
    }

    return null;
}

const fechaLarga = (iso: string) =>
    new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(aFecha(iso));

export default function PaseLista({
    grupo,
    fecha,
    hoy,
    alumnos,
    historial,
    sinClase,
    reposicionDe,
    clasesSinImpartir,
    motivosSuspension,
    canTake,
    canSuspend,
}: PaseListaProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Grupos', href: '/grupos' },
        { title: grupo.clave, href: `/grupos/${grupo.id}` },
        { title: 'Asistencias', href: `/grupos/${grupo.id}/asistencias` },
    ];

    const { data, setData, put, processing, errors, isDirty } = useForm<PaseListaForm>({
        fecha,
        registros: alumnos.map((alumno) => ({
            inscripcion_id: alumno.inscripcion_id,
            estado: alumno.estado ?? '',
            observaciones: alumno.observaciones ?? '',
        })),
    });

    // Notes are tucked away until needed; the ones that already have text start open.
    const [notasAbiertas, setNotasAbiertas] = useState<Set<number>>(
        () => new Set(alumnos.filter((alumno) => alumno.observaciones).map((alumno) => alumno.inscripcion_id)),
    );

    const max = grupo.fecha_fin && grupo.fecha_fin < hoy ? grupo.fecha_fin : hoy;
    const reposiciones = clasesSinImpartir.flatMap((clase) => (clase.fecha_reposicion ? [clase.fecha_reposicion] : []));
    const anterior = claseVecina(fecha, -1, grupo.dias, reposiciones, grupo.fecha_inicio, max);
    const siguiente = claseVecina(fecha, 1, grupo.dias, reposiciones, grupo.fecha_inicio, max);
    const esDiaDeClase = grupo.dias.length === 0 || grupo.dias.includes(DIAS_JS[aFecha(fecha).getDay()]) || reposicionDe.length > 0;
    const [suspendiendo, setSuspendiendo] = useState(false);

    const grupoNoInicia = grupo.fecha_inicio > hoy;
    const editable = canTake && !grupoNoInicia;
    const yaRegistrada = alumnos.some((alumno) => alumno.estado !== null);
    // A holiday or suspended class needs no roll call (one already taken that day is still shown).
    const diaSinClase = sinClase !== null && !yaRegistrada;
    const marcados = data.registros.filter((registro) => registro.estado !== '').length;
    const sinMarcar = data.registros.length - marcados;
    const conteo = (estado: EstadoAsistencia) => data.registros.filter((registro) => registro.estado === estado).length;

    const actualizar = (index: number, cambios: Partial<Registro>) => {
        setData(
            'registros',
            data.registros.map((registro, i) => (i === index ? { ...registro, ...cambios } : registro)),
        );
    };

    const marcar = (index: number, estado: EstadoAsistencia) => {
        actualizar(index, { estado });

        // A justified absence usually needs its reason.
        if (estado === 'justificada') {
            setNotasAbiertas((abiertas) => new Set(abiertas).add(data.registros[index].inscripcion_id));
        }
    };

    const alternarNota = (inscripcionId: number) => {
        setNotasAbiertas((abiertas) => {
            const nuevas = new Set(abiertas);

            if (nuevas.has(inscripcionId)) {
                nuevas.delete(inscripcionId);
            } else {
                nuevas.add(inscripcionId);
            }

            return nuevas;
        });
    };

    const todosPresentes = () => {
        setData(
            'registros',
            data.registros.map((registro) => (registro.estado === '' ? { ...registro, estado: 'presente' } : registro)),
        );
    };

    const cambiarFecha = (nueva: string | null) => {
        if (!nueva || nueva === fecha) return;
        if (isDirty && !confirm('Tienes cambios sin guardar en esta fecha. ¿Descartarlos?')) return;

        router.get(route('asistencias.edit', grupo.id), { fecha: nueva });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('asistencias.update', grupo.id), { preserveScroll: true });
    };

    const registroError = (index: number) =>
        (errors as Record<string, string | undefined>)[`registros.${index}.estado`] ??
        (errors as Record<string, string | undefined>)[`registros.${index}.observaciones`];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Asistencias ${grupo.clave}`} />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col gap-6 p-4 sm:p-6"
            >
                {/* Header: back to the grupo, title, and the date with prev/next class. */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0">
                        <Link
                            href={route('grupos.show', grupo.id)}
                            className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm transition-colors"
                        >
                            <ArrowLeft className="size-4" />
                            {grupo.curso} · <span className="font-mono">{grupo.clave}</span>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                                <ClipboardCheck className="size-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight">{editable ? 'Pase de lista' : 'Asistencias'}</h1>
                                <p className="text-muted-foreground text-sm">
                                    {grupo.dias.length > 0 ? `Clases: ${grupo.dias.join(', ')}` : 'Sin días de clase definidos'}
                                    {grupo.horario && ` · ${grupo.horario}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => cambiarFecha(anterior)}
                            disabled={!anterior}
                            aria-label="Clase anterior"
                            title={anterior ? `Clase anterior: ${formatFecha(anterior)}` : 'No hay clase anterior'}
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                        <div className="relative flex-1 lg:flex-none">
                            <CalendarDays className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                id="fecha"
                                type="date"
                                value={fecha}
                                min={grupo.fecha_inicio}
                                max={max}
                                onChange={(e) => cambiarFecha(e.target.value)}
                                className="pl-9 lg:w-48"
                                aria-label="Fecha del pase de lista"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => cambiarFecha(siguiente)}
                            disabled={!siguiente}
                            aria-label="Clase siguiente"
                            title={siguiente ? `Clase siguiente: ${formatFecha(siguiente)}` : 'No hay clase siguiente'}
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
                    <form onSubmit={submit} className="min-w-0">
                        <Card className="gap-0 p-0">
                            {/* Day header with live counters. */}
                            <div className="space-y-4 border-b px-5 py-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="text-lg font-semibold first-letter:uppercase">{fechaLarga(fecha)}</h2>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {canSuspend && !yaRegistrada && !sinClase && esDiaDeClase && grupo.dias.length > 0 && !grupoNoInicia && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-muted-foreground h-7"
                                                onClick={() => setSuspendiendo(true)}
                                            >
                                                <CalendarX2 className="size-3.5" />
                                                ¿No hubo clase?
                                            </Button>
                                        )}
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                                                yaRegistrada
                                                    ? 'border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                                                    : 'text-muted-foreground',
                                            )}
                                        >
                                            <span
                                                className={cn('size-1.5 rounded-full', yaRegistrada ? 'bg-emerald-500' : 'bg-muted-foreground/50')}
                                            />
                                            {yaRegistrada ? 'Lista registrada' : diaSinClase ? 'Sin clase' : 'Sin registrar'}
                                        </span>
                                    </div>
                                </div>

                                <AvisoSinClase sinClase={sinClase} reposicionDe={reposicionDe} />

                                {!esDiaDeClase && !sinClase && (
                                    <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
                                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                        <span>
                                            Este día no es de clase para el grupo ({grupo.dias.join(', ')}).
                                            {anterior && (
                                                <>
                                                    {' '}
                                                    <button type="button" onClick={() => cambiarFecha(anterior)} className="font-medium underline">
                                                        Ir a la clase del {formatFecha(anterior)}
                                                    </button>
                                                </>
                                            )}
                                        </span>
                                    </p>
                                )}

                                <div className={cn('flex flex-wrap gap-2', diaSinClase && 'hidden')}>
                                    {ORDEN_ESTADOS.map((estado) => (
                                        <span
                                            key={estado}
                                            className={cn(
                                                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                                                ESTADOS_ASISTENCIA[estado].suave,
                                            )}
                                        >
                                            {(() => {
                                                const Icono = ESTADOS_ASISTENCIA[estado].icono;

                                                return <Icono className="size-3.5" aria-hidden="true" />;
                                            })()}
                                            {ESTADOS_ASISTENCIA[estado].etiqueta}
                                            <span className="tabular-nums">{conteo(estado)}</span>
                                        </span>
                                    ))}
                                    {sinMarcar > 0 && (
                                        <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                                            Sin marcar <span className="tabular-nums">{sinMarcar}</span>
                                        </span>
                                    )}
                                </div>

                                {alumnos.length > 0 && !diaSinClase && (
                                    <div
                                        className="bg-muted flex h-1.5 overflow-hidden rounded-full"
                                        role="meter"
                                        aria-label="Alumnos marcados"
                                        aria-valuemin={0}
                                        aria-valuemax={alumnos.length}
                                        aria-valuenow={marcados}
                                    >
                                        {ORDEN_ESTADOS.map((estado) => (
                                            <div
                                                key={estado}
                                                className={cn('h-full transition-all', ESTADOS_ASISTENCIA[estado].punto)}
                                                style={{ width: `${(100 * conteo(estado)) / alumnos.length}%` }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {grupoNoInicia && (
                                <p className="bg-muted text-muted-foreground mx-5 mt-4 rounded-md px-3 py-2 text-sm">
                                    El grupo inicia el {formatFecha(grupo.fecha_inicio)}; podrás pasar lista a partir de esa fecha.
                                </p>
                            )}
                            {errors.fecha && (
                                <div className="px-5 pt-4">
                                    <InputError message={errors.fecha} />
                                </div>
                            )}

                            {diaSinClase ? (
                                <div className="flex flex-col items-center px-6 py-12 text-center">
                                    <div className="bg-muted text-muted-foreground mb-3 flex size-11 items-center justify-center rounded-full">
                                        <CalendarOff className="size-5" />
                                    </div>
                                    <p className="font-medium">Este día no se pasa lista</p>
                                    <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                                        {sinClase.tipo === 'festivo'
                                            ? 'Es un día sin clase del calendario escolar.'
                                            : 'La clase se registró como no impartida. Si sí se dio, deshaz la suspensión para pasar lista.'}
                                    </p>
                                    {canSuspend && sinClase.tipo === 'suspendida' && (
                                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                                            <Button type="button" variant="outline" size="sm" onClick={() => setSuspendiendo(true)}>
                                                <Pencil className="size-4" />
                                                Editar
                                            </Button>
                                            <Button type="button" variant="outline" size="sm" onClick={() => deshacerSuspension(sinClase.id)}>
                                                <Undo2 className="size-4" />
                                                Deshacer suspensión
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : alumnos.length === 0 ? (
                                <div className="flex flex-col items-center px-6 py-14 text-center">
                                    <div className="bg-muted text-muted-foreground mb-3 flex size-11 items-center justify-center rounded-full">
                                        <ClipboardCheck className="size-5" />
                                    </div>
                                    <p className="font-medium">No hay alumnos inscritos</p>
                                    <p className="text-muted-foreground mt-1 text-sm">
                                        <Link href={route('grupos.show', grupo.id)} className="underline">
                                            Inscribe alumnos
                                        </Link>{' '}
                                        para pasar lista.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {editable && sinMarcar > 0 && (
                                        <div className="bg-muted/30 flex items-center justify-between gap-3 border-b px-5 py-2.5">
                                            <p className="text-muted-foreground text-sm">Marca a cada alumno o empieza con todos presentes.</p>
                                            <Button type="button" variant="outline" size="sm" onClick={todosPresentes} className="shrink-0">
                                                <CheckCheck className="size-4" />
                                                {sinMarcar === alumnos.length ? 'Todos presentes' : 'Resto presentes'}
                                            </Button>
                                        </div>
                                    )}

                                    <ul className="divide-y">
                                        {alumnos.map((alumno, index) => {
                                            const registro = data.registros[index];
                                            const notaAbierta = notasAbiertas.has(alumno.inscripcion_id);
                                            const riesgo =
                                                alumno.resumen.porcentaje !== null &&
                                                alumno.resumen.total >= 3 &&
                                                alumno.resumen.porcentaje < UMBRAL_RIESGO;

                                            return (
                                                <li
                                                    key={alumno.inscripcion_id}
                                                    className={cn('px-5 py-3', registro.estado === '' && editable && 'bg-amber-500/[0.03]')}
                                                >
                                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                                            <PersonaAvatar
                                                                nombre={alumno.nombre_completo}
                                                                fotoUrl={alumno.foto_url}
                                                                className="size-10"
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="text-sm leading-snug font-medium">
                                                                    {alumno.nombre_completo}
                                                                    {!alumno.inscripcion_activa && (
                                                                        <span className="bg-muted text-muted-foreground ml-2 rounded-full border px-1.5 py-0.5 text-[11px]">
                                                                            Baja
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                                                                    <span className="font-mono">{alumno.matricula}</span>
                                                                    {alumno.resumen.porcentaje !== null && (
                                                                        <span
                                                                            className={cn(
                                                                                'font-medium tabular-nums',
                                                                                riesgo ? 'text-destructive' : 'text-foreground/80',
                                                                            )}
                                                                            title={`${alumno.resumen.faltas} faltas en ${alumno.resumen.total} clases`}
                                                                        >
                                                                            {riesgo && (
                                                                                <AlertTriangle className="mr-0.5 inline size-3 align-[-2px]" />
                                                                            )}
                                                                            {alumno.resumen.porcentaje}%
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="grid flex-1 grid-cols-4 gap-1.5 lg:flex-none"
                                                                role="radiogroup"
                                                                aria-label={`Asistencia de ${alumno.nombre_completo}`}
                                                            >
                                                                {ORDEN_ESTADOS.map((estado) => {
                                                                    const estilo = ESTADOS_ASISTENCIA[estado];
                                                                    const activo = registro.estado === estado;

                                                                    return (
                                                                        <button
                                                                            key={estado}
                                                                            type="button"
                                                                            role="radio"
                                                                            aria-checked={activo}
                                                                            disabled={!editable}
                                                                            onClick={() => marcar(index, estado)}
                                                                            title={estilo.etiqueta}
                                                                            className={cn(
                                                                                'flex h-9 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors disabled:cursor-not-allowed lg:w-10 2xl:w-[6.5rem]',
                                                                                activo
                                                                                    ? cn(estilo.solido, 'shadow-sm')
                                                                                    : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60',
                                                                            )}
                                                                        >
                                                                            <estilo.icono className="size-3.5 shrink-0" />
                                                                            <span className="sr-only sm:not-sr-only lg:sr-only 2xl:not-sr-only">
                                                                                {estilo.etiqueta}
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            {(editable || registro.observaciones) && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => alternarNota(alumno.inscripcion_id)}
                                                                    aria-label={notaAbierta ? 'Ocultar observación' : 'Agregar observación'}
                                                                    aria-expanded={notaAbierta}
                                                                    title="Observación"
                                                                    className={cn(
                                                                        'relative size-9 shrink-0',
                                                                        (notaAbierta || registro.observaciones) && 'text-primary',
                                                                    )}
                                                                >
                                                                    <MessageSquareText className="size-4" />
                                                                    {registro.observaciones && !notaAbierta && (
                                                                        <span className="bg-primary absolute top-1.5 right-1.5 size-1.5 rounded-full" />
                                                                    )}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {notaAbierta && (
                                                        <Input
                                                            value={registro.observaciones}
                                                            onChange={(e) => actualizar(index, { observaciones: e.target.value })}
                                                            placeholder={
                                                                registro.estado === 'justificada'
                                                                    ? 'Motivo de la justificación (cita médica, trámite...)'
                                                                    : 'Observación (opcional)'
                                                            }
                                                            disabled={!editable}
                                                            maxLength={255}
                                                            className="mt-2.5 h-9 text-sm lg:ml-[3.25rem] lg:w-[calc(100%-3.25rem)]"
                                                            aria-label={`Observación de ${alumno.nombre_completo}`}
                                                        />
                                                    )}
                                                    {registroError(index) && <InputError message={registroError(index)} className="mt-2" />}
                                                </li>
                                            );
                                        })}
                                    </ul>

                                    {Object.keys(errors).some((key) => key.startsWith('registros')) && (
                                        <div className="border-t px-5 py-3">
                                            <InputError message="Revisa la lista: marca la asistencia de todos los alumnos." />
                                        </div>
                                    )}

                                    {/* Save bar: sticks to the bottom of the screen while the list scrolls. */}
                                    {editable && (
                                        <div className="bg-card/95 supports-[backdrop-filter]:bg-card/80 sticky bottom-0 flex flex-col gap-2 border-t px-5 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                                            <p className="text-muted-foreground text-sm">
                                                <span className="text-foreground font-medium tabular-nums">
                                                    {marcados} de {alumnos.length}
                                                </span>{' '}
                                                marcados
                                                {isDirty && <span className="text-amber-700 dark:text-amber-300"> · cambios sin guardar</span>}
                                            </p>
                                            <Button type="submit" disabled={processing || sinMarcar > 0} className="shadow-sm">
                                                {processing ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                                                {yaRegistrada ? 'Guardar cambios' : 'Guardar asistencia'}
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </Card>
                    </form>

                    {/* History: each recorded day as a compact bar, click to open it. */}
                    <Card className="gap-0 overflow-hidden p-0">
                        <div className="border-b px-5 py-4">
                            <h2 className="flex items-center gap-2 font-semibold">
                                <History className="text-muted-foreground size-4" />
                                Historial
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                {historial.length} {historial.length === 1 ? 'clase registrada' : 'clases registradas'}
                            </p>
                        </div>
                        {historial.length === 0 ? (
                            <p className="text-muted-foreground px-5 py-6 text-sm">Aún no se ha pasado lista.</p>
                        ) : (
                            <div className="max-h-[28rem] overflow-y-auto p-2">
                                {historial.map((dia) => {
                                    const asistieron = dia.total - dia.faltas;
                                    const porcentaje = dia.total ? Math.round((100 * asistieron) / dia.total) : 0;
                                    const actual = dia.fecha === fecha;

                                    return (
                                        <button
                                            key={dia.fecha}
                                            type="button"
                                            onClick={() => cambiarFecha(dia.fecha)}
                                            aria-current={actual ? 'date' : undefined}
                                            className={cn(
                                                'w-full space-y-1.5 rounded-lg px-3 py-2 text-left transition-colors',
                                                actual ? 'bg-primary/10 ring-primary/30 ring-1' : 'hover:bg-muted',
                                            )}
                                        >
                                            <div className="flex items-baseline justify-between gap-2 text-sm">
                                                <span className={cn('font-medium', actual && 'text-primary')}>{formatFecha(dia.fecha)}</span>
                                                <span
                                                    className={cn(
                                                        'text-xs tabular-nums',
                                                        porcentaje < UMBRAL_RIESGO ? 'text-destructive font-medium' : 'text-muted-foreground',
                                                    )}
                                                >
                                                    {porcentaje}%
                                                </span>
                                            </div>
                                            <div className="bg-muted flex h-1 overflow-hidden rounded-full" aria-hidden="true">
                                                <div className="bg-emerald-500" style={{ width: `${(100 * dia.presentes) / dia.total}%` }} />
                                                <div className="bg-amber-500" style={{ width: `${(100 * dia.retardos) / dia.total}%` }} />
                                                <div className="bg-red-500" style={{ width: `${(100 * dia.faltas) / dia.total}%` }} />
                                            </div>
                                            <p className="text-muted-foreground text-[11px]">
                                                {dia.presentes} presentes
                                                {dia.retardos > 0 && ` · ${dia.retardos} ${dia.retardos === 1 ? 'retardo' : 'retardos'}`}
                                                {dia.faltas > 0 && ` · ${dia.faltas} ${dia.faltas === 1 ? 'falta' : 'faltas'}`}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>

                {suspendiendo && (
                    <SuspenderClaseDialog
                        grupoId={grupo.id}
                        motivos={motivosSuspension}
                        open
                        onOpenChange={setSuspendiendo}
                        fecha={fecha}
                        actual={sinClase?.tipo === 'suspendida' ? { ...sinClase, fecha } : null}
                        min={grupo.fecha_inicio}
                        finCurso={grupo.fecha_fin}
                    />
                )}
            </motion.div>
        </AppLayout>
    );
}
