<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\Folder;
use App\Models\FolderAccess;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FolderControllerTest extends TestCase
{
    use RefreshDatabase;

    // --- index ---

    public function test_guests_are_redirected_from_folders_index(): void
    {
        $this->get(route('folders.index'))->assertRedirect(route('login'));
    }

    public function test_user_sees_own_root_folders_and_granted_folders(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create();
        $other = User::factory()->create();

        $ownFolder = Folder::factory()->for($user)->create();
        $grantedFolder = Folder::factory()->for($admin)->create();
        $otherFolder = Folder::factory()->for($other)->create();

        FolderAccess::create(['folder_id' => $grantedFolder->id, 'user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('folders.index'));
        $response->assertOk();

        $ids = collect($response->original->getData()['page']['props']['folders'])->pluck('id');
        $this->assertTrue($ids->contains($ownFolder->id));
        $this->assertTrue($ids->contains($grantedFolder->id));
        $this->assertFalse($ids->contains($otherFolder->id));
    }

    public function test_subfolders_are_excluded_from_index(): void
    {
        $user = User::factory()->create();
        $parent = Folder::factory()->for($user)->create();
        $child = Folder::factory()->withParent($parent)->create();

        $response = $this->actingAs($user)->get(route('folders.index'));
        $response->assertOk();

        $ids = collect($response->original->getData()['page']['props']['folders'])->pluck('id');
        $this->assertTrue($ids->contains($parent->id));
        $this->assertFalse($ids->contains($child->id));
    }

    public function test_folders_include_children_and_files_counts(): void
    {
        $user = User::factory()->create();
        $folder = Folder::factory()->for($user)->create();
        Folder::factory()->withParent($folder)->create();
        File::factory()->for($user)->inFolder($folder)->create();

        $response = $this->actingAs($user)->get(route('folders.index'));
        $response->assertOk();

        $data = collect($response->original->getData()['page']['props']['folders'])
            ->firstWhere('id', $folder->id);

        $this->assertSame(1, $data['children_count']);
        $this->assertSame(1, $data['files_count']);
    }

    // --- show ---

    public function test_guests_are_redirected_from_folder_show(): void
    {
        $folder = Folder::factory()->for(User::factory()->create())->create();

        $this->get(route('folders.show', $folder->id))->assertRedirect(route('login'));
    }

    public function test_user_can_view_own_folder_with_subfolders_and_files(): void
    {
        $user = User::factory()->create();
        $folder = Folder::factory()->for($user)->create();
        $sub = Folder::factory()->withParent($folder)->create();
        $file = File::factory()->for($user)->inFolder($folder)->create();

        $response = $this->actingAs($user)->get(route('folders.show', $folder->id));
        $response->assertOk();

        $props = $response->original->getData()['page']['props'];
        $this->assertSame($folder->id, $props['folder']['id']);
        $this->assertTrue(collect($props['subfolders'])->pluck('id')->contains($sub->id));
        $this->assertTrue(collect($props['files'])->pluck('id')->contains($file->id));
    }

    public function test_user_cannot_view_another_users_folder(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $folder = Folder::factory()->for($owner)->create();

        $this->actingAs($other)
            ->get(route('folders.show', $folder->id))
            ->assertNotFound();
    }

    public function test_ancestors_are_returned_in_correct_order(): void
    {
        $user = User::factory()->create();
        $root = Folder::factory()->for($user)->create();
        $child = Folder::factory()->withParent($root)->create();
        $grandchild = Folder::factory()->withParent($child)->create();

        $response = $this->actingAs($user)->get(route('folders.show', $grandchild->id));
        $response->assertOk();

        $ancestors = $response->original->getData()['page']['props']['ancestors'];
        $this->assertCount(2, $ancestors);
        $this->assertSame($root->id, $ancestors[0]['id']);
        $this->assertSame($child->id, $ancestors[1]['id']);
    }

    // --- store ---

    public function test_guests_cannot_create_folders(): void
    {
        $this->post(route('folders.store'), ['name' => 'Test'])->assertRedirect(route('login'));
    }

    public function test_admin_can_create_root_folder(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->post(route('folders.store'), ['name' => 'My Videos'])
            ->assertRedirect();

        $this->assertDatabaseHas('folders', [
            'user_id' => $admin->id,
            'parent_id' => null,
            'name' => 'My Videos',
        ]);
    }

    public function test_admin_can_create_subfolder(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $parent = Folder::factory()->for($admin)->create();

        $this->actingAs($admin)
            ->post(route('folders.store'), ['name' => '2024', 'parent_id' => $parent->id])
            ->assertRedirect();

        $this->assertDatabaseHas('folders', [
            'user_id' => $admin->id,
            'parent_id' => $parent->id,
            'name' => '2024',
        ]);
    }

    public function test_admin_can_create_subfolder_in_another_users_folder(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $other = User::factory()->create();
        $otherFolder = Folder::factory()->for($other)->create();

        $this->actingAs($admin)
            ->post(route('folders.store'), ['name' => 'Sub', 'parent_id' => $otherFolder->id])
            ->assertRedirect();

        $this->assertDatabaseHas('folders', [
            'name' => 'Sub',
            'parent_id' => $otherFolder->id,
        ]);
    }

    public function test_folder_name_is_required(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->post(route('folders.store'), ['name' => ''])
            ->assertSessionHasErrors(['name']);
    }

    public function test_folder_name_cannot_exceed_255_characters(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->post(route('folders.store'), ['name' => str_repeat('a', 256)])
            ->assertSessionHasErrors(['name']);
    }

    public function test_cannot_create_subfolder_beyond_depth_5(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $level1 = Folder::factory()->for($admin)->create();
        $level2 = Folder::factory()->withParent($level1)->create();
        $level3 = Folder::factory()->withParent($level2)->create();
        $level4 = Folder::factory()->withParent($level3)->create();
        $level5 = Folder::factory()->withParent($level4)->create();

        $this->actingAs($admin)
            ->post(route('folders.store'), ['name' => 'Too Deep', 'parent_id' => $level5->id])
            ->assertSessionHasErrors(['parent_id']);

        $this->assertDatabaseMissing('folders', ['name' => 'Too Deep']);
    }

    public function test_can_create_subfolder_at_depth_4_parent(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $level1 = Folder::factory()->for($admin)->create();
        $level2 = Folder::factory()->withParent($level1)->create();
        $level3 = Folder::factory()->withParent($level2)->create();
        $level4 = Folder::factory()->withParent($level3)->create();

        $this->actingAs($admin)
            ->post(route('folders.store'), ['name' => 'Level 5', 'parent_id' => $level4->id])
            ->assertRedirect();

        $this->assertDatabaseHas('folders', ['name' => 'Level 5', 'parent_id' => $level4->id]);
    }

    // --- destroy ---

    public function test_non_admin_cannot_delete_folder(): void
    {
        $user = User::factory()->create();
        $folder = Folder::factory()->for($user)->create();

        $this->actingAs($user)
            ->delete(route('folders.destroy', $folder->id))
            ->assertForbidden();

        $this->assertDatabaseHas('folders', ['id' => $folder->id]);
    }

    public function test_admin_can_delete_own_folder(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $folder = Folder::factory()->for($admin)->create();

        $this->actingAs($admin)
            ->delete(route('folders.destroy', $folder->id))
            ->assertRedirect(route('folders.index'));

        $this->assertDatabaseMissing('folders', ['id' => $folder->id]);
    }

    public function test_deleting_root_folder_redirects_to_folders_index(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $folder = Folder::factory()->for($admin)->create();

        $this->actingAs($admin)
            ->delete(route('folders.destroy', $folder->id))
            ->assertRedirect(route('folders.index'));
    }

    public function test_deleting_subfolder_redirects_to_parent_folder(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $parent = Folder::factory()->for($admin)->create();
        $child = Folder::factory()->withParent($parent)->create();

        $this->actingAs($admin)
            ->delete(route('folders.destroy', $child->id))
            ->assertRedirect(route('folders.show', $parent->id));
    }

    public function test_deleting_folder_cascades_to_subfolders(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $parent = Folder::factory()->for($admin)->create();
        $child = Folder::factory()->withParent($parent)->create();
        $grandchild = Folder::factory()->withParent($child)->create();

        $this->actingAs($admin)
            ->delete(route('folders.destroy', $parent->id));

        $this->assertDatabaseMissing('folders', ['id' => $child->id]);
        $this->assertDatabaseMissing('folders', ['id' => $grandchild->id]);
    }

    public function test_deleting_folder_cascades_to_files_and_removes_from_storage(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create(['is_admin' => true]);
        $folder = Folder::factory()->for($admin)->create();
        Storage::disk('local')->put('media/test.mp4', 'fake content');
        $file = File::factory()->for($admin)->inFolder($folder)->create([
            'disk' => 'local',
            'path' => 'media/test.mp4',
        ]);

        $this->actingAs($admin)
            ->delete(route('folders.destroy', $folder->id));

        $this->assertDatabaseMissing('files', ['id' => $file->id]);
        Storage::disk('local')->assertMissing('media/test.mp4');
    }

    // --- update ---

    public function test_non_admin_cannot_rename_folder(): void
    {
        $user = User::factory()->create();
        $folder = Folder::factory()->for($user)->create(['name' => 'Original']);

        $this->actingAs($user)
            ->patch(route('folders.update', $folder->id), ['name' => 'Renamed'])
            ->assertForbidden();

        $this->assertDatabaseHas('folders', ['id' => $folder->id, 'name' => 'Original']);
    }

    public function test_admin_can_rename_folder(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $folder = Folder::factory()->for($admin)->create(['name' => 'Original']);

        $this->actingAs($admin)
            ->patch(route('folders.update', $folder->id), ['name' => 'Renamed'])
            ->assertRedirect();

        $this->assertDatabaseHas('folders', ['id' => $folder->id, 'name' => 'Renamed']);
    }

    public function test_rename_requires_name(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $folder = Folder::factory()->for($admin)->create();

        $this->actingAs($admin)
            ->patch(route('folders.update', $folder->id), ['name' => ''])
            ->assertSessionHasErrors(['name']);
    }

    public function test_rename_name_cannot_exceed_255_characters(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $folder = Folder::factory()->for($admin)->create();

        $this->actingAs($admin)
            ->patch(route('folders.update', $folder->id), ['name' => str_repeat('a', 256)])
            ->assertSessionHasErrors(['name']);
    }

    public function test_admin_can_rename_another_users_folder(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $other = User::factory()->create();
        $folder = Folder::factory()->for($other)->create(['name' => 'Original']);

        $this->actingAs($admin)
            ->patch(route('folders.update', $folder->id), ['name' => 'Renamed'])
            ->assertRedirect();

        $this->assertDatabaseHas('folders', ['id' => $folder->id, 'name' => 'Renamed']);
    }
}
