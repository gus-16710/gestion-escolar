import { CursoTarjeta, type CursoResumen, type EstadisticasCurso } from '@/components/cursos/curso-tarjeta';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { Pagination, type PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertCircle, ArrowRight, GraduationCap, Pencil, Plus, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface CursoRow extends CursoResumen {
    id: number;
    estadisticas: EstadisticasCurso | null;
}

interface PaginatedCursos {
    data: CursoRow[];
    links: PaginationLink[];
    total: number;
    from: number | null;
    to: number | null;
}

type Conteos = Record<'todos' | 'activos' | 'inactivos', number>;

interface CursosIndexProps {
    cursos: PaginatedCursos;
    conteos: Conteos;
    filters: { search: string; estado: 'activos' | 'inactivos' | null };
    perPage: number;
    canManage: boolean;
    canViewGroups: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Cursos', href: '/cursos' }];

const PESTANAS: { valor: CursosIndexProps['filters']['estado']; etiqueta: string; conteo: keyof Conteos }[] = [
    { valor: null, etiqueta: 'Todos', conteo: 'todos' },
    { valor: 'activos', etiqueta: 'Activos', conteo: 'activos' },
    { valor: 'inactivos', etiqueta: 'Inactivos', conteo: 'inactivos' },
];

export default function CursosIndex({ cursos, conteos, filters, perPage, canManage, canViewGroups }: CursosIndexProps) {
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState(filters.search);
    const isFirstRender = useRef(true);
    const hayFiltros = filters.search !== '' || filters.estado !== null;

    const visit = (overrides: Record<string, string | number | null>) => {
        router.get(
            route('cursos.index'),
            { search: searchTerm, estado: filters.estado, per_page: perPage, ...overrides },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const limpiarFiltros = () => {
        setSearchTerm('');
        router.get(route('cursos.index'), { per_page: perPage }, { preserveScroll: true, replace: true });
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

    const handleDelete = (cursoId: number) => {
        setError(null);
        router.delete(route('cursos.destroy', cursoId), {
            preserveScroll: true,
            onError: (errors) => setError(errors.curso ?? 'No se pudo eliminar el curso.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cursos" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                            <GraduationCap className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">Cursos</h1>
                            <p className="text-muted-foreground text-sm">
                                Catálogo de la escuela · {conteos.activos} {conteos.activos === 1 ? 'activo' : 'activos'}
                                {conteos.inactivos > 0 && ` · ${conteos.inactivos} ${conteos.inactivos === 1 ? 'inactivo' : 'inactivos'}`}
                            </p>
                        </div>
                    </div>
                    {canManage && (
                        <Button asChild className="w-full shadow-sm sm:w-auto">
                            <Link href={route('cursos.create')}>
                                <Plus className="size-4" />
                                Crear curso
                            </Link>
                        </Button>
                    )}
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
                    {/* Toolbar: activo tabs with counts, then search. */}
                    <div className="flex flex-col gap-3 border-b p-3 sm:p-4 lg:flex-row lg:items-center">
                        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Estado del curso">
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
                                placeholder="Buscar por nombre o clave..."
                                className="pl-9"
                                aria-label="Buscar cursos"
                            />
                        </div>
                    </div>

                    {cursos.data.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-16 text-center">
                            <div className="bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-full">
                                <GraduationCap className="size-6" />
                            </div>
                            <p className="font-medium">{hayFiltros ? 'Ningún curso coincide con los filtros' : 'Aún no hay cursos en el catálogo'}</p>
                            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                                {hayFiltros
                                    ? 'Prueba con otro nombre, otra clave u otra pestaña.'
                                    : canManage
                                      ? 'Agrega el primer curso y elige en qué planteles se imparte.'
                                      : 'Cuando la administración agregue cursos aparecerán aquí.'}
                            </p>
                            <div className="mt-5 flex gap-2">
                                {hayFiltros && (
                                    <Button variant="outline" onClick={limpiarFiltros}>
                                        <X className="size-4" />
                                        Limpiar filtros
                                    </Button>
                                )}
                                {canManage && !hayFiltros && (
                                    <Button asChild>
                                        <Link href={route('cursos.create')}>
                                            <Plus className="size-4" />
                                            Crear curso
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-3 p-3 sm:p-4 md:grid-cols-2 2xl:grid-cols-3">
                                <AnimatePresence initial={false}>
                                    {cursos.data.map((curso, index) => (
                                        <motion.div
                                            key={curso.id}
                                            layout
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2, delay: index * 0.03 }}
                                        >
                                            <CursoTarjeta
                                                curso={curso}
                                                estadisticas={curso.estadisticas}
                                                className={cn(!curso.activo && 'bg-muted/30')}
                                                acciones={
                                                    (canViewGroups || canManage) && (
                                                        <>
                                                            {canViewGroups && (
                                                                <Button variant="ghost" size="sm" asChild className="text-primary">
                                                                    <Link href={route('grupos.index', { search: curso.nombre })}>
                                                                        Ver grupos
                                                                        <ArrowRight className="size-4" />
                                                                    </Link>
                                                                </Button>
                                                            )}
                                                            {canManage && (
                                                                <div className="ml-auto flex items-center gap-1">
                                                                    <Button variant="outline" size="sm" asChild>
                                                                        <Link href={route('cursos.edit', curso.id)}>
                                                                            <Pencil className="size-4" />
                                                                            Editar
                                                                        </Link>
                                                                    </Button>
                                                                    <DeleteConfirmDialog
                                                                        title={`¿Eliminar ${curso.nombre}?`}
                                                                        description="El curso sale del catálogo; sus grupos concluidos y su historial se conservan. No se puede eliminar mientras tenga grupos planeados o en curso."
                                                                        onConfirm={() => handleDelete(curso.id)}
                                                                    />
                                                                </div>
                                                            )}
                                                        </>
                                                    )
                                                }
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                    <span>
                                        {cursos.from ?? 0}–{cursos.to ?? 0} de {cursos.total}
                                    </span>
                                    <Select value={String(perPage)} onValueChange={(value) => visit({ per_page: value })}>
                                        <SelectTrigger className="h-8 w-18" aria-label="Cursos por página">
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

                                <Pagination links={cursos.links} />
                            </div>
                        </>
                    )}
                </Card>
            </motion.div>
        </AppLayout>
    );
}
