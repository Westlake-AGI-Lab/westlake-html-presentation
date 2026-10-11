"""Compatibility import for lecture improvements."""
import sys
import _bootstrap
from westlake_ppt.classroom import improvements
sys.modules[__name__] = improvements
