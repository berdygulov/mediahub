<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FileController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('files/index', [
            'type' => $request->query('type'),
            'sort' => $request->query('sort', 'created_at'),
            'order' => $request->query('order', 'desc'),
        ]);
    }

    public function show(int $id): Response
    {
        return Inertia::render('files/show');
    }

    public function destroy(int $id): RedirectResponse
    {
        // TODO: delete file from storage and database
        return back();
    }
}
