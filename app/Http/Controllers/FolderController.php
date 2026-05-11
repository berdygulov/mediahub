<?php

namespace App\Http\Controllers;

use App\Models\Folder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FolderController extends Controller
{
    public function index(Request $request): Response
    {
        $folders = Folder::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('parent_id')
            ->withCount(['children', 'files'])
            ->orderBy('name')
            ->get();

        return Inertia::render('folders/index', [
            'folders' => $folders,
        ]);
    }

    public function show(int $id, Request $request): Response
    {
        $user = $request->user();

        $folder = Folder::query()
            ->where('user_id', $user->id)
            ->withCount(['children', 'files'])
            ->findOrFail($id);

        $subfolders = $folder->children()
            ->withCount(['children', 'files'])
            ->orderBy('name')
            ->get();

        $files = $folder->files()
            ->orderBy('name')
            ->get();

        $ancestors = collect($folder->ancestors())
            ->map(fn (Folder $f) => ['id' => $f->id, 'name' => $f->name])
            ->values();

        return Inertia::render('folders/show', [
            'folder' => $folder,
            'subfolders' => $subfolders,
            'files' => $files,
            'ancestors' => $ancestors,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('folders', 'id')->where('user_id', $request->user()->id),
            ],
        ]);

        Folder::create([
            'user_id' => $request->user()->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'name' => $validated['name'],
        ]);

        return back();
    }

    public function destroy(int $id, Request $request): RedirectResponse
    {
        $folder = Folder::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $folder->delete();

        return back();
    }
}
