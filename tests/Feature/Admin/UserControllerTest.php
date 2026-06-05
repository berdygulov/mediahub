<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserControllerTest extends TestCase
{
    use RefreshDatabase;

    // --- index ---

    public function test_guests_are_redirected_from_index(): void
    {
        $this->get(route('admin.users.index'))->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_access_index(): void
    {
        $user = User::factory()->create(['is_admin' => false]);

        $this->actingAs($user)->get(route('admin.users.index'))->assertForbidden();
    }

    public function test_admin_can_access_index(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        User::factory()->count(3)->create();

        $response = $this->actingAs($admin)->get(route('admin.users.index'));

        $response->assertOk();
        $data = $response->original->getData()['page']['props']['users']['data'];
        $this->assertCount(4, $data);
    }

    public function test_index_returns_required_user_fields(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $response = $this->actingAs($admin)->get(route('admin.users.index'));

        $response->assertOk();
        $user = $response->original->getData()['page']['props']['users']['data'][0];

        $this->assertArrayHasKey('id', $user);
        $this->assertArrayHasKey('name', $user);
        $this->assertArrayHasKey('username', $user);
        $this->assertArrayHasKey('email', $user);
        $this->assertArrayHasKey('is_admin', $user);
        $this->assertArrayHasKey('created_at', $user);
    }

    public function test_index_returns_filters_prop(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $response = $this->actingAs($admin)->get(route('admin.users.index', [
            'search' => 'john',
            'sort' => 'name',
            'order' => 'asc',
        ]));

        $response->assertOk();
        $filters = $response->original->getData()['page']['props']['filters'];

        $this->assertSame('john', $filters['search']);
        $this->assertSame('name', $filters['sort']);
        $this->assertSame('asc', $filters['order']);
    }

    // --- search ---

    public function test_search_filters_by_name(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'name' => 'Admin User']);
        $match = User::factory()->create(['name' => 'John Doe', 'email' => 'john@example.com']);
        $noMatch = User::factory()->create(['name' => 'Jane Smith', 'email' => 'jane@example.com']);

        $response = $this->actingAs($admin)->get(route('admin.users.index', ['search' => 'John']));

        $response->assertOk();
        $ids = collect($response->original->getData()['page']['props']['users']['data'])->pluck('id');

        $this->assertTrue($ids->contains($match->id));
        $this->assertFalse($ids->contains($noMatch->id));
    }

    public function test_search_filters_by_email(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $match = User::factory()->create(['email' => 'unique@company.com']);
        $noMatch = User::factory()->create(['email' => 'other@example.com']);

        $response = $this->actingAs($admin)->get(route('admin.users.index', ['search' => 'company']));

        $response->assertOk();
        $ids = collect($response->original->getData()['page']['props']['users']['data'])->pluck('id');

        $this->assertTrue($ids->contains($match->id));
        $this->assertFalse($ids->contains($noMatch->id));
    }

    public function test_search_matches_name_and_email_simultaneously(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'name' => 'Admin', 'email' => 'admin@test.com']);
        $byName = User::factory()->create(['name' => 'Alice acme', 'email' => 'alice@other.com']);
        $byEmail = User::factory()->create(['name' => 'Bob', 'email' => 'bob@acme.com']);
        $noMatch = User::factory()->create(['name' => 'Charlie', 'email' => 'charlie@other.com']);

        $response = $this->actingAs($admin)->get(route('admin.users.index', ['search' => 'acme']));

        $response->assertOk();
        $ids = collect($response->original->getData()['page']['props']['users']['data'])->pluck('id');

        $this->assertTrue($ids->contains($byName->id));
        $this->assertTrue($ids->contains($byEmail->id));
        $this->assertFalse($ids->contains($noMatch->id));
    }

    // --- sort ---

    public function test_sort_by_name_ascending(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'name' => 'Zara']);
        User::factory()->create(['name' => 'Alice']);
        User::factory()->create(['name' => 'Mike']);

        $response = $this->actingAs($admin)->get(route('admin.users.index', [
            'sort' => 'name',
            'order' => 'asc',
        ]));

        $response->assertOk();
        $names = collect($response->original->getData()['page']['props']['users']['data'])->pluck('name');

        $this->assertSame($names->sort()->values()->all(), $names->values()->all());
    }

    public function test_sort_by_name_descending(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'name' => 'Zara']);
        User::factory()->create(['name' => 'Alice']);
        User::factory()->create(['name' => 'Mike']);

        $response = $this->actingAs($admin)->get(route('admin.users.index', [
            'sort' => 'name',
            'order' => 'desc',
        ]));

        $response->assertOk();
        $names = collect($response->original->getData()['page']['props']['users']['data'])->pluck('name');

        $this->assertSame($names->sortDesc()->values()->all(), $names->values()->all());
    }

    public function test_invalid_sort_column_falls_back_to_created_at(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $response = $this->actingAs($admin)->get(route('admin.users.index', ['sort' => 'password']));

        $response->assertOk();
        $filters = $response->original->getData()['page']['props']['filters'];
        $this->assertSame('created_at', $filters['sort']);
    }

    public function test_invalid_order_falls_back_to_desc(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $response = $this->actingAs($admin)->get(route('admin.users.index', ['order' => 'random']));

        $response->assertOk();
        $filters = $response->original->getData()['page']['props']['filters'];
        $this->assertSame('desc', $filters['order']);
    }

    // --- store ---

    public function test_guests_cannot_create_user(): void
    {
        $this->post(route('admin.users.store'), [
            'name' => 'New User',
            'username' => 'newuser',
            'email' => 'new@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_create_user(): void
    {
        $user = User::factory()->create(['is_admin' => false]);

        $this->actingAs($user)->post(route('admin.users.store'), [
            'name' => 'New User',
            'username' => 'newuser',
            'email' => 'new@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertForbidden();
    }

    public function test_admin_can_create_user(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)->post(route('admin.users.store'), [
            'name' => 'New User',
            'username' => 'newuser',
            'email' => 'new@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertRedirect();

        $this->assertDatabaseHas('users', [
            'name' => 'New User',
            'username' => 'newuser',
            'email' => 'new@example.com',
            'is_admin' => false,
        ]);
    }

    public function test_admin_can_create_admin_user(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)->post(route('admin.users.store'), [
            'name' => 'New Admin',
            'username' => 'newadmin',
            'email' => 'newadmin@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
            'is_admin' => true,
        ])->assertRedirect();

        $this->assertTrue(
            User::where('username', 'newadmin')->first()?->is_admin
        );
    }

    public function test_create_user_is_auto_verified(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)->post(route('admin.users.store'), [
            'name' => 'New User',
            'username' => 'verifieduser',
            'email' => 'verified@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        $this->assertNotNull(
            User::where('username', 'verifieduser')->first()?->email_verified_at
        );
    }

    public function test_create_user_requires_all_fields(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)->post(route('admin.users.store'), [])
            ->assertSessionHasErrors(['name', 'username', 'email', 'password']);
    }

    public function test_create_user_requires_unique_username(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        User::factory()->create(['username' => 'taken']);

        $this->actingAs($admin)->post(route('admin.users.store'), [
            'name' => 'New User',
            'username' => 'taken',
            'email' => 'new@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertSessionHasErrors('username');
    }

    public function test_create_user_requires_unique_email(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        User::factory()->create(['email' => 'taken@example.com']);

        $this->actingAs($admin)->post(route('admin.users.store'), [
            'name' => 'New User',
            'username' => 'newuser',
            'email' => 'taken@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertSessionHasErrors('email');
    }

    public function test_create_user_username_must_match_pattern(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)->post(route('admin.users.store'), [
            'name' => 'New User',
            'username' => 'invalid username!',
            'email' => 'new@example.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ])->assertSessionHasErrors('username');
    }

    // --- update ---

    public function test_guests_cannot_update_user(): void
    {
        $user = User::factory()->create();

        $this->patch(route('admin.users.update', $user->id), ['is_admin' => true])
            ->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_update_user(): void
    {
        $user = User::factory()->create(['is_admin' => false]);
        $target = User::factory()->create(['is_admin' => false]);

        $this->actingAs($user)
            ->patch(route('admin.users.update', $target->id), ['is_admin' => true])
            ->assertForbidden();
    }

    public function test_admin_can_grant_admin_role(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $target = User::factory()->create(['is_admin' => false]);

        $this->actingAs($admin)
            ->patch(route('admin.users.update', $target->id), ['is_admin' => true]);

        $this->assertTrue($target->fresh()->is_admin);
    }

    public function test_admin_can_revoke_admin_role(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $target = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->patch(route('admin.users.update', $target->id), ['is_admin' => false]);

        $this->assertFalse($target->fresh()->is_admin);
    }

    public function test_update_requires_is_admin_field(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $target = User::factory()->create();

        $this->actingAs($admin)
            ->patch(route('admin.users.update', $target->id), [])
            ->assertSessionHasErrors('is_admin');
    }

    public function test_update_returns_404_for_missing_user(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->patch(route('admin.users.update', 99999), ['is_admin' => true])
            ->assertNotFound();
    }
}
