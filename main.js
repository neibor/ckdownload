const request = require('request')
const fs = require('fs')
const Bagpipe = require('bagpipe')
const { app, BrowserWindow, dialog } = require('electron')
const ipc = require('electron').ipcMain

let win
function createWindow() {
    // 创建浏览器窗口
    win = new BrowserWindow({ width: 1100, height: 700 })
    win.webContents.openDevTools()
    // 然后加载 app 的 index.html.
    win.loadFile('main.html')
    win.on('closed', () => {
        // 取消引用 window 对象，如果你的应用支持多窗口的话，
        // 通常会把多个 window 对象存放在一个数组里面，
        // 与此同时，你应该删除相应的元素。
        win = null
    })

}
app.on('ready', createWindow)

ipc.on('download', (sys, url, start, end, dest_dir) => {
    console.log('Begin download...')
    console.log('prefix: ' + url)
    console.log('start from ' + start)
    console.log('end with '+ end)
    donwload(url, start, end, dest_dir)
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
    request(src).pipe(fs.createWriteStream(dest)).on('close', function () {
        console.log(src)
        callback("completed " + src)
    })
}

let bp = new Bagpipe(11, { refuse: false })
var donwload = function (url, start, end, dest_dir, suffix = '.ts') {
    var webc = win.webContents
    var len = end.length
    for (var i = parseInt(start); i <= parseInt(end); i++) {
        src = url + PrefixInteger(i, len) + suffix
        dest = dest_dir + '/' + PrefixInteger(i, len) + suffix
        bp.push(downloadVideo, src, dest, function (data) {
            webc.send("complete", data)
        });
    }
}

function print(src, dest, callback) {
    // console.log(src, dest)
    callback(src)
}

function PrefixInteger(num, n) {
    return (Array(n).join(0) + num).slice(-n);
}

ipc.on('select_dir', function (event) {
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }, function (files) {
        if (files)
            event.sender.send('selectedItem', files)
    })
})