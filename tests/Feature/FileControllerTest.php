<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FileControllerTest extends TestCase
{
    use RefreshDatabase;

    // --- index ---

    public function test_guests_are_redirected_from_index(): void
    {
        $this->get(route('files.index'))->assertRedirect(route('login'));
    }

    public function test_user_sees_only_own_files(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $ownFile = File::factory()->for($owner)->create();
        $otherFile = File::factory()->for($other)->create();

        $response = $this->actingAs($owner)->get(route('files.index'));

        $response->assertOk();
        $data = $response->original->getData()['page']['props']['files']['data'];
        $ids = collect($data)->pluck('id');

        $this->assertTrue($ids->contains($ownFile->id));
        $this->assertFalse($ids->contains($otherFile->id));
    }

    public function test_admin_sees_all_files(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $fileA = File::factory()->for($userA)->create();
        $fileB = File::factory()->for($userB)->create();

        $response = $this->actingAs($admin)->get(route('files.index'));

        $response->assertOk();
        $data = $response->original->getData()['page']['props']['files']['data'];
        $ids = collect($data)->pluck('id');

        $this->assertTrue($ids->contains($fileA->id));
        $this->assertTrue($ids->contains($fileB->id));
    }

    public function test_index_filters_by_name_search(): void
    {
        $user = User::factory()->create();
        File::factory()->for($user)->create(['name' => 'vacation_video.mp4']);
        File::factory()->for($user)->create(['name' => 'podcast_episode.mp3']);

        $response = $this->actingAs($user)->get(route('files.index', ['search' => 'vacation']));

        $response->assertOk();
        $data = $response->original->getData()['page']['props']['files']['data'];

        $this->assertCount(1, $data);
        $this->assertSame('vacation_video.mp4', $data[0]['name']);
    }

    public function test_index_filters_by_type(): void
    {
        $user = User::factory()->create();
        File::factory()->for($user)->video()->create();
        File::factory()->for($user)->audio()->create();

        $response = $this->actingAs($user)->get(route('files.index', ['type' => 'video']));

        $response->assertOk();
        $data = $response->original->getData()['page']['props']['files']['data'];

        $this->assertNotEmpty($data);
        foreach ($data as $file) {
            $this->assertSame('video', $file['type']);
        }
    }

    public function test_index_filters_by_date_range(): void
    {
        $user = User::factory()->create();

        $old = File::factory()->for($user)->create();
        $old->forceFill(['created_at' => now()->subMonths(3)])->save();

        $recent = File::factory()->for($user)->create();
        $recent->forceFill(['created_at' => now()->subDay()])->save();

        $response = $this->actingAs($user)->get(route('files.index', [
            'from' => now()->subWeek()->toDateString(),
            'to' => now()->toDateString(),
        ]));

        $response->assertOk();
        $data = $response->original->getData()['page']['props']['files']['data'];
        $ids = collect($data)->pluck('id');

        $this->assertTrue($ids->contains($recent->id));
        $this->assertFalse($ids->contains($old->id));
    }

    // --- show ---

    public function test_guests_are_redirected_from_show(): void
    {
        $file = File::factory()->for(User::factory()->create())->create();

        $this->get(route('files.show', $file->id))->assertRedirect(route('login'));
    }

    public function test_user_can_view_own_file(): void
    {
        $user = User::factory()->create();
        $file = File::factory()->for($user)->create();

        $response = $this->actingAs($user)->get(route('files.show', $file->id));

        $response->assertOk();
        $props = $response->original->getData()['page']['props'];
        $this->assertSame($file->id, $props['file']['id']);
        $this->assertArrayHasKey('streamUrl', $props);
        $this->assertArrayHasKey('downloadUrl', $props);
    }

    public function test_user_cannot_view_another_users_file(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $file = File::factory()->for($owner)->create();

        $this->actingAs($other)->get(route('files.show', $file->id))->assertNotFound();
    }

    public function test_admin_can_view_any_file(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $owner = User::factory()->create();
        $file = File::factory()->for($owner)->create();

        $this->actingAs($admin)->get(route('files.show', $file->id))->assertOk();
    }

    // --- stream ---

    public function test_guests_are_redirected_from_stream(): void
    {
        $file = File::factory()->for(User::factory()->create())->create();

        $this->get(route('files.stream', $file->id))->assertRedirect(route('login'));
    }

    public function test_user_can_stream_own_file(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $file = File::factory()->for($user)->create([
            'disk' => 'local',
            'path' => 'media/test.mp4',
            'mime_type' => 'video/mp4',
        ]);
        Storage::disk('local')->put('media/test.mp4', 'fake video content');

        $this->actingAs($user)->get(route('files.stream', $file->id))->assertOk();
    }

    public function test_user_cannot_stream_another_users_file(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $other = User::factory()->create();
        $file = File::factory()->for($owner)->create([
            'disk' => 'local',
            'path' => 'media/test.mp4',
        ]);
        Storage::disk('local')->put('media/test.mp4', 'fake video content');

        $this->actingAs($other)->get(route('files.stream', $file->id))->assertNotFound();
    }

    public function test_admin_can_stream_any_file(): void
    {
        Storage::fake('local');

        $admin = User::factory()->create(['is_admin' => true]);
        $owner = User::factory()->create();
        $file = File::factory()->for($owner)->create([
            'disk' => 'local',
            'path' => 'media/test.mp4',
            'mime_type' => 'video/mp4',
        ]);
        Storage::disk('local')->put('media/test.mp4', 'fake video content');

        $this->actingAs($admin)->get(route('files.stream', $file->id))->assertOk();
    }

    // --- download ---

    public function test_user_can_download_own_file(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $file = File::factory()->for($user)->create([
            'disk' => 'local',
            'path' => 'media/test.mp4',
        ]);
        Storage::disk('local')->put('media/test.mp4', 'fake content');

        $response = $this->actingAs($user)->get(route('files.download', $file->id));

        $response->assertOk();
    }

    public function test_user_cannot_download_another_users_file(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $other = User::factory()->create();
        $file = File::factory()->for($owner)->create(['disk' => 'local', 'path' => 'media/test.mp4']);
        Storage::disk('local')->put('media/test.mp4', 'fake content');

        $this->actingAs($other)->get(route('files.download', $file->id))->assertNotFound();
    }

    // --- destroy ---

    public function test_user_can_delete_own_file(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $file = File::factory()->for($user)->create(['disk' => 'local', 'path' => 'media/test.mp4']);
        Storage::disk('local')->put('media/test.mp4', 'fake content');

        $response = $this->actingAs($user)->delete(route('files.destroy', $file->id));

        $response->assertRedirect(route('files.index'));
        $this->assertDatabaseMissing('files', ['id' => $file->id]);
        Storage::disk('local')->assertMissing('media/test.mp4');
    }

    public function test_user_cannot_delete_another_users_file(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $other = User::factory()->create();
        $file = File::factory()->for($owner)->create(['disk' => 'local', 'path' => 'media/test.mp4']);
        Storage::disk('local')->put('media/test.mp4', 'fake content');

        $this->actingAs($other)->delete(route('files.destroy', $file->id))->assertNotFound();

        $this->assertDatabaseHas('files', ['id' => $file->id]);
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
    }
}
