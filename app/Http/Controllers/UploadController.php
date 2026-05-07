<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UploadController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('upload');
    }

    public function store(Request $request): JsonResponse
    {
        // TODO: validate, store file, return file data
        return response()->json(['message' => 'Not yet implemented.'], 501);
    }
}
