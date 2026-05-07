<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/users');
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        // TODO: update user role / status
        return back();
    }

    public function destroy(int $id): RedirectResponse
    {
        // TODO: delete user
        return back();
    }
}
