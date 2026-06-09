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
        $request->validate(
            [
                'file' => [
                    'required',
                    FileRule::types(['mp4', 'mkv', 'avi', 'mp3', 'wav', 'flac', 'ogg'])
                        ->max('500mb'),
                ],
                'folder_id' => ['nullable', 'integer', 'exists:folders,id'],
                'description' => ['nullable', 'string', 'max:2000'],
            ],
            [
                'file.required' => 'Файл обязателен.',
                'file.Illuminate\Validation\Rules\File' => 'Файл должен быть одного из форматов: MP4, MKV, AVI, MP3, WAV, FLAC, OGG. Максимальный размер — 500 МБ.',
                'folder_id.exists' => 'Указанная папка не существует.',
                'description.max' => 'Описание не должно превышать 2000 символов.',
            ],
        );

        $uploaded = $request->file('file');
        $mimeType = $uploaded->getMimeType();
        $extension = strtolower($uploaded->getClientOriginalExtension());
        $type = str_starts_with($mimeType, 'video/') ? 'video' : 'audio';

        $path = $uploaded->storeAs('media', Str::uuid().'.'.$extension, 'local');

        File::create([
            'user_id' => $request->user()->id,
            'folder_id' => $request->input('folder_id'),
            'name' => $uploaded->getClientOriginalName(),
            'description' => $request->input('description'),
            'disk' => 'local',
            'path' => $path,
            'mime_type' => $mimeType,
            'type' => $type,
            'size' => $uploaded->getSize(),
        ]);

        return back();
    }
}
