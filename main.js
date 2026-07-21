const { app, BrowserWindow, ipcMain } = require("electron");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const whois = require("whois");
const net = require("net");

app.whenReady().then(() => {

    initializeDataFiles();

    createWindow();

});

function createWindow() {

    const win = new BrowserWindow({

        width: 1200,
        height: 700,
        minWidth: 900,
        minHeight: 600,

        icon: path.join(__dirname, "assets", "img", "logo.ico"),

        autoHideMenuBar: true,
        backgroundColor: "#111111",

        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        }

    });


    win.loadFile(path.join(__dirname, "src", "views", "index.html"));

    //win.webContents.openDevTools();

}

//Create Json Files
function initializeDataFiles() {

    // Pasta da aplicação dentro do AppData
    const dataFolder = path.join(
        app.getPath("userData"),
        "data"
    );


    // Cria a pasta caso ainda não exista
    if (!fs.existsSync(dataFolder)) {

        fs.mkdirSync(dataFolder, {
            recursive: true
        });

    }


    const files = [

        {
            name: "servers.json",
            defaultData: []
        },

        {
            name: "groups.json",
            defaultData: [
                {
                    id: "default",
                    name: "Ungrouped",
                    description: "Servers without a group",
                    icon: "fa-server",
                    color: "#6b7280"
                }
            ]
        },

        {
            name: "settings.json",
            defaultData: {
                theme: "dark",
                language: "en",
                refreshInterval: 30000,
                pingCount: 1
            }
        }

    ];


    files.forEach(file => {

        const filePath = path.join(
            dataFolder,
            file.name
        );


        // Só cria o ficheiro caso ainda não exista
        if (!fs.existsSync(filePath)) {

            fs.writeFileSync(
                filePath,
                JSON.stringify(file.defaultData, null, 4),
                "utf8"
            );

            console.log(`Created: ${file.name}`);

        }

    });


    return dataFolder;

}

ipcMain.handle("load-page", (event, page) => {

    const filePath = path.join(__dirname, "src", "views", page);

    return fs.readFileSync(filePath, "utf8");

});

//Ping Tool
ipcMain.handle("ping", async (event, target, count = 4) => {

    return new Promise((resolve, reject) => {

        execFile(
            "ping",
            ["-n", String(count), target],
            {
                windowsHide: true
            },
            (error, stdout, stderr) => {

                if (error && !stdout) {
                    reject(stderr || error.message);
                    return;
                }

                resolve(stdout);

            }
        );

    });

});

//Trace Route Tool
ipcMain.handle("traceroute", async (event, target) => {

    return new Promise((resolve, reject) => {

        execFile(
            "tracert",
            ["-d", target],
            {
                windowsHide: true
            },
            (error, stdout, stderr) => {

                if (error && !stdout) {
                    reject(stderr || error.message);
                    return;
                }

                resolve(stdout);

            }
        );

    });

});

//DNS Lookup Tool
ipcMain.handle("dns-lookup", async(event,target)=>{

    return new Promise((resolve,reject)=>{

        execFile(

            "nslookup",

            [target],

            {
                windowsHide:true
            },

            (error,stdout,stderr)=>{

                if(error && !stdout){

                    reject(stderr || error.message);

                    return;

                }

                resolve(stdout);

            }

        );

    });

});

//WhoIs
ipcMain.handle("whois", async (event, target) => {

    return new Promise((resolve, reject) => {

        whois.lookup(target, (err, data) => {

            if (err) {
                reject(err.message);
                return;
            }

            resolve(data);

        });

    });

});

//Port Scan
ipcMain.handle("port-scan", async (event, target, startPort, endPort) => {

    const host = String(target || "").trim();
    const firstPort = Number(startPort);
    const lastPort = Number(endPort);

    if (!host) {
        throw new Error("Invalid host.");
    }

    if (
        !Number.isInteger(firstPort) ||
        !Number.isInteger(lastPort) ||
        firstPort < 1 ||
        lastPort > 65535 ||
        firstPort > lastPort
    ) {
        throw new Error("Invalid port range.");
    }

    // Limite para evitar scans enormes e bloquear a aplicação
    if (lastPort - firstPort + 1 > 1000) {
        throw new Error("Maximum range is 1000 ports.");
    }

    function checkPort(port) {

        return new Promise((resolve) => {

            const socket = new net.Socket();

            let finished = false;

            const finish = (open) => {

                if (finished) return;

                finished = true;
                socket.destroy();

                resolve({
                    port,
                    open
                });

            };

            socket.setTimeout(700);

            socket.once("connect", () => {
                finish(true);
            });

            socket.once("timeout", () => {
                finish(false);
            });

            socket.once("error", () => {
                finish(false);
            });

            socket.connect(port, host);

        });

    }

    const ports = [];

    for (let port = firstPort; port <= lastPort; port++) {
        ports.push(port);
    }

    const results = [];

    const concurrency = 100;

    for (let index = 0; index < ports.length; index += concurrency) {

        const batch = ports.slice(index, index + concurrency);

        const batchResults = await Promise.all(
            batch.map(port => checkPort(port))
        );

        results.push(...batchResults);

    }

    return results.filter(result => result.open);

});

//RDP
ipcMain.handle("open-rdp", async (event, target) => {

    const host = String(target || "").trim();

    if (!host) {
        throw new Error("Invalid host or IP address.");
    }

    execFile(
        "mstsc.exe",
        [`/v:${host}`],
        { windowsHide: false }
    );

    return true;

});

//Ping Check Online
ipcMain.handle("check-online", async (event, target) => {

    return new Promise((resolve) => {

        execFile(
            "ping",
            ["-n", "1", "-w", "1000", target],
            {
                windowsHide: true,
                timeout: 2000
            },
            (error, stdout = "") => {

                const output = stdout.toLowerCase();

                const online =
                    output.includes("ttl=") ||
                    output.includes("ttl ");

                resolve(online);

            }
        );

    });

});

//Save Json File
ipcMain.handle("save-server", async (event, newServer) => {

    try {

        const serversPath = getDataFilePath("servers.json");

        const data = fs.readFileSync(serversPath, "utf8");

        const servers = JSON.parse(data || "[]");

        servers.push(newServer);

        fs.writeFileSync(
            serversPath,
            JSON.stringify(servers, null, 4),
            "utf8"
        );

        return {
            success: true
        };

    } catch (error) {

        console.error("Erro ao guardar servidor:", error);

        return {
            success: false,
            error: error.message
        };

    }

});

//Read Json File
ipcMain.handle("get-servers", async () => {

    try {

        const serversPath = getDataFilePath("servers.json");

        const fileContent = fs.readFileSync(
            serversPath,
            "utf8"
        );

        return JSON.parse(fileContent || "[]");

    } catch (error) {

        console.error("Erro ao carregar servidores:", error);

        return [];

    }

});

function getDataFilePath(fileName) {

    return path.join(
        app.getPath("userData"),
        "data",
        fileName
    );

}

app.on("window-all-closed", () => {

    if (process.platform !== "darwin")
        app.quit();

});