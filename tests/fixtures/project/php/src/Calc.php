<?php

declare(strict_types=1);

namespace Acme;

final class Calc
{
    public function abs(int $a): int
    {
        if ($a < 0) {
            return -$a;
        }

        return $a;
    }
}
