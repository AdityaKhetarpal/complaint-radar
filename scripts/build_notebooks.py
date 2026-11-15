"""Turn the plain-text notebook sources in nbsrc/ into .ipynb notebooks in notebooks/ (jupytext percent format)."""
from pathlib import Path
import jupytext

root = Path(__file__).resolve().parent.parent
for src in sorted((root / "nbsrc").glob("*.py")):
    nb = jupytext.read(src)
    nb.metadata["kernelspec"] = {"name": "python3", "display_name": "Python 3", "language": "python"}
    jupytext.write(nb, root / "notebooks" / (src.stem + ".ipynb"))
    print("built", src.stem)
