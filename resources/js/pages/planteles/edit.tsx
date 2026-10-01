import { EstadoActivoBadge } from '@/components/estado-activo-badge';
import { EstadoGrupoBadge } from '@/components/grupos/grupo-labels';
import { PersonaAvatar } from '@/components/persona-avatar';
import { PlantelForm, type PlantelFormData } from '@/components/planteles/plantel-form';
import { type CursoOfertado, type DirectorPlantel } from '@/components/planteles/plantel-tarjeta';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, ArrowRight, GraduationCap, UserRound, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler, type ReactNode } from 'react';

interface EditablePlantel {
    id: number;
    nombre: string;
    clave: string;
    calle: string;
    numero_exterior: string;
    numero_interior: string | null;
    colonia: string;
    codigo_postal: string;
    localidad: string;
    municipio: string;
    estado: string;
    telefono: string | null;
    email: string | null;
    activo: boolean;
}

/** The plantel's grupos by estado, plus alumnos and profesores of its planned or running grupos. */
type Resumen = Record<'planeado' | 'en_curso' | 'concluido' | 'cancelado' | 'alumnos' | 'profesores', number>;

interface EditPlantelProps {
    plantel: EditablePlantel;
    cursos: CursoOfertado[];
    resumen: Resumen;
    directores: DirectorPlantel[];
    clavesUsadas: Record<string, string>;
}

const ORDEN_ESTADOS = ['en_curso', 'planeado', 'concluido', 'cancelado'] as const;

export default function EditPlantel({ plantel, cursos, resumen, directores, clavesUsadas }: EditPlantelProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Planteles', href: '/planteles' },
        { title: plantel.nombre, href: `/planteles/${plantel.id}/edit` },
    ];

    const { data, setData, put, errors, processing } = useForm<PlantelFormData>({
        nombre: plantel.nombre,
        clave: plantel.clave,
        calle: plantel.calle,
        numero_exterior: plantel.numero_exterior,
        numero_interior: plantel.numero_interior ?? '',
        colonia: plantel.colonia,
        codigo_postal: plantel.codigo_postal,
        localidad: plantel.localidad,
        municipio: plantel.municipio,
        estado: plantel.estado,
        telefono: plantel.telefono ?? '',
        email: plantel.email ?? '',
        activo: plantel.activo,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('planteles.update', plantel.id));
    };

    const totalGrupos = ORDEN_ESTADOS.reduce((suma, estado) => suma + resumen[estado], 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${plantel.nombre}`} />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex max-w-6xl flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex items-center gap-3">
                    <Link
                        href={route('planteles.index')}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                        aria-label="Volver a planteles"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold">
                        {plantel.clave}
                    </div>
                    <div className="min-w-0">
                        <p className="text-muted-foreground text-sm">Editar plantel</p>
                        <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl leading-tight font-semibold tracking-tight">
                            {plantel.nombre}
                            <EstadoActivoBadge activo={plantel.activo} />
                        </h1>
                    </div>
                </div>

                <PlantelForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    clavesUsadas={clavesUsadas}
                    processing={processing}
                    onSubmit={submit}
                    submitLabel="Guardar cambios"
                    complemento={
                        <Card className="gap-0 p-0">
                            <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
                                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Este plantel hoy</p>
                                {totalGrupos > 0 && (
                                    <Link
                                        href={route('grupos.index', { plantel_id: plantel.id })}
                                        className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
                                    >
                                        Ver grupos
                                        <ArrowRight className="size-3.5" />
                                    </Link>
                                )}
                            </div>

                            <div className="divide-y">
                                <Bloque>
                                    {totalGrupos === 0 ? (
                                        <p className="text-muted-foreground text-sm">Todavía no se ha abierto ningún grupo aquí.</p>
                                    ) : (
                                        <>
                                            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                                                <p className="flex items-center gap-2">
                                                    <Users className="text-muted-foreground size-4" />
                                                    <span>
                                                        <span className="font-semibold tabular-nums">{resumen.alumnos}</span>{' '}
                                                        {resumen.alumnos === 1 ? 'alumno' : 'alumnos'}
                                                    </span>
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <UserRound className="text-muted-foreground size-4" />
                                                    <span>
                                                        <span className="font-semibold tabular-nums">{resumen.profesores}</span>{' '}
                                                        {resumen.profesores === 1 ? 'profesor' : 'profesores'}
                                                    </span>
                                                </p>
                                            </div>
                                            <ul className="space-y-1.5">
                                                {ORDEN_ESTADOS.filter((estado) => resumen[estado] > 0).map((estado) => (
                                                    <li key={estado} className="flex items-center justify-between gap-2 text-sm">
                                                        <EstadoGrupoBadge estado={estado} />
                                                        <span className="tabular-nums">
                                                            {resumen[estado]} {resumen[estado] === 1 ? 'grupo' : 'grupos'}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </Bloque>

                                <Bloque titulo="Dirección">
                                    {directores.length === 0 ? (
                                        <p className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                                            <AlertTriangle className="size-4 shrink-0" />
                                            Sin director asignado
                                        </p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {directores.map((director) => (
                                                <li key={director.nombre} className="flex items-center gap-2.5 text-sm">
                                                    <PersonaAvatar
                                                        nombre={director.nombre}
                                                        fotoUrl={director.foto_url}
                                                        className="size-7"
                                                        fallbackClassName="text-[10px]"
                                                    />
                                                    {director.nombre}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <Link href={route('admin.directores.index')} className="text-primary text-xs font-medium hover:underline">
                                        {directores.length === 0 ? 'Asignar desde Directores' : 'Cambiar desde Directores'}
                                    </Link>
                                </Bloque>

                                <Bloque titulo={`Cursos que imparte (${cursos.length})`}>
                                    {cursos.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">Aún no imparte cursos.</p>
                                    ) : (
                                        <ul className="space-y-1.5">
                                            {cursos.map((curso) => (
                                                <li key={curso.id} className="flex items-center gap-2.5 text-sm">
                                                    <span
                                                        className={cn(
                                                            'w-10 shrink-0 rounded-md py-0.5 text-center font-mono text-[11px] font-semibold',
                                                            curso.activo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                                                        )}
                                                    >
                                                        {curso.clave}
                                                    </span>
                                                    <span className={cn('min-w-0 truncate', !curso.activo && 'text-muted-foreground')}>
                                                        {curso.nombre}
                                                        {!curso.activo && ' (inactivo)'}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                                        <GraduationCap className="mt-0.5 size-3.5 shrink-0" />
                                        <span>
                                            La oferta se cambia en{' '}
                                            <Link href={route('cursos.index')} className="text-primary font-medium hover:underline">
                                                Cursos
                                            </Link>
                                            , en «¿Dónde se imparte?» de cada curso.
                                        </span>
                                    </p>
                                </Bloque>
                            </div>
                        </Card>
                    }
                />
            </motion.div>
        </AppLayout>
    );
}

function Bloque({ titulo, children }: { titulo?: string; children: ReactNode }) {
    return (
        <div className="space-y-2.5 px-5 py-4">
            {titulo && <p className="text-xs font-medium">{titulo}</p>}
            {children}
        </div>
    );
}
