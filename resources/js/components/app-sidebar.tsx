import { NavMain, type NavSection } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Backpack,
    Building2,
    CalendarOff,
    GraduationCap,
    KeyRound,
    LayoutGrid,
    ShieldCheck,
    UserCog,
    UserRound,
    Users,
    UsersRound,
} from 'lucide-react';
import AppLogo from './app-logo';

type Seccion = 'Académico' | 'Personas';

// Each module is shown only when the user has its `view` permission (also used by the start page shortcuts).
export const moduleNavItems: (NavItem & { permission: string; seccion: Seccion })[] = [
    { title: 'Grupos', url: '/grupos', icon: Users, permission: 'view groups', seccion: 'Académico' },
    { title: 'Cursos', url: '/cursos', icon: GraduationCap, permission: 'view courses', seccion: 'Académico' },
    { title: 'Calendario', url: '/calendario', icon: CalendarOff, permission: 'view groups', seccion: 'Académico' },
    { title: 'Planteles', url: '/planteles', icon: Building2, permission: 'view planteles', seccion: 'Académico' },
    { title: 'Alumnos', url: '/alumnos', icon: Backpack, permission: 'view students', seccion: 'Personas' },
    { title: 'Profesores', url: '/profesores', icon: UserRound, permission: 'view teachers', seccion: 'Personas' },
    { title: 'Directores', url: '/admin/directores', icon: UserCog, permission: 'manage directors', seccion: 'Personas' },
];

const adminNavItems: NavItem[] = [
    { title: 'Usuarios', url: '/admin/users', icon: UsersRound },
    { title: 'Roles', url: '/admin/roles', icon: ShieldCheck },
    { title: 'Permisos', url: '/admin/permissions', icon: KeyRound },
];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;

    const modulos = moduleNavItems.filter((item) => auth.permissions.includes(item.permission));
    const seccion = (nombre: Seccion) => modulos.filter((item) => item.seccion === nombre);

    const sections: NavSection[] = [
        { items: [{ title: 'Inicio', url: '/dashboard', icon: LayoutGrid }] },
        { title: 'Académico', items: seccion('Académico') },
        { title: 'Personas', items: seccion('Personas') },
        { title: 'Administración', items: auth.roles.includes('Admin') ? adminNavItems : [] },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild tooltip="Inicio">
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarSeparator className="mx-3" />

            <SidebarContent className="py-1">
                <NavMain sections={sections} />
            </SidebarContent>

            <SidebarSeparator className="mx-3" />

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
