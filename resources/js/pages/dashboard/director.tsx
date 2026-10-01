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
import { AccionesRapidas, ProfesoresCard, ProximosGruposCard, SinPlantelCard } from '@/components/dashboard/director';
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
    type ProfesorResumen,
    type ProximoGrupo,
} from '@/components/dashboard/types';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

interface ResumenDirector {
    kpis: Kpis;
    planteles: PlantelResumen[];
    alumnosPorCurso: AlumnosPorCurso[];
    asistenciaSemanal: AsistenciaSemana[];
    movimientosMensuales: MovimientoMensual[];
    gruposEnCurso: GrupoEnCurso[];
    alumnosEnRiesgo: AlumnoEnRiesgo[];
    pendientes: Pendiente[];
    bajasRecientes: BajaReciente[];
    proximosGrupos: ProximoGrupo[];
    profesores: ProfesorResumen[];
    plantelesFiltro: PlantelFiltro[];
    plantelId: number | null;
}

type DirectorDashboardProps = { hoy: string } & ({ sinPlantel: true } | ({ sinPlantel: false } & ResumenDirector));

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Inicio', href: '/dashboard' }];

export default function DirectorDashboard(props: DirectorDashboardProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inicio" />
            <div className="flex flex-col gap-6 p-4 sm:p-6">
                {props.sinPlantel ? (
                    <>
                        <Seccion indice={0}>
                            <EncabezadoDashboard hoy={props.hoy} planteles={[]} plantelId={null} etiquetaTodos="Sin plantel asignado" />
                        </Seccion>
                        <Seccion indice={1}>
                            <SinPlantelCard />
                        </Seccion>
                    </>
                ) : (
                    <Resumen {...props} />
                )}
            </div>
        </AppLayout>
    );
}

function Resumen(props: ResumenDirector & { hoy: string }) {
    const { plantelesFiltro, plantelId } = props;
    const variosPlanteles = plantelId === null && plantelesFiltro.length > 1;

    return (
        <>
            <Seccion indice={0}>
                <EncabezadoDashboard
                    hoy={props.hoy}
                    planteles={plantelesFiltro}
                    plantelId={plantelId}
                    etiquetaTodos="Todos mis planteles"
                    acciones={<AccionesRapidas />}
                />
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
                        <GruposEnCursoCard grupos={props.gruposEnCurso} mostrarPlantel={variosPlanteles} />
                    </div>
                    <div className="flex flex-col gap-4">
                        <PendientesCard pendientes={props.pendientes} />
                        <AlumnosEnRiesgoCard alumnos={props.alumnosEnRiesgo} umbral={UMBRAL_RIESGO} />
                    </div>
                </div>
            </Seccion>

            <Seccion indice={4}>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <ProximosGruposCard grupos={props.proximosGrupos} mostrarPlantel={variosPlanteles} />
                    <ProfesoresCard profesores={props.profesores} />
                </div>
            </Seccion>

            <Seccion indice={5}>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <div className="xl:col-span-2">
                        <AsistenciaSemanalCard datos={props.asistenciaSemanal} />
                    </div>
                    <AlumnosPorCursoCard datos={props.alumnosPorCurso} />
                </div>
            </Seccion>

            <Seccion indice={6}>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <div className="xl:col-span-2">
                        <MovimientosCard datos={props.movimientosMensuales} />
                    </div>
                    <BajasRecientesCard bajas={props.bajasRecientes} />
                </div>
            </Seccion>
        </>
    );
}
