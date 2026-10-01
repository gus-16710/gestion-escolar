import { IconoRol, NivelChip } from '@/components/admin/resumen-permisos';
import { Card } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { etiquetaNivel, etiquetaPermiso, nivelEnModulo, permisosPorModulo } from '@/lib/permisos';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import { motion } from 'motion/react';

interface RolConPermisos {
    id: number;
    name: string;
    permissions: string[];
    users_count: number;
}

interface PermissionsIndexProps {
    permissions: string[];
    roles: RolConPermisos[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Permisos', href: '/admin/permissions' }];

export default function PermissionsIndex({ permissions, roles }: PermissionsIndexProps) {
    const { modulos, otros } = permisosPorModulo(permissions);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Permisos" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                        <KeyRound className="size-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Permisos</h1>
                        <p className="text-muted-foreground text-sm">
                            Qué puede hacer cada rol en cada módulo. Para cambiarlo, edita el rol en{' '}
                            <Link href={route('admin.roles.index')} className="text-primary font-medium hover:underline">
                                Roles
                            </Link>
                            .
                        </p>
                    </div>
                </div>

                <Card className="gap-0 overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[40rem] text-left text-sm">
                            <thead>
                                <tr className="bg-muted/30 border-b">
                                    <th className="bg-card sticky left-0 z-10 px-4 py-3 text-xs font-medium tracking-wide uppercase">
                                        <span className="text-muted-foreground">Módulo</span>
                                    </th>
                                    {roles.map((rol) => (
                                        <th key={rol.id} className="px-3 py-3 font-medium">
                                            <Link href={route('admin.roles.edit', rol.id)} className="group flex items-center gap-2">
                                                <IconoRol nombre={rol.name} className="size-8 rounded-lg [&_svg]:size-4" />
                                                <span className="min-w-0">
                                                    <span className="block group-hover:underline">{rol.name}</span>
                                                    <span className="text-muted-foreground block text-xs font-normal">
                                                        {rol.users_count} {rol.users_count === 1 ? 'cuenta' : 'cuentas'}
                                                    </span>
                                                </span>
                                            </Link>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {modulos.map((modulo) => (
                                    <tr key={modulo.modulo} className="hover:bg-muted/30 border-b transition-colors last:border-0">
                                        <td className="bg-card sticky left-0 z-10 px-4 py-3">
                                            <span className="flex flex-wrap items-center gap-2 font-medium">
                                                {modulo.modulo}
                                                {modulo.proximamente && (
                                                    <span className="text-muted-foreground rounded-full border px-1.5 py-px text-[10px] font-normal">
                                                        Próximamente
                                                    </span>
                                                )}
                                            </span>
                                            {modulo.nota && <span className="text-muted-foreground block text-xs">{modulo.nota}</span>}
                                        </td>
                                        {roles.map((rol) => {
                                            const nivel = nivelEnModulo(modulo, rol.permissions);

                                            return (
                                                <td key={rol.id} className="px-3 py-3">
                                                    <NivelChip nivel={nivel} etiqueta={etiquetaNivel(modulo, nivel)} />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                {otros.map((permiso) => (
                                    <tr key={permiso} className="border-b last:border-0">
                                        <td className="bg-card sticky left-0 z-10 px-4 py-3">{etiquetaPermiso(permiso)}</td>
                                        {roles.map((rol) => (
                                            <td key={rol.id} className="px-3 py-3">
                                                <NivelChip nivel={rol.permissions.includes(permiso) ? 'ver' : 'ninguno'} etiqueta="Sí" />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                    <span className="flex items-center gap-2">
                        <NivelChip nivel="gestionar" etiqueta="Gestionar" /> crea, edita y elimina (incluye ver)
                    </span>
                    <span className="flex items-center gap-2">
                        <NivelChip nivel="ver" etiqueta="Ver" /> solo consulta
                    </span>
                    <span className="flex items-center gap-2">
                        <NivelChip nivel="ninguno" etiqueta="" /> sin acceso
                    </span>
                </div>
            </motion.div>
        </AppLayout>
    );
}
