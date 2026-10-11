#!/usr/bin/env python3
"""Compatibility entry point. Prefer westlake-ppt serve."""
import sys
import _bootstrap
from westlake_ppt.server import app

if __name__ == '__main__':
    app.main()
else:
    sys.modules[__name__] = app
