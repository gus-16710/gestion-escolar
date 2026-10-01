import { ChartCard, TablaDatos } from '@/components/dashboard/chart-card';
import { AlumnosPorCursoChart, AsistenciaSemanalChart, MovimientosChart } from '@/components/dashboard/charts';
import { StatCard } from '@/components/dashboard/stat-card';
import { type AlumnosPorCurso, type AsistenciaSemana, type Kpis, type MovimientoMensual } from '@/components/dashboard/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Backpack, ClipboardCheck, Gauge, UserMinus, UserRound, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { type ReactNode } from 'react';

/** Must match ResumenEscolar::UMBRAL_RIESGO. */
export const UMBRAL_RIESGO = 80;

const TODOS = 'all';

export interface PlantelFiltro {
    id: number;
    nombre: string;
    activo: boolean;
}

export function porcentaje(valor: number | null): string {
    return valor === null ? '—' : `${valor}%`;
}

export function plural(n: number, singular: string, pluralTexto: string): string {
    return `${n} ${n === 1 ? singular : pluralTexto}`;
}

/** Fades each dashboard block in, slightly staggered. */
export function Seccion({ children, indice }: { children: ReactNode; indice: number }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: indice * 0.05 }}
        >
            {children}
        </motion.section>
    );
}

interface EncabezadoProps {
    hoy: string;
    planteles: PlantelFiltro[];
    plantelId: number | null;
    /** Label for "no filter": every plantel for the admin, "all my planteles" for a director. */
    etiquetaTodos: string;
    /** Extra controls next to the filter (e.g. quick actions). */
    acciones?: ReactNode;
}

/** Greeting, today's date, the plantel in view and (with more than one plantel) a filter that reloads the dashboard. */
export function EncabezadoDashboard({ hoy, planteles, plantelId, etiquetaTodos, acciones }: EncabezadoProps) {
    const { auth } = usePage<SharedData>().props;

    const nombre = auth.user.name.split(' ')[0];
    const fecha = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(`${hoy}T12:00:00`),
    );
    const plantelActual = planteles.find((plantel) => plantel.id === plantelId) ?? (planteles.length === 1 ? planteles[0] : undefined);

    const cambiarPlantel = (valor: string) => {
        router.get(route('dashboard'), valor === TODOS ? {} : { plantel_id: valor }, { preserveScroll: true, preserveState: true });
    };

    return (
        // Side by side only from lg: next to the sidebar, the greeting plus the actions don't fit on a tablet.
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight">Hola, {nombre}</h1>
                <p className="text-muted-foreground text-sm first-letter:uppercase">
                    {fecha} · {plantelActual ? plantelActual.nombre : etiquetaTodos}
                </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                {acciones}
                {planteles.length > 1 && (
                    <Select value={plantelId ? String(plantelId) : TODOS} onValueChange={cambiarPlantel}>
                        <SelectTrigger className="sm:w-60" aria-label="Filtrar por plantel">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={TODOS}>{etiquetaTodos}</SelectItem>
                            {planteles.map((plantel) => (
                                <SelectItem key={plantel.id} value={String(plantel.id)}>
                                    {plantel.nombre}
                                    {!plantel.activo && ' (próximamente)'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
        </div>
    );
}

/** The six headline figures shared by the admin and director dashboards. */
export function KpiGrid({ kpis }: { kpis: Kpis }) {
    const deltaAsistencia = kpis.asistencia !== null && kpis.asistencia_anterior !== null ? kpis.asistencia - kpis.asistencia_anterior : null;
    const deltaBajas = kpis.bajas_mes - kpis.bajas_mes_anterior;

    return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard
                titulo="Alumnos activos"
                valor={String(kpis.alumnos_activos)}
                icon={Backpack}
                contexto={`+${plural(kpis.inscritos_mes, 'inscripción', 'inscripciones')} este mes`}
            />
            <StatCard
                titulo="Grupos en curso"
                valor={String(kpis.grupos_en_curso)}
                icon={Users}
                contexto={plural(kpis.grupos_planeados, 'planeado', 'planeados')}
            />
            <StatCard
                titulo="Profesores activos"
                valor={String(kpis.profesores_activos)}
                icon={UserRound}
                contexto={kpis.profesores_sin_grupo !== null ? `${kpis.profesores_sin_grupo} sin grupo asignado` : 'con grupo activo'}
            />
            <StatCard
                titulo="Asistencia 30 días"
                valor={porcentaje(kpis.asistencia)}
                icon={ClipboardCheck}
                delta={deltaAsistencia !== null ? { valor: deltaAsistencia, texto: `${deltaAsistencia > 0 ? '+' : ''}${deltaAsistencia} pts` } : null}
                contexto={kpis.asistencia_anterior !== null ? 'vs. 30 días previos' : 'sin periodo previo'}
            />
            <StatCard
                titulo="Ocupación"
                valor={porcentaje(kpis.ocupacion)}
                icon={Gauge}
                contexto={kpis.ocupacion !== null ? plural(kpis.lugares_libres, 'lugar libre', 'lugares libres') : 'sin cupos definidos'}
            />
            <StatCard
                titulo="Bajas este mes"
                valor={String(kpis.bajas_mes)}
                icon={UserMinus}
                delta={{ valor: deltaBajas, texto: `${deltaBajas > 0 ? '+' : ''}${deltaBajas}`, mejorSiSube: false }}
                contexto={`${kpis.bajas_mes_anterior} el mes pasado`}
            />
        </div>
    );
}

export function AsistenciaSemanalCard({ datos }: { datos: AsistenciaSemana[] }) {
    return (
        <ChartCard
            titulo="Asistencia semanal"
            descripcion="Porcentaje de asistencia de las últimas 12 semanas"
            vacio={datos.every((semana) => semana.porcentaje === null)}
            mensajeVacio="Aún no se ha pasado lista en las últimas 12 semanas."
            tabla={
                <TablaDatos
                    columnas={['Semana del', 'Asistencia', 'Faltas', 'Registros']}
                    filas={datos.map((s) => [s.etiqueta, porcentaje(s.porcentaje), s.faltas, s.total])}
                />
            }
        >
            <AsistenciaSemanalChart datos={datos} umbral={UMBRAL_RIESGO} />
        </ChartCard>
    );
}

export function AlumnosPorCursoCard({ datos }: { datos: AlumnosPorCurso[] }) {
    return (
        <ChartCard
            titulo="Alumnos por curso"
            descripcion="Alumnos con inscripción activa"
            vacio={datos.length === 0}
            mensajeVacio="Aún no hay alumnos inscritos."
            tabla={<TablaDatos columnas={['Curso', 'Alumnos']} filas={datos.map((c) => [c.curso, c.alumnos])} />}
        >
            <AlumnosPorCursoChart datos={datos} />
        </ChartCard>
    );
}

export function MovimientosCard({ datos }: { datos: MovimientoMensual[] }) {
    return (
        <ChartCard
            titulo="Inscripciones y bajas"
            descripcion="Movimientos de los últimos 6 meses"
            vacio={!datos.some((mes) => mes.inscripciones > 0 || mes.bajas > 0)}
            mensajeVacio="No hay inscripciones ni bajas en los últimos 6 meses."
            tabla={<TablaDatos columnas={['Mes', 'Inscripciones', 'Bajas']} filas={datos.map((m) => [m.etiqueta, m.inscripciones, m.bajas])} />}
        >
            <MovimientosChart datos={datos} />
        </ChartCard>
    );
}
