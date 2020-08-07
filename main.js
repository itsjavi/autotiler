// Modules to control application life and create native browser window
const {app, BrowserWindow, shell} = require('electron')
const path = require('path')
const open = require('open')

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        darkTheme: true,
        width: 920,
        height: 560,
        useContentSize: true,
        webPreferences: {
            preload: path.join(__dirname, 'app.js'),
            //nodeIntegration: true
        },
        icon: path.join(__dirname, '/img/Icon-512x512.png')
    })

    mainWindow.setResizable(false)
    mainWindow.setFullScreenable(false)

    // and load the index.html of the app.
    mainWindow.loadFile('index.html')

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Remove menu bar
    mainWindow.removeMenu()
    mainWindow.sele
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow()

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    //if (process.platform !== 'darwin')
    app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


// Open links in default browser
app.on('web-contents-created', (e, contents) => {
    contents.on('new-window', (e, url) => {
        e.preventDefault();
        open(url);
    });
    contents.on('will-navigate', (e, url) => {
        if (url !== contents.getURL()) {
            e.preventDefault();
            open(url);
        }
    });
});