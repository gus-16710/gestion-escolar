import { colorCalificacion, formatCalificacion } from '@/components/calificaciones/calificacion';
import InputError from '@/components/input-error';
import { PersonaAvatar } from '@/components/persona-avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn, formatFecha } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ClipboardPen,
    Info,
    LoaderCircle,
    MessageSquareText,
    RotateCcw,
    Save,
} from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler, useState } from 'react';

type EstadoModulo = 'terminado' | 'actual' | 'proximo';

interface AlumnoCaptura {
    inscripcion_id: number;
    matricula: string;
    nombre_completo: string;
    foto_url: string | null;
    activa: boolean;
    calificacion: number | null;
    recuperacion: number | null;
    fecha_recuperacion: string | null;
    observaciones: string | null;
    promedio_parcial: number | null;
}

interface CapturarProps {
    grupo: { id: number; clave: string; curso: string; fecha_inicio: string };
    modulo: {
        id: number;
        orden: number;
        nombre: string;
        descripcion: string | null;
        semanas: number;
        inicio: string;
        fin: string;
        estado: EstadoModulo;
    };
    modulos: { id: number; orden: number; nombre: string; estado: EstadoModulo }[];
    alumnos: AlumnoCaptura[];
    fecha: string;
    hoy: string;
    aprobatoria: number;
    canGrade: boolean;
    puedeCalificarGrupo: boolean;
}

// Type aliases (not interfaces) so they satisfy Inertia's FormDataType index signature.
type Registro = {
    inscripcion_id: number;
    calificacion: string;
    recuperacion: string;
    fecha_recuperacion: string;
    observaciones: string;
};

type CapturaForm = {
    fecha_evaluacion: string;
    registros: Registro[];
};

const ESTADOS: Record<EstadoModulo, { etiqueta: string; clase: string }> = {
    terminado: { etiqueta: 'Terminado', clase: 'border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' },
    actual: { etiqueta: 'En curso', clase: 'border-primary/25 bg-primary/10 text-primary' },
    proximo: { etiqueta: 'Próximo', clase: 'text-muted-foreground' },
};

/** A typed grade as a number, or null while empty or not a valid 0–10 value. */
function valor(texto: string): number | null {
    if (texto.trim() === '') return null;
    const numero = Number(texto.replace(',', '.'));

    return Number.isFinite(numero) && numero >= 0 && numero <= 10 ? numero : null;
}

const texto = (numero: number | null) => (numero === null ? '' : String(numero));

export default function Capturar({ grupo, modulo, modulos, alumnos, fecha, hoy, aprobatoria, canGrade, puedeCalificarGrupo }: CapturarProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Grupos', href: '/grupos' },
        { title: grupo.clave, href: `/grupos/${grupo.id}` },
        { title: 'Calificaciones', href: `/grupos/${grupo.id}/calificaciones` },
        { title: `Módulo ${modulo.orden}`, href: `/grupos/${grupo.id}/calificaciones/${modulo.id}` },
    ];

    const { data, setData, setDefaults, put, transform, processing, errors, isDirty } = useForm<CapturaForm>({
        fecha_evaluacion: fecha,
        registros: alumnos.map((alumno) => ({
            inscripcion_id: alumno.inscripcion_id,
            calificacion: texto(alumno.calificacion),
            recuperacion: texto(alumno.recuperacion),
            fecha_recuperacion: alumno.fecha_recuperacion ?? '',
            observaciones: alumno.observaciones ?? '',
        })),
    });

    const [notasAbiertas, setNotasAbiertas] = useState<Set<number>>(
        () => new Set(alumnos.filter((alumno) => alumno.observaciones).map((alumno) => alumno.inscripcion_id)),
    );

    // A retake only counts for a failed module; empty strings go as null.
    transform((datos) => ({
        ...datos,
        registros: datos.registros.map((registro) => {
            const original = valor(registro.calificacion);
            const conRecuperacion = original !== null && original < aprobatoria && registro.recuperacion.trim() !== '';

            return {
                inscripcion_id: registro.inscripcion_id,
                calificacion: registro.calificacion.trim() === '' ? null : registro.calificacion.replace(',', '.'),
                recuperacion: conRecuperacion ? registro.recuperacion.replace(',', '.') : null,
                fecha_recuperacion: conRecuperacion ? registro.fecha_recuperacion || null : null,
                observaciones: registro.observaciones.trim() || null,
            };
        }),
    }));

    const finales = data.registros.map((registro) => {
        const original = valor(registro.calificacion);
        const recuperacion = original !== null && original < aprobatoria ? valor(registro.recuperacion) : null;

        return recuperacion ?? original;
    });
    const capturadas = finales.filter((final) => final !== null);
    const promedio = capturadas.length ? Math.round((10 * capturadas.reduce((suma, final) => suma + final!, 0)) / capturadas.length) / 10 : null;
    const reprobados = capturadas.filter((final) => final! < aprobatoria).length;
    const activos = alumnos.filter((alumno) => alumno.activa).length;

    const indice = modulos.findIndex((otro) => otro.id === modulo.id);
    const anterior = modulos[indice - 1];
    const siguiente = modulos[indice + 1];

    const actualizar = (posicion: number, cambios: Partial<Registro>) =>
        setData(
            'registros',
            data.registros.map((registro, i) => (i === posicion ? { ...registro, ...cambios } : registro)),
        );

    const alternarNota = (inscripcionId: number) =>
        setNotasAbiertas((abiertas) => {
            const nuevas = new Set(abiertas);

            if (nuevas.has(inscripcionId)) {
                nuevas.delete(inscripcionId);
            } else {
                nuevas.add(inscripcionId);
            }

            return nuevas;
        });

    const irA = (destino: { id: number } | undefined) => {
        if (!destino) return;
        if (isDirty && !confirm('Tienes calificaciones sin guardar en este módulo. ¿Descartarlas?')) return;

        router.get(route('calificaciones.edit', [grupo.id, destino.id]));
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // What was saved becomes the new baseline, so "cambios sin guardar" clears.
        put(route('calificaciones.update', [grupo.id, modulo.id]), { preserveScroll: true, onSuccess: () => setDefaults() });
    };

    const error = (posicion: number, campo: keyof Registro) => (errors as Record<string, string | undefined>)[`registros.${posicion}.${campo}`];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Calificaciones ${grupo.clave} · Módulo ${modulo.orden}`} />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex max-w-5xl flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0">
                        <Link
                            href={route('calificaciones.index', grupo.id)}
                            className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm transition-colors"
                        >
                            <ArrowLeft className="size-4" />
                            Calificaciones · <span className="font-mono">{grupo.clave}</span>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl text-lg font-semibold">
                                {modulo.orden}
                            </div>
                            <div className="min-w-0">
                                <p className="text-muted-foreground text-sm">
                                    Módulo {modulo.orden} de {modulos.length} · {grupo.curso}
                                </p>
                                <h1 className="text-2xl leading-tight font-semibold tracking-tight">{modulo.nombre}</h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => irA(anterior)}
                            disabled={!anterior}
                            aria-label="Módulo anterior"
                            title={anterior?.nombre}
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                        <span
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                                ESTADOS[modulo.estado].clase,
                            )}
                        >
                            {ESTADOS[modulo.estado].etiqueta} · {formatFecha(modulo.inicio)} – {formatFecha(modulo.fin)}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => irA(siguiente)}
                            disabled={!siguiente}
                            aria-label="Módulo siguiente"
                            title={siguiente?.nombre}
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>
                </div>

                {modulo.descripcion && <p className="text-muted-foreground -mt-2 max-w-3xl text-sm">{modulo.descripcion}</p>}

                {modulo.estado === 'proximo' && (
                    <p className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg px-4 py-3 text-sm">
                        <Info className="mt-0.5 size-4 shrink-0" />
                        Este módulo inicia el {formatFecha(modulo.inicio)}; podrás calificarlo cuando empiece.
                    </p>
                )}
                {modulo.estado !== 'proximo' && !puedeCalificarGrupo && (
                    <p className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg px-4 py-3 text-sm">
                        <Info className="mt-0.5 size-4 shrink-0" />
                        Solo consulta: las calificaciones las registra el profesor del grupo.
                    </p>
                )}

                <form onSubmit={submit}>
                    <Card className="gap-0 p-0">
                        <div className="flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
                            <div className="grid gap-1.5">
                                <Label htmlFor="fecha_evaluacion">Fecha del examen</Label>
                                <div className="relative">
                                    <CalendarDays className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                    <Input
                                        id="fecha_evaluacion"
                                        type="date"
                                        value={data.fecha_evaluacion}
                                        min={grupo.fecha_inicio}
                                        max={hoy}
                                        disabled={!canGrade}
                                        onChange={(e) => setData('fecha_evaluacion', e.target.value)}
                                        className="pl-9 sm:w-48"
                                    />
                                </div>
                                <InputError message={errors.fecha_evaluacion} />
                            </div>
                            <dl className="grid grid-cols-3 gap-4 text-center sm:text-right">
                                <div>
                                    <dt className="text-muted-foreground text-xs">Calificados</dt>
                                    <dd className="font-semibold tabular-nums">
                                        {capturadas.length} / {alumnos.length}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground text-xs">Promedio</dt>
                                    <dd className={cn('font-semibold tabular-nums', colorCalificacion(promedio))}>{formatCalificacion(promedio)}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground text-xs">Reprobados</dt>
                                    <dd className={cn('font-semibold tabular-nums', reprobados > 0 && 'text-destructive')}>{reprobados}</dd>
                                </div>
                            </dl>
                        </div>

                        {alumnos.length === 0 ? (
                            <p className="text-muted-foreground px-5 py-12 text-center text-sm">No hay alumnos inscritos en el grupo.</p>
                        ) : (
                            <ul className="divide-y">
                                {alumnos.map((alumno, posicion) => {
                                    const registro = data.registros[posicion];
                                    const original = valor(registro.calificacion);
                                    const invalida = registro.calificacion.trim() !== '' && original === null;
                                    const reprobada = original !== null && original < aprobatoria;
                                    const recuperacion = reprobada ? valor(registro.recuperacion) : null;
                                    const notaAbierta = notasAbiertas.has(alumno.inscripcion_id);

                                    return (
                                        <li key={alumno.inscripcion_id} className={cn('px-5 py-3', !alumno.activa && 'bg-muted/30')}>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                                                    <PersonaAvatar nombre={alumno.nombre_completo} fotoUrl={alumno.foto_url} className="size-10" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm leading-snug font-medium">
                                                            {alumno.nombre_completo}
                                                            {!alumno.activa && (
                                                                <span className="bg-muted text-muted-foreground ml-2 rounded-full border px-1.5 py-0.5 text-[11px]">
                                                                    Baja
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-muted-foreground text-xs">
                                                            <span className="font-mono">{alumno.matricula}</span>
                                                            {alumno.promedio_parcial !== null && (
                                                                <span title="Promedio de sus módulos calificados">
                                                                    {' '}
                                                                    · promedio{' '}
                                                                    <span className={cn('font-medium', colorCalificacion(alumno.promedio_parcial))}>
                                                                        {formatCalificacion(alumno.promedio_parcial)}
                                                                    </span>
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        value={registro.calificacion}
                                                        onChange={(e) => actualizar(posicion, { calificacion: e.target.value })}
                                                        inputMode="decimal"
                                                        placeholder="—"
                                                        disabled={!canGrade}
                                                        aria-label={`Calificación de ${alumno.nombre_completo}`}
                                                        aria-invalid={invalida || Boolean(error(posicion, 'calificacion'))}
                                                        className={cn(
                                                            'h-10 w-20 text-center text-base font-semibold tabular-nums',
                                                            original !== null && colorCalificacion(original),
                                                            reprobada && 'border-red-500/50',
                                                        )}
                                                    />
                                                    <span
                                                        className={cn(
                                                            'w-24 text-xs font-medium whitespace-nowrap',
                                                            original === null ? 'text-muted-foreground' : colorCalificacion(recuperacion ?? original),
                                                        )}
                                                    >
                                                        {invalida
                                                            ? 'De 0 a 10'
                                                            : original === null
                                                              ? 'Sin calificar'
                                                              : (recuperacion ?? original) >= aprobatoria
                                                                ? recuperacion !== null
                                                                    ? 'Aprobó en rec.'
                                                                    : 'Aprobado'
                                                                : 'Reprobado'}
                                                    </span>
                                                    {(canGrade || registro.observaciones) && (
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

                                            {reprobada && (canGrade || registro.recuperacion !== '') && (
                                                <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 sm:ml-[3.25rem]">
                                                    <p className="flex basis-full items-center gap-1.5 text-xs font-medium text-amber-900 dark:text-amber-200">
                                                        <RotateCcw className="size-3.5" />
                                                        Recuperación: si la presenta, cuenta esta calificación y la original queda en su historial.
                                                    </p>
                                                    <div className="grid gap-1">
                                                        <Label htmlFor={`recuperacion_${alumno.inscripcion_id}`} className="text-xs">
                                                            Calificación
                                                        </Label>
                                                        <Input
                                                            id={`recuperacion_${alumno.inscripcion_id}`}
                                                            value={registro.recuperacion}
                                                            onChange={(e) => actualizar(posicion, { recuperacion: e.target.value })}
                                                            inputMode="decimal"
                                                            placeholder="—"
                                                            disabled={!canGrade}
                                                            className={cn(
                                                                'h-9 w-20 text-center font-semibold tabular-nums',
                                                                colorCalificacion(recuperacion),
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="grid gap-1">
                                                        <Label htmlFor={`fecha_recuperacion_${alumno.inscripcion_id}`} className="text-xs">
                                                            Fecha
                                                        </Label>
                                                        <Input
                                                            id={`fecha_recuperacion_${alumno.inscripcion_id}`}
                                                            type="date"
                                                            value={registro.fecha_recuperacion}
                                                            min={data.fecha_evaluacion}
                                                            max={hoy}
                                                            disabled={!canGrade}
                                                            onChange={(e) => actualizar(posicion, { fecha_recuperacion: e.target.value })}
                                                            className="h-9 w-44"
                                                        />
                                                    </div>
                                                    {(error(posicion, 'recuperacion') || error(posicion, 'fecha_recuperacion')) && (
                                                        <InputError
                                                            message={error(posicion, 'recuperacion') ?? error(posicion, 'fecha_recuperacion')}
                                                            className="basis-full"
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {notaAbierta && (
                                                <Input
                                                    value={registro.observaciones}
                                                    onChange={(e) => actualizar(posicion, { observaciones: e.target.value })}
                                                    placeholder="Observación (opcional)"
                                                    disabled={!canGrade}
                                                    maxLength={255}
                                                    className="mt-2.5 h-9 text-sm sm:ml-[3.25rem] sm:w-[calc(100%-3.25rem)]"
                                                    aria-label={`Observación de ${alumno.nombre_completo}`}
                                                />
                                            )}
                                            {error(posicion, 'calificacion') && (
                                                <InputError message={error(posicion, 'calificacion')} className="mt-2 sm:ml-[3.25rem]" />
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        {canGrade && alumnos.length > 0 && (
                            <div className="bg-card/95 supports-[backdrop-filter]:bg-card/80 sticky bottom-0 flex flex-col gap-2 rounded-b-xl border-t px-5 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-muted-foreground text-sm">
                                    <span className="text-foreground font-medium tabular-nums">
                                        {capturadas.length} de {alumnos.length}
                                    </span>{' '}
                                    calificados
                                    {capturadas.length < activos && ' · puedes guardar y completar después'}
                                    {isDirty && <span className="text-amber-700 dark:text-amber-300"> · cambios sin guardar</span>}
                                </p>
                                <Button type="submit" disabled={processing || !isDirty} className="shadow-sm">
                                    {processing ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                                    Guardar calificaciones
                                </Button>
                            </div>
                        )}
                    </Card>
                </form>

                {!canGrade && modulo.estado !== 'proximo' && alumnos.every((alumno) => alumno.calificacion === null) && (
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                        <ClipboardPen className="size-4" />
                        Este módulo aún no tiene calificaciones.
                    </p>
                )}
            </motion.div>
        </AppLayout>
    );
}
