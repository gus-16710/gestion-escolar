import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export interface NavSection {
    /** Section heading; omitted for the first block (Inicio). */
    title?: string;
    items: NavItem[];
}

/** Active on the module's own page and on any page under it (e.g. /grupos/5/edit), ignoring the query string. */
export function isActiveUrl(currentUrl: string, url: string): boolean {
    const path = currentUrl.split('?')[0];

    return path === url || path.startsWith(`${url}/`);
}

// Accent bar on the left edge of the active item, in the brand green; hidden while the sidebar is collapsed to icons.
const ACTIVE_ACCENT =
    'relative data-[active=true]:before:absolute data-[active=true]:before:inset-y-1.5 data-[active=true]:before:left-0 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-full data-[active=true]:before:bg-sidebar-primary group-data-[collapsible=icon]:before:hidden';

export function NavMain({ sections }: { sections: NavSection[] }) {
    const page = usePage();

    return (
        <>
            {sections
                .filter((section) => section.items.length > 0)
                .map((section, index) => (
                    <SidebarGroup key={section.title ?? index} className="px-2 py-1">
                        {section.title && (
                            <SidebarGroupLabel className="text-sidebar-foreground/55 text-[11px] font-semibold tracking-wider uppercase">
                                {section.title}
                            </SidebarGroupLabel>
                        )}
                        <SidebarMenu className="gap-0.5">
                            {section.items.map((item) => {
                                const active = isActiveUrl(page.url, item.url);

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={active}
                                            tooltip={item.title}
                                            className={cn(
                                                'h-9 pl-3 transition-colors [&>svg]:opacity-75 data-[active=true]:[&>svg]:opacity-100',
                                                'data-[active=true]:[&>svg]:text-sidebar-primary',
                                                ACTIVE_ACCENT,
                                            )}
                                        >
                                            <Link href={item.url} prefetch aria-current={active ? 'page' : undefined}>
                                                {item.icon && <item.icon />}
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
        </>
    );
}
