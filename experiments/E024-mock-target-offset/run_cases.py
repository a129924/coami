"""Display independent Mock inputs, actual results and hand-written expectations."""

from calculator import calculate_offset
from mock_cases import COMMON_CASES


def main() -> None:
    for case in COMMON_CASES:
        print(f"{case.name}: input={case.observation!r}")
        print(f"  actual={calculate_offset(case.observation)!r}")
        print(f"  expected={case.expected!r}")
    print(f"Displayed {len(COMMON_CASES)} independent Mock snapshots.")
    print("Validate with unittest. This is not a tracking or Robot control run.")


if __name__ == "__main__":
    main()
