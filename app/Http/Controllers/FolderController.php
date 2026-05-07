<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FolderController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('folders/index');
    }

    public function show(int $id): Response
    {
        return Inertia::render('folders/show');
    }

    public function store(Request $request): RedirectResponse
    {
        // TODO: create folder
        return back();
    }

    public function destroy(int $id): RedirectResponse
    {
        // TODO: delete folder
        return back();
    }
}
