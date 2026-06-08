<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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

        $folder->accesses()->firstOrCreate(['user_id' => $target->id]);

        return back();
    }

    public function destroy(int $folderId, int $userId): RedirectResponse
    {
        $folder = Folder::findOrFail($folderId);
        $folder->accesses()->where('user_id', $userId)->delete();

        return back();
    }
}
