<?php

namespace App\Listeners;

use App\ActivityEvent;
use App\Models\ActivityLog;
use Illuminate\Auth\Events\Logout;
use Illuminate\Http\Request;

class LogUserLogout
{
    public function __construct(private Request $request) {}

    public function handle(Logout $event): void
    {
        if ($event->user === null) {
            return;
        }

        ActivityLog::create([
            'user_id' => $event->user->getAuthIdentifier(),
            'event' => ActivityEvent::Logout,
            'description' => 'Выход из системы',
            'ip_address' => $this->request->ip(),
        ]);
    }
}
