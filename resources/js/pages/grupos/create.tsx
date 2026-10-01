import { emptyGrupo, GrupoForm, type GrupoFormData, type GrupoFormOptions } from '@/components/grupos/grupo-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { motion } from 'motion/react';
import { FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Grupos', href: '/grupos' },
    { title: 'Abrir grupo', href: '/grupos/create' },
];

export default function CreateGrupo(options: GrupoFormOptions) {
    const { data, setData, post, errors, processing } = useForm<GrupoFormData>({
        ...emptyGrupo,
        plantel_id: options.planteles.length === 1 ? String(options.planteles[0].id) : '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('grupos.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Abrir grupo" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="max-w-6xl p-4 sm:p-6"
            >
                <GrupoForm
                    title="Abrir grupo"
                    description="Elige plantel y curso, asigna profesor y horario. Después podrás inscribir alumnos."
                    submitLabel="Abrir grupo"
                    data={data}
                    setData={setData}
                    errors={errors}
                    {...options}
                    processing={processing}
                    cancelHref={route('grupos.index')}
                    onSubmit={submit}
                />
            </motion.div>
        </AppLayout>
    );
}
