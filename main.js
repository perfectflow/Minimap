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
let updateInterval;
let firstTime = true;

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
            <div id="preview" title="Click to jump into specific viewport">
                <div id="center"></div>
            </div>
            <div id="footer">
                <ul id="settings">
                    <li title="Axis lines for viewport's position"><h3>Crosshair</h3><input type="checkbox" id="updateSetting" name="crosshair" `+crosshair_setting+` /></li>
                    <li title="Alternative style of the minimap"><h3>Dark mode</h3><input type="checkbox" id="updateSetting" name="dark_mode" `+dark_mode_setting+` /></li>
                    <li title="Artboards will be visible underneath plugin's panel"><h3>Ghost mode</h3><input type="checkbox" id="updateSetting" name="ghost_mode" `+ghost_mode_setting+` /></li>
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
        item.addEventListener('click', async function () {
            window.localStorage.setItem(this.name, this.checked ? true : false);
            await generateMinimap();
        })
    })

    return panel;
}

async function generateMinimap(){
    let preview = document.getElementById("preview");
    let center = document.getElementById("center");

    // rootWidth = await calculateRootSize();
    // console.log(rootWidth);

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
    }else{
        let ghostCenter = document.getElementById("ghostCenter");
        while(ghostCenter.firstChild) {
            ghostCenter.removeChild(ghostCenter.firstChild);
        }
    }

}

async function calculateRootSize(){
    let minX = scenegraph.root.children.at(0).globalBounds.x;
    let maxX = scenegraph.root.children.at(0).globalBounds.x;
    let minY = scenegraph.root.children.at(0).globalBounds.y;
    let maxY = scenegraph.root.children.at(0).globalBounds.y;

    for (let i = 0; i < scenegraph.root.children.length; i++) {
        if(scenegraph.root.children.at(i).globalBounds.x > maxX){
            maxX = scenegraph.root.children.at(i).globalBounds.x + scenegraph.root.children.at(i).globalBounds.width;
        }
        if(scenegraph.root.children.at(i).globalBounds.x < minX){
            minX = scenegraph.root.children.at(i).globalBounds.x;
        }
        if(scenegraph.root.children.at(i).globalBounds.y > maxY){
            maxY = scenegraph.root.children.at(i).globalBounds.y + scenegraph.root.children.at(i).globalBounds.height;
        }
        if(scenegraph.root.children.at(i).globalBounds.y < minY){
            minY = scenegraph.root.children.at(i).globalBounds.y;
        }
    }
    
    let rootWidth = maxX - minX;
    let rootHeight = maxY - minY;
    return rootWidth > rootHeight ? rootWidth : rootHeight;
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

async function show(event) {

    if (!panel) await event.node.appendChild(create());

    await initializeDefaultSettings();

    let preview = document.getElementById("preview");
    preview.addEventListener("click", e => {
        editDocument({ editLabel: "Scroll into viewport" }, function () {
            var rect = preview.getBoundingClientRect();
            let miniViewport = document.getElementById("miniViewport");
            var x = ((e.clientX - rect.left - miniViewport.offsetWidth / 2) - (preview.offsetWidth / 2)) * scaleFactor;
            var y = ((e.clientY - rect.top - miniViewport.offsetHeight / 2) - (preview.offsetHeight / 2)) * scaleFactor;
            viewport.scrollIntoView(x, y, viewport.bounds.width, viewport.bounds.height);
        });
    });

    updateInterval = setInterval(
        async function() {
            if (panel.offsetWidth != panelWidth || viewport.zoomFactor != viewportZoomFactor || viewport.bounds.x != viewportBoundsX || viewport.bounds.y != viewportBoundsY){
                panelWidth = panel.offsetWidth;
                viewportZoomFactor = viewport.zoomFactor;
                viewportBoundsX = viewport.bounds.x;
                viewportBoundsY = viewport.bounds.y;
                await generateMinimap();
            }
        }, 20
    );

}

function hide(event) {

}

async function update() {
    if(firstTime == false){
        await generateMinimap();
    }
    firstTime = false;
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
