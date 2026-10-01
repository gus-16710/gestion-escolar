import { EncabezadoFormulario } from '@/components/encabezado-formulario';
import { UsuarioForm, type UsuarioFormData } from '@/components/users/usuario-form';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler } from 'react';

interface CreateUserProps {
    roles: string[];
    permisosDeRoles: Record<string, string[]>;
    permissions: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Usuarios', href: '/admin/users' },
    { title: 'Crear usuario', href: '/admin/users/create' },
];

export default function CreateUser({ roles, permisosDeRoles, permissions }: CreateUserProps) {
    const { data, setData, post, errors, processing } = useForm<UsuarioFormData>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        roles: [],
        permissions: [],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.users.store'));
    };

    const enlace = (ruta: string, texto: string) => (
        <Link href={route(ruta)} className="text-primary font-medium hover:underline">
            {texto}
        </Link>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear usuario" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex max-w-6xl flex-col gap-6 p-4 sm:p-6"
            >
                <EncabezadoFormulario
                    volverA={route('admin.users.index')}
                    volverEtiqueta="Volver a usuarios"
                    icono={UserPlus}
                    titulo="Crear usuario"
                    descripcion={
                        <>
                            Cuentas de administración. Directores, profesores y alumnos se registran en{' '}
                            {enlace('admin.directores.index', 'Directores')}, {enlace('profesores.index', 'Profesores')} o{' '}
                            {enlace('alumnos.index', 'Alumnos')}.
                        </>
                    }
                />
                <UsuarioForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    roles={roles}
                    permisosDeRoles={permisosDeRoles}
                    permisos={permissions}
                    processing={processing}
                    onSubmit={submit}
                    submitLabel="Crear usuario"
                />
            </motion.div>
        </AppLayout>
    );
}
