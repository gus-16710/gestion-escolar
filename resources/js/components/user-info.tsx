import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';

interface UserInfoProps {
    user: User;
    showEmail?: boolean;
    /** Second line (e.g. the role); takes the place of the email. */
    subtitle?: string;
}

export function UserInfo({ user, showEmail = false, subtitle }: UserInfoProps) {
    const getInitials = useInitials();
    const segundaLinea = subtitle ?? (showEmail ? user.email : null);

    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground rounded-full text-xs font-semibold">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                {segundaLinea && <span className="truncate text-xs opacity-70">{segundaLinea}</span>}
            </div>
        </>
    );
}
