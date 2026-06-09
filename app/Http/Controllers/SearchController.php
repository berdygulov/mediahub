<?php

namespace App\Http\Controllers;

use App\Models\File;
use App\Models\Folder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'q' => 'string|max:255',
            'type' => 'nullable|in:folder,video,audio',
        ]);

        $query = $validated['q'] ?? '';
        $type = $validated['type'] ?? null;

        $folders = [];
        $files = [];

        if (strlen($query) >= 2) {
            $user = $request->user();
            $isAdmin = $user->is_admin;

            // Load all folders unfiltered — needed to build breadcrumb paths for
            // shared folders whose ancestors may belong to other users.
            $allFolders = Folder::select(['id', 'parent_id', 'name'])->get()->keyBy('id');

            if (! $type || $type === 'folder') {
                $foldersQuery = Folder::with('user:id,name')->where('name', 'like', '%'.$query.'%');
                if (! $isAdmin) {
                    $accessibleIds = Folder::accessibleIdsFor($user);
                    $foldersQuery->where(function (Builder $q) use ($user, $accessibleIds): void {
                        $q->where('user_id', $user->id);
                        if (! empty($accessibleIds)) {
                            $q->orWhereIn('id', $accessibleIds);
                        }
                    });
                }

                $folders = $foldersQuery
                    ->limit(20)
                    ->get()
                    ->map(fn (Folder $folder): array => [
                        'id' => $folder->id,
                        'name' => $folder->name,
                        'owner_name' => $folder->user->name,
                        'path' => $this->buildPath($folder->parent_id, $allFolders),
                    ])
                    ->all();
            }

            if (! $type || in_array($type, ['video', 'audio'], true)) {
                $filesQuery = File::with('user:id,name')->where('name', 'like', '%'.$query.'%');
                if (! $isAdmin) {
                    $filesQuery->accessibleBy($user);
                }

                if ($type) {
                    $filesQuery->where('type', $type);
                }

                $files = $filesQuery
                    ->limit(20)
                    ->get()
                    ->map(fn (File $file): array => [
                        'id' => $file->id,
                        'name' => $file->name,
                        'description' => $file->description,
                        'type' => $file->type,
                        'mime_type' => $file->mime_type,
                        'size' => $file->size,
                        'owner_name' => $file->user->name,
                        'folder_path' => $this->buildFilePath($file->folder_id, $allFolders),
                    ])
                    ->all();
            }
        }

        return Inertia::render('search', [
            'query' => $query,
            'type' => $type,
            'folders' => $folders,
            'files' => $files,
        ]);
    }

    /**
     * Build the full path to a file's folder: ancestors + the folder itself.
     *
     * @param  Collection<int, Folder>  $allFolders
     * @return array<int, array{id: int, name: string}>
     */
    private function buildFilePath(?int $folderId, Collection $allFolders): array
    {
        if ($folderId === null || ! $allFolders->has($folderId)) {
            return [];
        }

        $folder = $allFolders->get($folderId);
        $path = $this->buildPath($folder->parent_id, $allFolders);
        $path[] = ['id' => $folder->id, 'name' => $folder->name];

        return $path;
    }

    /**
     * Walk the in-memory folder map from $startParentId up to the root.
     *
     * @param  Collection<int, Folder>  $allFolders
     * @return array<int, array{id: int, name: string}>
     */
    private function buildPath(?int $startParentId, Collection $allFolders): array
    {
        $path = [];
        $parentId = $startParentId;

        while ($parentId !== null && $allFolders->has($parentId)) {
            $ancestor = $allFolders->get($parentId);
            $path[] = ['id' => $ancestor->id, 'name' => $ancestor->name];
            $parentId = $ancestor->parent_id;
        }

        return array_reverse($path);
    }
}
