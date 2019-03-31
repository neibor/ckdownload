const request = require('request')
const fs = require('fs')
const Bagpipe = require('bagpipe')
const { app, BrowserWindow, dialog } = require('electron')
const ipc = require('electron').ipcMain
const menu = require('electron').Menu
const url = require('url')

if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (prefix) {
        return this.slice(0, prefix.length) === prefix;
    };
}

if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function (suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}

let win

function createWindow() {
    menu.setApplicationMenu(null)
    win = new BrowserWindow({ width: 400, height: 500 })
    // win.webContents.openDevTools()
    win.loadFile('main.html')
    win.on('closed', () => {
        win = null
    })
    console.log("")

}
app.on('ready', createWindow)

ipc.on('download', (sys, m3u_src, dest_dir) => {
    console.log('Begin download...')
    console.log('m3u8 src ' + m3u_src)
    download(m3u_src, dest_dir)
    // dry_run(url, start, end)
})

// 当全部窗口关闭时退出。
app.on('window-all-closed', () => {
    // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
    // 否则绝大部分应用及其菜单栏会保持激活。
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

var downloadVideo = function (src, dest, callback) {
    request({"url":src, "rejectUnauthorized": false}).pipe(fs.createWriteStream(dest)).on('close', function () {
        callback("completed " + src)
    })
}

var parseM3u = function(data) {
    var rtn = []
    var lines = data.split('\n')
    for (i in lines) {
        if (lines[i].endsWith('.ts')) {
            rtn.push(lines[i])
        }
    }
    return rtn
}

function download(m3u_src, dest_dir) {
    var prefix = url.resolve(m3u_src,".")
    request({ "url": m3u_src, "rejectUnauthorized": false }, (err, data) => {
        var list_of_files = parseM3u(data.body)
        downloadAll(list_of_files, prefix, dest_dir)
    })
}

let bp = new Bagpipe(11, { refuse: false })
function downloadAll(list_of_files, prefix, dest_dir) {
    var webc = win.webContents
    webc.send("totalfiles", 20)
    dest_dir = dest_dir + "/"
    // for (var i in list_of_files) {
    for (var i=0; i < 20; i++){
        src = url.resolve(prefix, list_of_files[i])
        var dest = url.resolve(dest_dir, list_of_files[i])
        bp.push(downloadVideo, src, dest, function (data) {
            webc.send("complete", data)
            webc.send("statplus")
        });
    }
}
function sleep(ms) {
    return new Promise(resolve => 
        setTimeout(resolve, ms)
    )
  }

function print(src, dest, callback) {
    sleep(Math.floor(Math.random()*1000)+1).then(() => {
        callback(src)
    })
}

ipc.on('select_dir', function (event) {
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }, function (files) {
        if (files)
            event.sender.send('selectedItem', files)
    })
})