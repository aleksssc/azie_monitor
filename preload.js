const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {

    // Menu
    loadPage: (page) => ipcRenderer.invoke("load-page", page),

    // Tools
    runTool: (tool) => ipcRenderer.invoke("run-tool", tool),

    // Ping
    ping: (target, count = 4) => ipcRenderer.invoke("ping", target, count),

    //TraceRoute
    traceroute: (target) => ipcRenderer.invoke("traceroute", target),

    //DnsLookup
    dnsLookup: (target) => ipcRenderer.invoke("dns-lookup", target),

    //WhoIs
    whois: (target) => ipcRenderer.invoke("whois", target),

    //Port
    portScan: (target, startPort, endPort) => ipcRenderer.invoke("port-scan",target,startPort,endPort),

    //RDP
    openRdp: (target) => ipcRenderer.invoke("open-rdp", target),

    // Server
    saveServer: (server) => ipcRenderer.invoke("save-server", server),

    // Update
    updateServer: (serverId, serverData) => ipcRenderer.invoke("update-server",serverId,serverData),

    //Delete
    deleteServer: serverId => ipcRenderer.invoke("delete-server", serverId),
    
    //Load
    getServers: () => ipcRenderer.invoke("get-servers"),

    // Test
    checkOnline: (target) => ipcRenderer.invoke("check-online", target),

    // Get Groups
    getGroups: () => ipcRenderer.invoke("get-groups"),

    // Save Groups
    saveGroup: (group) => ipcRenderer.invoke("save-group", group),

    // Edit Groups
    updateGroupServers: data => ipcRenderer.invoke("update-group-servers",data),

    // Delete Group
    deleteGroup: groupId => ipcRenderer.invoke("delete-group",groupId),

});