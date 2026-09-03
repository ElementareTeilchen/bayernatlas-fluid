<?php

declare(strict_types=1);

namespace ElementareTeilchen\BayernAtlasFluid\Tests\Unit\Value;

use ElementareTeilchen\BayernAtlasFluid\Value\DimensionNormalizer;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class DimensionNormalizerTest extends TestCase
{
    /**
     * @return iterable<string, array{mixed, string, string}>
     */
    public static function dimensions(): iterable
    {
        yield 'integer' => [300, '560px', '300px'];
        yield 'numeric string' => ['300', '560px', '300px'];
        yield 'decimal string' => ['300.5', '560px', '300.5px'];
        yield 'percentage' => ['75%', '100%', '75%'];
        yield 'viewport unit' => ['60vh', '560px', '60vh'];
        yield 'empty value' => ['', '560px', '560px'];
        yield 'null value' => [null, '100%', '100%'];
    }

    #[Test]
    #[DataProvider('dimensions')]
    public function returnsValidCssDimension(mixed $value, string $fallback, string $expected): void
    {
        self::assertSame($expected, DimensionNormalizer::normalize($value, $fallback));
    }
}
