<?php

declare(strict_types=1);

namespace ElementareTeilchen\BayernAtlasFluid\Tests\Unit\Components;

use ElementareTeilchen\BayernAtlasFluid\Components\ComponentCollection;
use PHPUnit\Framework\TestCase;
use TYPO3Fluid\Fluid\Core\Rendering\RenderingContext;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;
use TYPO3Fluid\Fluid\Core\ViewHelper\ViewHelperResolver;
use TYPO3Fluid\Fluid\View\TemplateView;

/** Render the actual component; replace only TYPO3 translation and asset services. */
final class RenderingTest extends TestCase
{
    public function testComponentRendersNormalizedDimensionsAndEscapedItemData(): void
    {
        $html = $this->render('<baf:map id="sample" items="{items}" configuration="{height: 300}"/>');

        self::assertStringContainsString('id="bayernatlas-sample"', $html);
        self::assertStringContainsString('style="width: 100%; height: 300px;"', $html);
        self::assertStringNotContainsString('<script>', $html);

        $document = new \DOMDocument();
        @$document->loadHTML($html);
        $items = json_decode($document->getElementById('bayernatlas-sample')->getAttribute('data-items'), true, flags: JSON_THROW_ON_ERROR);
        self::assertSame('<script>untrusted title</script>', $items[0]['title']);
        self::assertCount(3, AssetViewHelper::$assets);
    }

    public function testMultipleComponentsShareAssetsButKeepDistinctIds(): void
    {
        $html = $this->render('<baf:map id="first" items="{items}" configuration="{configuration}"/><baf:map id="second" items="{items}" configuration="{configuration}"/>');

        self::assertStringContainsString('id="bayernatlas-first"', $html);
        self::assertStringContainsString('id="bayernatlas-second"', $html);
        self::assertSame(2, substr_count($html, 'height: 560px;'));
        self::assertCount(3, AssetViewHelper::$assets);
    }

    private function render(string $source): string
    {
        AssetViewHelper::$assets = [];
        $context = new RenderingContext();
        $resolver = new ComponentViewHelperResolver();
        $resolver->addNamespace('baf', ComponentCollection::class);
        $context->setViewHelperResolver($resolver);
        $context->getTemplatePaths()->setTemplateSource($source);
        $view = new TemplateView($context);
        $view->assign('configuration', []);
        $view->assign('items', [[
            'id' => 'sample',
            'title' => '<script>untrusted title</script>',
            'type' => 'point',
            'coordinates' => [11.5, 48.8],
        ]]);

        return $view->render();
    }
}

final class ComponentViewHelperResolver extends ViewHelperResolver
{
    public function resolveViewHelperClassName(string $namespaceIdentifier, string $methodIdentifier): string
    {
        return match ($namespaceIdentifier . ':' . $methodIdentifier) {
            'f:translate' => TranslationViewHelper::class,
            'f:asset.css', 'f:asset.script' => AssetViewHelper::class,
            default => parent::resolveViewHelperClassName($namespaceIdentifier, $methodIdentifier),
        };
    }
}

final class AssetViewHelper extends AbstractViewHelper
{
    public static array $assets = [];

    public function initializeArguments(): void
    {
        foreach (['identifier', 'href', 'src', 'type', 'priority', 'inline', 'useNonce', 'csp'] as $name) {
            $this->registerArgument($name, 'mixed', '');
        }
    }

    public function render(): string
    {
        self::$assets[$this->arguments['identifier']] = $this->arguments;

        return '';
    }
}

final class TranslationViewHelper extends AbstractViewHelper
{
    public function initializeArguments(): void
    {
        $this->registerArgument('key', 'string', '', true);
    }

    public function render(): string
    {
        return $this->arguments['key'];
    }
}
