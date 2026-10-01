import { emptyProfesor, ProfesorForm, type ProfesorFormData } from '@/components/profesores/profesor-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler } from 'react';

interface CreateProfesorProps {
    especialidades: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Profesores', href: '/profesores' },
    { title: 'Registrar profesor', href: '/profesores/create' },
];

export default function CreateProfesor({ especialidades }: CreateProfesorProps) {
    const { data, setData, post, errors, processing } = useForm<ProfesorFormData>(emptyProfesor);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('profesores.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Registrar profesor" />
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
                    <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                        <UserPlus className="size-5" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold tracking-tight">Registrar profesor</h1>
                        <p className="text-muted-foreground text-sm">Después podrás asignarle grupos en cualquier plantel.</p>
                    </div>
                </div>

                <ProfesorForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    especialidades={especialidades}
                    processing={processing}
                    onSubmit={submit}
                    submitLabel="Registrar profesor"
                />
            </motion.div>
        </AppLayout>
    );
}
