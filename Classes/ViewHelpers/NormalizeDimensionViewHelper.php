<?php

declare(strict_types=1);

namespace ElementareTeilchen\BayernAtlasFluid\ViewHelpers;

use ElementareTeilchen\BayernAtlasFluid\Value\DimensionNormalizer;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;

final class NormalizeDimensionViewHelper extends AbstractViewHelper
{
    public function initializeArguments(): void
    {
        $this->registerArgument('value', 'mixed', 'CSS dimension to normalize.');
        $this->registerArgument('fallback', 'string', 'Fallback CSS dimension.', true);
    }

    public function render(): string
    {
        return DimensionNormalizer::normalize(
            $this->arguments['value'] ?? null,
            $this->arguments['fallback'],
        );
    }
}
