<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('search', [
            'query' => $request->query('q', ''),
            'type' => $request->query('type'),
        ]);
    }
}
