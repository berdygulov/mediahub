<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('folder_accesses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('folder_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['folder_id', 'user_id']);
        });

        Schema::dropIfExists('file_accesses');
    }

    public function down(): void
    {
        Schema::dropIfExists('folder_accesses');

        Schema::create('file_accesses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('file_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['file_id', 'user_id']);
        });
    }
};
