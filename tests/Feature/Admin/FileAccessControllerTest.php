<?php

namespace Tests\Feature\Admin;

use App\Models\File;
use App\Models\FileAccess;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FileAccessControllerTest extends TestCase
{
    use RefreshDatabase;

    // --- store ---

    public function test_guest_cannot_grant_access(): void
    {
        $file = File::factory()->create();

        $this->post(route('admin.file-accesses.store', $file->id), ['user_id' => 1])
            ->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_grant_access(): void
    {
        $user = User::factory()->create();
        $file = File::factory()->create();

        $this->actingAs($user)
            ->post(route('admin.file-accesses.store', $file->id), ['user_id' => $user->id])
            ->assertForbidden();
    }

    public function test_admin_can_grant_access_to_user(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $owner = User::factory()->create();
        $target = User::factory()->create();
        $file = File::factory()->for($owner)->create();

        $this->actingAs($admin)
            ->post(route('admin.file-accesses.store', $file->id), ['user_id' => $target->id])
            ->assertRedirect();

        $this->assertDatabaseHas('file_accesses', [
            'file_id' => $file->id,
            'user_id' => $target->id,
        ]);
    }

    public function test_cannot_grant_access_to_file_owner(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $owner = User::factory()->create();
        $file = File::factory()->for($owner)->create();

        $this->actingAs($admin)
            ->post(route('admin.file-accesses.store', $file->id), ['user_id' => $owner->id])
            ->assertSessionHasErrors('user_id');
    }

    public function test_cannot_grant_access_to_admin(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $otherAdmin = User::factory()->create(['is_admin' => true]);
        $file = File::factory()->create();

        $this->actingAs($admin)
            ->post(route('admin.file-accesses.store', $file->id), ['user_id' => $otherAdmin->id])
            ->assertSessionHasErrors('user_id');
    }

    public function test_duplicate_access_is_idempotent(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $owner = User::factory()->create();
        $target = User::factory()->create();
        $file = File::factory()->for($owner)->create();

        FileAccess::create(['file_id' => $file->id, 'user_id' => $target->id]);

        $this->actingAs($admin)
            ->post(route('admin.file-accesses.store', $file->id), ['user_id' => $target->id])
            ->assertRedirect();

        $this->assertDatabaseCount('file_accesses', 1);
    }

    // --- destroy ---

    public function test_admin_can_revoke_access(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $owner = User::factory()->create();
        $target = User::factory()->create();
        $file = File::factory()->for($owner)->create();

        FileAccess::create(['file_id' => $file->id, 'user_id' => $target->id]);

        $this->actingAs($admin)
            ->delete(route('admin.file-accesses.destroy', [$file->id, $target->id]))
            ->assertRedirect();

        $this->assertDatabaseMissing('file_accesses', [
            'file_id' => $file->id,
            'user_id' => $target->id,
        ]);
    }

    public function test_non_admin_cannot_revoke_access(): void
    {
        $user = User::factory()->create();
        $file = File::factory()->create();

        $this->actingAs($user)
            ->delete(route('admin.file-accesses.destroy', [$file->id, $user->id]))
            ->assertForbidden();
    }

    // --- access control for files ---

    public function test_user_with_access_can_view_file_show_page(): void
    {
        $user = User::factory()->create();
        $owner = User::factory()->create();
        $file = File::factory()->for($owner)->create();

        FileAccess::create(['file_id' => $file->id, 'user_id' => $user->id]);

        $this->actingAs($user)->get(route('files.show', $file->id))->assertOk();
    }

    public function test_user_without_access_cannot_view_file(): void
    {
        $user = User::factory()->create();
        $owner = User::factory()->create();
        $file = File::factory()->for($owner)->create();

        $this->actingAs($user)->get(route('files.show', $file->id))->assertNotFound();
    }

    public function test_user_with_access_cannot_download_file(): void
    {
        $user = User::factory()->create();
        $owner = User::factory()->create();
        $file = File::factory()->for($owner)->create();

        FileAccess::create(['file_id' => $file->id, 'user_id' => $user->id]);

        $this->actingAs($user)->get(route('files.download', $file->id))->assertNotFound();
    }

    public function test_show_page_passes_can_download_false_for_access_user(): void
    {
        $user = User::factory()->create();
        $owner = User::factory()->create();
        $file = File::factory()->for($owner)->create();

        FileAccess::create(['file_id' => $file->id, 'user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('files.show', $file->id));

        $response->assertOk();
        $this->assertFalse($response->original->getData()['page']['props']['canDownload']);
    }

    public function test_show_page_passes_can_download_true_for_owner(): void
    {
        $owner = User::factory()->create();
        $file = File::factory()->for($owner)->create();

        $response = $this->actingAs($owner)->get(route('files.show', $file->id));

        $response->assertOk();
        $this->assertTrue($response->original->getData()['page']['props']['canDownload']);
    }
}
