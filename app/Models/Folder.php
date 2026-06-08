<?php

namespace App\Models;

use Database\Factories\FolderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

#[Fillable(['user_id', 'parent_id', 'name'])]
class Folder extends Model
{
    /** @use HasFactory<FolderFactory> */
    use HasFactory;

    protected static function boot(): void
    {
        parent::boot();

        static::deleting(function (Folder $folder): void {
            $folder->children()->each(fn (Folder $child) => $child->delete());

            $folder->files()->each(function (File $file): void {
                Storage::disk($file->disk)->delete($file->path);
                $file->delete();
            });
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Folder::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Folder::class, 'parent_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(File::class);
    }

    public function accesses(): HasMany
    {
        return $this->hasMany(FolderAccess::class);
    }

    /**
     * Recursively load all nested children up to the given depth.
     *
     * @return HasMany<Folder, $this>
     */
    public function allChildren(): HasMany
    {
        return $this->children()->with('allChildren');
    }

    /**
     * Collect all ancestor folders from root to this folder.
     *
     * @return array<int, Folder>
     */
    public function ancestors(): array
    {
        $ancestors = [];
        $folder = $this;

        while ($folder->parent_id !== null) {
            $folder = $folder->parent()->first();
            if ($folder === null) {
                break;
            }
            array_unshift($ancestors, $folder);
        }

        return $ancestors;
    }

    public function depth(): int
    {
        return count($this->ancestors()) + 1;
    }

    /**
     * Returns all folder IDs accessible to the user:
     * directly granted folders plus all their descendants recursively.
     *
     * @return array<int>
     */
    public static function accessibleIdsFor(User $user): array
    {
        $grantedIds = FolderAccess::where('user_id', $user->id)
            ->pluck('folder_id')
            ->toArray();

        if (empty($grantedIds)) {
            return [];
        }

        $allIds = $grantedIds;
        $frontier = $grantedIds;

        while (! empty($frontier)) {
            $childIds = static::query()
                ->whereIn('parent_id', $frontier)
                ->pluck('id')
                ->toArray();

            $newIds = array_diff($childIds, $allIds);

            if (empty($newIds)) {
                break;
            }

            $allIds = array_merge($allIds, $newIds);
            $frontier = $newIds;
        }

        return $allIds;
    }

    public function scopeAccessibleBy(Builder $query, User $user): Builder
    {
        if ($user->is_admin) {
            return $query;
        }

        return $query->whereIn('id', static::accessibleIdsFor($user));
    }
}
