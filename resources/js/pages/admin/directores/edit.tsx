import { DirectorForm, type DirectorFormData } from '@/components/directores/director-form';
import { PlantelesDirector, type ActividadPlantel } from '@/components/directores/planteles-director';
import { emptyFoto } from '@/components/foto-persona-fields';
import { PersonaAvatar } from '@/components/persona-avatar';
import { type PlantelOpcion } from '@/components/planteles-asignados-field';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler } from 'react';

interface EditableDirector {
    id: number;
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    curp: string | null;
    fecha_nacimiento: string | null;
    telefono: string | null;
    email: string | null;
    activo: boolean;
    foto_url: string | null;
    planteles: number[];
    profesor_id: number | null;
}

interface EditDirectorProps {
    director: EditableDirector;
    planteles: PlantelOpcion[];
    actividad: Record<number, ActividadPlantel>;
}

export default function EditDirector({ director, planteles, actividad }: EditDirectorProps) {
    const nombreCompleto = [director.nombre, director.apellido_paterno, director.apellido_materno].filter(Boolean).join(' ');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Directores', href: '/admin/directores' },
        { title: nombreCompleto, href: `/admin/directores/${director.id}/edit` },
    ];

    const { data, setData, post, transform, errors, processing } = useForm<DirectorFormData>({
        nombre: director.nombre,
        apellido_paterno: director.apellido_paterno,
        apellido_materno: director.apellido_materno ?? '',
        curp: director.curp ?? '',
        fecha_nacimiento: director.fecha_nacimiento ?? '',
        telefono: director.telefono ?? '',
        email: director.email ?? '',
        activo: director.activo,
        ...emptyFoto,
        password: '',
        password_confirmation: '',
        planteles: director.planteles.map(String),
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        // PHP only parses multipart bodies on POST, so the photo travels in a spoofed PUT.
        transform((data) => ({ ...data, _method: 'put' }));
        post(route('admin.directores.update', director.id), { forceFormData: true });
    };

    // Follows the ticked boxes, so the summary shows what they will run once saved.
    const dirigidos = planteles
        .filter((plantel) => data.planteles.includes(String(plantel.id)))
        .map((plantel) => ({ ...plantel, ...actividad[plantel.id] }));

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
                        href={route('admin.directores.index')}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                        aria-label="Volver a directores"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <PersonaAvatar nombre={nombreCompleto} fotoUrl={director.foto_url} className="size-11" />
                    <div className="min-w-0">
                        <p className="text-muted-foreground text-sm">Editar director</p>
                        <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl leading-tight font-semibold tracking-tight">
                            {nombreCompleto}
                            {!director.activo && (
                                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">Inactivo</span>
                            )}
                        </h1>
                    </div>
                </div>

                <DirectorForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    planteles={planteles}
                    fotoUrl={director.foto_url}
                    editando
                    processing={processing}
                    onSubmit={submit}
                    submitLabel="Guardar cambios"
                    complemento={
                        <Card className="gap-0 p-0">
                            <div className="border-b px-5 py-3">
                                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Sus planteles hoy</p>
                            </div>
                            <div className="px-5 py-4">
                                <PlantelesDirector planteles={dirigidos} />
                            </div>
                            {director.profesor_id && (
                                <Link
                                    href={route('profesores.edit', director.profesor_id)}
                                    className="text-primary flex items-start gap-2 border-t px-5 py-3 text-xs font-medium hover:underline"
                                >
                                    <GraduationCap className="mt-px size-3.5 shrink-0" />
                                    También es profesor: ver su ficha de profesor (cuenta aparte)
                                </Link>
                            )}
                        </Card>
                    }
                />
            </motion.div>
        </AppLayout>
    );
}
