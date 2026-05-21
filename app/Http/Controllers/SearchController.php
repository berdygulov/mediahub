<?php

namespace App\Http\Controllers;

use App\Models\File;
use App\Models\Folder;
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

            $allFoldersQuery = Folder::select(['id', 'parent_id', 'name']);
            if (! $isAdmin) {
                $allFoldersQuery->where('user_id', $user->id);
            }
            $allFolders = $allFoldersQuery->get()->keyBy('id');

            if (! $type || $type === 'folder') {
                $foldersQuery = Folder::with('user:id,name')->where('name', 'like', '%'.$query.'%');
                if (! $isAdmin) {
                    $foldersQuery->where('user_id', $user->id);
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
                    $filesQuery->where('user_id', $user->id);
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
