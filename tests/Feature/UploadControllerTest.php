<?php

namespace Tests\Feature;

use App\Models\File;
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

    public function test_authenticated_user_can_visit_upload_page(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('upload.create'));

        $response->assertOk();
    }

    public function test_authenticated_user_can_upload_a_video_file(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('video.mp4', 1024, 'video/mp4');

        $response = $this->actingAs($user)->post(route('upload.store'), ['file' => $file]);

        $response->assertRedirect();

        $this->assertDatabaseHas('files', [
            'user_id' => $user->id,
            'name' => 'video.mp4',
            'disk' => 'local',
            'type' => 'video',
        ]);

        $record = File::where('user_id', $user->id)->sole();
        Storage::disk('local')->assertExists($record->path);
    }

    public function test_authenticated_user_can_upload_an_audio_file(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('audio.mp3', 512, 'audio/mpeg');

        $response = $this->actingAs($user)->post(route('upload.store'), ['file' => $file]);

        $response->assertRedirect();

        $this->assertDatabaseHas('files', [
            'user_id' => $user->id,
            'name' => 'audio.mp3',
            'disk' => 'local',
            'type' => 'audio',
        ]);
    }

    public function test_file_is_required(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withHeaders(['Accept' => 'application/json'])
            ->post(route('upload.store'), []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['file']);
    }

    public function test_unsupported_file_type_is_rejected(): void
    {
        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $response = $this->actingAs($user)
            ->withHeaders(['Accept' => 'application/json'])
            ->post(route('upload.store'), ['file' => $file]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['file']);
    }

    public function test_file_exceeding_500mb_is_rejected(): void
    {
        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('video.mp4', 1, 'video/mp4')->size(501 * 1024);

        $response = $this->actingAs($user)
            ->withHeaders(['Accept' => 'application/json'])
            ->post(route('upload.store'), ['file' => $file]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['file']);
    }

    public function test_file_is_stored_under_authenticated_user(): void
    {
        Storage::fake('local');

        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $file = UploadedFile::fake()->create('video.mp4', 1024, 'video/mp4');

        $this->actingAs($userA)->post(route('upload.store'), ['file' => $file]);

        $this->assertDatabaseHas('files', ['user_id' => $userA->id]);
        $this->assertDatabaseMissing('files', ['user_id' => $userB->id]);
    }
}
