import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import Heading from '@/components/heading';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    return (
        <>
            <Head title="Настройки оформления" />

            <h1 className="sr-only">Настройки оформления</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Настройки оформления"
                    description="Настройте внешний вид интерфейса"
                />
                <AppearanceTabs />
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Настройки оформления',
            href: editAppearance(),
        },
    ],
};
