import {
    CalificacionChip,
    colorCalificacion,
    formatCalificacion,
    PromedioBoleta,
    SituacionBadge,
    type Boleta,
} from '@/components/calificaciones/calificacion';
import { PersonaAvatar } from '@/components/persona-avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { cn, formatFecha } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Check, ClipboardPen, GraduationCap, ListOrdered, PenLine, TrendingUp, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { type ReactNode } from 'react';

interface ModuloSabana {
    id: number;
    orden: number;
    nombre: string;
    semanas: number;
    inicio: string;
    fin: string;
    estado: 'terminado' | 'actual' | 'proximo';
    capturadas: number;
    promedio: number | null;
    reprobados: number;
}

interface AlumnoSabana {
    inscripcion_id: number;
    alumno_id: number;
    matricula: string;
    nombre_completo: string;
    foto_url: string | null;
    activa: boolean;
    boleta: Boleta;
}

interface SabanaProps {
    grupo: { id: number; clave: string; curso: string; curso_clave: string; plantel: string; estado: string; fecha_inicio: string };
    modulos: ModuloSabana[];
    alumnos: AlumnoSabana[];
    resumen: { promedio: number | null; activos: number; bajo_minimo: number };
    aprobatoria: number;
    canGrade: boolean;
}

export default function Sabana({ grupo, modulos, alumnos, resumen, aprobatoria, canGrade }: SabanaProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Grupos', href: '/grupos' },
        { title: grupo.clave, href: `/grupos/${grupo.id}` },
        { title: 'Calificaciones', href: `/grupos/${grupo.id}/calificaciones` },
    ];

    const terminados = modulos.filter((modulo) => modulo.estado === 'terminado');
    const completos = modulos.filter((modulo) => resumen.activos > 0 && modulo.capturadas >= resumen.activos).length;
    const porCalificar = terminados.filter((modulo) => modulo.capturadas < resumen.activos);
    const actual = modulos.find((modulo) => modulo.estado === 'actual');
    const siguienteCaptura = porCalificar[0] ?? actual;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Calificaciones ${grupo.clave}`} />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col gap-6 p-4 sm:p-6"
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
                                <GraduationCap className="size-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight">Calificaciones</h1>
                                <p className="text-muted-foreground text-sm">
                                    {modulos.length} módulos · se aprueba con {aprobatoria} · promedio simple
                                </p>
                            </div>
                        </div>
                    </div>
                    {canGrade && siguienteCaptura && (
                        <Button asChild className="w-full shadow-sm sm:w-auto">
                            <Link href={route('calificaciones.edit', [grupo.id, siguienteCaptura.id])}>
                                <ClipboardPen className="size-4" />
                                Calificar módulo {siguienteCaptura.orden}
                            </Link>
                        </Button>
                    )}
                </div>

                {modulos.length === 0 ? (
                    <Card className="items-center px-6 py-16 text-center">
                        <ListOrdered className="text-muted-foreground size-8" />
                        <p className="font-medium">Este curso aún no tiene plan de estudios</p>
                        <p className="text-muted-foreground max-w-sm text-sm">
                            Las calificaciones se capturan por módulo; primero hay que definir los módulos del curso.
                        </p>
                    </Card>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                            <Indicador icono={TrendingUp} titulo="Promedio del grupo">
                                <p className={cn('text-2xl font-semibold tabular-nums', colorCalificacion(resumen.promedio))}>
                                    {formatCalificacion(resumen.promedio)}
                                </p>
                                <p className="text-muted-foreground text-xs">De los módulos calificados</p>
                            </Indicador>
                            <Indicador icono={AlertTriangle} titulo="Bajo el mínimo" alerta={resumen.bajo_minimo > 0}>
                                <p className={cn('text-2xl font-semibold tabular-nums', resumen.bajo_minimo > 0 && 'text-destructive')}>
                                    {resumen.bajo_minimo}
                                </p>
                                <p className="text-muted-foreground text-xs">Alumnos con promedio menor a {aprobatoria}</p>
                            </Indicador>
                            <Indicador icono={Check} titulo="Módulos calificados">
                                <p className="text-2xl font-semibold tabular-nums">
                                    {completos}
                                    <span className="text-muted-foreground text-base font-normal"> / {modulos.length}</span>
                                </p>
                                <p className="text-muted-foreground truncate text-xs">
                                    {actual ? `En curso: módulo ${actual.orden}` : `${terminados.length} terminados`}
                                </p>
                            </Indicador>
                            <Indicador icono={PenLine} titulo="Por calificar" alerta={porCalificar.length > 0}>
                                <p className={cn('text-2xl font-semibold tabular-nums', porCalificar.length > 0 && 'text-destructive')}>
                                    {porCalificar.length}
                                </p>
                                <p className="text-muted-foreground truncate text-xs">
                                    {porCalificar.length === 0
                                        ? 'Al día'
                                        : `Módulo${porCalificar.length > 1 ? 's' : ''} ${porCalificar.map((modulo) => modulo.orden).join(', ')} ya terminó`}
                                </p>
                            </Indicador>
                        </div>

                        {/* Desktop: the sheet, alumnos × modules. */}
                        <Card className="hidden gap-0 overflow-hidden p-0 md:flex">
                            <div className="w-full overflow-x-auto">
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-muted/40 border-b">
                                            <th className="bg-card sticky left-0 z-10 min-w-56 px-4 py-3 text-left font-medium">Alumno</th>
                                            {modulos.map((modulo) => (
                                                <th key={modulo.id} className="min-w-16 px-1.5 py-2 text-center font-medium">
                                                    <Link
                                                        href={route('calificaciones.edit', [grupo.id, modulo.id])}
                                                        className="hover:bg-muted group inline-flex flex-col items-center gap-1 rounded-md px-1.5 py-1"
                                                        title={`${modulo.orden}. ${modulo.nombre} (${formatFecha(modulo.inicio)} – ${formatFecha(modulo.fin)})`}
                                                    >
                                                        <NumeroModulo modulo={modulo} />
                                                        <span className="text-muted-foreground group-hover:text-foreground text-[10px] font-normal">
                                                            {modulo.estado === 'proximo' ? 'Próximo' : canGrade ? 'Calificar' : 'Ver'}
                                                        </span>
                                                    </Link>
                                                </th>
                                            ))}
                                            <th className="min-w-24 border-l px-3 py-3 text-center font-medium">Promedio</th>
                                            <th className="min-w-28 px-3 py-3 text-center font-medium">Situación</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {alumnos.map((alumno) => {
                                            const promedio = alumno.boleta.promedio_final ?? alumno.boleta.promedio_parcial;

                                            return (
                                                <tr key={alumno.inscripcion_id} className={cn('hover:bg-muted/30', !alumno.activa && 'opacity-60')}>
                                                    <td className="bg-card sticky left-0 z-10 px-4 py-2.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <PersonaAvatar
                                                                nombre={alumno.nombre_completo}
                                                                fotoUrl={alumno.foto_url}
                                                                className="size-8"
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="truncate font-medium">
                                                                    {alumno.nombre_completo}
                                                                    {!alumno.activa && (
                                                                        <span className="bg-muted text-muted-foreground ml-1.5 rounded-full border px-1.5 text-[10px]">
                                                                            Baja
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                <p className="text-muted-foreground font-mono text-xs">{alumno.matricula}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {alumno.boleta.modulos.map((fila) => (
                                                        <td key={fila.modulo_id} className="px-1.5 py-2.5 text-center">
                                                            <CalificacionChip
                                                                final={fila.final}
                                                                calificacion={fila.calificacion}
                                                                recuperacion={fila.recuperacion}
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="border-l px-3 py-2.5 text-center">
                                                        <span className={cn('font-semibold tabular-nums', colorCalificacion(promedio))}>
                                                            {formatCalificacion(promedio)}
                                                        </span>
                                                        {alumno.boleta.promedio_final === null && alumno.boleta.calificados > 0 && (
                                                            <span className="text-muted-foreground block text-[10px]">parcial</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        <SituacionBadge situacion={alumno.boleta.situacion} />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-muted/40 border-t">
                                            <td className="bg-muted sticky left-0 z-10 px-4 py-2.5 text-xs font-medium">Promedio del módulo</td>
                                            {modulos.map((modulo) => (
                                                <td key={modulo.id} className="px-1.5 py-2.5 text-center">
                                                    <span className={cn('text-xs font-semibold tabular-nums', colorCalificacion(modulo.promedio))}>
                                                        {formatCalificacion(modulo.promedio)}
                                                    </span>
                                                </td>
                                            ))}
                                            <td className="border-l px-3 py-2.5 text-center">
                                                <span className={cn('text-xs font-semibold tabular-nums', colorCalificacion(resumen.promedio))}>
                                                    {formatCalificacion(resumen.promedio)}
                                                </span>
                                            </td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            {alumnos.length === 0 && <p className="text-muted-foreground px-5 py-8 text-center text-sm">No hay alumnos inscritos.</p>}
                        </Card>

                        {/* Mobile: modules as a list to open, then a card per alumno. */}
                        <div className="flex flex-col gap-4 md:hidden">
                            <Card className="gap-0 p-0">
                                <p className="border-b px-4 py-3 text-sm font-medium">Módulos</p>
                                <ul className="divide-y">
                                    {modulos.map((modulo) => (
                                        <li key={modulo.id}>
                                            <Link
                                                href={route('calificaciones.edit', [grupo.id, modulo.id])}
                                                className="hover:bg-muted/40 flex items-center gap-3 px-4 py-2.5"
                                            >
                                                <NumeroModulo modulo={modulo} />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium">{modulo.nombre}</span>
                                                    <span className="text-muted-foreground text-xs">
                                                        {modulo.estado === 'proximo'
                                                            ? `Inicia ${formatFecha(modulo.inicio)}`
                                                            : `${modulo.capturadas} de ${resumen.activos} calificados`}
                                                    </span>
                                                </span>
                                                <span className={cn('text-sm font-semibold tabular-nums', colorCalificacion(modulo.promedio))}>
                                                    {formatCalificacion(modulo.promedio)}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </Card>

                            {alumnos.map((alumno) => (
                                <Card key={alumno.inscripcion_id} className={cn('gap-3 p-4', !alumno.activa && 'opacity-60')}>
                                    <div className="flex items-start gap-3">
                                        <PersonaAvatar nombre={alumno.nombre_completo} fotoUrl={alumno.foto_url} className="size-9" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{alumno.nombre_completo}</p>
                                            <p className="text-muted-foreground font-mono text-xs">{alumno.matricula}</p>
                                        </div>
                                        <SituacionBadge situacion={alumno.boleta.situacion} />
                                    </div>
                                    <PromedioBoleta boleta={alumno.boleta} />
                                    <div className="flex flex-wrap gap-x-1.5 gap-y-2.5">
                                        {alumno.boleta.modulos.map((fila, indice) => (
                                            <div key={fila.modulo_id} className="flex flex-col items-center gap-0.5">
                                                <span className="text-muted-foreground text-[10px]">M{modulos[indice]?.orden}</span>
                                                <CalificacionChip
                                                    final={fila.final}
                                                    calificacion={fila.calificacion}
                                                    recuperacion={fila.recuperacion}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                )}
            </motion.div>
        </AppLayout>
    );
}

function NumeroModulo({ modulo }: { modulo: ModuloSabana }) {
    return (
        <span
            className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                modulo.estado === 'terminado' && 'bg-emerald-600 text-white dark:bg-emerald-500',
                modulo.estado === 'actual' && 'bg-primary text-primary-foreground ring-primary/25 ring-2',
                modulo.estado === 'proximo' && 'bg-muted text-muted-foreground border',
            )}
        >
            {modulo.orden}
        </span>
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
