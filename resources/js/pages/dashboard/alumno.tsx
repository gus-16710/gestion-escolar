import {
    AnterioresCard,
    type ClaseAlumno,
    ClasesDeHoyAlumno,
    type CursoAlumno,
    type CursoAnterior,
    CursoCard,
    HistorialCard,
    type RegistroAsistencia,
    SinFichaAlumnoCard,
} from '@/components/dashboard/alumno';
import { plural, porcentaje, Seccion, UMBRAL_RIESGO } from '@/components/dashboard/bloques';
import { StatCard } from '@/components/dashboard/stat-card';
import { PersonaAvatar } from '@/components/persona-avatar';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { BookOpen, ClipboardCheck, Clock, UserX } from 'lucide-react';

interface ResumenAlumno {
    alumno: { nombre_completo: string; matricula: string; foto_url: string | null };
    kpis: {
        cursos_en_curso: number;
        cursos_por_iniciar: number;
        asistencia: number | null;
        registros: number;
        faltas: number;
        retardos: number;
        justificadas: number;
    };
    cursos: CursoAlumno[];
    clasesDeHoy: ClaseAlumno[];
    historial: RegistroAsistencia[];
    anteriores: CursoAnterior[];
}

type AlumnoDashboardProps = { hoy: string } & ({ sinFicha: true } | ({ sinFicha: false } & ResumenAlumno));

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Inicio', href: '/dashboard' }];

function Encabezado({ hoy, alumno }: { hoy: string; alumno?: ResumenAlumno['alumno'] }) {
    const { auth } = usePage<SharedData>().props;
    const nombre = (alumno?.nombre_completo ?? auth.user.name).split(' ')[0];
    const fecha = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(`${hoy}T12:00:00`),
    );

    return (
        <div className="flex items-center gap-4">
            {alumno && <PersonaAvatar nombre={alumno.nombre_completo} fotoUrl={alumno.foto_url} className="size-14" fallbackClassName="text-lg" />}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Hola, {nombre}</h1>
                <p className="text-muted-foreground text-sm first-letter:uppercase">
                    {fecha}
                    {alumno && ` · Matrícula ${alumno.matricula}`}
                </p>
            </div>
        </div>
    );
}

export default function AlumnoDashboard(props: AlumnoDashboardProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inicio" />
            <div className="flex flex-col gap-6 p-4 sm:p-6">
                {props.sinFicha ? (
                    <>
                        <Seccion indice={0}>
                            <Encabezado hoy={props.hoy} />
                        </Seccion>
                        <Seccion indice={1}>
                            <SinFichaAlumnoCard />
                        </Seccion>
                    </>
                ) : (
                    <Resumen {...props} />
                )}
            </div>
        </AppLayout>
    );
}

function Resumen(props: ResumenAlumno & { hoy: string }) {
    const { kpis, cursos } = props;
    const enRiesgo = cursos.some((curso) => curso.asistencia.en_riesgo);

    return (
        <>
            <Seccion indice={0}>
                <Encabezado hoy={props.hoy} alumno={props.alumno} />
            </Seccion>

            <Seccion indice={1}>
                <ClasesDeHoyAlumno clases={props.clasesDeHoy} />
            </Seccion>

            <Seccion indice={2}>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        titulo="Cursos en curso"
                        valor={String(kpis.cursos_en_curso)}
                        icon={BookOpen}
                        contexto={
                            kpis.cursos_por_iniciar > 0 ? `${plural(kpis.cursos_por_iniciar, 'por iniciar', 'por iniciar')}` : 'inscrito actualmente'
                        }
                    />
                    <StatCard
                        titulo="Mi asistencia"
                        valor={porcentaje(kpis.asistencia)}
                        icon={ClipboardCheck}
                        contexto={
                            kpis.asistencia === null
                                ? 'aún sin pases de lista'
                                : enRiesgo
                                  ? `por debajo del ${UMBRAL_RIESGO}% en algún curso`
                                  : 'en tus cursos actuales'
                        }
                    />
                    <StatCard
                        titulo="Faltas"
                        valor={String(kpis.faltas)}
                        icon={UserX}
                        contexto={
                            kpis.justificadas > 0 ? `${plural(kpis.justificadas, 'justificada aparte', 'justificadas aparte')}` : 'sin justificar'
                        }
                    />
                    <StatCard titulo="Retardos" valor={String(kpis.retardos)} icon={Clock} contexto="no cuentan como falta" />
                </div>
            </Seccion>

            <Seccion indice={3}>
                <h2 className="mb-3 text-lg font-semibold">Mis cursos</h2>
                {cursos.length === 0 ? (
                    <Card className="text-muted-foreground p-6 text-sm">Por ahora no estás inscrito en ningún curso.</Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {cursos.map((curso) => (
                            <CursoCard key={curso.inscripcion_id} curso={curso} />
                        ))}
                    </div>
                )}
            </Seccion>

            <Seccion indice={4}>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <HistorialCard registros={props.historial} />
                    {props.anteriores.length > 0 && <AnterioresCard cursos={props.anteriores} />}
                </div>
            </Seccion>
        </>
    );
}
