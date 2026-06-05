<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminOnlyActionsTest extends TestCase
{
    use RefreshDatabase;

    // --- Upload: GET /upload ---

    public function test_non_admin_cannot_visit_upload_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('upload.create'))->assertForbidden();
    }

    public function test_admin_can_visit_upload_page(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)->get(route('upload.create'))->assertOk();
    }

    // --- Upload: POST /upload ---

    public function test_non_admin_cannot_upload_file(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('video.mp4', 1024, 'video/mp4');

        $this->actingAs($user)->post(route('upload.store'), ['file' => $file])->assertForbidden();

        $this->assertDatabaseMissing('files', ['user_id' => $user->id]);
    }

    public function test_admin_can_upload_file(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create(['is_admin' => true]);
        $file = UploadedFile::fake()->create('video.mp4', 1024, 'video/mp4');

        $this->actingAs($admin)->post(route('upload.store'), ['file' => $file])->assertRedirect();

        $this->assertDatabaseHas('files', ['user_id' => $admin->id, 'name' => 'video.mp4']);
    }

    // --- Create folder: POST /folders ---

    public function test_non_admin_cannot_create_folder(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('folders.store'), ['name' => 'Test'])->assertForbidden();

        $this->assertDatabaseMissing('folders', ['name' => 'Test']);
    }

    public function test_admin_can_create_folder(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)->post(route('folders.store'), ['name' => 'Test'])->assertRedirect();

        $this->assertDatabaseHas('folders', ['user_id' => $admin->id, 'name' => 'Test']);
    }

    // --- Delete file: DELETE /files/{id} ---

    public function test_non_admin_cannot_delete_file(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $file = File::factory()->for($user)->create(['disk' => 'local', 'path' => 'media/test.mp4']);
        Storage::disk('local')->put('media/test.mp4', 'fake content');

        $this->actingAs($user)->delete(route('files.destroy', $file->id))->assertForbidden();

        $this->assertDatabaseHas('files', ['id' => $file->id]);
        Storage::disk('local')->assertExists('media/test.mp4');
    }

    public function test_admin_can_delete_any_file(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create(['is_admin' => true]);
        $owner = User::factory()->create();
        $file = File::factory()->for($owner)->create(['disk' => 'local', 'path' => 'media/test.mp4']);
        Storage::disk('local')->put('media/test.mp4', 'fake content');

        $this->actingAs($admin)->delete(route('files.destroy', $file->id))->assertRedirect(route('files.index'));

        $this->assertDatabaseMissing('files', ['id' => $file->id]);
        Storage::disk('local')->assertMissing('media/test.mp4');
    }

    // --- Delete folder: DELETE /folders/{id} ---

    public function test_non_admin_cannot_delete_folder(): void
    {
        $user = User::factory()->create();
        $folder = Folder::factory()->for($user)->create();

        $this->actingAs($user)->delete(route('folders.destroy', $folder->id))->assertForbidden();

        $this->assertDatabaseHas('folders', ['id' => $folder->id]);
    }

    public function test_admin_can_delete_folder(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $folder = Folder::factory()->for($admin)->create();

        $this->actingAs($admin)->delete(route('folders.destroy', $folder->id))->assertRedirect();

        $this->assertDatabaseMissing('folders', ['id' => $folder->id]);
    }
}
