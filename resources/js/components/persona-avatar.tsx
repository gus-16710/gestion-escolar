import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';

interface PersonaAvatarProps {
    nombre: string;
    fotoUrl?: string | null;
    className?: string;
    fallbackClassName?: string;
}

/** Avatar of an alumno or profesor: their photo when they have one, their initials otherwise. */
export function PersonaAvatar({ nombre, fotoUrl, className, fallbackClassName }: PersonaAvatarProps) {
    const getInitials = useInitials();

    return (
        <Avatar className={cn('size-9 shrink-0', className)}>
            {fotoUrl && <AvatarImage src={fotoUrl} alt={nombre} className="object-cover" />}
            <AvatarFallback className={cn('text-xs', fallbackClassName)}>{getInitials(nombre)}</AvatarFallback>
        </Avatar>
    );
}
