import { emptyPlantel, PlantelForm, type PlantelFormData } from '@/components/planteles/plantel-form';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Building2, GraduationCap, UserCog } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler } from 'react';

interface CreatePlantelProps {
    clavesUsadas: Record<string, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Planteles', href: '/planteles' },
    { title: 'Crear plantel', href: '/planteles/create' },
];

export default function CreatePlantel({ clavesUsadas }: CreatePlantelProps) {
    const { data, setData, post, errors, processing } = useForm<PlantelFormData>(emptyPlantel);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('planteles.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear plantel" />
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
                    <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                        <Building2 className="size-5" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold tracking-tight">Crear plantel</h1>
                        <p className="text-muted-foreground text-sm">Registra una nueva sede de la escuela.</p>
                    </div>
                </div>

                <PlantelForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    clavesUsadas={clavesUsadas}
                    processing={processing}
                    onSubmit={submit}
                    submitLabel="Crear plantel"
                    sugerirClaveAutomatica
                    complemento={
                        <Card className="gap-0 p-0">
                            <div className="bg-muted/40 border-b px-5 py-3">
                                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Después de crearlo</p>
                            </div>
                            <ol className="space-y-3 px-5 py-4 text-sm">
                                <li className="flex gap-2.5">
                                    <GraduationCap className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                                    <span>
                                        Elige qué cursos imparte desde{' '}
                                        <Link href={route('cursos.index')} className="text-primary font-medium hover:underline">
                                            Cursos
                                        </Link>{' '}
                                        («¿Dónde se imparte?»).
                                    </span>
                                </li>
                                <li className="flex gap-2.5">
                                    <UserCog className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                                    <span>
                                        Asígnale un director desde{' '}
                                        <Link href={route('admin.directores.index')} className="text-primary font-medium hover:underline">
                                            Directores
                                        </Link>
                                        .
                                    </span>
                                </li>
                            </ol>
                        </Card>
                    }
                />
            </motion.div>
        </AppLayout>
    );
}
