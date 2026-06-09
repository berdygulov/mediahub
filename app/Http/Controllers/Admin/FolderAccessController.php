<?php

namespace App\Http\Controllers\Admin;

use App\ActivityEvent;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class FolderAccessController extends Controller
{
    public function store(int $folderId, Request $request): RedirectResponse
    {
        $folder = Folder::findOrFail($folderId);

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $target = User::findOrFail($validated['user_id']);

        if ($target->is_admin) {
            return back()->withErrors(['user_id' => 'Нельзя выдать доступ администратору.']);
        }

        $access = $folder->accesses()->firstOrCreate(['user_id' => $target->id]);

        if ($access->wasRecentlyCreated) {
            ActivityLog::create([
                'user_id' => $request->user()->id,
                'event' => ActivityEvent::FolderAccessGranted,
                'description' => "Выдан доступ к папке «{$folder->name}» пользователю {$target->name}",
                'ip_address' => $request->ip(),
                'metadata' => [
                    'folder_id' => $folder->id,
                    'folder_name' => $folder->name,
                    'target_user_id' => $target->id,
                    'target_user_name' => $target->name,
                ],
            ]);
        }

        return back();
    }

    public function destroy(int $folderId, int $userId, Request $request): RedirectResponse
    {
        $folder = Folder::findOrFail($folderId);
        $target = User::findOrFail($userId);

        $folder->accesses()->where('user_id', $userId)->delete();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'event' => ActivityEvent::FolderAccessRevoked,
            'description' => "Отозван доступ к папке «{$folder->name}» у пользователя {$target->name}",
            'ip_address' => $request->ip(),
            'metadata' => [
                'folder_id' => $folder->id,
                'folder_name' => $folder->name,
                'target_user_id' => $target->id,
                'target_user_name' => $target->name,
            ],
        ]);

        return back();
    }
}
