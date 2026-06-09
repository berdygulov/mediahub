<?php

namespace App\Listeners;

use App\ActivityEvent;
use App\Models\ActivityLog;
use Illuminate\Auth\Events\Login;
use Illuminate\Http\Request;

class LogUserLogin
{
    public function __construct(private Request $request) {}

    public function handle(Login $event): void
    {
        ActivityLog::create([
            'user_id' => $event->user->getAuthIdentifier(),
            'event' => ActivityEvent::Login,
            'description' => 'Вход в систему',
            'ip_address' => $this->request->ip(),
        ]);
    }
}
