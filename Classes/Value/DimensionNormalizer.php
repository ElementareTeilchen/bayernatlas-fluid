<?php

declare(strict_types=1);

namespace ElementareTeilchen\BayernAtlasFluid\Value;

final class DimensionNormalizer
{
    public static function normalize(mixed $value, string $fallback): string
    {
        $normalized = trim((string)($value ?? ''));

        if ($normalized === '') {
            $normalized = trim($fallback);
        }

        return preg_match('/^\d+(?:\.\d+)?$/D', $normalized) === 1
            ? $normalized . 'px'
            : $normalized;
    }
}
