import { EncabezadoFormulario } from '@/components/encabezado-formulario';
import { RolForm, type RolFormData } from '@/components/roles/rol-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Lock, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler } from 'react';

interface EditableRole {
    id: number;
    name: string;
    permissions: string[];
    es_sistema: boolean;
    users_count: number;
    alta_en: { modulo: string; url: string };
}

interface EditRoleProps {
    role: EditableRole;
    permissions: string[];
}

export default function EditRole({ role, permissions }: EditRoleProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Roles', href: '/admin/roles' },
        { title: role.name, href: `/admin/roles/${role.id}/edit` },
    ];

    const { data, setData, put, errors, processing } = useForm<RolFormData>({
        name: role.name,
        permissions: role.permissions,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('admin.roles.update', role.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${role.name}`} />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex max-w-6xl flex-col gap-6 p-4 sm:p-6"
            >
                <EncabezadoFormulario
                    volverA={route('admin.roles.index')}
                    volverEtiqueta="Volver a roles"
                    icono={Shield}
                    antetitulo={role.name === 'Admin' ? 'Rol' : 'Editar rol'}
                    titulo={
                        <>
                            {role.name}
                            {role.es_sistema && (
                                <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                                    <Lock className="size-3" />
                                    Del sistema
                                </span>
                            )}
                        </>
                    }
                />
                <RolForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    permisos={permissions}
                    esSistema={role.es_sistema}
                    cuentas={{ total: role.users_count, altaEn: role.alta_en }}
                    processing={processing}
                    onSubmit={submit}
                    submitLabel="Guardar cambios"
                />
            </motion.div>
        </AppLayout>
    );
}
