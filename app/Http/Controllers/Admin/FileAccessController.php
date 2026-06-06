<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\File;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class FileAccessController extends Controller
{
    public function store(int $fileId, Request $request): RedirectResponse
    {
        $file = File::findOrFail($fileId);

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $target = User::findOrFail($validated['user_id']);

        if ($target->is_admin || $file->user_id === $target->id) {
            return back()->withErrors(['user_id' => 'Нельзя выдать доступ владельцу или администратору.']);
        }

        $file->accesses()->firstOrCreate(['user_id' => $target->id]);

        return back();
    }

    public function destroy(int $fileId, int $userId, Request $request): RedirectResponse
    {
        $file = File::findOrFail($fileId);
        $file->accesses()->where('user_id', $userId)->delete();

        return back();
    }
}
