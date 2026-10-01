import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { Pagination, type PaginationLink } from '@/components/pagination';
import {
    PlantelTarjeta,
    type CursoOfertado,
    type DirectorPlantel,
    type EstadisticasPlantel,
    type PlantelResumen,
} from '@/components/planteles/plantel-tarjeta';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertCircle, ArrowRight, Building2, Pencil, Plus, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface PlantelRow extends PlantelResumen {
    id: number;
    estadisticas: EstadisticasPlantel;
    proxima_apertura: string | null;
    cursos: CursoOfertado[];
    directores: DirectorPlantel[];
}

interface PaginatedPlanteles {
    data: PlantelRow[];
    links: PaginationLink[];
    total: number;
    from: number | null;
    to: number | null;
}

interface PlantelesIndexProps {
    planteles: PaginatedPlanteles;
    perPage: number;
    search: string;
    canManage: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Planteles', href: '/planteles' }];

export default function PlantelesIndex({ planteles, perPage, search, canManage }: PlantelesIndexProps) {
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState(search);
    const isFirstRender = useRef(true);

    const conClases = planteles.data.filter((plantel) => plantel.estadisticas.grupos_en_curso > 0).length;

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            router.get(
                route('planteles.index'),
                { search: searchTerm, per_page: perPage },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 350);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    const handleDelete = (plantelId: number) => {
        setError(null);
        router.delete(route('planteles.destroy', plantelId), {
            preserveScroll: true,
            onError: (errors) => setError(errors.plantel ?? 'No se pudo eliminar el plantel.'),
        });
    };

    const handlePerPageChange = (value: string) => {
        router.get(route('planteles.index'), { search: searchTerm, per_page: value }, { preserveState: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Planteles" />
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col gap-6 p-4 sm:p-6"
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                            <Building2 className="size-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">{canManage ? 'Planteles' : 'Mis planteles'}</h1>
                            <p className="text-muted-foreground text-sm">
                                {planteles.total} {planteles.total === 1 ? 'plantel' : 'planteles'}· {conClases} con clases en curso
                            </p>
                        </div>
                    </div>
                    {canManage && (
                        <Button asChild className="w-full shadow-sm sm:w-auto">
                            <Link href={route('planteles.create')}>
                                <Plus className="size-4" />
                                Crear plantel
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
                    <div className="border-b p-3 sm:p-4">
                        <div className="relative lg:max-w-md">
                            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar plantel o localidad..."
                                className="pl-9"
                                aria-label="Buscar planteles"
                            />
                        </div>
                    </div>

                    {planteles.data.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-16 text-center">
                            <div className="bg-muted text-muted-foreground mb-4 flex size-12 items-center justify-center rounded-full">
                                <Building2 className="size-6" />
                            </div>
                            <p className="font-medium">{search ? 'Ningún plantel coincide con la búsqueda' : 'Aún no hay planteles'}</p>
                            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                                {search
                                    ? 'Prueba con otro nombre, clave o localidad.'
                                    : canManage
                                      ? 'Registra la primera sede de la escuela.'
                                      : 'Pide a la administración que te asigne un plantel.'}
                            </p>
                            <div className="mt-5 flex gap-2">
                                {search && (
                                    <Button variant="outline" onClick={() => setSearchTerm('')}>
                                        <X className="size-4" />
                                        Limpiar búsqueda
                                    </Button>
                                )}
                                {canManage && !search && (
                                    <Button asChild>
                                        <Link href={route('planteles.create')}>
                                            <Plus className="size-4" />
                                            Crear plantel
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-3 p-3 sm:p-4 lg:grid-cols-2 2xl:grid-cols-3">
                                <AnimatePresence initial={false}>
                                    {planteles.data.map((plantel, index) => (
                                        <motion.div
                                            key={plantel.id}
                                            layout
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2, delay: index * 0.03 }}
                                        >
                                            <PlantelTarjeta
                                                plantel={plantel}
                                                estadisticas={plantel.estadisticas}
                                                proximaApertura={plantel.proxima_apertura}
                                                directores={plantel.directores}
                                                cursos={plantel.cursos}
                                                className={cn(!plantel.activo && 'bg-muted/30')}
                                                acciones={
                                                    <>
                                                        <Button variant="ghost" size="sm" asChild className="text-primary">
                                                            <Link href={route('grupos.index', { plantel_id: plantel.id })}>
                                                                Ver grupos
                                                                <ArrowRight className="size-4" />
                                                            </Link>
                                                        </Button>
                                                        {canManage && (
                                                            <div className="ml-auto flex items-center gap-1">
                                                                <Button variant="outline" size="sm" asChild>
                                                                    <Link href={route('planteles.edit', plantel.id)}>
                                                                        <Pencil className="size-4" />
                                                                        Editar
                                                                    </Link>
                                                                </Button>
                                                                <DeleteConfirmDialog
                                                                    title={`¿Eliminar ${plantel.nombre}?`}
                                                                    description="El plantel sale de la lista; sus grupos concluidos y su historial se conservan. No se puede eliminar mientras tenga grupos planeados o en curso."
                                                                    onConfirm={() => handleDelete(plantel.id)}
                                                                />
                                                            </div>
                                                        )}
                                                    </>
                                                }
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                    <span>
                                        {planteles.from ?? 0}–{planteles.to ?? 0} de {planteles.total}
                                    </span>
                                    <Select value={String(perPage)} onValueChange={handlePerPageChange}>
                                        <SelectTrigger className="h-8 w-18" aria-label="Planteles por página">
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

                                <Pagination links={planteles.links} />
                            </div>
                        </>
                    )}
                </Card>
            </motion.div>
        </AppLayout>
    );
}
