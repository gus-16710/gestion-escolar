import { AlumnosEnRiesgoCard, PendientesCard } from '@/components/dashboard/atencion';
import { AsistenciaSemanalCard, EncabezadoDashboard, plural, porcentaje, Seccion, UMBRAL_RIESGO } from '@/components/dashboard/bloques';
import { ProximosGruposCard } from '@/components/dashboard/director';
import { GruposEnCursoCard } from '@/components/dashboard/grupos-en-curso';
import {
    CalificacionesPendientesCard,
    type CalificacionPendiente,
    type ClaseDeHoy,
    ClasesDeHoyCard,
    SinFichaCard,
} from '@/components/dashboard/profesor';
import { StatCard } from '@/components/dashboard/stat-card';
import {
    type AlumnoEnRiesgo,
    type AsistenciaSemana,
    type GrupoEnCurso,
    type Kpis,
    type Pendiente,
    type ProximoGrupo,
} from '@/components/dashboard/types';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Backpack, ClipboardCheck, ClipboardX, Users } from 'lucide-react';

interface ResumenProfesor {
    kpis: Kpis;
    clasesDeHoy: ClaseDeHoy[];
    gruposEnCurso: GrupoEnCurso[];
    alumnosEnRiesgo: AlumnoEnRiesgo[];
    listasPendientes: Pendiente[];
    calificacionesPendientes: CalificacionPendiente[];
    asistenciaSemanal: AsistenciaSemana[];
    proximosGrupos: ProximoGrupo[];
    variosPlanteles: boolean;
}

type ProfesorDashboardProps = { hoy: string } & ({ sinFicha: true } | ({ sinFicha: false } & ResumenProfesor));

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Inicio', href: '/dashboard' }];

export default function ProfesorDashboard(props: ProfesorDashboardProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inicio" />
            <div className="flex flex-col gap-6 p-4 sm:p-6">
                {props.sinFicha ? (
                    <>
                        <Seccion indice={0}>
                            <EncabezadoDashboard hoy={props.hoy} planteles={[]} plantelId={null} etiquetaTodos="Profesor" />
                        </Seccion>
                        <Seccion indice={1}>
                            <SinFichaCard />
                        </Seccion>
                    </>
                ) : (
                    <Resumen {...props} />
                )}
            </div>
        </AppLayout>
    );
}

function Resumen(props: ResumenProfesor & { hoy: string }) {
    const { kpis } = props;
    const deltaAsistencia = kpis.asistencia !== null && kpis.asistencia_anterior !== null ? kpis.asistencia - kpis.asistencia_anterior : null;
    const pendientes = props.listasPendientes.length;

    return (
        <>
            <Seccion indice={0}>
                <EncabezadoDashboard hoy={props.hoy} planteles={[]} plantelId={null} etiquetaTodos="Tus grupos" />
            </Seccion>

            <Seccion indice={1}>
                <ClasesDeHoyCard clases={props.clasesDeHoy} mostrarPlantel={props.variosPlanteles} />
            </Seccion>

            <Seccion indice={2}>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        titulo="Grupos en curso"
                        valor={String(kpis.grupos_en_curso)}
                        icon={Users}
                        contexto={plural(kpis.grupos_planeados, 'planeado', 'planeados')}
                    />
                    <StatCard
                        titulo="Alumnos"
                        valor={String(kpis.alumnos_activos)}
                        icon={Backpack}
                        contexto={`+${plural(kpis.inscritos_mes, 'inscripción', 'inscripciones')} este mes`}
                    />
                    <StatCard
                        titulo="Asistencia 30 días"
                        valor={porcentaje(kpis.asistencia)}
                        icon={ClipboardCheck}
                        delta={
                            deltaAsistencia !== null
                                ? { valor: deltaAsistencia, texto: `${deltaAsistencia > 0 ? '+' : ''}${deltaAsistencia} pts` }
                                : null
                        }
                        contexto={kpis.asistencia_anterior !== null ? 'vs. 30 días previos' : 'sin periodo previo'}
                    />
                    <StatCard
                        titulo="Listas pendientes"
                        valor={String(pendientes)}
                        icon={ClipboardX}
                        contexto={pendientes === 0 ? 'todo al día' : 'grupos sin pase de lista reciente'}
                    />
                </div>
            </Seccion>

            <Seccion indice={3}>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <div className="xl:col-span-2">
                        <GruposEnCursoCard
                            grupos={props.gruposEnCurso}
                            mostrarPlantel={props.variosPlanteles}
                            mostrarProfesor={false}
                            titulo="Mis grupos"
                        />
                    </div>
                    <div className="flex flex-col gap-4">
                        {pendientes > 0 && <PendientesCard pendientes={props.listasPendientes} />}
                        {props.calificacionesPendientes.length > 0 && <CalificacionesPendientesCard pendientes={props.calificacionesPendientes} />}
                        <AlumnosEnRiesgoCard alumnos={props.alumnosEnRiesgo} umbral={UMBRAL_RIESGO} />
                    </div>
                </div>
            </Seccion>

            <Seccion indice={4}>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <div className="xl:col-span-2">
                        <AsistenciaSemanalCard datos={props.asistenciaSemanal} />
                    </div>
                    <ProximosGruposCard grupos={props.proximosGrupos} mostrarPlantel={props.variosPlanteles} />
                </div>
            </Seccion>
        </>
    );
}
