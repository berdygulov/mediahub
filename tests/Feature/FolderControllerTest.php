<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FolderControllerTest extends TestCase
{
    use RefreshDatabase;

    // --- index ---

    public function test_guests_are_redirected_from_folders_index(): void
    {
        $this->get(route('folders.index'))->assertRedirect(route('login'));
    }

    public function test_user_sees_only_own_root_folders(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $ownFolder = Folder::factory()->for($user)->create();
        $otherFolder = Folder::factory()->for($other)->create();

        $response = $this->actingAs($user)->get(route('folders.index'));
        $response->assertOk();

        $ids = collect($response->original->getData()['page']['props']['folders'])->pluck('id');
        $this->assertTrue($ids->contains($ownFolder->id));
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

    public function test_user_can_create_root_folder(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('folders.store'), ['name' => 'My Videos'])
            ->assertRedirect();

        $this->assertDatabaseHas('folders', [
            'user_id' => $user->id,
            'parent_id' => null,
            'name' => 'My Videos',
        ]);
    }

    public function test_user_can_create_subfolder(): void
    {
        $user = User::factory()->create();
        $parent = Folder::factory()->for($user)->create();

        $this->actingAs($user)
            ->post(route('folders.store'), ['name' => '2024', 'parent_id' => $parent->id])
            ->assertRedirect();

        $this->assertDatabaseHas('folders', [
            'user_id' => $user->id,
            'parent_id' => $parent->id,
            'name' => '2024',
        ]);
    }

    public function test_user_cannot_create_subfolder_in_another_users_folder(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $otherFolder = Folder::factory()->for($other)->create();

        $this->actingAs($user)
            ->post(route('folders.store'), ['name' => 'Hack', 'parent_id' => $otherFolder->id])
            ->assertSessionHasErrors(['parent_id']);
    }

    public function test_folder_name_is_required(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('folders.store'), ['name' => ''])
            ->assertSessionHasErrors(['name']);
    }

    public function test_folder_name_cannot_exceed_255_characters(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('folders.store'), ['name' => str_repeat('a', 256)])
            ->assertSessionHasErrors(['name']);
    }

    // --- destroy ---

    public function test_user_can_delete_own_folder(): void
    {
        $user = User::factory()->create();
        $folder = Folder::factory()->for($user)->create();

        $this->actingAs($user)
            ->delete(route('folders.destroy', $folder->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('folders', ['id' => $folder->id]);
    }

    public function test_user_cannot_delete_another_users_folder(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $folder = Folder::factory()->for($owner)->create();

        $this->actingAs($other)
            ->delete(route('folders.destroy', $folder->id))
            ->assertNotFound();

        $this->assertDatabaseHas('folders', ['id' => $folder->id]);
    }
}
