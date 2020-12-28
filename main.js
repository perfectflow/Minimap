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
    const HTML =
        `<style>
            #main {height: 100%; position: relative;}
            #preview {width: 100%; height: auto; position: relative; overflow: hidden; background: #E4E4E4;}
            #preview:before {content: ""; display: block; padding-top: 100%;}
            #preview #center {width: 0px; height: 0px; position: absolute; left: 50%; top: 50%;}
            #preview #center .miniArtboard {position: absolute; background: #fff; border: 1px solid #777; z-index: 2;}
            #preview #center #miniViewport {position: absolute; border: 2px solid #0F66D0; z-index: 3;}
            #preview #center #horizontalPointer, #preview #center #verticalPointer {position: absolute; background: #DDD; z-index: 1;}
            #footer {width: 100%; position: fixed; bottom: 0; left: 0; line-height: 150%;}
            #footer .trigger {font-weight: bold; text-decoration: underline; color: #0F66D0;}
        </style>
        <div id="main">
            <div id="preview" title="Click to jump into specific region">
                <div id="center"></div>
            </div>
            <div id="footer">
                Crosshair is <span class="trigger">on</span>, viewport is <span class="trigger">blue</span> and ghost mode is <span class="trigger">off</span>.
            </div>
        </div>
        `;

    panel = document.createElement("div");
    panel.innerHTML = HTML;
    return panel;
}

function generateMinimap(){
    let preview = document.getElementById("preview");
    let center = document.getElementById("center");
    scaleFactor = rootWidth / preview.offsetWidth;

    while (center.firstChild) {
        center.removeChild(center.firstChild);
    }

    let miniViewport = document.createElement("div");
    miniViewport.setAttribute("id", "miniViewport");
    miniViewport.style.width = viewport.bounds.width / scaleFactor;
    miniViewport.style.height = viewport.bounds.height / scaleFactor;
    miniViewport.style.left = viewport.bounds.x / scaleFactor;
    miniViewport.style.top = viewport.bounds.y / scaleFactor;
    // miniViewport.setAttribute("draggable", true);

    let horizontalPointer = document.createElement("div");
    horizontalPointer.setAttribute("id", "horizontalPointer");
    horizontalPointer.style.width = rootWidth / scaleFactor;
    horizontalPointer.style.height = viewport.bounds.height / scaleFactor;
    horizontalPointer.style.left = (rootWidth / scaleFactor) / 2 * -1;
    horizontalPointer.style.top = viewport.bounds.y / scaleFactor;

    let verticalPointer = document.createElement("div");
    verticalPointer.setAttribute("id", "verticalPointer");
    verticalPointer.style.height = rootWidth / scaleFactor;
    verticalPointer.style.width = viewport.bounds.width / scaleFactor;
    verticalPointer.style.top = (rootWidth / scaleFactor) / 2 * -1;
    verticalPointer.style.left = viewport.bounds.x / scaleFactor;

    // miniViewport.addEventListener("dragend", event => {
    //     console.log(event.clientX - panel.offsetWidth / 2);
    //     miniViewport.style.left = event.clientX - panel.offsetWidth / 2;
    // });

    center.appendChild(miniViewport);
    center.appendChild(horizontalPointer);
    center.appendChild(verticalPointer);

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

function show(event) {
    if (!panel) event.node.appendChild(create());

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
