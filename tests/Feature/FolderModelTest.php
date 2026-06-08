<?php

namespace Tests\Feature;

use App\Models\Folder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FolderModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_folder_belongs_to_user(): void
    {
        $user = User::factory()->create();
        $folder = Folder::factory()->for($user)->create();

        $this->assertTrue($folder->user->is($user));
    }

    public function test_parent_relationship_returns_parent_folder(): void
    {
        $parent = Folder::factory()->create();
        $child = Folder::factory()->withParent($parent)->create();

        $this->assertTrue($child->parent->is($parent));
    }

    public function test_root_folder_has_null_parent(): void
    {
        $folder = Folder::factory()->create();

        $this->assertNull($folder->parent);
    }

    public function test_children_relationship_returns_direct_children(): void
    {
        $parent = Folder::factory()->create();
        $child1 = Folder::factory()->withParent($parent)->create();
        $child2 = Folder::factory()->withParent($parent)->create();
        $unrelated = Folder::factory()->create();

        $childIds = $parent->children->pluck('id');

        $this->assertCount(2, $childIds);
        $this->assertTrue($childIds->contains($child1->id));
        $this->assertTrue($childIds->contains($child2->id));
        $this->assertFalse($childIds->contains($unrelated->id));
    }

    public function test_all_children_loads_tree_recursively(): void
    {
        $root = Folder::factory()->create();
        $level1 = Folder::factory()->withParent($root)->create();
        $level2 = Folder::factory()->withParent($level1)->create();
        $level3 = Folder::factory()->withParent($level2)->create();

        $root->load('allChildren');

        $this->assertCount(1, $root->allChildren);
        $this->assertCount(1, $root->allChildren->first()->allChildren);
        $this->assertCount(1, $root->allChildren->first()->allChildren->first()->allChildren);
        $this->assertTrue(
            $root->allChildren->first()->allChildren->first()->allChildren->first()->is($level3)
        );
    }

    public function test_ancestors_returns_chain_from_root_to_parent(): void
    {
        $root = Folder::factory()->create();
        $level1 = Folder::factory()->withParent($root)->create();
        $level2 = Folder::factory()->withParent($level1)->create();
        $level3 = Folder::factory()->withParent($level2)->create();

        $ancestors = $level3->ancestors();

        $this->assertCount(3, $ancestors);
        $this->assertTrue($ancestors[0]->is($root));
        $this->assertTrue($ancestors[1]->is($level1));
        $this->assertTrue($ancestors[2]->is($level2));
    }

    public function test_ancestors_returns_empty_for_root_folder(): void
    {
        $root = Folder::factory()->create();

        $this->assertEmpty($root->ancestors());
    }

    public function test_children_are_deleted_when_parent_folder_is_deleted(): void
    {
        $parent = Folder::factory()->create();
        $child = Folder::factory()->withParent($parent)->create();

        $parent->delete();

        $this->assertDatabaseMissing('folders', ['id' => $child->id]);
    }
}
