import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { forwardRef, useState, type ComponentProps } from 'react';

/** Password input with a lock icon and a button to show or hide what was typed. */
export const CampoContrasena = forwardRef<HTMLInputElement, Omit<ComponentProps<typeof Input>, 'type'>>(function CampoContrasena(
    { className, ...props },
    ref,
) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
            <Input ref={ref} type={visible ? 'text' : 'password'} className={cn('h-11 pr-11 pl-10', className)} {...props} />
            <button
                type="button"
                onClick={() => setVisible((valor) => !valor)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
                aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={visible}
                tabIndex={-1}
            >
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
        </div>
    );
});
