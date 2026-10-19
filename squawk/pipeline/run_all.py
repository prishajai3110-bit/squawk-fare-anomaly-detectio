"""
run_all.py
Orchestrates sequential execution of data generation and model detection pipelines.
"""

import sys
import time
from generate_data import main as run_data_gen
from train_and_detect import run_pipeline as run_detection

def main():
    print("[1/2] Generating synthetic airline datasets...")
    start_time = time.time()
    try:
        run_data_gen()
    except Exception as e:
        print(f"ERROR: generate_data failed: {e}", file=sys.stderr)
        sys.exit(1)

    print("\n[2/2] Training XGBoost baseline, running Isolation Forest & Coordination detector...")
    try:
        run_detection()
    except Exception as e:
        print(f"ERROR: train_and_detect failed: {e}", file=sys.stderr)
        sys.exit(1)

    elapsed = time.time() - start_time
    print(f"\nSQUAWK Pipeline finished successfully in {elapsed:.2f} seconds.")

if __name__ == "__main__":
    main()