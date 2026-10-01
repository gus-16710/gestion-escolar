import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

/** A numbered form step: a card with a header (number, icon, title, hint) and its fields. */
export function Seccion({
    numero,
    icono: Icono,
    titulo,
    descripcion,
    children,
}: {
    numero: number;
    icono: LucideIcon;
    titulo: string;
    descripcion: string;
    children: ReactNode;
}) {
    return (
        <Card className="gap-0 p-0">
            <div className="flex items-start gap-3 border-b px-5 py-4">
                <div className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    {numero}
                </div>
                <div className="min-w-0">
                    <h2 className="flex items-center gap-2 font-semibold">
                        <Icono className="text-muted-foreground size-4" />
                        {titulo}
                    </h2>
                    <p className="text-muted-foreground text-sm">{descripcion}</p>
                </div>
            </div>
            <div className="space-y-5 p-5">{children}</div>
        </Card>
    );
}

/** A selectable card used as a radio option, or as a checkbox with tipo="checkbox". */
export function OpcionTarjeta({
    seleccionada,
    onSelect,
    tipo = 'radio',
    disabled = false,
    className,
    children,
}: {
    seleccionada: boolean;
    onSelect: () => void;
    tipo?: 'radio' | 'checkbox';
    disabled?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            role={tipo}
            aria-checked={seleccionada}
            aria-disabled={disabled || undefined}
            onClick={() => !disabled && onSelect()}
            className={cn(
                'relative flex items-center gap-3 rounded-xl border p-3 pr-9 text-left transition-all',
                seleccionada ? 'border-primary bg-primary/5 ring-primary/20 ring-2' : 'hover:border-primary/40 hover:bg-muted/40',
                disabled && 'cursor-not-allowed',
                className,
            )}
        >
            {children}
            <span
                className={cn(
                    'absolute top-1/2 right-3 flex size-5 -translate-y-1/2 items-center justify-center border transition-colors',
                    tipo === 'radio' ? 'rounded-full' : 'rounded-md',
                    seleccionada ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                    disabled && 'opacity-60',
                )}
                aria-hidden="true"
            >
                {seleccionada && <Check className="size-3" />}
            </span>
        </button>
    );
}
