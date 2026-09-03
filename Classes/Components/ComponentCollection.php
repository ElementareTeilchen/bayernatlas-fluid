<?php

declare(strict_types=1);

namespace ElementareTeilchen\BayernAtlasFluid\Components;

use TYPO3Fluid\Fluid\Core\Component\AbstractComponentCollection;
use TYPO3Fluid\Fluid\View\TemplatePaths;

final class ComponentCollection extends AbstractComponentCollection
{
    public function getTemplatePaths(): TemplatePaths
    {
        $extensionPath = dirname(__DIR__, 2);

        $templatePaths = new TemplatePaths();
        $templatePaths->setTemplateRootPaths([
            $extensionPath . '/Resources/Private/Components',
        ]);
        $templatePaths->setPartialRootPaths([
            $extensionPath . '/Resources/Private/Partials',
        ]);

        return $templatePaths;
    }
}
