<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Http\Controllers\Controller;
use App\Models\File;
use App\Models\Folder;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    use PasswordValidationRules, ProfileValidationRules;

    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();
        $sort = $request->input('sort', 'created_at');
        $order = $request->input('order', 'desc');

        if (! in_array($sort, ['name', 'created_at'])) {
            $sort = 'created_at';
        }

        if (! in_array($order, ['asc', 'desc'])) {
            $order = 'desc';
        }

        $users = User::query()
            ->select(['id', 'name', 'username', 'email', 'is_admin', 'created_at'])
            ->where('id', '!=', $request->user()->id)
            ->when($search, fn ($q) => $q->where(function ($q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->orderBy($sort, $order)
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('admin/users', [
            'users' => $users,
            'filters' => [
                'search' => $search,
                'sort' => $sort,
                'order' => $order,
            ],
        ]);
    }

    public function show(int $id): Response
    {
        $user = User::findOrFail($id);

        $accessibleFolders = Folder::whereHas('accesses', fn ($q) => $q->where('user_id', $user->id))
            ->select(['id', 'name', 'parent_id'])
            ->orderBy('name')
            ->get();

        $folderIds = $accessibleFolders->pluck('id');

        $files = File::query()
            ->whereIn('folder_id', $folderIds)
            ->with('folder:id,name')
            ->select(['id', 'name', 'type', 'mime_type', 'size', 'folder_id', 'created_at'])
            ->latest()
            ->paginate(20);

        $allFolders = Folder::select(['id', 'name', 'parent_id'])
            ->orderBy('name')
            ->get();

        return Inertia::render('admin/users/show', [
            'user' => $user->only('id', 'name', 'username', 'email', 'is_admin', 'created_at'),
            'accessibleFolders' => $accessibleFolders,
            'files' => $files,
            'allFolders' => $allFolders,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            ...$this->profileRules(),
            'username' => $this->usernameRules(),
            'password' => $this->passwordRules(),
            'is_admin' => ['boolean'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'is_admin' => $validated['is_admin'] ?? false,
        ]);

        $user->email_verified_at = now();
        $user->save();

        return back();
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $user = User::findOrFail($id);

        $rules = [
            ...$this->profileRules($user->id),
            'username' => $this->usernameRules($user->id),
            'is_admin' => ['boolean'],
        ];

        if ($request->filled('password')) {
            $rules['password'] = ['string', Password::default(), 'confirmed'];
        }

        $validated = $request->validate($rules);

        $updateData = [
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'is_admin' => $validated['is_admin'] ?? $user->is_admin,
        ];

        if (isset($validated['password'])) {
            $updateData['password'] = $validated['password'];
        }

        $user->update($updateData);

        return back();
    }

    public function destroy(int $id): RedirectResponse
    {
        // TODO: delete user
        return back();
    }
}
