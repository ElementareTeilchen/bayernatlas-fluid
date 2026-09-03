<?php

declare(strict_types=1);

use ElementareTeilchen\BayernAtlasFluid\Components\ComponentCollection;

defined('TYPO3') || die();

$GLOBALS['TYPO3_CONF_VARS']['SYS']['fluid']['namespaces']['baf'] = [
    ComponentCollection::class,
];
