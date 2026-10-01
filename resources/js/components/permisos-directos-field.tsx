import { CheckboxList } from '@/components/checkbox-list';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { etiquetaPermiso } from '@/lib/permisos';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface PermisosDirectosFieldProps {
    permisos: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    error?: string;
}

/** Direct permissions on top of the role's, tucked away: the role is normally enough. Opens by itself when some are set. */
export function PermisosDirectosField({ permisos, selected, onChange, error }: PermisosDirectosFieldProps) {
    const [abierto, setAbierto] = useState(selected.length > 0 || Boolean(error));

    return (
        <Collapsible open={abierto} onOpenChange={setAbierto} className="space-y-3">
            <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm font-medium">
                <ChevronRight className={`size-4 transition-transform ${abierto ? 'rotate-90' : ''}`} />
                Opciones avanzadas
                {selected.length > 0 && ` (${selected.length} permisos directos)`}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2">
                <p className="text-muted-foreground text-xs">
                    Normalmente basta con el rol. Usa esto solo para dar un permiso extra a una cuenta en particular.
                </p>
                <CheckboxList
                    idPrefix="permission"
                    label="Permisos directos (además de los que dan los roles)"
                    options={permisos}
                    selected={selected}
                    onChange={onChange}
                    renderLabel={etiquetaPermiso}
                    error={error}
                />
            </CollapsibleContent>
        </Collapsible>
    );
}
