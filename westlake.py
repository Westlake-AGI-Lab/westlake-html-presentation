#!/usr/bin/env python3
"""Checkout entry point; installed environments can use westlake-ppt."""
import _bootstrap
from westlake_ppt.cli import main

if __name__ == '__main__':
    raise SystemExit(main())
