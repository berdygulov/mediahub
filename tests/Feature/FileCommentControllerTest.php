<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\FileComment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FileCommentControllerTest extends TestCase
{
    use RefreshDatabase;

    // --- store ---

    public function test_guest_cannot_post_comment(): void
    {
        $file = File::factory()->create();

        $this->post(route('file-comments.store', $file->id), ['body' => 'Тест'])
            ->assertRedirect(route('login'));
    }

    public function test_user_can_comment_on_own_file(): void
    {
        $user = User::factory()->create();
        $file = File::factory()->for($user)->create();

        $this->actingAs($user)
            ->post(route('file-comments.store', $file->id), ['body' => 'Отличное видео!'])
            ->assertRedirect();

        $this->assertDatabaseHas('file_comments', [
            'file_id' => $file->id,
            'user_id' => $user->id,
            'body' => 'Отличное видео!',
        ]);
    }

    public function test_user_cannot_comment_on_other_users_file(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $file = File::factory()->for($owner)->create();

        $this->actingAs($other)
            ->post(route('file-comments.store', $file->id), ['body' => 'Тест'])
            ->assertNotFound();
    }

    public function test_admin_can_comment_on_any_file(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $owner = User::factory()->create();
        $file = File::factory()->for($owner)->create();

        $this->actingAs($admin)
            ->post(route('file-comments.store', $file->id), ['body' => 'Комментарий администратора'])
            ->assertRedirect();

        $this->assertDatabaseHas('file_comments', [
            'file_id' => $file->id,
            'user_id' => $admin->id,
        ]);
    }

    public function test_comment_body_is_required(): void
    {
        $user = User::factory()->create();
        $file = File::factory()->for($user)->create();

        $this->actingAs($user)
            ->post(route('file-comments.store', $file->id), ['body' => ''])
            ->assertSessionHasErrors('body');
    }

    public function test_comment_body_max_2000_chars(): void
    {
        $user = User::factory()->create();
        $file = File::factory()->for($user)->create();

        $this->actingAs($user)
            ->post(route('file-comments.store', $file->id), ['body' => str_repeat('a', 2001)])
            ->assertSessionHasErrors('body');
    }

    // --- destroy ---

    public function test_guest_cannot_delete_comment(): void
    {
        $file = File::factory()->create();
        $comment = FileComment::factory()->for($file)->create();

        $this->delete(route('file-comments.destroy', [$file->id, $comment->id]))
            ->assertRedirect(route('login'));
    }

    public function test_author_can_delete_own_comment(): void
    {
        $user = User::factory()->create();
        $file = File::factory()->for($user)->create();
        $comment = FileComment::factory()->for($file)->for($user)->create();

        $this->actingAs($user)
            ->delete(route('file-comments.destroy', [$file->id, $comment->id]))
            ->assertRedirect();

        $this->assertDatabaseMissing('file_comments', ['id' => $comment->id]);
    }

    public function test_user_cannot_delete_other_users_comment(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $file = File::factory()->for($owner)->create();
        $comment = FileComment::factory()->for($file)->for($owner)->create();

        $this->actingAs($other)
            ->delete(route('file-comments.destroy', [$file->id, $comment->id]))
            ->assertNotFound();
    }

    public function test_admin_can_delete_any_comment(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $owner = User::factory()->create();
        $file = File::factory()->for($owner)->create();
        $comment = FileComment::factory()->for($file)->for($owner)->create();

        $this->actingAs($admin)
            ->delete(route('file-comments.destroy', [$file->id, $comment->id]))
            ->assertRedirect();

        $this->assertDatabaseMissing('file_comments', ['id' => $comment->id]);
    }

    public function test_show_page_includes_comments(): void
    {
        $user = User::factory()->create();
        $file = File::factory()->for($user)->create();
        FileComment::factory()->for($file)->for($user)->count(3)->create();

        $response = $this->actingAs($user)->get(route('files.show', $file->id));

        $response->assertOk();
        $comments = $response->original->getData()['page']['props']['file']['comments'];
        $this->assertCount(3, $comments);
    }
}
