import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Transition } from '@headlessui/react';
import { CheckCircle2, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

/** A settings section: icon, title and description on top, its content below and an optional footer bar. */
export function TarjetaAjustes({
    icono: Icono,
    titulo,
    descripcion,
    children,
    pie,
    className,
}: {
    icono: LucideIcon;
    titulo: string;
    descripcion?: string;
    children: ReactNode;
    pie?: ReactNode;
    className?: string;
}) {
    return (
        <Card className={cn('gap-0 overflow-hidden p-0', className)}>
            <div className="flex items-start gap-3 border-b px-5 py-4 sm:px-6">
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Icono className="size-4" />
                </span>
                <div>
                    <h2 className="font-semibold">{titulo}</h2>
                    {descripcion && <p className="text-muted-foreground text-sm">{descripcion}</p>}
                </div>
            </div>
            <div className="px-5 py-5 sm:px-6">{children}</div>
            {pie && <div className="bg-muted/40 flex flex-wrap items-center justify-end gap-3 border-t px-5 py-3 sm:px-6">{pie}</div>}
        </Card>
    );
}

/** "Guardado" that fades in after a successful save. */
export function AvisoGuardado({ visible, texto = 'Cambios guardados' }: { visible: boolean; texto?: string }) {
    return (
        <Transition show={visible} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
                {texto}
            </p>
        </Transition>
    );
}
