const { app, BrowserWindow, ipcMain } = require("electron");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const whois = require("whois");
const net = require("net");
const crypto = require("crypto");

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

// Add Server
ipcMain.handle("save-server", async (event, newServer) => {

    try {

        const serversPath = getDataFilePath("servers.json");

        const fileContent = fs.readFileSync(
            serversPath,
            "utf8"
        );

        const servers = JSON.parse(
            fileContent || "[]"
        );

        const server = {

            id: `server-${crypto.randomUUID()}`,

            name: String(
                newServer.name || ""
            ).trim(),

            ip: String(
                newServer.ip || ""
            ).trim(),

            description: String(
                newServer.description || ""
            ).trim(),

            os: newServer.os || "Windows Server",

            groupId: newServer.groupId || "default"

        };

        if (!server.name || !server.ip) {

            throw new Error(
                "Server name and IP are required."
            );

        }

        servers.push(server);

        fs.writeFileSync(
            serversPath,
            JSON.stringify(servers, null, 4),
            "utf8"
        );

        return {
            success: true,
            server
        };

    } catch (error) {

        console.error(
            "Erro ao guardar servidor:",
            error
        );

        return {
            success: false,
            error: error.message
        };

    }

});

// Update Servers
ipcMain.handle("update-server",async (event, serverId, serverData) => {

        try {

            const serversPath =
                getDataFilePath("servers.json");

            const fileContent =
                fs.readFileSync(
                    serversPath,
                    "utf8"
                );

            const servers =
                JSON.parse(
                    fileContent || "[]"
                );

            const serverIndex =
                servers.findIndex(
                    server =>
                        server.id === serverId
                );

            if (serverIndex === -1) {

                throw new Error(
                    `Servidor não encontrado: ${serverId}`
                );

            }

            servers[serverIndex] = {

                ...servers[serverIndex],

                name: String(
                    serverData.name || ""
                ).trim(),

                ip: String(
                    serverData.ip || ""
                ).trim(),

                description: String(
                    serverData.description || ""
                ).trim(),

                os:
                    serverData.os ||
                    servers[serverIndex].os,

                id:
                    servers[serverIndex].id,

                groupId:
                    servers[serverIndex].groupId ||
                    "default"

            };

            if (
                !servers[serverIndex].name ||
                !servers[serverIndex].ip
            ) {

                throw new Error(
                    "Server name and IP are required."
                );

            }

            fs.writeFileSync(
                serversPath,
                JSON.stringify(
                    servers,
                    null,
                    4
                ),
                "utf8"
            );

            return {

                success: true,

                server:
                    servers[serverIndex]

            };

        } catch (error) {

            console.error(
                "Erro ao atualizar servidor:",
                error
            );

            return {

                success: false,

                error: error.message

            };

        }

    }
);

// Delete Server
ipcMain.handle("delete-server",async (event, serverId) => {

        const filePath =
            getDataFilePath("servers.json");

        try {

            const servers = JSON.parse(
                fs.readFileSync(filePath, "utf8")
            );

            const updatedServers =
                servers.filter(
                    server =>
                        String(server.id) !==
                        String(serverId)
                );

            fs.writeFileSync(
                filePath,
                JSON.stringify(
                    updatedServers,
                    null,
                    4
                )
            );

            return {
                success: true
            };

        } catch (error) {

            return {
                success: false,
                error: error.message
            };

        }

    }
);

// Get Server
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

// Read Groups
ipcMain.handle("get-groups", async () => {

    try {

        const groupsPath = getDataFilePath("groups.json");

        const fileContent = fs.readFileSync(
            groupsPath,
            "utf8"
        );

        return JSON.parse(fileContent || "[]");

    } catch (error) {

        console.error("Erro ao carregar grupos:", error);

        return [];

    }

});

// Save Group
ipcMain.handle("save-group", async (event, newGroup) => {

    try {

        const groupsPath = getDataFilePath("groups.json");

        const fileContent = fs.readFileSync(
            groupsPath,
            "utf8"
        );

        const groups = JSON.parse(fileContent || "[]");

        const group = {
            id: `group-${Date.now()}`,
            name: String(newGroup.name || "").trim(),
            description: String(newGroup.description || "").trim(),
            icon: newGroup.icon || "fa-server",
            color: newGroup.color || "#6b7280"
        };

        if (!group.name) {
            throw new Error("Group name is required.");
        }

        groups.push(group);

        fs.writeFileSync(
            groupsPath,
            JSON.stringify(groups, null, 4),
            "utf8"
        );

        return {
            success: true,
            group
        };

    } catch (error) {

        console.error("Erro ao guardar grupo:", error);

        return {
            success: false,
            error: error.message
        };

    }

});

// Edit Groups
ipcMain.handle("update-group-servers",async (event, data) => {

        try {

            const groupId = String(
                data?.groupId || ""
            ).trim();

            const serverIds = Array.isArray(
                data?.serverIds
            )
                ? data.serverIds
                : [];


            if (!groupId) {

                throw new Error(
                    "Group ID is required."
                );

            }


            const serversPath =
                getDataFilePath("servers.json");


            const fileContent = fs.readFileSync(
                serversPath,
                "utf8"
            );


            const servers = JSON.parse(
                fileContent || "[]"
            );


            const selectedIds =
                new Set(serverIds);


            const updatedServers = servers.map(
                server => {

                    /*
                    Se foi selecionado:
                    move para o grupo atual.
                    */

                    if (
                        selectedIds.has(server.id)
                    ) {

                        return {
                            ...server,
                            groupId
                        };

                    }


                    /*
                    Se já pertencia a este grupo,
                    mas foi desselecionado:
                    volta para default.
                    */

                    if (
                        server.groupId === groupId
                    ) {

                        return {
                            ...server,
                            groupId: "default"
                        };

                    }


                    /*
                    Servidores de outros grupos
                    permanecem iguais.
                    */

                    return server;

                }
            );


            fs.writeFileSync(
                serversPath,
                JSON.stringify(
                    updatedServers,
                    null,
                    4
                ),
                "utf8"
            );


            return {
                success: true,
                updatedServers
            };


        } catch (error) {

            console.error(
                "Erro ao atualizar servidores do grupo:",
                error
            );

            return {
                success: false,
                error: error.message
            };

        }

    }
);

// Delete Groups
ipcMain.handle("delete-group",async (event, receivedGroupId) => {

        try {

            const groupId = String(
                receivedGroupId || ""
            ).trim();

            if (!groupId) {

                throw new Error(
                    "Group ID is required."
                );

            }

            if (groupId === "default") {

                throw new Error(
                    "The default group cannot be deleted."
                );

            }


            const groupsPath =
                getDataFilePath("groups.json");

            const serversPath =
                getDataFilePath("servers.json");


            const groupsContent = fs.readFileSync(
                groupsPath,
                "utf8"
            );

            const serversContent = fs.readFileSync(
                serversPath,
                "utf8"
            );


            const groups = JSON.parse(
                groupsContent || "[]"
            );

            const servers = JSON.parse(
                serversContent || "[]"
            );


            const groupExists = groups.some(
                group => group.id === groupId
            );

            if (!groupExists) {

                throw new Error(
                    "Group not found."
                );

            }


            const updatedGroups = groups.filter(
                group => group.id !== groupId
            );


            const updatedServers = servers.map(
                server => {

                    if (server.groupId === groupId) {

                        return {
                            ...server,
                            groupId: "default"
                        };

                    }

                    return server;

                }
            );


            fs.writeFileSync(
                groupsPath,
                JSON.stringify(
                    updatedGroups,
                    null,
                    4
                ),
                "utf8"
            );


            fs.writeFileSync(
                serversPath,
                JSON.stringify(
                    updatedServers,
                    null,
                    4
                ),
                "utf8"
            );


            return {
                success: true,
                deletedGroupId: groupId
            };

        } catch (error) {

            console.error(
                "Erro ao eliminar grupo:",
                error
            );

            return {
                success: false,
                error: error.message
            };

        }

    }
);

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