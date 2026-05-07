<?php

namespace Database\Factories;

use App\Models\File;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<File>
 */
class FileFactory extends Factory
{
    public function definition(): array
    {
        $type = fake()->randomElement(['video', 'audio']);

        $extensions = $type === 'video' ? ['mp4', 'mkv', 'avi'] : ['mp3', 'wav', 'flac'];
        $extension = fake()->randomElement($extensions);
        $name = fake()->words(3, true).'.'.$extension;

        return [
            'user_id' => User::factory(),
            'folder_id' => null,
            'name' => $name,
            'disk' => 'local',
            'path' => 'media/'.fake()->uuid().'.'.$extension,
            'mime_type' => $type === 'video' ? 'video/'.$extension : 'audio/'.$extension,
            'type' => $type,
            'size' => fake()->numberBetween(1024 * 1024, 1024 * 1024 * 500),
        ];
    }

    public function video(): static
    {
        return $this->state(fn () => [
            'type' => 'video',
            'mime_type' => 'video/mp4',
            'path' => 'media/'.fake()->uuid().'.mp4',
            'name' => fake()->words(3, true).'.mp4',
        ]);
    }

    public function audio(): static
    {
        return $this->state(fn () => [
            'type' => 'audio',
            'mime_type' => 'audio/mp3',
            'path' => 'media/'.fake()->uuid().'.mp3',
            'name' => fake()->words(3, true).'.mp3',
        ]);
    }

    public function inFolder(Folder $folder): static
    {
        return $this->state(fn () => ['folder_id' => $folder->id]);
    }
}
