<?php

namespace App\Models;

use Database\Factories\FileFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'folder_id', 'name', 'disk', 'path', 'mime_type', 'type', 'size'])]
class File extends Model
{
    /** @use HasFactory<FileFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(Folder::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(FileComment::class)->oldest();
    }

    public function scopeAccessibleBy(Builder $query, User $user): Builder
    {
        if ($user->is_admin) {
            return $query;
        }

        $folderIds = Folder::accessibleIdsFor($user);

        return $query->where(function (Builder $q) use ($user, $folderIds): void {
            $q->where('user_id', $user->id);
            if (! empty($folderIds)) {
                $q->orWhereIn('folder_id', $folderIds);
            }
        });
    }
}
