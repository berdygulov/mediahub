<?php

namespace Tests\Feature\Admin;

use App\Models\File;
use App\Models\Folder;
use App\Models\FolderAccess;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FolderAccessControllerTest extends TestCase
{
    use RefreshDatabase;

    // --- store ---

    public function test_guest_cannot_grant_folder_access(): void
    {
        $folder = Folder::factory()->for(User::factory()->create(['is_admin' => true]))->create();

        $this->post(route('admin.folder-accesses.store', $folder->id), ['user_id' => 1])
            ->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_grant_folder_access(): void
    {
        $user = User::factory()->create();
        $folder = Folder::factory()->for(User::factory()->create(['is_admin' => true]))->create();

        $this->actingAs($user)
            ->post(route('admin.folder-accesses.store', $folder->id), ['user_id' => $user->id])
            ->assertForbidden();
    }

    public function test_admin_can_grant_folder_access(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $target = User::factory()->create();
        $folder = Folder::factory()->for($admin)->create();

        $this->actingAs($admin)
            ->post(route('admin.folder-accesses.store', $folder->id), ['user_id' => $target->id])
            ->assertRedirect();

        $this->assertDatabaseHas('folder_accesses', [
            'folder_id' => $folder->id,
            'user_id' => $target->id,
        ]);
    }

    public function test_cannot_grant_folder_access_to_admin(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $otherAdmin = User::factory()->create(['is_admin' => true]);
        $folder = Folder::factory()->for($admin)->create();

        $this->actingAs($admin)
            ->post(route('admin.folder-accesses.store', $folder->id), ['user_id' => $otherAdmin->id])
            ->assertSessionHasErrors('user_id');
    }

    public function test_duplicate_folder_access_is_idempotent(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $target = User::factory()->create();
        $folder = Folder::factory()->for($admin)->create();

        FolderAccess::create(['folder_id' => $folder->id, 'user_id' => $target->id]);

        $this->actingAs($admin)
            ->post(route('admin.folder-accesses.store', $folder->id), ['user_id' => $target->id])
            ->assertRedirect();

        $this->assertDatabaseCount('folder_accesses', 1);
    }

    // --- destroy ---

    public function test_admin_can_revoke_folder_access(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $target = User::factory()->create();
        $folder = Folder::factory()->for($admin)->create();

        FolderAccess::create(['folder_id' => $folder->id, 'user_id' => $target->id]);

        $this->actingAs($admin)
            ->delete(route('admin.folder-accesses.destroy', [$folder->id, $target->id]))
            ->assertRedirect();

        $this->assertDatabaseMissing('folder_accesses', [
            'folder_id' => $folder->id,
            'user_id' => $target->id,
        ]);
    }

    public function test_non_admin_cannot_revoke_folder_access(): void
    {
        $user = User::factory()->create();
        $folder = Folder::factory()->for(User::factory()->create(['is_admin' => true]))->create();

        $this->actingAs($user)
            ->delete(route('admin.folder-accesses.destroy', [$folder->id, $user->id]))
            ->assertForbidden();
    }

    // --- file access via folder ---

    public function test_user_with_folder_access_can_view_file_show_page(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create();
        $folder = Folder::factory()->for($admin)->create();
        $file = File::factory()->for($admin)->inFolder($folder)->create();

        FolderAccess::create(['folder_id' => $folder->id, 'user_id' => $user->id]);

        $this->actingAs($user)->get(route('files.show', $file->id))->assertOk();
    }

    public function test_user_without_folder_access_cannot_view_file(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create();
        $folder = Folder::factory()->for($admin)->create();
        $file = File::factory()->for($admin)->inFolder($folder)->create();

        $this->actingAs($user)->get(route('files.show', $file->id))->assertNotFound();
    }

    public function test_user_with_folder_access_cannot_download_file(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create();
        $folder = Folder::factory()->for($admin)->create();
        $file = File::factory()->for($admin)->inFolder($folder)->create();

        FolderAccess::create(['folder_id' => $folder->id, 'user_id' => $user->id]);

        $this->actingAs($user)->get(route('files.download', $file->id))->assertNotFound();
    }

    public function test_show_page_passes_can_download_false_for_folder_access_user(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create();
        $folder = Folder::factory()->for($admin)->create();
        $file = File::factory()->for($admin)->inFolder($folder)->create();

        FolderAccess::create(['folder_id' => $folder->id, 'user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('files.show', $file->id));

        $response->assertOk();
        $this->assertFalse($response->original->getData()['page']['props']['canDownload']);
    }

    public function test_show_page_passes_can_download_true_for_owner(): void
    {
        $owner = User::factory()->create();
        $folder = Folder::factory()->for($owner)->create();
        $file = File::factory()->for($owner)->inFolder($folder)->create();

        $response = $this->actingAs($owner)->get(route('files.show', $file->id));

        $response->assertOk();
        $this->assertTrue($response->original->getData()['page']['props']['canDownload']);
    }
}
