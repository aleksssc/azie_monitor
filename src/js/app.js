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

            case "servers/manage_groups.html":
                initManageGroups();
                break;

            case "servers/add_group.html":
                initAddGroup();
                break;

            case "servers/edit_group.html":
                initEditGroup();
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

    const button =
        document.getElementById("run-ping");

    const input =
        document.getElementById("ping-target");

    const output =
        document.getElementById("terminal-output");

    if (!button || !input || !output) {
        return;
    }


    async function runPing() {

        const target = input.value.trim();

        if (!target) {

            output.textContent =
                "Please enter a valid host or IP address.";

            return;

        }


        const originalButtonContent =
            button.innerHTML;


        button.disabled = true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Running...
        `;

        output.textContent =
            `Running ping to ${target}...`;


        try {

            const result =
                await window.api.ping(target);

            output.textContent = result;

        } catch (error) {

            output.textContent =
                `Error: ${error.message || error}`;

        } finally {

            button.disabled = false;

            button.innerHTML =
                originalButtonContent;

        }

    }


    bindEnter(input, button);

    button.addEventListener(
        "click",
        runPing
    );


    const serverTarget =
        sessionStorage.getItem(
            "serverPingTarget"
        );


    if (serverTarget) {

        sessionStorage.removeItem(
            "serverPingTarget"
        );

        input.value = serverTarget;

        runPing();

    }

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

//List Servers
function createServerCard(server) {

    const card = document.createElement("div");

    const serverOs = String(server.os || "").toLowerCase();

    let osIcon;

    if (serverOs.includes("windows")) {
        osIcon = "fa-brands fa-windows";
    }
    else if (serverOs.includes("ubuntu")) {
        osIcon = "fa-brands fa-ubuntu";
    }
    else if (serverOs.includes("debian")) {
        osIcon = "fa-brands fa-debian";
    }
    else if (serverOs.includes("linux")) {
        osIcon = "fa-brands fa-linux";
    }
    else {
        osIcon = "fa-solid fa-server";
    }

    card.className = "server-card";
    card.dataset.ip = server.ip;
    card.dataset.groupId = server.groupId || "default";

    card.innerHTML = `
        <div class="server-header">

            <div class="os-icon">
                <i class="${osIcon}"></i>
            </div>

            <div class="server-status"></div>

        </div>

        <div class="server-info">

            <h3>${server.name}</h3>

            <p>${server.ip}</p>

            <span>${server.os || "Unknown OS"}</span>

        </div>

        <div class="server-actions">

            <button
                class="server-action-btn rdp-btn"
                data-ip="${server.ip}"
                title="Abrir Remote Desktop"
            >
                <i class="fa-solid fa-display"></i>
                <span>RDP</span>
            </button>

            <button
                class="server-action-btn ping-btn"
                data-ip="${server.ip}"
                title="Executar Ping"
            >
                <i class="fa-solid fa-signal"></i>
                <span>Ping</span>
            </button>

            <button
                class="server-action-btn edit-btn"
                title="Editar servidor"
            >
                <i class="fa-solid fa-pen"></i>
            </button>

        </div>
    `;

    const pingButton = card.querySelector(".ping-btn");

    pingButton?.addEventListener("click", event => {

        event.preventDefault();
        event.stopPropagation();

        sessionStorage.setItem(
            "serverPingTarget",
            server.ip
        );

        loadPage("tools/ping.html");

    });

    return card;
}

//Load Groups and navigate Server page
async function initServers() {

    bindNavigation();

    const [servers, groups] = await Promise.all([
        window.api.getServers(),
        window.api.getGroups()
    ]);

    const container = document.getElementById("servers-list");

    if (!container) return;

    container.innerHTML = "";

    groups.forEach(group => {

        const groupServers = servers.filter(server => {

            const serverGroupId = server.groupId || "default";

            return serverGroupId === group.id;

        });

        const groupSection = document.createElement("section");

        if (group.id === "default") {
            groupSection.className = "server-group-section";
        } else {
            groupSection.className = "server-group-section collapsed";
        }
        groupSection.dataset.groupId = group.id;

        groupSection.style.setProperty("--group-color",group.color || "#6b7280");

        groupSection.innerHTML = `
            <div class="server-group-header">

                <div class="server-group-title">

                    <i class="fa-solid ${group.icon || "fa-building"}" style="color:#6b7280"></i>

                    <h2>${group.name}</h2>

                    <span class="server-count">
                        ${groupServers.length}
                        ${groupServers.length === 1 ? "server" : "servers"}
                    </span>

                </div>

                <button class="group-toggle-btn" data-group-id="${group.id}">
                    <i class="fa-solid fa-chevron-up"></i>
                </button>

            </div>

            <div class="server-group-content"></div>
        `;

        const groupContent = groupSection.querySelector(
            ".server-group-content"
        );

        groupServers.forEach(server => {

            const card = createServerCard(server);

            groupContent.appendChild(card);

        });

        container.appendChild(groupSection);

    });

    initGroupToggleButtons();

    startServerStatusMonitoring();
}

//Logic Open and close groups
function initGroupToggleButtons() {

    const buttons = document.querySelectorAll(
        ".group-toggle-btn"
    );

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            const groupSection = button.closest(
                ".server-group-section"
            );

            const groupContent = groupSection.querySelector(
                ".server-group-content"
            );

            const icon = button.querySelector("i");

            const isCollapsed = groupSection.classList.toggle(
                "collapsed"
            );

            groupContent.style.display = isCollapsed
                ? "none"
                : "grid";

            icon.className = isCollapsed
                ? "fa-solid fa-chevron-down"
                : "fa-solid fa-chevron-up";

        });

    });

}

function toggleServerGroup(section) {

    const content = section.querySelector(".server-group-content");

    if (!content) return;

    const isCollapsed = section.classList.contains("collapsed");

    if (isCollapsed) {

        // Abrir o grupo
        section.classList.remove("collapsed");

        content.style.height = "0px";
        content.style.opacity = "0";

        const targetHeight = content.scrollHeight;

        requestAnimationFrame(() => {

            content.style.height = `${targetHeight}px`;
            content.style.opacity = "1";

        });

        const handleExpandEnd = event => {

            if (event.propertyName !== "height") return;

            content.style.height = "auto";

            content.removeEventListener(
                "transitionend",
                handleExpandEnd
            );
        };

        content.addEventListener(
            "transitionend",
            handleExpandEnd
        );

    } else {

        // Fechar o grupo
        content.style.height = `${content.scrollHeight}px`;

        // Força o browser a registar a altura inicial
        content.offsetHeight;

        section.classList.add("collapsed");

        requestAnimationFrame(() => {

            content.style.height = "0px";
            content.style.opacity = "0";

        });
    }
}

function initGroupToggleButtons() {

    document
        .querySelectorAll(".group-toggle-btn")
        .forEach(button => {

            button.addEventListener("click", event => {

                event.stopPropagation();

                const section = button.closest(
                    ".server-group-section"
                );

                if (!section) return;

                toggleServerGroup(section);
            });

        });
}

//Save Json
function initAddServer() {

    const cancelButton = document.querySelector(
        "#cancel-server-btn"
    );

    cancelButton?.addEventListener("click", () => {

        loadPage("servers.html");

    });


    const saveButton = document.querySelector("#save-server");

    if (!saveButton) {

        console.error("Save Server button not found.");

        return;

    }


    saveButton.addEventListener("click", async () => {

        const name = document
            .querySelector("#server-name")
            .value
            .trim();

        const ip = document
            .querySelector("#server-ip")
            .value
            .trim();

        const description = document
            .querySelector("#server-description")
            .value
            .trim();

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

        const result = await window.api.saveServer(server);

        if (result.success) {

            loadPage("servers.html");

        } else {

            console.error(result.error);

        }

    });

}

//Add Group
function initAddGroup(){

    const nameInput = document.getElementById("group-name");
    const descriptionInput = document.getElementById(
        "group-description"
    );
    const iconSelect = document.getElementById("group-icon");
    const colorInput = document.getElementById("group-color");

    const colorValue = document.getElementById(
        "group-color-value"
    );

    const previewCard = document.querySelector(
        ".group-preview-card"
    );

    const previewIcon = document.getElementById(
        "group-preview-icon"
    );

    const previewName = document.getElementById(
        "group-preview-name"
    );

    const previewDescription = document.getElementById(
        "group-preview-description"
    );

    const saveButton = document.getElementById(
        "save-group-btn"
    );

    const cancelButton = document.getElementById(
        "cancel-group-btn"
    );

    if(
        !nameInput ||
        !descriptionInput ||
        !iconSelect ||
        !colorInput ||
        !saveButton
    ){
        return;
    }

    function updatePreview(){

        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();
        const icon = iconSelect.value;
        const color = colorInput.value;

        previewName.textContent =
            name || "Group Name";

        previewDescription.textContent =
            description || "Group description";

        previewCard.style.setProperty(
            "--group-color",
            color
        );

        previewIcon.innerHTML = `
            <i class="fa-solid ${icon}"></i>
        `;

        colorValue.textContent = color;
    }

    nameInput.addEventListener("input", updatePreview);
    descriptionInput.addEventListener("input", updatePreview);
    iconSelect.addEventListener("change", updatePreview);
    colorInput.addEventListener("input", updatePreview);

    cancelButton?.addEventListener("click", () => {

        loadPage("servers/manage_groups.html");

    });

    saveButton.addEventListener("click", async () => {

        const group = {
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim(),
            icon: iconSelect.value,
            color: colorInput.value
        };

        if (!group.name) {

            nameInput.focus();
            nameInput.classList.add("input-error");

            return;
        }

        nameInput.classList.remove("input-error");

        try {

            saveButton.disabled = true;

            saveButton.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Saving...
            `;

            const result = await window.api.saveGroup(group);

            if (!result?.success) {
                throw new Error(
                    result?.error || "Could not save group."
                );
            }

            loadPage("servers/manage_groups.html");

        } catch (error) {

            console.error("Error saving group:", error);

            alert(error.message);

            saveButton.disabled = false;

            saveButton.innerHTML = `
                <i class="fa-solid fa-floppy-disk"></i>
                Save Group
            `;

        }

    });

    updatePreview();
}

//Edit Group
async function initEditGroup() {

    const groupId = sessionStorage.getItem(
        "editingGroupId"
    );

    const title = document.getElementById(
        "edit-group-title"
    );

    const serversContainer = document.getElementById(
        "edit-group-servers-list"
    );

    const searchInput = document.getElementById(
        "edit-group-search"
    );

    const selectedCount = document.getElementById(
        "selected-server-count"
    );

    const saveButton = document.getElementById(
        "save-group-servers-btn"
    );

    const cancelButton = document.getElementById(
        "cancel-edit-group-btn"
    );

    const backButton = document.getElementById(
        "back-edit-group-btn"
    );

    if (!groupId || !serversContainer || !saveButton) {

        console.error(
            "Could not initialize Edit Group."
        );

        loadPage("servers/manage_groups.html");

        return;
    }


    function returnToGroups() {

        sessionStorage.removeItem(
            "editingGroupId"
        );

        loadPage("servers/manage_groups.html");

    }


    cancelButton?.addEventListener(
        "click",
        returnToGroups
    );

    backButton?.addEventListener(
        "click",
        returnToGroups
    );


    try {

        const [groups, servers] = await Promise.all([

            window.api.getGroups(),

            window.api.getServers()

        ]);


        const group = groups.find(
            item => item.id === groupId
        );

        if (!group) {

            throw new Error(
                "Group not found."
            );

        }


        title.textContent = `Edit ${group.name}`;


        function getGroupName(currentGroupId) {

            const currentGroup = groups.find(
                item => item.id === currentGroupId
            );

            return currentGroup?.name || "Ungrouped";

        }


        function updateSelectedCount() {

            const amount = serversContainer
                .querySelectorAll(
                    ".edit-group-server-checkbox:checked"
                )
                .length;

            selectedCount.textContent = `
                ${amount}
                ${amount === 1
                    ? "server selected"
                    : "servers selected"
                }
            `;

        }


        function renderServers(searchTerm = "") {

            const search =
                searchTerm.trim().toLowerCase();

            serversContainer.innerHTML = "";


            const filteredServers = servers.filter(
                server => {

                    const text = `
                        ${server.name || ""}
                        ${server.ip || ""}
                        ${server.os || ""}
                    `.toLowerCase();

                    return text.includes(search);

                }
            );


            if (!filteredServers.length) {

                serversContainer.innerHTML = `

                    <div class="edit-group-empty">

                        <i class="fa-solid fa-server"></i>

                        <p>No servers found.</p>

                    </div>

                `;

                updateSelectedCount();

                return;
            }


            filteredServers.forEach(server => {

                const currentGroupId =
                    server.groupId || "default";

                const isSelected =
                    currentGroupId === groupId;


                const serverItem =
                    document.createElement("label");

                serverItem.className =
                    "edit-group-server-item";


                serverItem.innerHTML = `

                    <input
                        type="checkbox"
                        class="edit-group-server-checkbox"
                        value="${server.id}"
                        ${isSelected ? "checked" : ""}
                    >

                    <div class="edit-group-server-icon">

                        <i class="fa-solid fa-server"></i>

                    </div>

                    <div class="edit-group-server-info">

                        <strong>
                            ${server.name || "Unnamed Server"}
                        </strong>

                        <span>
                            ${server.ip || "No IP"}
                        </span>

                        <small>
                            Current group:
                            ${getGroupName(currentGroupId)}
                        </small>

                    </div>

                    <div class="edit-group-server-check">

                        <i class="fa-solid fa-check"></i>

                    </div>

                `;


                serversContainer.appendChild(
                    serverItem
                );

            });


            serversContainer
                .querySelectorAll(
                    ".edit-group-server-checkbox"
                )
                .forEach(checkbox => {

                    checkbox.addEventListener(
                        "change",
                        updateSelectedCount
                    );

                });


            updateSelectedCount();

        }


        searchInput?.addEventListener(
            "input",
            event => {

                renderServers(
                    event.target.value
                );

            }
        );


        renderServers();


        saveButton.addEventListener(
            "click",
            async () => {

                const selectedServerIds = [
                    ...serversContainer.querySelectorAll(
                        ".edit-group-server-checkbox:checked"
                    )
                ].map(
                    checkbox => checkbox.value
                );


                try {

                    saveButton.disabled = true;

                    saveButton.innerHTML = `

                        <i class="fa-solid fa-spinner fa-spin"></i>
                        Saving...

                    `;


                    const result =
                        await window.api.updateGroupServers({

                            groupId,

                            serverIds:
                                selectedServerIds

                        });


                    if (!result?.success) {

                        throw new Error(
                            result?.error ||
                            "Could not update group."
                        );

                    }


                    sessionStorage.removeItem(
                        "editingGroupId"
                    );

                    loadPage("servers.html");


                } catch (error) {

                    console.error(
                        "Error updating servers:",
                        error
                    );

                    alert(error.message);


                    saveButton.disabled = false;

                    saveButton.innerHTML = `

                        <i class="fa-solid fa-floppy-disk"></i>
                        Save Changes

                    `;

                }

            }
        );


    } catch (error) {

        console.error(
            "Error loading Edit Group:",
            error
        );

        alert(error.message);

        returnToGroups();

    }

}

//Delete Group
async function deleteGroup(groupId, groupName) {

    if (groupId === "default") {
        alert("The default group cannot be deleted.");
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to delete the group "${groupName}"?\n\n` +
        "Servers in this group will be moved to Ungrouped."
    );

    if (!confirmed) return;

    try {

        const result = await window.api.deleteGroup(
            groupId
        );

        if (!result?.success) {

            throw new Error(
                result?.error ||
                "Could not delete the group."
            );

        }

        loadPage("servers/manage_groups.html");

    } catch (error) {

        console.error(
            "Error deleting group:",
            error
        );

        alert(error.message);

    }

}

//Save Groups
async function initManageGroups() {

    const groupsList = document.getElementById("groups-list");
    const addGroupButton = document.getElementById("add-group-btn");

    if (!groupsList) return;

    const [groups, servers] = await Promise.all([
        window.api.getGroups(),
        window.api.getServers()
    ]);

    groupsList.innerHTML = "";

    groups.forEach(group => {

        const groupServers = servers.filter(server => {

            const groupId = server.groupId || "default";

            return groupId === group.id;

        });

        const groupCard = createGroupCard(
            group,
            groupServers.length
        );

        groupsList.appendChild(groupCard);

    });

    addGroupButton?.addEventListener("click", () => {

        loadPage("servers/add_group.html");

    });

}

//List button manage groups
function createGroupCard(group, serverCount) {

    const card = document.createElement("div");

    card.className = "group-card";
    card.style.setProperty("--group-color",group.color);
    card.dataset.groupId = group.id;

    card.innerHTML = `

    <div class="group-card-icon" style="color:#6b7280">
        <i class="fa-solid ${group.icon || "fa-layer-group"}"></i>
    </div>

    <div class="group-card-info">

        <h3>${group.name}</h3>

        <p>
            ${group.description || "No description"}
        </p>

        <span>
            ${serverCount}
            ${serverCount === 1 ? "server" : "servers"}
        </span>

    </div>

    <div class="group-card-actions">

        ${
            group.id !== "default" ?
            `<button
                class="group-action-btn edit-group-btn"
                type="button"
                title="Edit group"
            >
                <i class="fa-solid fa-pen"></i>
            </button>
            ` :""
        }

        ${
            group.id !== "default"
                ? 
                `
                    <button
                        class="group-action-btn delete-group-btn"
                        type="button"
                        title="Delete group"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>
                `
                : ""
        }

    </div>

    `;

    card
        .querySelector(".edit-group-btn")
        ?.addEventListener("click", () => {

        sessionStorage.setItem(
            "editingGroupId",
            group.id
        );

        loadPage("servers/edit_group.html");

        });

    card
        .querySelector(".delete-group-btn")
        ?.addEventListener("click", () => {

            deleteGroup(
                group.id,
                group.name
            );

        });

    return card;
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