<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\Folder;
use App\Models\FolderAccess;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page(): void
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_dashboard(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }

    public function test_dashboard_passes_stats_and_recent_files_props(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));

        $response->assertInertia(
            fn ($page) => $page
                ->component('dashboard')
                ->has('stats')
                ->has('stats.total')
                ->has('stats.video')
                ->has('stats.audio')
                ->has('stats.storage')
                ->has('recentFiles')
        );
    }

    public function test_stats_reflect_only_current_users_files(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        File::factory()->count(2)->for($user)->create(['type' => 'video']);
        File::factory()->count(1)->for($user)->create(['type' => 'audio']);
        File::factory()->count(5)->for($other)->create(['type' => 'video']);

        $this->actingAs($user);

        $response = $this->get(route('dashboard'));

        $response->assertInertia(
            fn ($page) => $page
                ->where('stats.total', 3)
                ->where('stats.video', 2)
                ->where('stats.audio', 1)
        );
    }

    public function test_admin_sees_all_files_in_stats(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();

        File::factory()->count(3)->for($admin)->create(['type' => 'video']);
        File::factory()->count(2)->for($user)->create(['type' => 'audio']);

        $this->actingAs($admin);

        $response = $this->get(route('dashboard'));

        $response->assertInertia(
            fn ($page) => $page
                ->where('stats.total', 5)
                ->where('stats.video', 3)
                ->where('stats.audio', 2)
        );
    }

    public function test_non_admin_stats_include_files_from_shared_folders(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();

        $folder = Folder::factory()->for($admin)->create();
        FolderAccess::create(['folder_id' => $folder->id, 'user_id' => $user->id]);

        File::factory()->count(2)->for($user)->create(['type' => 'video']);
        File::factory()->count(3)->for($admin)->for($folder, 'folder')->create(['type' => 'audio']);

        $this->actingAs($user);

        $response = $this->get(route('dashboard'));

        $response->assertInertia(
            fn ($page) => $page
                ->where('stats.total', 5)
                ->where('stats.video', 2)
                ->where('stats.audio', 3)
        );
    }

    public function test_non_admin_recent_files_include_files_from_shared_folders(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create();

        $folder = Folder::factory()->for($admin)->create();
        FolderAccess::create(['folder_id' => $folder->id, 'user_id' => $user->id]);

        File::factory()->count(2)->for($user)->create();
        File::factory()->count(2)->for($admin)->for($folder, 'folder')->create();

        $this->actingAs($user);

        $response = $this->get(route('dashboard'));

        $response->assertInertia(
            fn ($page) => $page->count('recentFiles', 4)
        );
    }

    public function test_recent_files_are_limited_to_six_and_ordered_by_newest_first(): void
    {
        $user = User::factory()->create();

        File::factory()->count(8)->for($user)->create();

        $this->actingAs($user);

        $response = $this->get(route('dashboard'));

        $response->assertInertia(
            fn ($page) => $page->count('recentFiles', 6)
        );
    }
}
