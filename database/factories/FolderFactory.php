<?php

namespace Database\Factories;

use App\Models\Folder;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Folder>
 */
class FolderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->words(2, true),
        ];
    }

    public function withParent(Folder $parent): static
    {
        return $this->state([
            'user_id' => $parent->user_id,
            'parent_id' => $parent->id,
        ]);
    }
}
