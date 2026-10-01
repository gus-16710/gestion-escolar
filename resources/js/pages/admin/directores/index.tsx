import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { PlantelesDirector, type PlantelDirigido } from '@/components/directores/planteles-director';
import { Pagination, type PaginationLink } from '@/components/pagination';
import { PersonaAvatar } from '@/components/persona-avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { cn, formatTelefono } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertCircle, AlertTriangle, GraduationCap, KeyRound, Pencil, Phone, Plus, Search, UserCog, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface DirectorRow {
    id: number;
    nombre_completo: string;
    foto_url: string | null;
    telefono: string | null;
    email: string;
    activo: boolean;
    es_yo: boolean;
    /** Their separate profesor record, when they also teach. */
    profesor_id: number | null;
    planteles: PlantelDirigido[];
}

interface PaginatedDirectores {
    data: DirectorRow[];
    links: PaginationLink[];
    total: number;
    from: number | null;
    to: number | null;
}

type Estado = 'activos' | 'inactivos';

interface DirectoresIndexProps {
    directores: PaginatedDirectores;
    conteos: Record<'todos' | Estado, number>;
    plantelesSinDirector: { id: number; nombre: string; clave: string }[];
    filters: { search: string; estado: Estado | null };
    perPage: number;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Directores', href: '/admin/directores' }];

const PESTANAS: { valor: Estado | null; etiqueta: string; conteo: 'todos' | Estado }[] = [
    { valor: null, etiqueta: 'Todos', conteo: 'todos' },
    { valor: 'activos', etiqueta: 'Activos', conteo: 'activos' },
    { valor: 'inactivos', etiqueta: 'Inactivos', conteo: 'inactivos' },
];

export default function DirectoresIndex({ directores, conteos, plantelesSinDirector, filters, perPage }: DirectoresIndexProps) {
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const isFirstRender = useRef(true);
    const hayFiltros = filters.search !== '' || filters.estado !== null;

    const visit = (overrides: Record<string, string | number | null>) => {
        router.get(
            route('admin.directores.index'),
            { search: searchTerm, estado: filters.estado, per_page: perPage, ...overrides },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const limpiarFiltros = () => {
        setSearchTerm('');
        router.get(route('admin.directores.index'), { per_page: perPage }, { preserveScroll: true, replace: true });
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timeout = setTimeout(() => visit({ search: searchTerm }), 350);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    const handleDelete = (directorId: number) => {
        setError(null);
        router.delete(route('admin.directores.destroy', directorId), {
            preserveScroll: true,
            onError: (errors) => setError(errors.director ?? 'No se pudo eliminar al director.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Directores" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                            <UserCog className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">Directores</h1>
                            <p className="text-muted-foreground text-sm">Quién lleva cada plantel: inscripciones, grupos y profesores.</p>
                        </div>
                    </div>
                    <Button asChild className="w-full shadow-sm sm:w-auto">
                        <Link href={route('admin.directores.create')}>
                            <Plus className="size-4" />
                            Registrar director
                        </Link>
                    </Button>
                </div>

                {plantelesSinDirector.length > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                        <p>
                            {plantelesSinDirector.length === 1
                                ? 'Este plantel activo no tiene director: '
                                : 'Estos planteles activos no tienen director: '}
                            <span className="font-medium">{plantelesSinDirector.map((plantel) => plantel.nombre).join(', ')}</span>. Solo la
                            administración ve su información.
                        </p>
                    </div>
                )}

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
                    <div className="flex flex-col gap-3 border-b p-3 sm:p-4 lg:flex-row lg:items-center">
                        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Estado del director">
                            {PESTANAS.map((pestana) => {
                                const activa = filters.estado === pestana.valor;

                                return (
                                    <button
                                        key={pestana.etiqueta}
                                        type="button"
                                        role="tab"
                                        aria-selected={activa}
                                        onClick={() => visit({ estado: pestana.valor })}
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
                                            {conteos[pestana.conteo]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="relative flex-1 lg:ml-auto lg:max-w-sm">
                            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Nombre, CURP o correo..."
                                className="pl-9"
                                aria-label="Buscar directores"
                            />
                        </div>
                    </div>

                    {directores.data.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-16 text-center">
                            <div className="bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-full">
                                <UserCog className="size-6" />
                            </div>
                            <p className="font-medium">{hayFiltros ? 'Ningún director coincide con los filtros' : 'Aún no hay directores'}</p>
                            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                                {hayFiltros
                                    ? 'Prueba con otra búsqueda u otra pestaña.'
                                    : 'Registra a quien lleva las inscripciones y los grupos de un plantel.'}
                            </p>
                            <div className="mt-5 flex gap-2">
                                {hayFiltros ? (
                                    <Button variant="outline" onClick={limpiarFiltros}>
                                        <X className="size-4" />
                                        Limpiar filtros
                                    </Button>
                                ) : (
                                    <Button asChild>
                                        <Link href={route('admin.directores.create')}>
                                            <Plus className="size-4" />
                                            Registrar director
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-2 2xl:grid-cols-3">
                                <AnimatePresence initial={false}>
                                    {directores.data.map((director, index) => (
                                        <motion.div
                                            key={director.id}
                                            layout
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2, delay: index * 0.03 }}
                                        >
                                            <TarjetaDirector director={director} onDelete={() => handleDelete(director.id)} />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                    <span>
                                        {directores.from ?? 0}–{directores.to ?? 0} de {directores.total}
                                    </span>
                                    <Select value={String(perPage)} onValueChange={(value) => visit({ per_page: value })}>
                                        <SelectTrigger className="h-8 w-18" aria-label="Directores por página">
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

                                <Pagination links={directores.links} />
                            </div>
                        </>
                    )}
                </Card>
            </motion.div>
        </AppLayout>
    );
}

function TarjetaDirector({ director, onDelete }: { director: DirectorRow; onDelete: () => void }) {
    return (
        <article
            className={cn('bg-card flex h-full flex-col rounded-xl border transition-shadow hover:shadow-sm', !director.activo && 'bg-muted/30')}
        >
            <div className="flex items-start gap-3 p-4">
                <PersonaAvatar nombre={director.nombre_completo} fotoUrl={director.foto_url} className="size-14" />
                <div className="min-w-0 flex-1">
                    <h3 className="leading-snug font-semibold">{director.nombre_completo}</h3>
                    <p className="text-muted-foreground text-sm">Dirección</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        {!director.activo && <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">Inactivo</span>}
                        {director.es_yo && <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">Tú</span>}
                        {director.profesor_id && (
                            <Link
                                href={route('profesores.edit', director.profesor_id)}
                                className="text-primary flex items-center gap-1 font-medium hover:underline"
                                title="Tiene una ficha de profesor aparte, con su propia cuenta"
                            >
                                <GraduationCap className="size-3.5" />
                                También es profesor
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-4 pb-3 text-sm">
                <span className="flex min-w-0 items-center gap-2" title="Usuario para iniciar sesión">
                    <KeyRound className="text-muted-foreground size-4 shrink-0" />
                    <span className="truncate">{director.email}</span>
                </span>
                {director.telefono ? (
                    <a href={`tel:${director.telefono.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:underline">
                        <Phone className="text-muted-foreground size-4 shrink-0" />
                        {formatTelefono(director.telefono)}
                    </a>
                ) : (
                    <span className="text-muted-foreground flex items-center gap-2">
                        <Phone className="size-4 shrink-0" />
                        Sin teléfono
                    </span>
                )}
            </div>

            <div className="flex-1 border-t px-4 py-3">
                <p className="text-muted-foreground mb-2 text-xs">
                    {director.planteles.length === 1 ? 'Dirige 1 plantel' : `Dirige ${director.planteles.length} planteles`}
                </p>
                <PlantelesDirector planteles={director.planteles} />
            </div>

            <div className="flex items-center gap-1 border-t px-3 py-2.5">
                <Button variant="outline" size="sm" asChild className="ml-auto">
                    <Link href={route('admin.directores.edit', director.id)}>
                        <Pencil className="size-4" />
                        Editar
                    </Link>
                </Button>
                {!director.es_yo && (
                    <DeleteConfirmDialog
                        title={`¿Eliminar a ${director.nombre_completo}?`}
                        description="Se borra su ficha y deja de dirigir sus planteles. Su cuenta se conserva sin el rol de director (sigue apareciendo como quien inscribió a sus alumnos)."
                        onConfirm={onDelete}
                    />
                )}
            </div>
        </article>
    );
}
