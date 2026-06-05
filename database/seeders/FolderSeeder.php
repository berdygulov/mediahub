<?php

namespace Database\Seeders;

use App\Models\Folder;
use App\Models\User;
use Illuminate\Database\Seeder;

class FolderSeeder extends Seeder
{
    private const YEARS = [2024, 2025, 2026];

    private const MONTHS = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
    ];

    private const TYPES = ['Видео', 'Аудио'];

    public function run(): void
    {
        $admin = User::where('is_admin', true)->firstOrFail();

        foreach (self::YEARS as $year) {
            $yearFolder = Folder::firstOrCreate([
                'user_id' => $admin->id,
                'parent_id' => null,
                'name' => (string) $year,
            ]);

            foreach (self::MONTHS as $month) {
                $monthFolder = Folder::firstOrCreate([
                    'user_id' => $admin->id,
                    'parent_id' => $yearFolder->id,
                    'name' => $month,
                ]);

                foreach (self::TYPES as $type) {
                    Folder::firstOrCreate([
                        'user_id' => $admin->id,
                        'parent_id' => $monthFolder->id,
                        'name' => $type,
                    ]);
                }
            }
        }
    }
}
