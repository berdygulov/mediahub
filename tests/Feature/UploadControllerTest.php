<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UploadControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_login(): void
    {
        $response = $this->post(route('upload.store'));
        $response->assertRedirect(route('login'));
    }

    public function test_admin_can_visit_upload_page(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)->get(route('upload.create'))->assertOk();
    }

    public function test_admin_can_upload_a_video_file(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create(['is_admin' => true]);
        $file = UploadedFile::fake()->create('video.mp4', 1024, 'video/mp4');

        $this->actingAs($admin)->post(route('upload.store'), ['file' => $file])->assertRedirect();

        $this->assertDatabaseHas('files', [
            'user_id' => $admin->id,
            'name' => 'video.mp4',
            'disk' => 'local',
            'type' => 'video',
        ]);

        $record = File::where('user_id', $admin->id)->sole();
        Storage::disk('local')->assertExists($record->path);
    }

    public function test_admin_can_upload_an_audio_file(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create(['is_admin' => true]);
        $file = UploadedFile::fake()->create('audio.mp3', 512, 'audio/mpeg');

        $this->actingAs($admin)->post(route('upload.store'), ['file' => $file])->assertRedirect();

        $this->assertDatabaseHas('files', [
            'user_id' => $admin->id,
            'name' => 'audio.mp3',
            'disk' => 'local',
            'type' => 'audio',
        ]);
    }

    public function test_admin_can_upload_an_ogg_file(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create(['is_admin' => true]);
        $file = UploadedFile::fake()->create('audio.ogg', 512, 'audio/ogg');

        $this->actingAs($admin)->post(route('upload.store'), ['file' => $file])->assertRedirect();

        $this->assertDatabaseHas('files', [
            'user_id' => $admin->id,
            'name' => 'audio.ogg',
            'disk' => 'local',
            'type' => 'audio',
        ]);
    }

    public function test_file_is_required(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->withHeaders(['Accept' => 'application/json'])
            ->post(route('upload.store'), [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_unsupported_file_type_is_rejected(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $this->actingAs($admin)
            ->withHeaders(['Accept' => 'application/json'])
            ->post(route('upload.store'), ['file' => $file])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_file_exceeding_500mb_is_rejected(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $file = UploadedFile::fake()->create('video.mp4', 1, 'video/mp4')->size(501 * 1024);

        $this->actingAs($admin)
            ->withHeaders(['Accept' => 'application/json'])
            ->post(route('upload.store'), ['file' => $file])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_file_is_stored_under_uploading_admin(): void
    {
        Storage::fake('local');

        $adminA = User::factory()->create(['is_admin' => true]);
        $adminB = User::factory()->create(['is_admin' => true]);
        $file = UploadedFile::fake()->create('video.mp4', 1024, 'video/mp4');

        $this->actingAs($adminA)->post(route('upload.store'), ['file' => $file]);

        $this->assertDatabaseHas('files', ['user_id' => $adminA->id]);
        $this->assertDatabaseMissing('files', ['user_id' => $adminB->id]);
    }

    public function test_file_can_be_uploaded_into_a_folder(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create(['is_admin' => true]);
        $folder = Folder::factory()->create(['user_id' => $admin->id]);
        $file = UploadedFile::fake()->create('video.mp4', 1024, 'video/mp4');

        $this->actingAs($admin)->post(route('upload.store'), [
            'file' => $file,
            'folder_id' => $folder->id,
        ])->assertRedirect();

        $this->assertDatabaseHas('files', [
            'user_id' => $admin->id,
            'folder_id' => $folder->id,
            'name' => 'video.mp4',
        ]);
    }

    public function test_invalid_folder_id_is_rejected(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $file = UploadedFile::fake()->create('video.mp4', 1024, 'video/mp4');

        $this->actingAs($admin)
            ->withHeaders(['Accept' => 'application/json'])
            ->post(route('upload.store'), [
                'file' => $file,
                'folder_id' => 99999,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['folder_id']);
    }
}
