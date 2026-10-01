import { DirectorForm, emptyDirector, type DirectorFormData } from '@/components/directores/director-form';
import { type PlantelOpcion } from '@/components/planteles-asignados-field';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Directores', href: '/admin/directores' },
    { title: 'Registrar director', href: '/admin/directores/create' },
];

export default function CreateDirector({ planteles }: { planteles: PlantelOpcion[] }) {
    // With a single plantel there is nothing to choose: tick it from the start.
    const { data, setData, post, errors, processing } = useForm<DirectorFormData>({
        ...emptyDirector,
        planteles: planteles.length === 1 ? [String(planteles[0].id)] : [],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.directores.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Registrar director" />
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
                    <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                        <UserPlus className="size-5" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold tracking-tight">Registrar director</h1>
                        <p className="text-muted-foreground text-sm">
                            Se crea con su cuenta de acceso. Si además da clases, regístralo también en Profesores con otro correo.
                        </p>
                    </div>
                </div>

                <DirectorForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    planteles={planteles}
                    processing={processing}
                    onSubmit={submit}
                    submitLabel="Registrar director"
                />
            </motion.div>
        </AppLayout>
    );
}
