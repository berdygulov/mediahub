<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FileMoveFolderTest extends TestCase
{
    use RefreshDatabase;

    // --- folderTree ---

    public function test_guest_cannot_get_folder_tree(): void
    {
        $file = File::factory()->create();

        $this->get(route('files.folders', $file->id))
            ->assertRedirect(route('login'));
    }

    public function test_owner_gets_their_folder_tree(): void
    {
        $user = User::factory()->create();
        $file = File::factory()->for($user)->create();
        $folder = Folder::factory()->for($user)->create();

        $response = $this->actingAs($user)
            ->getJson(route('files.folders', $file->id));

        $response->assertOk()
            ->assertJsonFragment(['id' => $folder->id, 'name' => $folder->name]);
    }

    public function test_user_cannot_get_folder_tree_for_another_users_file(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $file = File::factory()->for($owner)->create();

        $this->actingAs($other)
            ->getJson(route('files.folders', $file->id))
            ->assertNotFound();
    }

    public function test_admin_gets_file_owners_folders(): void
    {
        $admin = User::factory()->admin()->create();
        $owner = User::factory()->create();
        $file = File::factory()->for($owner)->create();
        $ownerFolder = Folder::factory()->for($owner)->create();
        $adminFolder = Folder::factory()->for($admin)->create();

        $response = $this->actingAs($admin)
            ->getJson(route('files.folders', $file->id));

        $response->assertOk()
            ->assertJsonFragment(['id' => $ownerFolder->id])
            ->assertJsonMissing(['id' => $adminFolder->id]);
    }

    public function test_folder_tree_returns_only_id_name_parent_id(): void
    {
        $user = User::factory()->create();
        $file = File::factory()->for($user)->create();
        Folder::factory()->for($user)->create(['name' => 'Alpha']);

        $response = $this->actingAs($user)
            ->getJson(route('files.folders', $file->id));

        $response->assertOk();
        $item = $response->json(0);
        $this->assertArrayHasKey('id', $item);
        $this->assertArrayHasKey('name', $item);
        $this->assertArrayHasKey('parent_id', $item);
        $this->assertArrayNotHasKey('user_id', $item);
        $this->assertArrayNotHasKey('created_at', $item);
    }

    // --- moveFolder ---

    public function test_guest_cannot_move_file(): void
    {
        $file = File::factory()->create();

        $this->patch(route('files.move-folder', $file->id), ['folder_id' => null])
            ->assertRedirect(route('login'));
    }

    public function test_owner_can_move_file_to_their_folder(): void
    {
        $user = User::factory()->create();
        $file = File::factory()->for($user)->create();
        $folder = Folder::factory()->for($user)->create();

        $this->actingAs($user)
            ->patch(route('files.move-folder', $file->id), ['folder_id' => $folder->id])
            ->assertRedirect();

        $this->assertDatabaseHas('files', [
            'id' => $file->id,
            'folder_id' => $folder->id,
        ]);
    }

    public function test_owner_can_unassign_file_from_folder(): void
    {
        $user = User::factory()->create();
        $folder = Folder::factory()->for($user)->create();
        $file = File::factory()->for($user)->for($folder)->create();

        $this->actingAs($user)
            ->patch(route('files.move-folder', $file->id), ['folder_id' => null])
            ->assertRedirect();

        $this->assertDatabaseHas('files', ['id' => $file->id, 'folder_id' => null]);
    }

    public function test_owner_cannot_move_file_to_another_users_folder(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $file = File::factory()->for($owner)->create();
        $otherFolder = Folder::factory()->for($other)->create();

        $this->actingAs($owner)
            ->patch(route('files.move-folder', $file->id), ['folder_id' => $otherFolder->id])
            ->assertSessionHasErrors('folder_id');
    }

    public function test_user_cannot_move_another_users_file(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $file = File::factory()->for($owner)->create();

        $this->actingAs($other)
            ->patch(route('files.move-folder', $file->id), ['folder_id' => null])
            ->assertNotFound();
    }

    public function test_admin_can_move_any_file_to_owners_folder(): void
    {
        $admin = User::factory()->admin()->create();
        $owner = User::factory()->create();
        $file = File::factory()->for($owner)->create();
        $folder = Folder::factory()->for($owner)->create();

        $this->actingAs($admin)
            ->patch(route('files.move-folder', $file->id), ['folder_id' => $folder->id])
            ->assertRedirect();

        $this->assertDatabaseHas('files', ['id' => $file->id, 'folder_id' => $folder->id]);
    }

    public function test_admin_cannot_move_file_to_their_own_folder(): void
    {
        $admin = User::factory()->admin()->create();
        $owner = User::factory()->create();
        $file = File::factory()->for($owner)->create();
        $adminFolder = Folder::factory()->for($admin)->create();

        $this->actingAs($admin)
            ->patch(route('files.move-folder', $file->id), ['folder_id' => $adminFolder->id])
            ->assertSessionHasErrors('folder_id');
    }

    public function test_folder_id_must_be_integer(): void
    {
        $user = User::factory()->create();
        $file = File::factory()->for($user)->create();

        $this->actingAs($user)
            ->patch(route('files.move-folder', $file->id), ['folder_id' => 'abc'])
            ->assertSessionHasErrors('folder_id');
    }
}
