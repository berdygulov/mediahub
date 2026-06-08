<?php

namespace App\Models;

use Database\Factories\FolderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
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
}
