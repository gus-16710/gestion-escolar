import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <AppLogoIcon className="text-sidebar-primary size-8 group-data-[collapsible=icon]:size-6" />
            <div className="ml-1 grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold tracking-wide">CICCIS</span>
                <span className="text-sidebar-foreground/70 truncate text-xs">Gestión escolar</span>
            </div>
        </>
    );
}
