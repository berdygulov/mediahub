<?php

namespace Tests\Feature\Admin;

use App\Models\File;
use App\Models\Folder;
use App\Models\FolderAccess;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserShowControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_from_show(): void
    {
        $user = User::factory()->create();

        $this->get(route('admin.users.show', $user->id))->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_access_show(): void
    {
        $actor = User::factory()->create(['is_admin' => false]);
        $target = User::factory()->create();

        $this->actingAs($actor)
            ->get(route('admin.users.show', $target->id))
            ->assertForbidden();
    }

    public function test_admin_can_view_user_show_page(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $target = User::factory()->create(['is_admin' => false]);

        $this->actingAs($admin)
            ->get(route('admin.users.show', $target->id))
            ->assertOk()
            ->assertInertia(
                fn ($page) => $page
                    ->component('admin/users/show')
                    ->has('user')
                    ->has('accessibleFolders')
                    ->has('files')
                    ->has('allFolders')
                    ->where('user.id', $target->id),
            );
    }

    public function test_show_returns_404_for_missing_user(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->get(route('admin.users.show', 99999))
            ->assertNotFound();
    }

    public function test_accessible_folders_contains_only_granted_folders(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $target = User::factory()->create(['is_admin' => false]);

        $grantedFolder = Folder::factory()->create(['name' => 'Granted']);
        Folder::factory()->create(['name' => 'Other']);

        FolderAccess::create(['folder_id' => $grantedFolder->id, 'user_id' => $target->id]);

        $this->actingAs($admin)
            ->get(route('admin.users.show', $target->id))
            ->assertInertia(
                fn ($page) => $page
                    ->where('accessibleFolders.0.id', $grantedFolder->id)
                    ->where('accessibleFolders', fn ($folders) => count($folders) === 1),
            );
    }

    public function test_files_shows_only_files_from_accessible_folders(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $target = User::factory()->create(['is_admin' => false]);

        $grantedFolder = Folder::factory()->create();
        $otherFolder = Folder::factory()->create();

        FolderAccess::create(['folder_id' => $grantedFolder->id, 'user_id' => $target->id]);

        $fileInGranted = File::factory()->create(['folder_id' => $grantedFolder->id]);
        File::factory()->create(['folder_id' => $otherFolder->id]);
        File::factory()->create(['folder_id' => null]);

        $this->actingAs($admin)
            ->get(route('admin.users.show', $target->id))
            ->assertInertia(
                fn ($page) => $page
                    ->where('files.total', 1)
                    ->where('files.data.0.id', $fileInGranted->id),
            );
    }

    public function test_files_are_empty_when_no_folder_access(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $target = User::factory()->create(['is_admin' => false]);

        File::factory()->count(3)->create();

        $this->actingAs($admin)
            ->get(route('admin.users.show', $target->id))
            ->assertInertia(
                fn ($page) => $page->where('files.total', 0),
            );
    }
}
