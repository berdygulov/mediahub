<?php

namespace App\Http\Controllers;

use App\Models\File;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = File::query()->with(['folder.parent.parent.parent', 'user']);

        if (! $user->is_admin) {
            $query->accessibleBy($user);
        } elseif ($ownerId = $request->query('owner_id')) {
            $query->where('user_id', $ownerId);
        }

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        $allowedSorts = ['name', 'mime_type', 'size', 'created_at'];
        $sort = in_array($request->query('sort'), $allowedSorts) ? $request->query('sort') : 'created_at';
        $order = $request->query('order', 'desc') === 'asc' ? 'asc' : 'desc';

        $query->orderBy($sort, $order);

        $files = $query->paginate(10)->withQueryString();

        $files->getCollection()->transform(function ($file) {
            if ($file->folder) {
                $segments = [];
                $current = $file->folder;

                while ($current !== null) {
                    array_unshift($segments, $current->name);
                    $current = $current->parent;
                }

                $file->folder->path = implode(' / ', $segments);
            }

            return $file;
        });

        $users = $user->is_admin
            ? User::orderBy('name')->get(['id', 'name'])
            : collect();

        return Inertia::render('files/index', [
            'files' => $files,
            'filters' => [
                'search' => $request->query('search', ''),
                'type' => $request->query('type', ''),
                'from' => $request->query('from', ''),
                'to' => $request->query('to', ''),
                'sort' => $sort,
                'order' => $order,
                'owner_id' => $request->query('owner_id', ''),
            ],
            'users' => $users,
        ]);
    }

    public function show(int $id, Request $request): Response
    {
        $user = $request->user();

        $file = File::accessibleBy($user)
            ->with(['folder', 'user', 'comments.user'])
            ->findOrFail($id);

        return Inertia::render('files/show', [
            'file' => $file,
            'streamUrl' => route('files.stream', $file->id),
            'downloadUrl' => route('files.download', $file->id),
            'canDownload' => $user->is_admin || $file->user_id === $user->id,
        ]);
    }

    public function stream(int $id, Request $request): BinaryFileResponse
    {
        $user = $request->user();

        $file = File::accessibleBy($user)->findOrFail($id);
        $path = Storage::disk($file->disk)->path($file->path);

        return response()->file($path, ['Content-Type' => $file->mime_type]);
    }

    public function download(int $id, Request $request): StreamedResponse
    {
        $user = $request->user();

        $query = File::query();
        if (! $user->is_admin) {
            $query->where('user_id', $user->id);
        }

        $file = $query->findOrFail($id);

        return Storage::disk($file->disk)->download($file->path, $file->name);
    }

    public function folderTree(int $id, Request $request): JsonResponse
    {
        $user = $request->user();

        $query = File::query();
        if (! $user->is_admin) {
            $query->where('user_id', $user->id);
        }

        $file = $query->findOrFail($id);

        $folders = Folder::query()
            ->where('user_id', $file->user_id)
            ->orderBy('name')
            ->get(['id', 'name', 'parent_id']);

        return response()->json($folders);
    }

    public function update(int $id, Request $request): RedirectResponse
    {
        $file = File::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
        ]);

        $file->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?: null,
        ]);

        return back();
    }

    public function moveFolder(int $id, Request $request): RedirectResponse
    {
        $user = $request->user();

        $query = File::query();
        if (! $user->is_admin) {
            $query->where('user_id', $user->id);
        }

        $file = $query->findOrFail($id);

        $validated = $request->validate([
            'folder_id' => [
                'nullable',
                'integer',
                Rule::exists('folders', 'id')->where('user_id', $file->user_id),
            ],
        ]);

        $file->update(['folder_id' => $validated['folder_id']]);

        return back();
    }

    public function destroy(int $id, Request $request): RedirectResponse
    {
        $user = $request->user();

        $query = File::query();
        if (! $user->is_admin) {
            $query->where('user_id', $user->id);
        }

        $file = $query->findOrFail($id);

        Storage::disk($file->disk)->delete($file->path);
        $file->delete();

        return redirect()->route('files.index');
    }
}
