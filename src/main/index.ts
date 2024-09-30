import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { createServer } from 'http'
import { createReadStream } from 'fs'
import { FakeNgxResponse } from './polyfill'
import API from './server';
import { stat } from 'fs/promises'

app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.electron')

    app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

    const mainWindow = new BrowserWindow({
        width: 600,
        height: 400,
        show: false,
        autoHideMenuBar: true,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: 'rgba(0, 0, 0, 0)',
            height: 35,
            symbolColor: 'gray'
        },
        webPreferences: {
            nodeIntegration: true,
            preload: join(__dirname, '../preload/index.js'),
            spellcheck: false
        }
    })

    mainWindow.on('ready-to-show', () => mainWindow.show());

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

const windows = [] as BrowserWindow[];
ipcMain.addListener('create-session', (_: Event, search: string) => {
    const newWin = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true,
        icon: require.resolve('@imzlh/vlist/dist/favicon.ico'),
        webPreferences: {
            nodeIntegration: true,
            sandbox: false,
            contextIsolation: false,
            webSecurity: false,
            preload: join(__dirname, '../preload/index.js')
        }
    });
    newWin.loadFile(require.resolve('@imzlh/vlist/dist/index.html'), {
        search
    });
    windows.push(newWin);
    newWin.show();
})
ipcMain.addListener('create-server', (_, path: string) => {
    // 创建服务器
    const server = createServer(async (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        console.log(req.method, url.pathname);
        if (url.pathname === '/@api/') {
            const vhandle = new FakeNgxResponse(res);
            try{
                await vhandle.__waitReady()
                await API(vhandle, path);
            }catch(e){
                console.error(e);
                if(!res.writableFinished)
                    vhandle.return(403, String(e));
            }
        }else{
            // 设置静态文件目录
            const filePath = join(path, decodeURIComponent(url.pathname));

            let stats;
            try{
                stats = await stat(filePath);
            }catch(e){
                res.statusCode = 404;
                res.end(String(e));
                return;
            }

            const range = [0, stats.size];
            if(req.headers.range){
                const match = req.headers.range.match(/bytes=(\d+)-(\d*)/);
                if(match){
                    if(match[1]) range[0] = parseInt(match[1]);
                    if(match[2]) range[1] = parseInt(match[2]) +1;

                    if(range[0] < 0 || range[1] > stats.size || range[0] >= range[1]){
                        res.statusCode = 416;
                        return res.end('Requested Range Not Satisfiable');
                    }

                    res.statusCode = 206;
                    res.setHeader('Content-Range', `bytes ${range[0]}-${range[1]-1}/${stats.size}`);
                }else{
                    res.statusCode = 416;
                    return res.end('invalid range format');
                }
            }
            
            try{
                res.statusCode = 200;
                res.setHeader('Content-Length', range[1] - range[0]);
                res.setHeader('Content-Type', 'application/octet-stream');
                createReadStream(filePath, {
                    "start": range[0],
                    "end": range[1]
                }).pipe(res);
            }catch(e){
                res.statusCode = 404;
                res.end(String(e));
            }
        }
    });
    server.listen();
    let addrstr;
    const addr = server.address()!;
    if(typeof addr == 'string') addrstr = addr;
    else addrstr = `${addr.family === 'IPv6' ? addr.address == '::' ? '[::1]' : `[${addr.address}]` : addr.address}:${addr.port}`;

    // 创建窗口
    const newWin = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            sandbox: false,
            contextIsolation: false,
            webSecurity: false,
            preload: join(__dirname, '../preload/index.js')
        }
    });
    newWin.loadFile(require.resolve('@imzlh/vlist/dist/index.html'), {
        "search": `?api=http://${addrstr}/@api/&proxy=http://${addrstr}`
    });
    newWin.on('closed', () => server.close());
    windows.push(newWin);
    newWin.show();
});