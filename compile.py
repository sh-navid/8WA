import subprocess
import json
import os

def update_version_and_package():
    """
    Updates the patch version in package.json, compiles the VS Code extension,
    packages it, and installs the extension.
    """
    try:
        # Read package.json
        with open("package.json", "r") as f:
            package_json = json.load(f)

        # Increment patch version
        version = package_json["version"]
        major, minor, patch = map(int, version.split("."))
        patch += 1
        new_version = f"{major}.{minor}.{patch}"
        package_json["version"] = new_version

        # Write back to package.json
        with open("package.json", "w") as f:
            json.dump(package_json, f, indent=2)
            f.write('\n')  # Add newline at the end

        print(f"Updated version to {new_version}")

        # Create the vsix directory if it doesn't exist
        vsix_dir = "vsix"
        if not os.path.exists(vsix_dir):
            os.makedirs(vsix_dir)
            print(f"Created {vsix_dir} directory.")

        # Package the extension using vsce
        extension_name = package_json["name"]
        extension_version = package_json["version"]
        vsix_file = os.path.join(vsix_dir, f"{extension_name}-{extension_version}.vsix")

        # Package the extension, outputting directly to the vsix directory
        # vsce package does not support --out-dir
        subprocess.run(["vsce", "package"], check=True, capture_output=True, text=True, cwd=os.getcwd())
        print("Extension packaged successfully.")

        # Move the VSIX file to the vsix directory
        old_vsix_file = f"{extension_name}-{extension_version}.vsix"
        os.rename(old_vsix_file, vsix_file)
        print(f"Moved {old_vsix_file} to {vsix_file}")


        # Install the extension using code command
        subprocess.run(["code", "--install-extension", vsix_file], check=True, capture_output=True, text=True)
        print(f"Extension {vsix_file} installed successfully.")

    except FileNotFoundError:
        print("Error: package.json not found.")
    except json.JSONDecodeError:
        print("Error: Invalid JSON in package.json.")
    except subprocess.CalledProcessError as e:
        print(f"Error: {e.cmd} failed with error code {e.returncode}. Output: {e.stderr}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    update_version_and_package()