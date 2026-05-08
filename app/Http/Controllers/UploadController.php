<?php

namespace App\Http\Controllers;

use App\Models\File;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\File as FileRule;
use Inertia\Inertia;
use Inertia\Response;

class UploadController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('upload');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => [
                'required',
                FileRule::types(['mp4', 'mkv', 'avi', 'mp3', 'wav', 'flac'])
                    ->max('500mb'),
            ],
        ]);

        $uploaded = $request->file('file');
        $mimeType = $uploaded->getMimeType();
        $extension = strtolower($uploaded->getClientOriginalExtension());
        $type = str_starts_with($mimeType, 'video/') ? 'video' : 'audio';

        $path = $uploaded->storeAs('media', Str::uuid().'.'.$extension, 'local');

        File::create([
            'user_id' => $request->user()->id,
            'name' => $uploaded->getClientOriginalName(),
            'disk' => 'local',
            'path' => $path,
            'mime_type' => $mimeType,
            'type' => $type,
            'size' => $uploaded->getSize(),
        ]);

        return back();
    }
}
