<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_name_and_description(): void
    {
        $admin = User::factory()->admin()->create();
        $file = File::factory()->for($admin)->create(['name' => 'old.mp4', 'description' => null]);

        $this->actingAs($admin)
            ->patch(route('files.update', $file->id), [
                'name' => 'new.mp4',
                'description' => 'Some description',
            ])
            ->assertRedirect();

        $file->refresh();
        $this->assertSame('new.mp4', $file->name);
        $this->assertSame('Some description', $file->description);
    }

    public function test_admin_can_clear_description(): void
    {
        $admin = User::factory()->admin()->create();
        $file = File::factory()->for($admin)->create(['description' => 'existing']);

        $this->actingAs($admin)
            ->patch(route('files.update', $file->id), [
                'name' => $file->name,
                'description' => null,
            ])
            ->assertRedirect();

        $this->assertNull($file->fresh()->description);
    }

    public function test_non_admin_cannot_update_file(): void
    {
        $user = User::factory()->create();
        $file = File::factory()->for($user)->create(['name' => 'original.mp4']);

        $this->actingAs($user)
            ->patch(route('files.update', $file->id), [
                'name' => 'changed.mp4',
                'description' => null,
            ])
            ->assertForbidden();

        $this->assertSame('original.mp4', $file->fresh()->name);
    }

    public function test_guest_is_redirected(): void
    {
        $file = File::factory()->create();

        $this->patch(route('files.update', $file->id), ['name' => 'x.mp4'])
            ->assertRedirect(route('login'));
    }

    public function test_name_is_required(): void
    {
        $admin = User::factory()->admin()->create();
        $file = File::factory()->for($admin)->create();

        $this->actingAs($admin)
            ->patch(route('files.update', $file->id), ['name' => '', 'description' => null])
            ->assertSessionHasErrors('name');
    }

    public function test_name_cannot_exceed_255_characters(): void
    {
        $admin = User::factory()->admin()->create();
        $file = File::factory()->for($admin)->create();

        $this->actingAs($admin)
            ->patch(route('files.update', $file->id), [
                'name' => str_repeat('a', 256),
                'description' => null,
            ])
            ->assertSessionHasErrors('name');
    }

    public function test_description_cannot_exceed_500_characters(): void
    {
        $admin = User::factory()->admin()->create();
        $file = File::factory()->for($admin)->create();

        $this->actingAs($admin)
            ->patch(route('files.update', $file->id), [
                'name' => $file->name,
                'description' => str_repeat('a', 501),
            ])
            ->assertSessionHasErrors('description');
    }
}
