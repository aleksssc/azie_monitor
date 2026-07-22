let serverStatusInterval = null;
let serverStatusChecking = false;
let navigationId = 0;

window.addEventListener("load", () => {

    setTimeout(() => {

        const splash = document.getElementById("splash-screen");
        const app = document.getElementById("app");

        splash.style.opacity = "0";

        setTimeout(() => {
            splash.style.display = "none";
            app.style.display = "flex";
        }, 800);

    }, 1500); // 3 segundos

});
// Load page
async function loadPage(page) {

    // Cada navegação recebe um ID novo
    const currentNavigation = ++navigationId;

    try {

        const html = await window.api.loadPage(page);

        // Se o utilizador já clicou noutra página,
        // ignora o resultado desta navegação antiga
        if (currentNavigation !== navigationId) {
            return;
        }

        const pageContent = document.getElementById("page-content");

        if (!pageContent) {
            return;
        }

        pageContent.innerHTML = html;

        // Atualiza o botão ativo do menu
        document.querySelectorAll(".menu-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        const activeBtn = document.querySelector(
            `.menu-btn[data-page="${page}"]`
        );

        if (activeBtn) {
            activeBtn.classList.add("active");
        }

        // Para a monitorização quando saímos dos servidores
        if (page !== "servers.html") {
            stopServerStatusMonitoring();
        }

        switch (page) {

            case "home.html":
                initHome();
                break;

            case "tools.html":
                initTools();
                break;

            case "tools/ping.html":
                initPing();
                break;

            case "tools/traceroute.html":
                initTraceroute();
                break;

            case "tools/dnslookup.html":
                initDnsLookup();
                break;

            case "tools/whois.html":
                initWhois();
                break;

            case "tools/portscan.html":
                initPortScan();
                break;

            case "tools/rdp.html":
                initRdp();
                break;

            case "servers.html":
                initServers();

                setTimeout(() => {

                    // Só inicia se ainda estivermos nesta navegação
                    if (
                        currentNavigation === navigationId &&
                        page === "servers.html"
                    ) {
                        startServerStatusMonitoring();
                    }

                }, 1000);

                break;

            case "servers/add_server.html":
                initAddServer();
                break;

            case "settings.html":
                initSettings();
                break;

            case "about.html":
                initAbout();
                break;

            default:
                console.warn("Página sem inicialização definida:", page);
                break;
        }

    } catch (err) {

        // Só mostra o erro se esta ainda for a navegação atual
        if (currentNavigation === navigationId) {
            console.error("Erro ao carregar página:", err);
        }
    }
}

function bindNavigation(container = document) {

    container.querySelectorAll("[data-page]").forEach(button => {

        button.addEventListener("click", event => {

            event.preventDefault();

            const page = button.dataset.page;

            if (!page) {
                return;
            }

            loadPage(page);

        });

    });

}

function initHome() {

 bindNavigation();

}

function initTools() {

 bindNavigation();

}

//Tools
function initPing() {

    const button = document.getElementById("run-ping");
    const input = document.getElementById("ping-target");
    const output = document.getElementById("terminal-output");

    if (!button || !input || !output) return;

    bindEnter(input, button);

    button.addEventListener("click", async () => {

        const target = input.value.trim();

        if (!target) {
            output.textContent = "Please enter a valid host or IP address.";
            return;
        }

        output.textContent = "Running ping...";

        try {

            const result = await window.api.ping(target);

            output.textContent = result;

        } catch (err) {

            output.textContent = err.message || err;

        }

    });

}

function initTraceroute() {

    const button = document.getElementById("run-traceroute");
    const input = document.getElementById("traceroute-target");
    const output = document.getElementById("traceroute-output");

    if (!button || !input || !output) return;

    bindEnter(input, button);

    button.addEventListener("click", async () => {

        const target = input.value.trim();

        if (!target) {
            output.textContent = "Please enter a valid host or IP address.";
            return;
        }

        button.disabled = true;
        output.textContent = `Running traceroute to ${target}...`;

        try {

            const result = await window.api.traceroute(target);

            output.textContent = result;

        } catch (err) {

            output.textContent = `Error: ${err.message || err}`;

        } finally {

            button.disabled = false;

        }

    });

}

function initDnsLookup() {

    const button = document.getElementById("run-dnslookup");
    const input = document.getElementById("dns-target");
    const output = document.getElementById("dnslookup-output");

    if (!button || !input || !output) return;

    bindEnter(input, button);

    button.addEventListener("click", async () => {

        const target = input.value.trim();
        const output = document.getElementById("dnslookup-output");

        if(!target){

            output.textContent = "Please enter a domain.";

            return;

        }

        button.disabled = true;

        output.textContent = `Looking up DNS records for ${target}...`;

        try{

            const result = await window.api.dnsLookup(target);

            output.textContent = result;

        }
        catch(err){

            output.textContent = err.message || err;

        }
        finally{

            button.disabled = false;

        }

    });

}

function initWhois(){

    const button = document.getElementById("run-whois");
    const input = document.getElementById("whois-target");

    if (!button || !input) return;

    bindEnter(input, button); 

    button.addEventListener("click", async ()=>{

        const output = document.getElementById("whois-output");

        const target = input.value.trim();

        if(!target){

            output.textContent =
                "Please enter a valid domain or IP address.";

            return;

        }

        button.disabled = true;

        output.textContent =
            `Running Whois lookup for ${target}...`;

        try{

            const result = await window.api.whois(target);

            output.textContent = result;

        }
        catch(err){

            output.textContent =
                `Error: ${err.message || err}`;

        }
        finally{

            button.disabled = false;

        }

    });

}

function initPortScan() {

    const button =
        document.getElementById("run-portscan");

    const input =
        document.getElementById("portscan-target");

    const startInput =
        document.getElementById("portscan-start");

    const endInput =
        document.getElementById("portscan-end");

    const output =
        document.getElementById("portscan-output");

    if (
        !button ||
        !input ||
        !startInput ||
        !endInput ||
        !output
    ) return;

    bindEnter(input, button);
    bindEnter(startInput, button);
    bindEnter(endInput, button);

    button.addEventListener("click", async () => {

        const target = input.value.trim();
        const startPort = Number(startInput.value);
        const endPort = Number(endInput.value);

        if (!target) {

            output.textContent =
                "Please enter a valid host or IP address.";

            return;

        }

        if (
            !Number.isInteger(startPort) ||
            !Number.isInteger(endPort) ||
            startPort < 1 ||
            endPort > 65535 ||
            startPort > endPort
        ) {

            output.textContent =
                "Please enter a valid port range.";

            return;

        }

        button.disabled = true;
        button.textContent = "Scanning...";

        output.textContent =
            `Scanning ${target} from port ${startPort} to ${endPort}...\n`;

        try {

            const openPorts =
                await window.api.portScan(
                    target,
                    startPort,
                    endPort
                );

            if (openPorts.length === 0) {

                output.textContent +=
                    "\nNo open TCP ports found.";

                return;

            }

            output.textContent +=
                `\nOpen ports found: ${openPorts.length}\n\n`;

            openPorts.forEach(result => {

                output.textContent +=
                    `Port ${result.port} - OPEN\n`;

            });

        } catch (err) {

            output.textContent =
                `Error: ${err.message || err}`;

        } finally {

            button.disabled = false;
            button.textContent = "Run Port Scan";

        }

    });

}

function initRdp() {

    const button = document.getElementById("run-rdp");
    const input = document.getElementById("rdp-target");
    const output = document.getElementById("rdp-output");

    if (!button || !input || !output) return;

    bindEnter(input, button);

    button.addEventListener("click", async () => {

        const target = input.value.trim();

        if (!target) {

            output.textContent =
                "Please enter a valid host or IP address.";

            return;

        }

        try {

            await window.api.openRdp(target);

            output.textContent =
                `Remote Desktop opened for ${target}.`;

        } catch (err) {

            output.textContent =
                `Error: ${err.message || err}`;

        }

    });

}

//Load and navigate Server page
async function initServers() {

    bindNavigation();

    const servers = await window.api.getServers();

    const container = document.getElementById("servers-list");

    if (!container) return;

    container.innerHTML = "";

    servers.forEach(server => {

        const card = document.createElement("div");

        let osIcon;

        if (server.os.toLowerCase().includes("windows")) {
            osIcon = "fa-brands fa-windows";
        }
        else if (server.os.toLowerCase().includes("ubuntu")) {
            osIcon = "fa-brands fa-ubuntu";
        }
        else if (server.os.toLowerCase().includes("debian")) {
            osIcon = "fa-brands fa-debian";
        }
        else if (server.os.toLowerCase().includes("linux")) {
            osIcon = "fa-brands fa-linux";
        }
        else {
            osIcon = "fa-solid fa-server";
        }

        card.innerHTML = `
            <div class="server-card" data-ip="${server.ip}">

                <div class="server-header">

                    <div class="os-icon">
                        <i class="${osIcon}"></i>
                    </div>

                    <div class="server-status"></div>

                </div>

                <div class="server-info">

                    <h3>${server.name}</h3>

                    <p>${server.ip}</p>

                    <span>${server.os}</span>

                </div>

            </div>
        `;

        container.appendChild(card);

    });

    startServerStatusMonitoring();
}

//Save Json
function initAddServer() {

    const saveButton = document.querySelector("#save-server");

    if (!saveButton) {
        console.error("Save Server button not found.");
        return;
    }

    saveButton.addEventListener("click", async () => {

        const name = document.querySelector("#server-name").value.trim();
        const ip = document.querySelector("#server-ip").value.trim();
        const description = document
            .querySelector("#server-description")
            .value.trim();
        const os = document.querySelector("#server-os").value;

        if (!name || !ip) {
            console.error("Name and IP are required.");
            return;
        }

        const server = {
            name,
            ip,
            description,
            os
        };

        console.log("A enviar servidor:", server);

        const result = await window.api.saveServer(server);

        console.log("Resposta do main:", result);

        if (result.success) {
            loadPage("servers.html");
        } else {
            console.error(result.error);
        }

    });

}

async function checkServersStatus() {

    // Impede verificações sobrepostas
    if (serverStatusChecking) return;

    const cards = document.querySelectorAll(".server-card[data-ip]");

    // Já não estamos na página Servers
    if (!cards.length) return;

    serverStatusChecking = true;

    try {

        const checks = [...cards].map(async card => {

            const status = card.querySelector(".server-status");
            const ip = card.dataset.ip;

            if (!status || !ip) return;

            status.classList.remove("online", "offline");
            status.classList.add("checking");

            try {

            const isOnline = await window.api.checkOnline(ip);

                // Confirma que o card ainda existe
                if (!card.isConnected) return;

                status.classList.remove("checking");

                if (isOnline) {
                    status.classList.add("online");
                } else {
                    status.classList.add("offline");
                }

            } catch (error) {

                if (!card.isConnected) return;

                status.classList.remove("checking", "online");
                status.classList.add("offline");

                console.error(`Erro ao verificar ${ip}:`, error);
            }

        });

        await Promise.allSettled(checks);

    } finally {

        serverStatusChecking = false;

    }

}

function startServerStatusMonitoring() {

    // Remove um intervalo antigo, caso exista
    stopServerStatusMonitoring();

    // Primeira verificação
    checkServersStatus();

    // Verifica novamente a cada 30 segundos
    serverStatusInterval = setInterval(() => {

        if (!document.querySelector(".server-card[data-ip]")) {
            stopServerStatusMonitoring();
            return;
        }

        checkServersStatus();

    }, 30000);

}

function stopServerStatusMonitoring() {

    if (serverStatusInterval) {

        clearInterval(serverStatusInterval);
        serverStatusInterval = null;

    }

}

function bindEnter(input, button){

    if(!input || !button) return;

    input.addEventListener("keydown", (event)=>{

        if(event.key === "Enter"){

            button.click();

        }

    });

}
// Espera que a página carregue
window.addEventListener("DOMContentLoaded", () => {

    loadPage("home.html");
    // Botões do menu
    document.querySelectorAll(".menu-btn").forEach(button => {

        button.addEventListener("click", () => {
            loadPage(button.dataset.page);
        });

    });

});