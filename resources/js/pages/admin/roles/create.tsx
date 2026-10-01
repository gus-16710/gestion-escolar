import { EncabezadoFormulario } from '@/components/encabezado-formulario';
import { RolForm, type RolFormData } from '@/components/roles/rol-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { ShieldPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler } from 'react';

interface CreateRoleProps {
    permissions: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Roles', href: '/admin/roles' },
    { title: 'Crear rol', href: '/admin/roles/create' },
];

export default function CreateRole({ permissions }: CreateRoleProps) {
    const { data, setData, post, errors, processing } = useForm<RolFormData>({ name: '', permissions: [] });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.roles.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear rol" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex max-w-6xl flex-col gap-6 p-4 sm:p-6"
            >
                <EncabezadoFormulario
                    volverA={route('admin.roles.index')}
                    volverEtiqueta="Volver a roles"
                    icono={ShieldPlus}
                    titulo="Crear rol"
                    descripcion="Un rol personalizado para personal administrativo (por ejemplo, Recepción). Se asigna a las cuentas en Usuarios."
                />
                <RolForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    permisos={permissions}
                    processing={processing}
                    onSubmit={submit}
                    submitLabel="Crear rol"
                />
            </motion.div>
        </AppLayout>
    );
}
