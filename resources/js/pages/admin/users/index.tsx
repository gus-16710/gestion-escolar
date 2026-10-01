import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { Pagination, type PaginationLink } from '@/components/pagination';
import { PersonaAvatar } from '@/components/persona-avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { cn, haceTiempo } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertCircle, GraduationCap, IdCard, Pencil, Plus, Search, ShieldCheck, UserCog, UserRound, Users, X, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

type Tipo = 'administracion' | 'directores' | 'profesores' | 'alumnos' | 'todas';
type TipoCuenta = 'Administración' | 'Director' | 'Profesor' | 'Alumno';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    roles: string[];
    tipo: TipoCuenta;
    /** Set when the account belongs to a director, profesor or alumno record, which is where it is edited. */
    ficha_url: string | null;
    foto_url: string | null;
    /** ISO date-time of the latest request in a live session. */
    ultima_actividad: string | null;
    es_yo: boolean;
}

interface PaginatedUsers {
    data: AdminUser[];
    links: PaginationLink[];
    total: number;
    from: number | null;
    to: number | null;
}

interface UsersIndexProps {
    users: PaginatedUsers;
    conteos: Record<Tipo, number>;
    tipo: Tipo;
    search: string;
    perPage: number;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Usuarios', href: '/admin/users' }];

const PESTANAS: { valor: Tipo; etiqueta: string }[] = [
    { valor: 'administracion', etiqueta: 'Administración' },
    { valor: 'directores', etiqueta: 'Directores' },
    { valor: 'profesores', etiqueta: 'Profesores' },
    { valor: 'alumnos', etiqueta: 'Alumnos' },
    { valor: 'todas', etiqueta: 'Todas' },
];

const TIPOS: Record<TipoCuenta, { icono: LucideIcon; clase: string }> = {
    Administración: { icono: ShieldCheck, clase: 'bg-primary/10 text-primary' },
    Director: { icono: UserCog, clase: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
    Profesor: { icono: UserRound, clase: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    Alumno: { icono: GraduationCap, clase: 'bg-amber-500/10 text-amber-800 dark:text-amber-300' },
};

function TipoChip({ tipo }: { tipo: TipoCuenta }) {
    const { icono: Icono, clase } = TIPOS[tipo];

    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', clase)}>
            <Icono className="size-3" />
            {tipo}
        </span>
    );
}

/** "Activo ahora" within five minutes, otherwise how long ago; sessions expire, so older accounts show nothing. */
function Actividad({ iso }: { iso: string | null }) {
    if (!iso) {
        return <span className="text-muted-foreground text-xs">Sin sesión activa</span>;
    }

    const reciente = Date.now() - new Date(iso).getTime() < 5 * 60 * 1000;

    return (
        <span className="flex items-center gap-1.5 text-xs whitespace-nowrap" title={new Date(iso).toLocaleString('es-MX')}>
            <span className={cn('size-1.5 rounded-full', reciente ? 'bg-emerald-500' : 'bg-muted-foreground/40')} aria-hidden="true" />
            {reciente ? 'Activo ahora' : haceTiempo(iso)}
        </span>
    );
}

export default function UsersIndex({ users, conteos, tipo, search, perPage }: UsersIndexProps) {
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState(search);
    const isFirstRender = useRef(true);

    const recargar = (params: { tipo?: Tipo; search?: string; per_page?: number | string }) => {
        router.get(
            route('admin.users.index'),
            { tipo, search: searchTerm, per_page: perPage, ...params },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timeout = setTimeout(() => recargar({ search: searchTerm }), 350);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    const handleDelete = (userId: number) => {
        setError(null);
        router.delete(route('admin.users.destroy', userId), {
            preserveScroll: true,
            onError: (errors) => setError(errors.user ?? 'No se pudo eliminar el usuario.'),
        });
    };

    const acciones = (user: AdminUser) =>
        user.ficha_url ? (
            // Director, profesor and alumno accounts are managed from their own record.
            <Button variant="ghost" size="sm" asChild>
                <Link href={user.ficha_url}>
                    <IdCard className="size-4" />
                    Ver ficha
                </Link>
            </Button>
        ) : (
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={route('admin.users.edit', user.id)}>
                        <Pencil className="size-4" />
                        <span className="sr-only">Editar a {user.name}</span>
                    </Link>
                </Button>
                {!user.es_yo && (
                    <DeleteConfirmDialog
                        title={`¿Eliminar a ${user.name}?`}
                        description="Esta acción no se puede deshacer. La persona perderá el acceso al sistema de inmediato."
                        onConfirm={() => handleDelete(user.id)}
                    />
                )}
            </div>
        );

    const identidad = (user: AdminUser) => (
        <div className="flex min-w-0 items-center gap-3">
            <PersonaAvatar nombre={user.name} fotoUrl={user.foto_url} className="size-9" />
            <div className="min-w-0">
                <p className="flex items-center gap-2 leading-snug font-medium">
                    <span className="truncate">{user.name}</span>
                    {user.es_yo && <span className="bg-primary/10 text-primary shrink-0 rounded-full px-1.5 text-[11px] font-medium">Tú</span>}
                </p>
                <p className="text-muted-foreground truncate text-xs">{user.email}</p>
            </div>
        </div>
    );

    const rolesExtra = (user: AdminUser) => {
        // The type already names the main role; list only the others (e.g. an admin who is also a director).
        const principal = user.tipo === 'Administración' ? 'Admin' : user.tipo;
        const otros = user.roles.filter((rol) => rol !== principal);

        return otros.length > 0 ? <span className="text-muted-foreground text-xs">+ {otros.join(', ')}</span> : null;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Usuarios" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                            <Users className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
                            <p className="text-muted-foreground text-sm">
                                {conteos.todas} {conteos.todas === 1 ? 'cuenta' : 'cuentas'} con acceso · aquí se crean las de administración
                            </p>
                        </div>
                    </div>
                    <Button asChild className="w-full shadow-sm sm:w-auto">
                        <Link href={route('admin.users.create')}>
                            <Plus className="size-4" />
                            Crear usuario
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

                <Card className="gap-0 overflow-hidden p-0">
                    <div className="flex flex-col gap-3 border-b p-3 sm:p-4">
                        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Tipo de cuenta">
                            {PESTANAS.map((pestana) => {
                                const activa = tipo === pestana.valor;

                                return (
                                    <button
                                        key={pestana.valor}
                                        type="button"
                                        role="tab"
                                        aria-selected={activa}
                                        onClick={() => recargar({ tipo: pestana.valor })}
                                        className={cn(
                                            'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                                            activa
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                        )}
                                    >
                                        {pestana.etiqueta}
                                        <span
                                            className={cn(
                                                'min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums',
                                                activa ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            {conteos[pestana.valor]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="relative lg:max-w-md">
                            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Nombre o correo..."
                                className="pl-9"
                                aria-label="Buscar cuentas"
                            />
                        </div>
                        {tipo !== 'administracion' && tipo !== 'todas' && (
                            <p className="text-muted-foreground text-xs">
                                Estas cuentas se administran desde la ficha de cada persona («Ver ficha»).
                            </p>
                        )}
                    </div>

                    {users.data.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-16 text-center">
                            <div className="bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-full">
                                <Users className="size-6" />
                            </div>
                            <p className="font-medium">{search ? 'Ninguna cuenta coincide con la búsqueda' : 'No hay cuentas de este tipo'}</p>
                            {search && (
                                <Button variant="outline" className="mt-5" onClick={() => setSearchTerm('')}>
                                    <X className="size-4" />
                                    Limpiar búsqueda
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Wide screens: table. */}
                            <div className="hidden overflow-x-auto lg:block">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-muted-foreground bg-muted/30 border-b text-xs tracking-wide uppercase">
                                            <th className="px-3 py-2.5 pl-4 font-medium">Cuenta</th>
                                            <th className="px-3 py-2.5 font-medium">Tipo</th>
                                            <th className="px-3 py-2.5 font-medium">Última actividad</th>
                                            <th className="w-32 px-3 py-2.5" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence initial={false}>
                                            {users.data.map((user, index) => (
                                                <motion.tr
                                                    key={user.id}
                                                    layout
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.2, delay: index * 0.02 }}
                                                    className="hover:bg-muted/40 border-b transition-colors last:border-0"
                                                >
                                                    <td className="px-3 py-3 pl-4">{identidad(user)}</td>
                                                    <td className="px-3 py-3">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <TipoChip tipo={user.tipo} />
                                                            {rolesExtra(user)}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <Actividad iso={user.ultima_actividad} />
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <div className="flex justify-end">{acciones(user)}</div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>

                            {/* Phones and tablets: one row per account. */}
                            <ul className="divide-y lg:hidden">
                                {users.data.map((user) => (
                                    <li key={user.id} className="flex items-start gap-3 px-4 py-3">
                                        <div className="min-w-0 flex-1 space-y-1.5">
                                            {identidad(user)}
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-12">
                                                <TipoChip tipo={user.tipo} />
                                                {rolesExtra(user)}
                                                <Actividad iso={user.ultima_actividad} />
                                            </div>
                                        </div>
                                        <div className="shrink-0">{acciones(user)}</div>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                    <span>
                                        {users.from ?? 0}–{users.to ?? 0} de {users.total}
                                    </span>
                                    <Select value={String(perPage)} onValueChange={(value) => recargar({ per_page: value })}>
                                        <SelectTrigger className="h-8 w-18" aria-label="Cuentas por página">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="15">15</SelectItem>
                                            <SelectItem value="20">20</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span>por página</span>
                                </div>

                                <Pagination links={users.links} />
                            </div>
                        </>
                    )}
                </Card>
            </motion.div>
        </AppLayout>
    );
}
