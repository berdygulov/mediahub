<?php

namespace Tests\Feature\Admin;

use App\ActivityEvent;
use App\Models\ActivityLog;
use App\Models\Folder;
use App\Models\FolderAccess;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    // --- auth events ---

    public function test_login_creates_activity_log(): void
    {
        $user = User::factory()->create();

        $this->post(route('login'), [
            'username' => $user->username,
            'password' => 'password',
        ]);

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $user->id,
            'event' => ActivityEvent::Login->value,
        ]);
    }

    public function test_logout_creates_activity_log(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('logout'));

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $user->id,
            'event' => ActivityEvent::Logout->value,
        ]);
    }

    // --- folder access events ---

    public function test_granting_folder_access_creates_activity_log(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $target = User::factory()->create();
        $folder = Folder::factory()->for($admin)->create();

        $this->actingAs($admin)
            ->post(route('admin.folder-accesses.store', $folder->id), ['user_id' => $target->id]);

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $admin->id,
            'event' => ActivityEvent::FolderAccessGranted->value,
        ]);
    }

    public function test_revoking_folder_access_creates_activity_log(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $target = User::factory()->create();
        $folder = Folder::factory()->for($admin)->create();

        FolderAccess::create(['folder_id' => $folder->id, 'user_id' => $target->id]);

        $this->actingAs($admin)
            ->delete(route('admin.folder-accesses.destroy', [$folder->id, $target->id]));

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $admin->id,
            'event' => ActivityEvent::FolderAccessRevoked->value,
        ]);
    }

    // --- bulk delete ---

    public function test_admin_can_bulk_delete_logs(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $log1 = ActivityLog::create(['user_id' => $admin->id, 'event' => ActivityEvent::Login, 'description' => 'Вход']);
        $log2 = ActivityLog::create(['user_id' => $admin->id, 'event' => ActivityEvent::Logout, 'description' => 'Выход']);
        $log3 = ActivityLog::create(['user_id' => $admin->id, 'event' => ActivityEvent::Login, 'description' => 'Вход']);

        $this->actingAs($admin)
            ->delete(route('admin.logs.bulk-destroy'), ['ids' => [$log1->id, $log2->id]])
            ->assertRedirect();

        $this->assertDatabaseMissing('activity_logs', ['id' => $log1->id]);
        $this->assertDatabaseMissing('activity_logs', ['id' => $log2->id]);
        $this->assertDatabaseHas('activity_logs', ['id' => $log3->id]);
    }

    public function test_non_admin_cannot_bulk_delete_logs(): void
    {
        $user = User::factory()->create();
        $admin = User::factory()->create(['is_admin' => true]);

        $log = ActivityLog::create(['user_id' => $admin->id, 'event' => ActivityEvent::Login, 'description' => 'Вход']);

        $this->actingAs($user)
            ->delete(route('admin.logs.bulk-destroy'), ['ids' => [$log->id]])
            ->assertForbidden();

        $this->assertDatabaseHas('activity_logs', ['id' => $log->id]);
    }

    public function test_bulk_delete_requires_ids(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->delete(route('admin.logs.bulk-destroy'), [])
            ->assertSessionHasErrors('ids');
    }

    // --- logs page ---

    public function test_admin_can_view_logs_page(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->get(route('admin.logs.index'))
            ->assertOk();
    }

    public function test_non_admin_cannot_view_logs_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('admin.logs.index'))
            ->assertForbidden();
    }

    public function test_logs_page_can_filter_by_event(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        ActivityLog::create([
            'user_id' => $admin->id,
            'event' => ActivityEvent::Login,
            'description' => 'Вход в систему',
            'ip_address' => '127.0.0.1',
        ]);

        ActivityLog::create([
            'user_id' => $admin->id,
            'event' => ActivityEvent::Logout,
            'description' => 'Выход из системы',
            'ip_address' => '127.0.0.1',
        ]);

        $response = $this->actingAs($admin)
            ->get(route('admin.logs.index', ['event' => ActivityEvent::Login->value]));

        $response->assertOk();

        $logs = $response->original->getData()['page']['props']['logs']['data'];
        $this->assertCount(1, $logs);
        $this->assertEquals(ActivityEvent::Login->value, $logs[0]['event']);
    }

    public function test_logs_page_can_filter_by_user(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $other = User::factory()->create();

        ActivityLog::create([
            'user_id' => $admin->id,
            'event' => ActivityEvent::Login,
            'description' => 'Вход в систему',
        ]);

        ActivityLog::create([
            'user_id' => $other->id,
            'event' => ActivityEvent::Login,
            'description' => 'Вход в систему',
        ]);

        $response = $this->actingAs($admin)
            ->get(route('admin.logs.index', ['user_id' => $other->id]));

        $response->assertOk();

        $logs = $response->original->getData()['page']['props']['logs']['data'];
        $this->assertCount(1, $logs);
        $this->assertEquals($other->id, $logs[0]['user']['id']);
    }
}
