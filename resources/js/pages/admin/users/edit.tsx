import { EncabezadoFormulario } from '@/components/encabezado-formulario';
import { UsuarioForm, type UsuarioFormData } from '@/components/users/usuario-form';
import AppLayout from '@/layouts/app-layout';
import { formatFecha, haceTiempo } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { UserRoundCog } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEventHandler } from 'react';

interface EditableUser {
    id: number;
    name: string;
    email: string;
    roles: string[];
    permissions: string[];
    roles_de_ficha: string[];
    creado: string | null;
    ultima_actividad: string | null;
    es_yo: boolean;
}

interface EditUserProps {
    user: EditableUser;
    roles: string[];
    permisosDeRoles: Record<string, string[]>;
    permissions: string[];
}

export default function EditUser({ user, roles, permisosDeRoles, permissions }: EditUserProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Usuarios', href: '/admin/users' },
        { title: user.name, href: `/admin/users/${user.id}/edit` },
    ];

    const { data, setData, put, errors, processing } = useForm<UsuarioFormData>({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        roles: user.roles,
        permissions: user.permissions,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('admin.users.update', user.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${user.name}`} />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex max-w-6xl flex-col gap-6 p-4 sm:p-6"
            >
                <EncabezadoFormulario
                    volverA={route('admin.users.index')}
                    volverEtiqueta="Volver a usuarios"
                    icono={UserRoundCog}
                    antetitulo="Editar usuario"
                    titulo={
                        <>
                            {user.name}
                            {user.es_yo && <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">Tú</span>}
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
                    rolesDeFicha={user.roles_de_ficha}
                    editando
                    processing={processing}
                    onSubmit={submit}
                    submitLabel="Guardar cambios"
                    detalles={
                        <>
                            {user.creado && <p>Cuenta creada el {formatFecha(user.creado)}</p>}
                            <p>{user.ultima_actividad ? `Última actividad ${haceTiempo(user.ultima_actividad)}` : 'Sin sesión activa'}</p>
                        </>
                    }
                />
            </motion.div>
        </AppLayout>
    );
}
