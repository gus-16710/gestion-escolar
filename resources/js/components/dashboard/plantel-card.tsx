import { type PlantelResumen } from '@/components/dashboard/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Link } from '@inertiajs/react';
import { Backpack, BookOpen, Building2, UserRound, Users } from 'lucide-react';

/** One plantel at a glance; clicking it narrows the dashboard to that plantel. */
export function PlantelCard({ plantel }: { plantel: PlantelResumen }) {
    const cifras = [
        { icon: Backpack, etiqueta: 'Alumnos', valor: plantel.alumnos },
        { icon: Users, etiqueta: 'Grupos activos', valor: plantel.grupos_activos },
        { icon: UserRound, etiqueta: 'Profesores', valor: plantel.profesores },
        { icon: BookOpen, etiqueta: 'Cursos', valor: plantel.cursos },
    ];

    return (
        <Link href={route('dashboard', { plantel_id: plantel.id })} preserveScroll>
            <Card className="hover:border-primary/40 @container h-full p-4 transition-colors">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-md">
                            <Building2 className="size-5" />
                        </div>
                        <div>
                            <p className="font-medium">{plantel.nombre}</p>
                            <p className="text-muted-foreground text-xs">{plantel.localidad}</p>
                        </div>
                    </div>
                    {plantel.activo ? <Badge>Activo</Badge> : <Badge variant="secondary">Próximamente</Badge>}
                </div>
                {/* Four across only when the card itself is wide enough (it sits in a 2-column grid next to the sidebar). */}
                <div className="mt-4 grid grid-cols-2 gap-2 @lg:grid-cols-4">
                    {cifras.map(({ icon: Icon, etiqueta, valor }) => (
                        <div key={etiqueta} className="bg-muted/40 rounded-md px-2 py-2 text-center">
                            <p className="text-lg font-semibold tabular-nums">{valor}</p>
                            <p className="text-muted-foreground flex items-center justify-center gap-1 text-[11px]">
                                <Icon className="size-3" />
                                <span className="truncate">{etiqueta}</span>
                            </p>
                        </div>
                    ))}
                </div>
            </Card>
        </Link>
    );
}
