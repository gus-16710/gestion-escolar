import { AlumnosEnRiesgoCard, BajasRecientesCard, PendientesCard } from '@/components/dashboard/atencion';
import {
    AlumnosPorCursoCard,
    AsistenciaSemanalCard,
    EncabezadoDashboard,
    KpiGrid,
    MovimientosCard,
    type PlantelFiltro,
    Seccion,
    UMBRAL_RIESGO,
} from '@/components/dashboard/bloques';
import { GruposEnCursoCard } from '@/components/dashboard/grupos-en-curso';
import { PlantelCard } from '@/components/dashboard/plantel-card';
import {
    type AlumnoEnRiesgo,
    type AlumnosPorCurso,
    type AsistenciaSemana,
    type BajaReciente,
    type GrupoEnCurso,
    type Kpis,
    type MovimientoMensual,
    type Pendiente,
    type PlantelResumen,
} from '@/components/dashboard/types';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

interface AdminDashboardProps {
    kpis: Kpis;
    planteles: PlantelResumen[];
    alumnosPorCurso: AlumnosPorCurso[];
    asistenciaSemanal: AsistenciaSemana[];
    movimientosMensuales: MovimientoMensual[];
    gruposEnCurso: GrupoEnCurso[];
    alumnosEnRiesgo: AlumnoEnRiesgo[];
    pendientes: Pendiente[];
    bajasRecientes: BajaReciente[];
    plantelesFiltro: PlantelFiltro[];
    plantelId: number | null;
    hoy: string;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Inicio', href: '/dashboard' }];

export default function AdminDashboard(props: AdminDashboardProps) {
    const { plantelesFiltro, plantelId } = props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inicio" />
            <div className="flex flex-col gap-6 p-4 sm:p-6">
                <Seccion indice={0}>
                    <EncabezadoDashboard hoy={props.hoy} planteles={plantelesFiltro} plantelId={plantelId} etiquetaTodos="Todos los planteles" />
                </Seccion>

                <Seccion indice={1}>
                    <KpiGrid kpis={props.kpis} />
                </Seccion>

                {props.planteles.length > 0 && (
                    <Seccion indice={2}>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {props.planteles.map((plantel) => (
                                <PlantelCard key={plantel.id} plantel={plantel} />
                            ))}
                        </div>
                    </Seccion>
                )}

                <Seccion indice={3}>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <div className="xl:col-span-2">
                            <AsistenciaSemanalCard datos={props.asistenciaSemanal} />
                        </div>
                        <AlumnosPorCursoCard datos={props.alumnosPorCurso} />
                    </div>
                </Seccion>

                <Seccion indice={4}>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <div className="xl:col-span-2">
                            <GruposEnCursoCard grupos={props.gruposEnCurso} mostrarPlantel={plantelId === null && plantelesFiltro.length > 1} />
                        </div>
                        <div className="flex flex-col gap-4">
                            <PendientesCard pendientes={props.pendientes} />
                            <AlumnosEnRiesgoCard alumnos={props.alumnosEnRiesgo} umbral={UMBRAL_RIESGO} />
                        </div>
                    </div>
                </Seccion>

                <Seccion indice={5}>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <div className="xl:col-span-2">
                            <MovimientosCard datos={props.movimientosMensuales} />
                        </div>
                        <BajasRecientesCard bajas={props.bajasRecientes} />
                    </div>
                </Seccion>
            </div>
        </AppLayout>
    );
}
