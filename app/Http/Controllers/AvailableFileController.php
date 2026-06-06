<?php

namespace App\Http\Controllers;

use App\Models\File;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AvailableFileController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = File::query()
            ->with(['folder.parent.parent.parent'])
            ->whereHas('accesses', fn ($q) => $q->where('user_id', $user->id));

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

        $files = $query->paginate(10)->withQueryString();

        $files->getCollection()->transform(function ($file) {
            if ($file->folder) {
                $segments = [];
                $current = $file->folder;

                while ($current !== null) {
                    array_unshift($segments, $current->name);
                    $current = $current->parent;
                }

                $file->folder->path = implode(' / ', $segments);
            }

            return $file;
        });

        return Inertia::render('available-files/index', [
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
}
