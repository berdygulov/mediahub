<?php

namespace App\Http\Controllers;

use App\Models\Folder;
use App\Models\FolderAccess;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FolderController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = Folder::query()->withCount(['children', 'files'])->orderBy('name');

        if ($user->is_admin) {
            $query->where('user_id', $user->id)->whereNull('parent_id');
        } else {
            $grantedIds = FolderAccess::where('user_id', $user->id)
                ->pluck('folder_id')
                ->toArray();

            $query->where(function ($q) use ($user, $grantedIds): void {
                $q->where(function ($inner) use ($user): void {
                    $inner->where('user_id', $user->id)->whereNull('parent_id');
                });
                if (! empty($grantedIds)) {
                    $q->orWhereIn('id', $grantedIds);
                }
            });
        }

        return Inertia::render('folders/index', [
            'folders' => $query->get(),
        ]);
    }

    public function show(int $id, Request $request): Response
    {
        $user = $request->user();

        $query = Folder::query()->withCount(['children', 'files']);

        if (! $user->is_admin) {
            $accessibleIds = Folder::accessibleIdsFor($user);
            $query->where(function ($q) use ($user, $accessibleIds): void {
                $q->where('user_id', $user->id)
                    ->orWhereIn('id', $accessibleIds);
            });
        }

        $folder = $query->findOrFail($id);

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

        $accesses = $user->is_admin
            ? $folder->accesses()->with('user')->get()
            : collect();

        $eligibleUsers = $user->is_admin
            ? User::where('is_admin', false)
                ->whereNotIn('id', $folder->accesses()->pluck('user_id'))
                ->orderBy('name')
                ->get(['id', 'name'])
            : collect();

        return Inertia::render('folders/show', [
            'folder' => $folder,
            'subfolders' => $subfolders,
            'files' => $files,
            'ancestors' => $ancestors,
            'accesses' => $accesses,
            'eligibleUsers' => $eligibleUsers,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('folders', 'id'),
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($value === null) {
                        return;
                    }
                    $parent = Folder::find($value);
                    if ($parent !== null && $parent->depth() >= 5) {
                        $fail('Нельзя создать подпапку: достигнут максимальный уровень вложенности (5).');
                    }
                },
            ],
        ]);

        Folder::create([
            'user_id' => $request->user()->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'name' => $validated['name'],
        ]);

        return back();
    }

    public function update(int $id, Request $request): RedirectResponse
    {
        abort_if(! $request->user()->is_admin, 403);

        $folder = Folder::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $folder->update(['name' => $validated['name']]);

        return back();
    }

    public function destroy(int $id, Request $request): RedirectResponse
    {
        abort_if(! $request->user()->is_admin, 403);

        $folder = Folder::findOrFail($id);

        $parentId = $folder->parent_id;

        $folder->delete();

        if ($parentId !== null) {
            return redirect()->route('folders.show', $parentId);
        }

        return redirect()->route('folders.index');
    }
}
