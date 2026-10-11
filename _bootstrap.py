"""Source-checkout compatibility for the former top-level entry points."""
from pathlib import Path
import sys

source = str(Path(__file__).resolve().parent/'src')
if source not in sys.path:
    sys.path.insert(0, source)
