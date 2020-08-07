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

exec(`butler publish ${distDir}/Autotiler-${pkg.version}-mac.dmg ${pkg.butler.project}:osx-universal`, execHandler);
exec(`butler publish ${distDir}/Autotiler-${pkg.version}-win.exe ${pkg.butler.project}:win`, execHandler);
exec(`butler publish ${distDir}/Autotiler-${pkg.version}-linux.AppImage ${pkg.butler.project}:linux-universal`, execHandler);
