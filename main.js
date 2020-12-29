// const application = require("application");
// const fs = require('uxp').storage;
const viewport = require("viewport");
const scenegraph = require("scenegraph");
const { Artboard } = require("scenegraph");
const { editDocument } = require("application");
let panel;
let rootWidth = 50000;
let panelWidth = 0;
let scaleFactor = 0;
let viewportZoomFactor = viewport.zoomFactor;
let viewportBoundsX = viewport.bounds.x;
let viewportBoundsY = viewport.bounds.y;
let updateTimer;

function create() {
    let crosshair_setting = window.localStorage.getItem("crosshair") == "true" ? "checked" : "";
    let dark_mode_setting = window.localStorage.getItem("dark_mode") == "true" ? "checked" : "";
    let ghost_mode_setting = window.localStorage.getItem("ghost_mode") == "true" ? "checked" : "";
    const HTML =
        `<style>
            #main {height: 100%; position: relative;}
            #preview {width: 100%; height: auto; position: relative; overflow: hidden; background: #E4E4E4;}
            #preview:before {content: ""; display: block; padding-top: 100%;}
            #preview #center {width: 0px; height: 0px; position: absolute; left: 50%; top: 50%;}
            #preview #center .miniArtboard {position: absolute; background: #fff; border: 1px solid #777; z-index: 2;}
            #preview #center #miniViewport {position: absolute; border: 2px solid blue; z-index: 3;}
            #preview #center #horizontalPointer, #preview #center #verticalPointer {position: absolute; background: #DDD; z-index: 1;}
            #footer {width: 100%; position: fixed; bottom: 0; left: 0; line-height: 150%;}
            #settings {width: 100%; display: block;}
            #settings li {width: 100%; display: flex; flex-direction: row; justify-content: space-between;}
            #settings li h3 {margin: 0;}
            .dark_mode #preview {background: #3C3D3D;}
            .dark_mode #miniViewport {border: 2px solid #FD7422!important;}
            .dark_mode .miniArtboard {border: none!important;}
            .dark_mode #horizontalPointer, .dark_mode #verticalPointer {background: #303031!important;}
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
                    <li><h3><a href="https://minimap.xdplugins.co">Learn more</a></h3></li>
                </ul>
            </div>
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

    await initializeDefaultSettings();

    if (!panel) await event.node.appendChild(create());

    updateTimer = setInterval(
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
