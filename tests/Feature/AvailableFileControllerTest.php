<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\FileAccess;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AvailableFileControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected(): void
    {
        $this->get(route('available-files.index'))->assertRedirect(route('login'));
    }

    public function test_user_sees_only_files_granted_to_them(): void
    {
        $user = User::factory()->create();
        $owner = User::factory()->create();

        $grantedFile = File::factory()->for($owner)->create();
        $otherFile = File::factory()->for($owner)->create();

        FileAccess::create(['file_id' => $grantedFile->id, 'user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('available-files.index'));

        $response->assertOk();
        $ids = collect($response->original->getData()['page']['props']['files']['data'])->pluck('id');

        $this->assertTrue($ids->contains($grantedFile->id));
        $this->assertFalse($ids->contains($otherFile->id));
    }

    public function test_own_files_are_not_shown(): void
    {
        $user = User::factory()->create();
        $ownFile = File::factory()->for($user)->create();

        $response = $this->actingAs($user)->get(route('available-files.index'));

        $response->assertOk();
        $ids = collect($response->original->getData()['page']['props']['files']['data'])->pluck('id');

        $this->assertFalse($ids->contains($ownFile->id));
    }

    public function test_admin_sees_empty_available_list(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $owner = User::factory()->create();
        File::factory()->for($owner)->create();

        $response = $this->actingAs($admin)->get(route('available-files.index'));

        $response->assertOk();
        $ids = collect($response->original->getData()['page']['props']['files']['data'])->pluck('id');

        $this->assertCount(0, $ids);
    }

    public function test_search_filter_works(): void
    {
        $user = User::factory()->create();
        $owner = User::factory()->create();

        $match = File::factory()->for($owner)->create(['name' => 'лекция по физике.mp4']);
        $noMatch = File::factory()->for($owner)->create(['name' => 'музыка.mp3']);

        FileAccess::create(['file_id' => $match->id, 'user_id' => $user->id]);
        FileAccess::create(['file_id' => $noMatch->id, 'user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('available-files.index', ['search' => 'физике']));

        $ids = collect($response->original->getData()['page']['props']['files']['data'])->pluck('id');

        $this->assertTrue($ids->contains($match->id));
        $this->assertFalse($ids->contains($noMatch->id));
    }
}
