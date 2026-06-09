<?php

namespace App\Http\Controllers\Admin;

use App\ActivityEvent;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LogController extends Controller
{
    public function index(Request $request): Response
    {
        $event = $request->query('event');
        $userId = $request->query('user_id');
        $order = $request->query('order', 'desc');

        if (! in_array($order, ['asc', 'desc'])) {
            $order = 'desc';
        }

        $logs = ActivityLog::with('user:id,name,email')
            ->when($event, fn ($q) => $q->where('event', $event))
            ->when($userId, fn ($q) => $q->where('user_id', $userId))
            ->orderBy('created_at', $order)
            ->paginate(50)
            ->withQueryString();

        $users = User::orderBy('name')->get(['id', 'name', 'email']);

        return Inertia::render('admin/logs', [
            'logs' => $logs,
            'filters' => [
                'event' => $event ?? '',
                'user_id' => $userId ? (int) $userId : '',
                'order' => $order,
            ],
            'eventTypes' => collect(ActivityEvent::cases())->map(fn ($e) => [
                'value' => $e->value,
                'label' => match ($e) {
                    ActivityEvent::Login => 'Вход',
                    ActivityEvent::Logout => 'Выход',
                    ActivityEvent::FolderAccessGranted => 'Доступ выдан',
                    ActivityEvent::FolderAccessRevoked => 'Доступ отозван',
                },
            ]),
            'users' => $users,
        ]);
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:activity_logs,id'],
        ]);

        ActivityLog::whereIn('id', $validated['ids'])->delete();

        return back();
    }
}
