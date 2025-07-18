import os
import re

def remove_files_by_pattern(root_dir, pattern, exclude_filename="n8x.json"):
    """
    Removes files matching a specified pattern within a directory and its subdirectories,
    excluding a specific filename.

    Args:
        root_dir (str): The root directory to start the search from.
        pattern (str): The regular expression pattern to match filenames against.
        exclude_filename (str, optional): The name of the file to exclude from deletion.
                                          Defaults to "n8x.json".
    """
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for filename in filenames:
            if re.search(pattern, filename) and filename != exclude_filename:
                file_path = os.path.join(dirpath, filename)
                try:
                    os.remove(file_path)
                    print(f"Removed: {file_path}")
                except OSError as e:
                    print(f"Error removing {file_path}: {e}")

if __name__ == "__main__":
    root_directory = "."  # Current directory
    file_pattern = r".*n8x.*"  # Matches any file containing "n8x" in its name
    exclude_file = "n8x.json"

    remove_files_by_pattern(root_directory, file_pattern, exclude_file)