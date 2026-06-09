<?php

namespace Database\Seeders;

use App\Models\Folder;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    // Default credentials: admin@mediahub.com / password
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@mediahub.com'],
            [
                'name' => 'Super Admin',
                'username' => 'superadmin',
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
                'is_admin' => true,
            ]
        );

        $yearFolder = Folder::firstOrCreate([
            'user_id' => $admin->id,
            'parent_id' => null,
            'name' => '2026',
        ]);

        $months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь'];

        foreach ($months as $month) {
            Folder::firstOrCreate([
                'user_id' => $admin->id,
                'parent_id' => $yearFolder->id,
                'name' => $month,
            ]);
        }
    }
}
