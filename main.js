const application = require("application");
const { editDocument } = require("application");
const viewport = require("viewport");
const { selection, Artboard, Color } = require("scenegraph");
let scenegraph = require("scenegraph");
const fs = require('uxp').storage;

let panel;
let rootWidth = 50000;
let panelWidth = 0;
let scaleFactor = 0;
let viewportZoomFactor = viewport.zoomFactor;
let viewportBoundsX = viewport.bounds.x;
let viewportBoundsY = viewport.bounds.y;

function create() {
    let crosshair_setting = window.localStorage.getItem("crosshair") == "true" ? "checked" : "";
    let dark_mode_setting = window.localStorage.getItem("dark_mode") == "true" ? "checked" : "";
    let ghost_mode_setting = window.localStorage.getItem("ghost_mode") == "true" ? "checked" : "";
    const HTML =
        `<style>
            #main {width: 100%; height: 100%; position: relative;}
            #preview {width: 100%; height: auto; position: relative; overflow: hidden; background: rgba(204, 204, 204, 0.5);}
            #preview:before {content: ""; display: block; padding-top: 100%;}
            #preview #center {width: 0px; height: 0px; position: absolute; left: 50%; top: 50%;}
            #preview #center .miniArtboard {position: absolute; background: #fff; border: 1px solid #777; z-index: 2;}
            #preview #center #miniViewport {position: absolute; border: 2px solid blue; z-index: 3;}
            #preview #center #horizontalPointer, #preview #center #verticalPointer {position: absolute; background: #CCC; opacity: 0.5; z-index: 1;}
            #footer {width: 100%; position: fixed; bottom: 0; left: 0; line-height: 150%;}
            #settings {width: 100%; display: block;}
            #settings li {width: 100%; display: flex; flex-direction: row; justify-content: space-between;}
            #settings li h3 {margin: 0;}
            .dark_mode #preview {background: rgba(15, 15, 15, 0.75);}
            .dark_mode #miniViewport {border: 2px solid #FD7422!important;}
            .dark_mode .miniArtboard {border: none!important;}
            .dark_mode #horizontalPointer, .dark_mode #verticalPointer {background: #303031!important;}
            #ghost {position: fixed; left: -12px; right: -12px; top: -12px; bottom: 0; overflow: hidden; z-index: -1;}
            #ghost #ghostCenter {width: 0px; height: 0px; position: absolute; left: 50%; top: 50%;}
            #ghost #ghostCenter .ghostArtboard {position: absolute; border: 1px solid #CDCDCD; background: #fff; overflow: hidden;}
            #ghost #ghostCenter .ghostArtboard img {width: 100%;}
        </style>
        <div id="main">
            <div id="preview" title="Click to jump into specific region">
                <div id="center"></div>
            </div>
            <div id="footer">
                <ul id="settings">
                    <li><h3>Crosshair</h3><input type="checkbox" id="updateSetting" name="crosshair" `+crosshair_setting+` /></li>
                    <li><h3>Dark mode</h3><input type="checkbox" id="updateSetting" name="dark_mode" `+dark_mode_setting+` /></li>
                    <li><h3>Ghost mode</h3><input type="checkbox" id="updateSetting" name="ghost_mode" `+ghost_mode_setting+` /></li>
                    <li>&nbsp;</li>
                    <li><h3><a href="https://minimap.xdplugins.co">Learn more</a></h3></li>
                </ul>
            </div>
        </div>
        <div id="ghost">
            <div id="ghostCenter"></div>
        </div>
        `;

    panel = document.createElement("div");
    panel.innerHTML = HTML;

    panel.querySelectorAll("#updateSetting").forEach(item => {
        item.addEventListener('click', function() {
            window.localStorage.setItem(this.name, this.checked ? true : false);
            generateMinimap();
        })
    })

    return panel;
}

function generateMinimap(){
    let preview = document.getElementById("preview");
    let center = document.getElementById("center");
    scaleFactor = rootWidth / preview.offsetWidth;

    while (center.firstChild) {
        center.removeChild(center.firstChild);
    }

    if(window.localStorage.getItem("dark_mode") == "true"){
        document.getElementById("main").setAttribute("class", "dark_mode");
    }else{
        document.getElementById("main").removeAttribute("class");
    }

    let miniViewport = document.createElement("div");
    miniViewport.setAttribute("id", "miniViewport");
    miniViewport.style.width = viewport.bounds.width / scaleFactor;
    miniViewport.style.height = viewport.bounds.height / scaleFactor;
    miniViewport.style.left = viewport.bounds.x / scaleFactor;
    miniViewport.style.top = viewport.bounds.y / scaleFactor;
    // miniViewport.setAttribute("draggable", true);
    // miniViewport.addEventListener("dragend", event => {
    //     console.log(event.clientX - panel.offsetWidth / 2);
    //     miniViewport.style.left = event.clientX - panel.offsetWidth / 2;
    // });
    center.appendChild(miniViewport);

    for (let i = 0; i < scenegraph.root.children.length; i++) {
        let item = scenegraph.root.children.at(i);
        if (item instanceof Artboard) {
            let miniArtboard = document.createElement("div");
            miniArtboard.setAttribute("class" , "miniArtboard");
            miniArtboard.setAttribute("id" , "miniArtboard-"+i);
            miniArtboard.style.width = item.width / scaleFactor;
            miniArtboard.style.height = item.height / scaleFactor;
            miniArtboard.style.left = item.globalBounds.x / scaleFactor;
            miniArtboard.style.top = item.globalBounds.y / scaleFactor;
            center.appendChild(miniArtboard);
        }
    }

    if(window.localStorage.getItem("crosshair") == "true"){
        let horizontalPointer = document.createElement("div");
        horizontalPointer.setAttribute("id", "horizontalPointer");
        horizontalPointer.style.width = rootWidth / scaleFactor;
        horizontalPointer.style.height = viewport.bounds.height / scaleFactor;
        horizontalPointer.style.left = (rootWidth / scaleFactor) / 2 * -1;
        horizontalPointer.style.top = viewport.bounds.y / scaleFactor;
        center.appendChild(horizontalPointer);

        let verticalPointer = document.createElement("div");
        verticalPointer.setAttribute("id", "verticalPointer");
        verticalPointer.style.height = rootWidth / scaleFactor;
        verticalPointer.style.width = viewport.bounds.width / scaleFactor;
        verticalPointer.style.top = (rootWidth / scaleFactor) / 2 * -1;
        verticalPointer.style.left = viewport.bounds.x / scaleFactor;
        center.appendChild(verticalPointer);
    }

    if(window.localStorage.getItem("ghost_mode") == "true"){
        let ghostCenter = document.getElementById("ghostCenter");
        while(ghostCenter.firstChild) {
            ghostCenter.removeChild(ghostCenter.firstChild);
        }
        for (let i = 0; i < scenegraph.root.children.length; i++) {
            let item = scenegraph.root.children.at(i);
            // if (item instanceof Artboard) {
                let ghostArtboard = document.createElement("div");
                ghostArtboard.setAttribute("class" , "ghostArtboard");
                ghostArtboard.setAttribute("id" , "ghostArtboard-"+i);
                ghostArtboard.style.width = item.width * viewport.zoomFactor;
                ghostArtboard.style.height = item.height * viewport.zoomFactor;
                ghostArtboard.style.left = item.globalBounds.x * viewport.zoomFactor;
                ghostArtboard.style.top = item.globalBounds.y * viewport.zoomFactor;
                ghostCenter.appendChild(ghostArtboard);
                ghostCenter.style.left = panel.offsetWidth - (viewport.bounds.x * viewport.zoomFactor) + 24;
                ghostCenter.style.top = panel.offsetHeight - (viewport.bounds.y * viewport.zoomFactor) - panel.offsetHeight - 88;
            // }
        }
        // const renditionsFiles = await createRenditions();
        // for(var i = 0; i < renditionsFiles.length; i++){
        //     const arrayBuffer = await renditionsFiles[i].read({ format: fs.formats.binary });
        //     const base64 = base64ArrayBuffer(arrayBuffer);
        //     const image = document.createElement("img");
        //     image.setAttribute("src", `data:image/png;base64,${base64}`);
        //     const ghostArtboard = document.getElementById("ghostArtboard-"+i);
        //     ghostArtboard.appendChild(image);
        // }
    }else{
        let ghostCenter = document.getElementById("ghostCenter");
        while(ghostCenter.firstChild) {
            ghostCenter.removeChild(ghostCenter.firstChild);
        }
    }

}

async function initializeDefaultSettings(){
    let default_settings = [];
    default_settings["crosshair"] = true;
    default_settings["dark_mode"] = false;
    default_settings["ghost_mode"] = false;
    for (var key in default_settings) {
        if(!window.localStorage.getItem(key)){
            window.localStorage.setItem(key, default_settings[key]);
        }
    }
}

async function createRenditions() {
    const folder = await fs.localFileSystem.getTemporaryFolder();
    let arr = [];
    for(var i = 0; i < scenegraph.root.children.length; i++){
        await folder.createFile(`${scenegraph.root.children.at(i).guid}.png`, { overwrite: true }).then(file => {
            let obj = {};
            obj.node = scenegraph.root.children.at(i);
            obj.outputFile = file;
            obj.type = "png";
            obj.background = new Color("#ffffff", 0);
            obj.scale = 1;
            arr.push(obj);
        });
    }
    const renditionResults = await application.createRenditions(arr);
    const renditionsFiles = renditionResults.map(a => a.outputFile);
    return renditionsFiles;
}

function base64ArrayBuffer(arrayBuffer) {
    let base64 = ''
    const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

    const bytes = new Uint8Array(arrayBuffer)
    const byteLength = bytes.byteLength
    const byteRemainder = byteLength % 3
    const mainLength = byteLength - byteRemainder

    let a, b, c, d
    let chunk

    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
        // Combine the three bytes into a single integer
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

        // Use bitmasks to extract 6-bit segments from the triplet
        a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
        c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
        d = chunk & 63               // 63       = 2^6 - 1

        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder == 1) {
        chunk = bytes[mainLength]

        a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

        // Set the 4 least significant bits to zero
        b = (chunk & 3) << 4 // 3   = 2^2 - 1

        base64 += encodings[a] + encodings[b] + '=='
    } else if (byteRemainder == 2) {
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

        a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
        b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4

        // Set the 2 least significant bits to zero
        c = (chunk & 15) << 2 // 15    = 2^4 - 1

        base64 += encodings[a] + encodings[b] + encodings[c] + '='
    }

    return base64
}

async function show(event) {

    await initializeDefaultSettings();

    if (!panel) await event.node.appendChild(create());

    setInterval(
        function() {
            if (panel.offsetWidth != panelWidth || viewport.zoomFactor != viewportZoomFactor || viewportBoundsX != viewport.bounds.x || viewportBoundsY != viewport.bounds.y){
                panelWidth = panel.offsetWidth;
                viewportZoomFactor = viewport.zoomFactor;
                viewportBoundsX = viewport.bounds.x;
                viewportBoundsY = viewport.bounds.y;
                generateMinimap();
            }
        }, 20
    );

    let preview = document.getElementById("preview");
    preview.addEventListener("click", e => {
        editDocument({ editLabel: "Scroll into view" }, function () {
            var rect = preview.getBoundingClientRect();
            let miniViewport = document.getElementById("miniViewport");
            var x = ((e.clientX - rect.left - miniViewport.offsetWidth / 2) - (preview.offsetWidth / 2)) * scaleFactor;
            var y = ((e.clientY - rect.top - miniViewport.offsetHeight / 2) - (preview.offsetHeight / 2)) * scaleFactor;
            viewport.scrollIntoView(x, y, viewport.bounds.width, viewport.bounds.height);
        });
    });

}

function hide(event) {

}

async function update() {
    generateMinimap();
}

module.exports = {
    panels: {
        Minimap: {
            show,
            hide,
            update
        }
    }
};
