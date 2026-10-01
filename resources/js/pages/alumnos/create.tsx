import { AlumnoForm, emptyAlumno, type AlumnoFormData } from '@/components/alumnos/alumno-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler } from 'react';

interface CreateAlumnoProps {
    /** The matrícula the next registration will get (assigned for real when saving). */
    matriculaPrevista: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Alumnos', href: '/alumnos' },
    { title: 'Registrar alumno', href: '/alumnos/create' },
];

export default function CreateAlumno({ matriculaPrevista }: CreateAlumnoProps) {
    const { data, setData, post, errors, processing } = useForm<AlumnoFormData>(emptyAlumno);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('alumnos.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Registrar alumno" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex max-w-6xl flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex items-center gap-3">
                    <Link
                        href={route('alumnos.index')}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                        aria-label="Volver a alumnos"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                        <UserPlus className="size-5" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold tracking-tight">Registrar alumno</h1>
                        <p className="text-muted-foreground text-sm">
                            Recibirá la matrícula <span className="text-foreground font-mono font-medium">{matriculaPrevista}</span>. Después podrás
                            inscribirlo en grupos de cualquier plantel.
                        </p>
                    </div>
                </div>

                <AlumnoForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    matricula={matriculaPrevista}
                    matriculaPrevista
                    processing={processing}
                    onSubmit={submit}
                    submitLabel="Registrar alumno"
                />
            </motion.div>
        </AppLayout>
    );
}
