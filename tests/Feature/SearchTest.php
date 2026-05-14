<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get(route('search.index', ['q' => 'test']))
            ->assertRedirect(route('login'));
    }

    public function test_empty_query_returns_no_results(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('search.index'))
            ->assertInertia(fn ($page) => $page
                ->component('search')
                ->where('query', '')
                ->where('folders', [])
                ->where('files', [])
            );
    }

    public function test_short_query_returns_no_results(): void
    {
        $user = User::factory()->create();
        File::factory()->for($user)->create(['name' => 'a.mp4']);

        $this->actingAs($user)
            ->get(route('search.index', ['q' => 'a']))
            ->assertInertia(fn ($page) => $page
                ->where('folders', [])
                ->where('files', [])
            );
    }

    public function test_search_finds_matching_files(): void
    {
        $user = User::factory()->create();
        File::factory()->for($user)->create(['name' => 'my_vacation_video.mp4', 'type' => 'video', 'mime_type' => 'video/mp4']);
        File::factory()->for($user)->create(['name' => 'unrelated.mp3', 'type' => 'audio', 'mime_type' => 'audio/mp3']);

        $this->actingAs($user)
            ->get(route('search.index', ['q' => 'vacation']))
            ->assertInertia(fn ($page) => $page
                ->where('query', 'vacation')
                ->has('files', 1)
                ->where('files.0.name', 'my_vacation_video.mp4')
                ->where('folders', [])
            );
    }

    public function test_search_finds_matching_folders(): void
    {
        $user = User::factory()->create();
        Folder::factory()->for($user)->create(['name' => 'Summer Vacation']);
        Folder::factory()->for($user)->create(['name' => 'Work Projects']);

        $this->actingAs($user)
            ->get(route('search.index', ['q' => 'vacation']))
            ->assertInertia(fn ($page) => $page
                ->has('folders', 1)
                ->where('folders.0.name', 'Summer Vacation')
                ->where('files', [])
            );
    }

    public function test_search_returns_folder_path_for_nested_folder(): void
    {
        $user = User::factory()->create();
        $root = Folder::factory()->for($user)->create(['name' => 'Root']);
        $child = Folder::factory()->withParent($root)->create(['name' => 'Child']);
        Folder::factory()->withParent($child)->create(['name' => 'Nested Target']);

        $this->actingAs($user)
            ->get(route('search.index', ['q' => 'Nested Target']))
            ->assertInertia(fn ($page) => $page
                ->has('folders', 1)
                ->where('folders.0.name', 'Nested Target')
                ->has('folders.0.path', 2)
                ->where('folders.0.path.0.name', 'Root')
                ->where('folders.0.path.1.name', 'Child')
            );
    }

    public function test_search_returns_folder_path_for_file_in_nested_folder(): void
    {
        $user = User::factory()->create();
        $root = Folder::factory()->for($user)->create(['name' => 'Media']);
        $sub = Folder::factory()->withParent($root)->create(['name' => 'Videos']);
        File::factory()->for($user)->inFolder($sub)->create(['name' => 'holiday_clip.mp4', 'type' => 'video', 'mime_type' => 'video/mp4']);

        $this->actingAs($user)
            ->get(route('search.index', ['q' => 'holiday']))
            ->assertInertia(fn ($page) => $page
                ->has('files', 1)
                ->where('files.0.name', 'holiday_clip.mp4')
                ->has('files.0.folder_path', 2)
                ->where('files.0.folder_path.0.name', 'Media')
                ->where('files.0.folder_path.1.name', 'Videos')
            );
    }

    public function test_type_filter_folder_returns_only_folders(): void
    {
        $user = User::factory()->create();
        Folder::factory()->for($user)->create(['name' => 'alpha folder']);
        File::factory()->for($user)->create(['name' => 'alpha file.mp4']);

        $this->actingAs($user)
            ->get(route('search.index', ['q' => 'alpha', 'type' => 'folder']))
            ->assertInertia(fn ($page) => $page
                ->has('folders', 1)
                ->where('files', [])
            );
    }

    public function test_type_filter_video_returns_only_video_files(): void
    {
        $user = User::factory()->create();
        File::factory()->for($user)->video()->create(['name' => 'clip_summer.mp4']);
        File::factory()->for($user)->audio()->create(['name' => 'clip_summer.mp3']);

        $this->actingAs($user)
            ->get(route('search.index', ['q' => 'clip', 'type' => 'video']))
            ->assertInertia(fn ($page) => $page
                ->has('files', 1)
                ->where('files.0.type', 'video')
                ->where('folders', [])
            );
    }

    public function test_type_filter_audio_returns_only_audio_files(): void
    {
        $user = User::factory()->create();
        File::factory()->for($user)->video()->create(['name' => 'clip_summer.mp4']);
        File::factory()->for($user)->audio()->create(['name' => 'clip_summer.mp3']);

        $this->actingAs($user)
            ->get(route('search.index', ['q' => 'clip', 'type' => 'audio']))
            ->assertInertia(fn ($page) => $page
                ->has('files', 1)
                ->where('files.0.type', 'audio')
                ->where('folders', [])
            );
    }

    public function test_search_does_not_return_other_users_results(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        File::factory()->for($other)->create(['name' => 'secret_video.mp4']);
        Folder::factory()->for($other)->create(['name' => 'secret_folder']);

        $this->actingAs($user)
            ->get(route('search.index', ['q' => 'secret']))
            ->assertInertia(fn ($page) => $page
                ->where('folders', [])
                ->where('files', [])
            );
    }

    public function test_file_without_folder_has_empty_folder_path(): void
    {
        $user = User::factory()->create();
        File::factory()->for($user)->create(['name' => 'standalone.mp4', 'folder_id' => null]);

        $this->actingAs($user)
            ->get(route('search.index', ['q' => 'standalone']))
            ->assertInertia(fn ($page) => $page
                ->has('files', 1)
                ->where('files.0.folder_path', [])
            );
    }

    public function test_root_folder_has_empty_path(): void
    {
        $user = User::factory()->create();
        Folder::factory()->for($user)->create(['name' => 'root_folder_abc', 'parent_id' => null]);

        $this->actingAs($user)
            ->get(route('search.index', ['q' => 'root_folder_abc']))
            ->assertInertia(fn ($page) => $page
                ->has('folders', 1)
                ->where('folders.0.path', [])
            );
    }
}
