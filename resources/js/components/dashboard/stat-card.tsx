import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

interface StatCardProps {
    titulo: string;
    valor: string;
    icon: LucideIcon;
    /** Supporting line under the number, e.g. "+3 inscritos este mes". */
    contexto?: string;
    /** Change vs. the previous period, in the value's unit (percentage points, count...). */
    delta?: { valor: number; texto: string; mejorSiSube?: boolean } | null;
}

/** KPI tile: one big number, what it means, and how it moved. */
export function StatCard({ titulo, valor, icon: Icon, contexto, delta }: StatCardProps) {
    const sube = delta ? delta.valor > 0 : false;
    const bueno = delta ? (delta.mejorSiSube ?? true) === sube : false;

    return (
        <Card className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-sm font-medium">{titulo}</p>
                <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
                    <Icon className="size-4" />
                </div>
            </div>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">{valor}</p>
            <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                {delta && delta.valor !== 0 && (
                    <span
                        className={cn(
                            'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium',
                            bueno ? 'bg-secondary text-secondary-foreground' : 'bg-destructive/10 text-destructive',
                        )}
                    >
                        {sube ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {delta.texto}
                    </span>
                )}
                {contexto && <span className="text-muted-foreground">{contexto}</span>}
            </div>
        </Card>
    );
}
