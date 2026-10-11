"""Compatibility import for existing classroom integrations."""
import sys
import _bootstrap
from westlake_ppt.classroom import state
sys.modules[__name__] = state
