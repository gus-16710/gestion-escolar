import { CursoForm, type CursoFormData, type PlantelOpcion } from '@/components/cursos/curso-form';
import { CursoClaveChip } from '@/components/cursos/curso-tarjeta';
import { nuevoModulo } from '@/components/cursos/plan-estudios-field';
import { EstadoActivoBadge } from '@/components/estado-activo-badge';
import { EstadoGrupoBadge } from '@/components/grupos/grupo-labels';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler } from 'react';

interface EditableCurso {
    id: number;
    nombre: string;
    clave: string;
    descripcion: string | null;
    duracion_semanas: number | null;
    activo: boolean;
    planteles: string[];
    modulos: { id: number; nombre: string; descripcion: string | null; duracion_semanas: number }[];
}

/** The curso's grupos by estado, plus the alumnos currently enrolled in its planned or running grupos. */
type Resumen = Record<'planeado' | 'en_curso' | 'concluido' | 'cancelado' | 'alumnos', number>;

interface EditCursoProps {
    curso: EditableCurso;
    resumen: Resumen;
    planteles: PlantelOpcion[];
    clavesUsadas: Record<string, string>;
}

const ORDEN_ESTADOS = ['en_curso', 'planeado', 'concluido', 'cancelado'] as const;

export default function EditCurso({ curso, resumen, planteles, clavesUsadas }: EditCursoProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Cursos', href: '/cursos' },
        { title: curso.nombre, href: `/cursos/${curso.id}/edit` },
    ];

    const { data, setData, put, errors, processing } = useForm<CursoFormData>({
        nombre: curso.nombre,
        clave: curso.clave,
        descripcion: curso.descripcion ?? '',
        duracion_semanas: curso.duracion_semanas?.toString() ?? '',
        activo: curso.activo,
        planteles: curso.planteles,
        modulos: curso.modulos.map((modulo) =>
            nuevoModulo({
                id: modulo.id,
                clave_local: `modulo-${modulo.id}`,
                nombre: modulo.nombre,
                descripcion: modulo.descripcion ?? '',
                duracion_semanas: String(modulo.duracion_semanas),
            }),
        ),
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('cursos.update', curso.id));
    };

    const totalGrupos = ORDEN_ESTADOS.reduce((suma, estado) => suma + resumen[estado], 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${curso.nombre}`} />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex max-w-6xl flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex items-center gap-3">
                    <Link
                        href={route('cursos.index')}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                        aria-label="Volver a cursos"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <CursoClaveChip clave={curso.clave} className="size-11" />
                    <div className="min-w-0">
                        <p className="text-muted-foreground text-sm">Editar curso</p>
                        <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl leading-tight font-semibold tracking-tight">
                            {curso.nombre}
                            <EstadoActivoBadge activo={curso.activo} />
                        </h1>
                    </div>
                </div>

                <CursoForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    planteles={planteles}
                    clavesUsadas={clavesUsadas}
                    processing={processing}
                    onSubmit={submit}
                    submitLabel="Guardar cambios"
                    complemento={
                        <Card className="gap-0 p-0">
                            <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
                                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Este curso hoy</p>
                                {totalGrupos > 0 && (
                                    <Link
                                        href={route('grupos.index', { search: curso.nombre })}
                                        className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
                                    >
                                        Ver grupos
                                        <ArrowRight className="size-3.5" />
                                    </Link>
                                )}
                            </div>
                            {totalGrupos === 0 ? (
                                <p className="text-muted-foreground px-5 py-4 text-sm">Todavía no se ha abierto ningún grupo de este curso.</p>
                            ) : (
                                <div className="space-y-3 px-5 py-4">
                                    <p className="flex items-center gap-2 text-sm">
                                        <Users className="text-muted-foreground size-4" />
                                        <span>
                                            <span className="font-semibold tabular-nums">{resumen.alumnos}</span>{' '}
                                            {resumen.alumnos === 1 ? 'alumno inscrito' : 'alumnos inscritos'} ahora
                                        </span>
                                    </p>
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
                                </div>
                            )}
                        </Card>
                    }
                />
            </motion.div>
        </AppLayout>
    );
}
