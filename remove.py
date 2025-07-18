import os
import re

def remove_files_by_pattern(root_dir, pattern):
    """
    Removes files matching a specified pattern within a directory and its subdirectories.

    Args:
        root_dir (str): The root directory to start the search from.
        pattern (str): The regular expression pattern to match filenames against.
    """
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for filename in filenames:
            if re.search(pattern, filename):
                file_path = os.path.join(dirpath, filename)
                try:
                    os.remove(file_path)
                    print(f"Removed: {file_path}")
                except OSError as e:
                    print(f"Error removing {file_path}: {e}")

if __name__ == "__main__":
    root_directory = "."  # Current directory
    file_pattern = r".*n8x.*"  # Matches any file containing "n8x" in its name

    remove_files_by_pattern(root_directory, file_pattern)