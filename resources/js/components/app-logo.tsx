import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <div className="flex items-center gap-2">
            <AppLogoIcon className="size-6 fill-current text-foreground dark:text-primary" />
            <div className="truncate leading-tight">
                <span className="text-lg font-semibold">
                    MediaHub
                </span>
            </div>
        </div>
    );
}
