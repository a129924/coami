"""Execute one retained E013 runner source snapshot for an authorized live run."""

from pathlib import Path
import sys


def main() -> None:
    runner = Path(__file__).resolve().with_name("jev_context.py")
    source = runner.read_bytes()
    namespace = {
        "__name__": "__main__",
        "__file__": str(runner),
        "_E013_EXECUTED_SOURCE": source,
    }
    sys.argv = [str(runner), *sys.argv[1:]]
    exec(compile(source, str(runner), "exec"), namespace)


if __name__ == "__main__":
    main()
