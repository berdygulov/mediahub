<?php

namespace App\Http\Controllers;

use App\Models\File;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class FileCommentController extends Controller
{
    public function index(int $fileId, Request $request): JsonResponse
    {
        $user = $request->user();

        $file = File::accessibleBy($user)->findOrFail($fileId);

        return response()->json(
            $file->comments()->with('user:id,name')->oldest()->get()
        );
    }

    public function store(int $fileId, Request $request): RedirectResponse
    {
        $user = $request->user();

        $file = File::accessibleBy($user)->findOrFail($fileId);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $file->comments()->create([
            'user_id' => $user->id,
            'body' => $validated['body'],
        ]);

        return back();
    }

    public function destroy(int $fileId, int $commentId, Request $request): RedirectResponse
    {
        $user = $request->user();

        $file = File::accessibleBy($user)->findOrFail($fileId);

        $comment = $file->comments()->findOrFail($commentId);

        if (! $user->is_admin && $comment->user_id !== $user->id) {
            abort(403);
        }

        $comment->delete();

        return back();
    }
}
