const { spawn } = require('child_process');

async function startReactApp(reactAppPath) {
    return new Promise((resolve, reject) => {
        //const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const npm = 'npm';
        const startProcess = spawn(npm, ['start'], {
            cwd: reactAppPath,
            shell: true,  // Enable shell execution
            stdio: ['pipe', 'pipe', 'pipe'], // Pipe all streams
        });

        startProcess.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
            if (data.includes('Compiled successfully')) {
                resolve(startProcess); // Resolve when the app has compiled
            }
        });

        startProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        startProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`React app exited with code ${code}`));
            }

            console.log(`React app exited with code ${code}`);
        });

        startProcess.on('error', (err) => {
            reject(new Error(`Failed to start React app: ${err.message}`));
        });

        // Handle potential startup errors
        setTimeout(() => {
            if (startProcess.exitCode === null && !startProcess.killed) {
                console.log("React app taking longer than expected to start, resolving anyway.");
                resolve(startProcess); // Resolve even if compilation message is not received
            }
        }, 20000); // Timeout after 20 seconds
    });
}

module.exports = { startReactApp };
