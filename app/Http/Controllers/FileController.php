<?php

namespace App\Http\Controllers;

use App\Models\File;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = File::query()->with(['folder', 'user']);

        if (! $user->is_admin) {
            $query->where('user_id', $user->id);
        }

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        $allowedSorts = ['name', 'mime_type', 'size', 'created_at'];
        $sort = in_array($request->query('sort'), $allowedSorts) ? $request->query('sort') : 'created_at';
        $order = $request->query('order', 'desc') === 'asc' ? 'asc' : 'desc';

        $query->orderBy($sort, $order);

        $files = $query->paginate(20)->withQueryString();

        return Inertia::render('files/index', [
            'files' => $files,
            'filters' => [
                'search' => $request->query('search', ''),
                'type' => $request->query('type', ''),
                'from' => $request->query('from', ''),
                'to' => $request->query('to', ''),
                'sort' => $sort,
                'order' => $order,
            ],
        ]);
    }

    public function show(int $id): Response
    {
        return Inertia::render('files/show');
    }

    public function download(int $id, Request $request): StreamedResponse
    {
        $user = $request->user();

        $query = File::query();
        if (! $user->is_admin) {
            $query->where('user_id', $user->id);
        }

        $file = $query->findOrFail($id);

        return Storage::disk($file->disk)->download($file->path, $file->name);
    }

    public function destroy(int $id, Request $request): RedirectResponse
    {
        $user = $request->user();

        $query = File::query();
        if (! $user->is_admin) {
            $query->where('user_id', $user->id);
        }

        $file = $query->findOrFail($id);

        Storage::disk($file->disk)->delete($file->path);
        $file->delete();

        return back();
    }
}
