import { IconoRol, ResumenPermisos } from '@/components/admin/resumen-permisos';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { DESCRIPCION_ROLES } from '@/lib/permisos';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertCircle, ArrowRight, Lock, Pencil, Plus, Shield, Users, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

interface AdminRole {
    id: number;
    name: string;
    permissions: string[];
    permissions_count: number;
    users_count: number;
    /** A few account names, for the card. */
    muestra: string[];
    es_sistema: boolean;
    /** The module where accounts with this role are registered. */
    alta_en: { modulo: string; url: string };
}

interface RolesIndexProps {
    roles: AdminRole[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Roles', href: '/admin/roles' }];

export default function RolesIndex({ roles }: RolesIndexProps) {
    const [error, setError] = useState<string | null>(null);
    const personalizados = roles.filter((role) => !role.es_sistema).length;

    const handleDelete = (roleId: number) => {
        setError(null);
        router.delete(route('admin.roles.destroy', roleId), {
            preserveScroll: true,
            onError: (errors) => setError(errors.role ?? 'No se pudo eliminar el rol.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                            <Shield className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
                            <p className="text-muted-foreground text-sm">
                                Qué puede hacer cada tipo de cuenta · {roles.length - personalizados} del sistema
                                {personalizados > 0 && ` · ${personalizados} ${personalizados === 1 ? 'personalizado' : 'personalizados'}`}
                            </p>
                        </div>
                    </div>
                    <Button asChild className="w-full shadow-sm sm:w-auto">
                        <Link href={route('admin.roles.create')}>
                            <Plus className="size-4" />
                            Crear rol
                        </Link>
                    </Button>
                </div>

                {error && (
                    <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-4 py-3 text-sm">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <p className="flex-1">{error}</p>
                        <button type="button" onClick={() => setError(null)} className="opacity-70 hover:opacity-100" aria-label="Cerrar aviso">
                            <X className="size-4" />
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                    {roles.map((role, index) => (
                        <motion.article
                            key={role.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                            className="bg-card flex flex-col rounded-xl border transition-shadow hover:shadow-sm"
                        >
                            <div className="flex items-start gap-3 p-4">
                                <IconoRol nombre={role.name} />
                                <div className="min-w-0 flex-1">
                                    <h2 className="flex flex-wrap items-center gap-2 font-semibold">
                                        {role.name}
                                        {role.es_sistema ? (
                                            <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium">
                                                <Lock className="size-3" />
                                                Del sistema
                                            </span>
                                        ) : (
                                            <span className="bg-secondary/40 text-secondary-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
                                                Personalizado
                                            </span>
                                        )}
                                    </h2>
                                    <p className="text-muted-foreground text-sm">
                                        {DESCRIPCION_ROLES[role.name] ?? 'Rol para personal administrativo; se asigna en Usuarios.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 border-t px-4 py-3">
                                <p className="text-muted-foreground mb-2 text-xs">Puede</p>
                                <ResumenPermisos permisos={role.permissions} vacio="Todavía no tiene permisos: estas cuentas no ven ningún módulo." />
                            </div>

                            <div className="flex items-center gap-3 border-t px-4 py-3 text-sm">
                                <Users className="text-muted-foreground size-4 shrink-0" />
                                <p className="min-w-0 flex-1 truncate">
                                    <span className="font-medium tabular-nums">{role.users_count}</span>{' '}
                                    {role.users_count === 1 ? 'cuenta' : 'cuentas'}
                                    {role.muestra.length > 0 && (
                                        <span className="text-muted-foreground">
                                            {' · '}
                                            {role.muestra.join(', ')}
                                            {role.users_count > role.muestra.length && '…'}
                                        </span>
                                    )}
                                </p>
                                <Link
                                    href={role.alta_en.url}
                                    className="text-primary flex shrink-0 items-center gap-1 text-xs font-medium hover:underline"
                                    title={`Las cuentas con este rol se dan de alta en ${role.alta_en.modulo}`}
                                >
                                    {role.alta_en.modulo}
                                    <ArrowRight className="size-3.5" />
                                </Link>
                            </div>

                            <div className="flex items-center gap-1 border-t px-3 py-2.5">
                                <Button variant="outline" size="sm" asChild className="ml-auto">
                                    <Link href={route('admin.roles.edit', role.id)}>
                                        <Pencil className="size-4" />
                                        {role.name === 'Admin' ? 'Ver' : 'Editar permisos'}
                                    </Link>
                                </Button>
                                {!role.es_sistema && (
                                    <DeleteConfirmDialog
                                        title={`¿Eliminar el rol ${role.name}?`}
                                        description={
                                            role.users_count > 0
                                                ? `Este rol está asignado a ${role.users_count} ${role.users_count === 1 ? 'cuenta' : 'cuentas'}. Quítaselo antes de eliminarlo.`
                                                : 'Esta acción no se puede deshacer.'
                                        }
                                        onConfirm={() => handleDelete(role.id)}
                                    />
                                )}
                            </div>
                        </motion.article>
                    ))}
                </div>
            </motion.div>
        </AppLayout>
    );
}
