import { CursoForm, emptyCurso, type CursoFormData, type PlantelOpcion } from '@/components/cursos/curso-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler } from 'react';

interface CreateCursoProps {
    planteles: PlantelOpcion[];
    clavesUsadas: Record<string, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Cursos', href: '/cursos' },
    { title: 'Crear curso', href: '/cursos/create' },
];

export default function CreateCurso({ planteles, clavesUsadas }: CreateCursoProps) {
    // With a single plantel there is nothing to choose: offer the curso there from the start.
    const { data, setData, post, errors, processing } = useForm<CursoFormData>({
        ...emptyCurso,
        planteles: planteles.length === 1 ? [planteles[0].id] : [],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('cursos.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear curso" />
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
                    <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                        <GraduationCap className="size-5" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold tracking-tight">Crear curso</h1>
                        <p className="text-muted-foreground text-sm">Agrega un curso al catálogo y elige en qué planteles se imparte.</p>
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
                    submitLabel="Crear curso"
                    sugerirClaveAutomatica
                />
            </motion.div>
        </AppLayout>
    );
}
