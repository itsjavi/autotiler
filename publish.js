const pkg = require('./package.json');
const {exec} = require("child_process");
const distDir = __dirname + '/dist';

const execHandler = (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        process.exit(1);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
};

//exec(`butler push ${distDir}/autotiler-mac.dmg ${pkg.butler.project}:macos-universal --userversion ${pkg.version}`, execHandler);
exec(`butler push ${distDir}/autotiler-mac.app ${pkg.butler.project}:macos-universal --userversion ${pkg.version}`, execHandler);
exec(`butler push ${distDir}/autotiler-win.exe ${pkg.butler.project}:windows --userversion ${pkg.version}`, execHandler);
exec(`butler push ${distDir}/autotiler-linux.AppImage ${pkg.butler.project}:linux-universal --userversion ${pkg.version}`, execHandler);
