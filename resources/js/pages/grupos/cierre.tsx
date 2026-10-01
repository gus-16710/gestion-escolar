import { type Boleta, CalificacionChip, colorCalificacion, formatCalificacion } from '@/components/calificaciones/calificacion';
import InputError from '@/components/input-error';
import { PersonaAvatar } from '@/components/persona-avatar';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { cn, formatFecha } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Award, CircleSlash, Flag, LoaderCircle, type LucideIcon, PenLine, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { type ReactNode, useState } from 'react';

type Resultado = 'egresado' | 'no_acreditado' | 'incompleto';

interface AlumnoCierre {
    inscripcion_id: number;
    matricula: string;
    nombre_completo: string;
    foto_url: string | null;
    boleta: Boleta;
    faltantes: { id: number; orden: number; nombre: string }[];
    resultado: Resultado;
}

interface CierreProps {
    grupo: { id: number; clave: string; curso: string; curso_clave: string; plantel: string; fin: string | null };
    alumnos: AlumnoCierre[];
    totales: { egresados: number; no_acreditados: number; incompletos: number; promedio: number | null };
    hoy: string;
    tienePlan: boolean;
}

const RESULTADOS: Record<Resultado, { etiqueta: string; clase: string }> = {
    egresado: { etiqueta: 'Egresará', clase: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' },
    no_acreditado: { etiqueta: 'No acreditado', clase: 'bg-red-500/10 text-red-800 dark:text-red-300' },
    incompleto: { etiqueta: 'Pendiente', clase: 'bg-amber-500/15 text-amber-900 dark:text-amber-300' },
};

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export default function Cierre({ grupo, alumnos, totales, hoy, tienePlan }: CierreProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Grupos', href: '/grupos' },
        { title: grupo.clave, href: `/grupos/${grupo.id}` },
        { title: 'Concluir grupo', href: `/grupos/${grupo.id}/cierre` },
    ];

    const { post, processing } = useForm({});
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const [confirmando, setConfirmando] = useState(false);

    const puedeConcluir = tienePlan && totales.incompletos === 0 && alumnos.length > 0;
    const antesDeTiempo = grupo.fin !== null && hoy < grupo.fin;

    const concluir = () =>
        post(route('cierre.store', grupo.id), {
            onFinish: () => setConfirmando(false),
        });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Concluir ${grupo.clave}`} />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex max-w-5xl flex-col gap-6 p-4 sm:p-6"
            >
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
                                <Flag className="size-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight">Concluir grupo</h1>
                                <p className="text-muted-foreground text-sm">Revisa el resultado de cada alumno antes de cerrar el grupo</p>
                            </div>
                        </div>
                    </div>
                    <Button className="w-full shadow-sm sm:w-auto" disabled={!puedeConcluir || processing} onClick={() => setConfirmando(true)}>
                        <Flag className="size-4" />
                        Concluir grupo
                    </Button>
                </div>

                {antesDeTiempo && (
                    <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        Según su calendario el grupo termina el {formatFecha(grupo.fin!)}. Puedes concluirlo antes si ya se impartieron todos los
                        módulos.
                    </p>
                )}
                {!tienePlan && (
                    <p className="bg-muted text-muted-foreground rounded-lg px-4 py-3 text-sm">
                        El curso no tiene plan de estudios, así que no hay calificaciones con las cuales concluir.
                    </p>
                )}
                {errors.cierre && <InputError message={errors.cierre} />}

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <Indicador icono={Award} titulo="Egresarán" tono="exito">
                        {totales.egresados}
                    </Indicador>
                    <Indicador icono={CircleSlash} titulo="No acreditados" tono={totales.no_acreditados > 0 ? 'error' : undefined}>
                        {totales.no_acreditados}
                    </Indicador>
                    <Indicador icono={PenLine} titulo="Con calificaciones pendientes" tono={totales.incompletos > 0 ? 'aviso' : undefined}>
                        {totales.incompletos}
                    </Indicador>
                    <Indicador icono={TrendingUp} titulo="Promedio del grupo">
                        <span className={colorCalificacion(totales.promedio)}>{formatCalificacion(totales.promedio)}</span>
                    </Indicador>
                </div>

                <Card className="gap-0 p-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
                        <h2 className="font-semibold">Alumnos inscritos</h2>
                        <p className="text-muted-foreground text-sm">
                            {puedeConcluir
                                ? 'Todo listo para concluir'
                                : totales.incompletos > 0
                                  ? 'Completa las calificaciones para concluir'
                                  : 'No hay alumnos inscritos'}
                        </p>
                    </div>
                    <ul className="divide-y">
                        {alumnos.map((alumno) => (
                            <li key={alumno.inscripcion_id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                                <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                                    <PersonaAvatar nombre={alumno.nombre_completo} fotoUrl={alumno.foto_url} className="size-10" />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{alumno.nombre_completo}</p>
                                        <p className="text-muted-foreground font-mono text-xs">{alumno.matricula}</p>
                                    </div>
                                </div>
                                <div className="flex w-full items-center justify-between gap-3 pl-13 sm:w-auto sm:pl-0">
                                    {alumno.resultado === 'incompleto' ? (
                                        <div className="flex flex-wrap gap-1 sm:justify-end" aria-label="Módulos sin calificar">
                                            {alumno.faltantes.map((modulo) => (
                                                <Link
                                                    key={modulo.id}
                                                    href={route('calificaciones.edit', [grupo.id, modulo.id])}
                                                    title={modulo.nombre}
                                                    className="rounded-md border border-amber-500/40 px-1.5 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-500/10 dark:text-amber-300"
                                                >
                                                    <span className="sm:hidden">M{modulo.orden}</span>
                                                    <span className="hidden sm:inline">Módulo {modulo.orden}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <CalificacionChip final={alumno.boleta.promedio_final} />
                                    )}
                                    <span
                                        className={cn(
                                            'shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium whitespace-nowrap sm:w-36',
                                            RESULTADOS[alumno.resultado].clase,
                                        )}
                                    >
                                        {RESULTADOS[alumno.resultado].etiqueta}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            </motion.div>

            <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Concluir el grupo {grupo.clave}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {plural(totales.egresados, 'alumno egresará', 'alumnos egresarán')}
                            {totales.no_acreditados > 0 && ` y ${plural(totales.no_acreditados, 'quedará no acreditado', 'quedarán no acreditados')}`}
                            . El grupo quedará cerrado y sus calificaciones ya no se podrán modificar; solo la administración puede reabrirlo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                concluir();
                            }}
                            disabled={processing}
                        >
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            Concluir grupo
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}

function Indicador({
    icono: Icono,
    titulo,
    tono,
    children,
}: {
    icono: LucideIcon;
    titulo: string;
    tono?: 'exito' | 'error' | 'aviso';
    children: ReactNode;
}) {
    return (
        <Card className={cn('gap-2 p-4', tono === 'error' && 'border-destructive/40', tono === 'aviso' && 'border-amber-500/40')}>
            <div className="text-muted-foreground flex items-center justify-between gap-2 text-sm">
                <span>{titulo}</span>
                <span
                    className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-lg',
                        tono === 'exito' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                        tono === 'error' && 'bg-destructive/10 text-destructive',
                        tono === 'aviso' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                        !tono && 'bg-primary/10 text-primary',
                    )}
                >
                    <Icono className="size-4" />
                </span>
            </div>
            <p className="text-2xl font-semibold tabular-nums">{children}</p>
        </Card>
    );
}
