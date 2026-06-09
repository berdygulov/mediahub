<?php

namespace App\Http\Controllers;

use App\Models\File;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $baseQuery = File::query()->accessibleBy($user);

        $stats = [
            'total' => (clone $baseQuery)->count(),
            'video' => (clone $baseQuery)->where('type', 'video')->count(),
            'audio' => (clone $baseQuery)->where('type', 'audio')->count(),
            'storage' => (clone $baseQuery)->sum('size'),
        ];

        $recentFiles = (clone $baseQuery)
            ->with(['folder', 'user'])
            ->orderBy('created_at', 'desc')
            ->limit(6)
            ->get(['id', 'name', 'type', 'size', 'mime_type', 'folder_id', 'user_id', 'created_at']);

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'recentFiles' => $recentFiles,
        ]);
    }
}
