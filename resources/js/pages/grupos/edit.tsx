import { GrupoForm, type GrupoFormData, type GrupoFormOptions } from '@/components/grupos/grupo-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { motion } from 'motion/react';
import { FormEventHandler } from 'react';

interface EditableGrupo {
    id: number;
    plantel_id: number;
    curso_id: number;
    profesor_id: number | null;
    clave: string;
    turno: string;
    dias: string[];
    hora_inicio: string | null;
    hora_fin: string | null;
    fecha_inicio: string;
    fecha_fin: string | null;
    cupo: number | null;
    estado: string;
}

interface EditGrupoProps extends GrupoFormOptions {
    grupo: EditableGrupo;
}

export default function EditGrupo({ grupo, ...options }: EditGrupoProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Grupos', href: '/grupos' },
        { title: grupo.clave, href: `/grupos/${grupo.id}` },
        { title: 'Editar', href: `/grupos/${grupo.id}/edit` },
    ];

    const { data, setData, put, errors, processing } = useForm<GrupoFormData>({
        plantel_id: String(grupo.plantel_id),
        curso_id: String(grupo.curso_id),
        profesor_id: grupo.profesor_id ? String(grupo.profesor_id) : '',
        clave: grupo.clave,
        turno: grupo.turno,
        dias: grupo.dias,
        hora_inicio: grupo.hora_inicio ?? '',
        hora_fin: grupo.hora_fin ?? '',
        fecha_inicio: grupo.fecha_inicio,
        fecha_fin: grupo.fecha_fin ?? '',
        cupo: grupo.cupo?.toString() ?? '',
        estado: grupo.estado,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('grupos.update', grupo.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${grupo.clave}`} />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="max-w-6xl p-4 sm:p-6"
            >
                <GrupoForm
                    title={`Editar ${grupo.clave}`}
                    description="Actualiza el profesor, el horario, el periodo o el estado del grupo."
                    submitLabel="Guardar cambios"
                    data={data}
                    setData={setData}
                    errors={errors}
                    {...options}
                    processing={processing}
                    cancelHref={route('grupos.show', grupo.id)}
                    onSubmit={submit}
                />
            </motion.div>
        </AppLayout>
    );
}
