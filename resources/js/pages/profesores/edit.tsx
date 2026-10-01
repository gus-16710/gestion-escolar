import { emptyFoto } from '@/components/foto-persona-fields';
import { PersonaAvatar } from '@/components/persona-avatar';
import { GruposProfesor, type GrupoProfesor } from '@/components/profesores/grupos-profesor';
import { ProfesorForm, type ProfesorFormData } from '@/components/profesores/profesor-form';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler } from 'react';

interface EditableProfesor {
    id: number;
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    curp: string | null;
    fecha_nacimiento: string | null;
    telefono: string | null;
    email: string | null;
    especialidad: string | null;
    activo: boolean;
    foto_url: string | null;
    tiene_cuenta: boolean;
}

interface EditProfesorProps {
    profesor: EditableProfesor;
    grupos: GrupoProfesor[];
    especialidades: string[];
}

export default function EditProfesor({ profesor, grupos, especialidades }: EditProfesorProps) {
    const nombreCompleto = [profesor.nombre, profesor.apellido_paterno, profesor.apellido_materno].filter(Boolean).join(' ');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Profesores', href: '/profesores' },
        { title: nombreCompleto, href: `/profesores/${profesor.id}/edit` },
    ];

    const { data, setData, post, transform, errors, processing } = useForm<ProfesorFormData>({
        nombre: profesor.nombre,
        apellido_paterno: profesor.apellido_paterno,
        apellido_materno: profesor.apellido_materno ?? '',
        curp: profesor.curp ?? '',
        fecha_nacimiento: profesor.fecha_nacimiento ?? '',
        telefono: profesor.telefono ?? '',
        email: profesor.email ?? '',
        especialidad: profesor.especialidad ?? '',
        activo: profesor.activo,
        ...emptyFoto,
        crear_cuenta: false,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // PHP only parses multipart bodies on POST, so the photo travels in a spoofed PUT.
        transform((data) => ({ ...data, _method: 'put' }));
        post(route('profesores.update', profesor.id), { forceFormData: true });
    };

    const activos = grupos.filter((grupo) => ['en_curso', 'planeado'].includes(grupo.estado));
    const anteriores = grupos.filter((grupo) => !['en_curso', 'planeado'].includes(grupo.estado));
    const variosPlanteles = new Set(grupos.map((grupo) => grupo.plantel_clave)).size > 1;
    const horasEnCurso = grupos.filter((grupo) => grupo.estado === 'en_curso').reduce((suma, grupo) => suma + grupo.horas_semana, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${nombreCompleto}`} />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex max-w-6xl flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex items-center gap-3">
                    <Link
                        href={route('profesores.index')}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                        aria-label="Volver a profesores"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <PersonaAvatar nombre={nombreCompleto} fotoUrl={profesor.foto_url} className="size-11" />
                    <div className="min-w-0">
                        <p className="text-muted-foreground text-sm">Editar profesor{profesor.especialidad && ` · ${profesor.especialidad}`}</p>
                        <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl leading-tight font-semibold tracking-tight">
                            {nombreCompleto}
                            {!profesor.activo && (
                                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">Inactivo</span>
                            )}
                        </h1>
                    </div>
                </div>

                <ProfesorForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    especialidades={especialidades}
                    fotoUrl={profesor.foto_url}
                    tieneCuenta={profesor.tiene_cuenta}
                    processing={processing}
                    onSubmit={submit}
                    submitLabel="Guardar cambios"
                    complemento={
                        <Card className="gap-0 p-0">
                            <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
                                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Sus grupos</p>
                                {horasEnCurso > 0 && (
                                    <p className="text-muted-foreground text-xs">{String(horasEnCurso).replace('.', ',')} h de clase por semana</p>
                                )}
                            </div>
                            <div className="space-y-4 px-5 py-4">
                                <GruposProfesor
                                    grupos={activos}
                                    mostrarPlantel={variosPlanteles}
                                    vacio="No tiene grupos planeados ni en curso. Asígnale uno desde Grupos."
                                />
                                {anteriores.length > 0 && (
                                    <div className="space-y-2.5 border-t pt-3">
                                        <p className="text-muted-foreground text-xs">Grupos anteriores</p>
                                        <GruposProfesor grupos={anteriores} mostrarPlantel={variosPlanteles} />
                                    </div>
                                )}
                            </div>
                            {profesor.tiene_cuenta && (
                                <p className="text-muted-foreground flex items-center gap-2 border-t px-5 py-3 text-xs">
                                    <KeyRound className="size-3.5 shrink-0" />
                                    Entra al sistema con {profesor.email}
                                </p>
                            )}
                        </Card>
                    }
                />
            </motion.div>
        </AppLayout>
    );
}
