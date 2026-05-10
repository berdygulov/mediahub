import { Head, Link, usePage } from '@inertiajs/react';
import { Upload, Film, Image, Share2 } from 'lucide-react';
import { dashboard, login, register } from '@/routes';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="MediaHub — Your Media Library" />
            <div className="flex min-h-screen flex-col bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
                <header className="flex items-center justify-between px-6 py-4 lg:px-12">
                    <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-md bg-[#1b1b18] dark:bg-[#EDEDEC]">
                            <Film className="size-4 text-white dark:text-[#1b1b18]" />
                        </div>
                        <span className="text-lg font-semibold">MediaHub</span>
                    </div>
                    <nav className="flex items-center gap-3">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="inline-block rounded-md border border-[#19140035] px-5 py-1.5 text-sm hover:border-[#1915014a] dark:border-[#3E3E3A] dark:hover:border-[#62605b]"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="inline-block px-5 py-1.5 text-sm text-[#706f6c] hover:text-[#1b1b18] dark:text-[#A1A09A] dark:hover:text-[#EDEDEC]"
                                >
                                    Log in
                                </Link>
                                {canRegister && (
                                    <Link
                                        href={register()}
                                        className="inline-block rounded-md border border-[#19140035] bg-[#1b1b18] px-5 py-1.5 text-sm text-white hover:bg-black dark:border-[#3E3E3A] dark:bg-[#EDEDEC] dark:text-[#1b1b18] dark:hover:bg-white"
                                    >
                                        Get started
                                    </Link>
                                )}
                            </>
                        )}
                    </nav>
                </header>

                <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center lg:px-12">
                    <h1 className="mb-4 text-5xl font-bold tracking-tight lg:text-6xl">
                        Your media,{' '}
                        <span className="text-[#706f6c] dark:text-[#A1A09A]">organised.</span>
                    </h1>
                    <p className="mb-10 max-w-xl text-lg text-[#706f6c] dark:text-[#A1A09A]">
                        Upload, manage, and share your videos, images, and documents in one place.
                    </p>
                    <div className="flex gap-3">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="inline-block rounded-md bg-[#1b1b18] px-6 py-2.5 text-sm font-medium text-white hover:bg-black dark:bg-[#EDEDEC] dark:text-[#1b1b18] dark:hover:bg-white"
                            >
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                {canRegister && (
                                    <Link
                                        href={register()}
                                        className="inline-block rounded-md bg-[#1b1b18] px-6 py-2.5 text-sm font-medium text-white hover:bg-black dark:bg-[#EDEDEC] dark:text-[#1b1b18] dark:hover:bg-white"
                                    >
                                        Get started free
                                    </Link>
                                )}
                                <Link
                                    href={login()}
                                    className="inline-block rounded-md border border-[#19140035] px-6 py-2.5 text-sm font-medium hover:border-[#1915014a] dark:border-[#3E3E3A] dark:hover:border-[#62605b]"
                                >
                                    Log in
                                </Link>
                            </>
                        )}
                    </div>
                </main>

                <section className="border-t border-[#e3e3e0] px-6 py-16 dark:border-[#2E2E2A]">
                    <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-4">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="flex size-10 items-center justify-center rounded-full bg-[#f4f4f0] dark:bg-[#1D1D1A]">
                                <Upload className="size-5 text-[#706f6c] dark:text-[#A1A09A]" />
                            </div>
                            <h3 className="text-sm font-medium">Upload</h3>
                            <p className="text-xs text-[#706f6c] dark:text-[#A1A09A]">
                                Drag and drop any file type with ease
                            </p>
                        </div>
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="flex size-10 items-center justify-center rounded-full bg-[#f4f4f0] dark:bg-[#1D1D1A]">
                                <Film className="size-5 text-[#706f6c] dark:text-[#A1A09A]" />
                            </div>
                            <h3 className="text-sm font-medium">Videos</h3>
                            <p className="text-xs text-[#706f6c] dark:text-[#A1A09A]">
                                Stream and manage your video library
                            </p>
                        </div>
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="flex size-10 items-center justify-center rounded-full bg-[#f4f4f0] dark:bg-[#1D1D1A]">
                                <Image className="size-5 text-[#706f6c] dark:text-[#A1A09A]" />
                            </div>
                            <h3 className="text-sm font-medium">Images</h3>
                            <p className="text-xs text-[#706f6c] dark:text-[#A1A09A]">
                                Browse your photos and graphics
                            </p>
                        </div>
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="flex size-10 items-center justify-center rounded-full bg-[#f4f4f0] dark:bg-[#1D1D1A]">
                                <Share2 className="size-5 text-[#706f6c] dark:text-[#A1A09A]" />
                            </div>
                            <h3 className="text-sm font-medium">Share</h3>
                            <p className="text-xs text-[#706f6c] dark:text-[#A1A09A]">
                                Share files with a simple link
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
