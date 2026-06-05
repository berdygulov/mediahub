import type { Auth } from '@/types/auth';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            sidebarFolders: Array<{ id: number; name: string; parent_id: number | null }>;
            [key: string]: unknown;
        };
    }
}
