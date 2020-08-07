var fs = require('fs');
const dialog = require('electron').remote.dialog;
const util = require('util');
const writeFile = util.promisify(fs.writeFile);

var $f = function () {
    var inputFileName = 'demo.png';
    var tileSize = 16;
    var scale = 4;
    var imageLoader = document.getElementById('uploader-input');
    // var imageDownloader = document.getElementById('downloader-input');
    var $img = document.getElementById('uploader-img');
    var $imgOut = document.getElementById('img-output-generated');
    var $btnSaveImage = document.getElementById('btn-save-image');
    var $tileSizeInput = document.getElementById('tile_size');
    imageLoader.addEventListener('change', handleImage, false);
    // imageDownloader.addEventListener('click', downloadImage, false);
    document.getElementById('uploader-pic').addEventListener('click', function (e) {
        imageLoader.click();
    }, false);
    $btnSaveImage.addEventListener('click', saveCanvasImage, false);
    $tileSizeInput.addEventListener('change', function (e) {
        tileSize = this.value;
        console.log("New tile size is: " + tileSize);
        generateCanvasImg();
    }, false);

    var canvas = document.getElementById("composer-img-canvas");
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.scale(scale, scale);
    $img.addEventListener("load", function (e) {
        generateCanvasImg();
    }, false);

    function drawCell(sx, sy, dx, dy) {
        ctx.drawImage(
            $img,
            sx * tileSize, sy * tileSize, tileSize, tileSize,
            dx * tileSize, dy * tileSize, tileSize, tileSize
        );
        ctx.save();
    }

    function drawCellSlice(size, sx, sy, dx, dy) {
        ctx.drawImage(
            $img,
            sx * tileSize, sy * tileSize, size, size,
            dx * tileSize, dy * tileSize, size, size
        );
        ctx.save();
    }

    function handleImage(e) {
        $img.setAttribute("src", "");
        if (e.target.files.length > 0) {
            var reader = new FileReader();
            reader.onload = function (event) {
                $img.setAttribute('src', event.target.result);
                detectTileSize();
            }
            inputFileName = e.target.files[0].name;
            reader.readAsDataURL(e.target.files[0]);
            $btnSaveImage.disabled = false;
        }
    }

    function detectTileSize() {
        var tmpIm = new Image();
        tmpIm.src = $img.src;
        tmpIm.onload = function (e) {
            var newTileSize = Math.floor(tmpIm.width / 5);
            if (newTileSize === tileSize) {
                return;
            }
            $tileSizeInput.value = Math.floor(tmpIm.width / 5);
            $tileSizeInput.dispatchEvent(new Event('change'))
        }
    }

    function downloadImage(e) {
        var newIm = new Image();
        newIm.src = createOutputCanvas().toDataURL();
        newIm.id = 'img-output-generated-img';
        // document.body.appendChild(canvas2);
        $imgOut.innerHTML = '';
        $imgOut.appendChild(newIm);
        // document.body.app = ('<img src="' + canvas2.toDataURL() + '" />' +
        //     '<br><br><a href="javascript:window.location.reload();">&xlArr; Back</a>');
        $imgOut.addEventListener("click", saveCanvasImage)
    }

    /**
     * @returns {HTMLCanvasElement}
     */
    function createOutputCanvas() {
        var canvas2 = document.createElement("canvas");
        var ctx2 = canvas2.getContext("2d");
        ctx2.imageSmoothingEnabled = false;
        // ctx2.width = ctx2.width / scale;
        // ctx2.height = ctx2.height / scale;
        ctx2.width = canvas.width / scale;
        ctx2.height = canvas.height / scale;
        canvas2.width = canvas.width / scale;
        canvas2.height = canvas.height / scale;
        ctx2.scale(1 / scale, 1 / scale);
        ctx2.drawImage(canvas, 0, 0);

        return canvas2;
    }

    function generateCanvasImg() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.width = (88 * (tileSize / 8)) * scale;
        ctx.height = (40 * (tileSize / 8)) * scale;

        drawCell(0, 0, 0, 0);
        drawCell(1, 0, 1, 0);
        drawCell(2, 0, 2, 0);

        drawCell(0, 1, 0, 1);
        drawCell(1, 1, 1, 1);
        drawCell(2, 1, 2, 1);

        drawCell(0, 2, 0, 2);
        drawCell(1, 2, 1, 2);
        drawCell(2, 2, 2, 2);


        drawCellSlice(tileSize / 2, 0, 0, 0, 3);
        drawCellSlice(tileSize / 2, 1, 0, 0.5, 3);
        drawCellSlice(tileSize / 2, 1, 0, 1, 3);
        drawCellSlice(tileSize / 2, 1, 0, 1.5, 3);
        drawCellSlice(tileSize / 2, 1, 0, 2, 3);
        drawCellSlice(tileSize / 2, 2.5, 0, 2.5, 3);

        drawCellSlice(tileSize / 2, 0, 2.5, 0, 3.5);
        drawCellSlice(tileSize / 2, 1, 2.5, 0.5, 3.5);
        drawCellSlice(tileSize / 2, 1, 2.5, 1, 3.5);
        drawCellSlice(tileSize / 2, 1, 2.5, 1.5, 3.5);
        drawCellSlice(tileSize / 2, 1, 2.5, 2, 3.5);
        drawCellSlice(tileSize / 2, 2.5, 2.5, 2.5, 3.5);


        drawCellSlice(tileSize / 2, 0, 0, 3, 3);
        drawCellSlice(tileSize / 2, 2.5, 0, 3.5, 3);
        drawCellSlice(tileSize / 2, 0, 2.5, 3, 3.5);
        drawCellSlice(tileSize / 2, 2.5, 2.5, 3.5, 3.5);


        drawCellSlice(tileSize / 2, 0, 0, 3, 0);
        drawCellSlice(tileSize / 2, 2.5, 0, 3.5, 0);


        drawCellSlice(tileSize / 2, 0, 0.5, 3, 0.5);
        drawCellSlice(tileSize / 2, 2.5, 0.5, 3.5, 0.5);
        drawCellSlice(tileSize / 2, 0, 0.5, 3, 1);
        drawCellSlice(tileSize / 2, 2.5, 0.5, 3.5, 1);
        drawCellSlice(tileSize / 2, 0, 0.5, 3, 1.5);
        drawCellSlice(tileSize / 2, 2.5, 0.5, 3.5, 1.5);
        drawCellSlice(tileSize / 2, 0, 0.5, 3, 2);
        drawCellSlice(tileSize / 2, 2.5, 0.5, 3.5, 2);
        drawCellSlice(tileSize / 2, 0, 2.5, 3, 2.5);
        drawCellSlice(tileSize / 2, 2.5, 2.5, 3.5, 2.5);

        ///

        drawCell(0, 0, 4, 0);
        drawCell(1, 0, 5, 0);
        drawCell(1, 0, 6, 0);
        drawCell(2, 0, 7, 0);

        drawCell(0, 1, 4, 1);
        drawCell(1, 1, 5, 1);
        drawCell(1, 1, 6, 1);
        drawCell(2, 1, 7, 1);

        drawCell(0, 1, 4, 2);
        drawCell(1, 1, 5, 2);
        drawCell(1, 1, 6, 2);
        drawCell(2, 1, 7, 2);

        drawCell(0, 2, 4, 3);
        drawCell(1, 2, 5, 3);
        drawCell(1, 2, 6, 3);
        drawCell(2, 2, 7, 3);

        ///


        drawCell(0, 1, 4, 4);
        drawCell(1, 1, 5, 4);
        drawCell(1, 1, 6, 4);
        drawCell(2, 1, 7, 4);

        drawCell(1, 1, 8, 4);
        drawCell(1, 2, 8, 3);
        drawCell(1, 1, 8, 2);
        drawCell(1, 1, 8, 1);
        drawCell(1, 0, 8, 0);

        ///

        drawCell(1, 1, 9, 0);
        drawCell(1, 1, 9, 1);
        drawCell(1, 1, 9, 2);
        drawCell(1, 1, 9, 3);
        drawCell(1, 1, 10, 2);
        drawCell(1, 1, 10, 3);

        /// corners/holes
        drawCellSlice(tileSize / 2, 3.5, 0.5, 4.5, 0.5);
        drawCellSlice(tileSize / 2, 3.5, 0.5, 4.5, 1.5);
        drawCellSlice(tileSize / 2, 3.5, 0.5, 4.5, 4.5);
        drawCellSlice(tileSize / 2, 3.5, 0.5, 5.5, 0.5);
        drawCellSlice(tileSize / 2, 3.5, 0.5, 5.5, 1.5);
        drawCellSlice(tileSize / 2, 3.5, 0.5, 5.5, 4.5);
        drawCellSlice(tileSize / 2, 3.5, 0.5, 8.5, 0.5);
        drawCellSlice(tileSize / 2, 3.5, 0.5, 8.5, 1.5);
        drawCellSlice(tileSize / 2, 3.5, 0.5, 8.5, 4.5);
        drawCellSlice(tileSize / 2, 3.5, 0.5, 9.5, 1.5);
        drawCellSlice(tileSize / 2, 3.5, 0.5, 9.5, 3.5);
        drawCellSlice(tileSize / 2, 3.5, 0.5, 10.5, 2.5);
        drawCellSlice(tileSize / 2, 3.5, 0.5, 10.5, 3.5);


        drawCellSlice(tileSize / 2, 4, 0.5, 6, 0.5);
        drawCellSlice(tileSize / 2, 4, 0.5, 6, 1.5);
        drawCellSlice(tileSize / 2, 4, 0.5, 6, 4.5);
        drawCellSlice(tileSize / 2, 4, 0.5, 7, 0.5);
        drawCellSlice(tileSize / 2, 4, 0.5, 7, 1.5);
        drawCellSlice(tileSize / 2, 4, 0.5, 7, 4.5);
        drawCellSlice(tileSize / 2, 4, 0.5, 8, 4.5);
        drawCellSlice(tileSize / 2, 4, 0.5, 8, 1.5);
        drawCellSlice(tileSize / 2, 4, 0.5, 8, 0.5);
        drawCellSlice(tileSize / 2, 4, 0.5, 9, 0.5);
        drawCellSlice(tileSize / 2, 4, 0.5, 9, 2.5);
        drawCellSlice(tileSize / 2, 4, 0.5, 9, 3.5);
        drawCellSlice(tileSize / 2, 4, 0.5, 10, 3.5);


        ///
        drawCellSlice(tileSize / 2, 3.5, 1, 4.5, 2);
        drawCellSlice(tileSize / 2, 3.5, 1, 5.5, 2);
        drawCellSlice(tileSize / 2, 3.5, 1, 4.5, 3);
        drawCellSlice(tileSize / 2, 3.5, 1, 5.5, 3);
        drawCellSlice(tileSize / 2, 3.5, 1, 4.5, 4);
        drawCellSlice(tileSize / 2, 3.5, 1, 5.5, 4);
        drawCellSlice(tileSize / 2, 3.5, 1, 8.5, 4);
        drawCellSlice(tileSize / 2, 3.5, 1, 8.5, 3);
        drawCellSlice(tileSize / 2, 3.5, 1, 8.5, 2);
        drawCellSlice(tileSize / 2, 3.5, 1, 9.5, 0);
        drawCellSlice(tileSize / 2, 3.5, 1, 9.5, 2);
        drawCellSlice(tileSize / 2, 3.5, 1, 10.5, 2);
        drawCellSlice(tileSize / 2, 3.5, 1, 10.5, 3);

        drawCellSlice(tileSize / 2, 4, 1, 6, 2);
        drawCellSlice(tileSize / 2, 4, 1, 7, 2);
        drawCellSlice(tileSize / 2, 4, 1, 6, 3);
        drawCellSlice(tileSize / 2, 4, 1, 7, 3);
        drawCellSlice(tileSize / 2, 4, 1, 6, 4);
        drawCellSlice(tileSize / 2, 4, 1, 7, 4);

        drawCellSlice(tileSize / 2, 4, 1, 8, 2);
        drawCellSlice(tileSize / 2, 4, 1, 8, 3);
        drawCellSlice(tileSize / 2, 4, 1, 8, 4);
        drawCellSlice(tileSize / 2, 4, 1, 9, 1);
        drawCellSlice(tileSize / 2, 4, 1, 9, 2);
        drawCellSlice(tileSize / 2, 4, 1, 9, 3);
        drawCellSlice(tileSize / 2, 4, 1, 10, 2);

        ctx.save();
        // downloadImage();
    }

    function saveCanvasImage() {
        dialog.showSaveDialog(
            {title: 'Save generated image', defaultPath: inputFileName.replace(/\.([^.]+)/, '-autotile.$1')},
        ).then(file => {
            // Stating whether dialog operation was cancelled or not.
            if (!file.canceled) {
                console.log(file.filePath.toString());
                saveImg(file.filePath.toString());
            } else {
                console.log("save canceled");
            }
        });
    }

    function readBlobAsUint8Array(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                return new Uint8Array(reader.result);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    }

    /**
     *
     * @param {HTMLCanvasElement} canv
     * @returns {Promise<string[]>}
     */
    function getCanvasAsBlob(canv) {
        return new Promise((resolve) => {
            canv.toBlob(resolve, "image/png");
        });
    }

    async function saveCanvasAsPng(filename, canv) {
        const blob = await getCanvasAsBlob(canv);
        const data = await readBlobAsUint8Array(blob);
        await writeFile(filename, data);
    }

    function saveImg(filename) {
        const dataUrl = createOutputCanvas().toDataURL();
        const uu = dataUrl.substring('data:image/png;base64,'.length);
        fs.writeFileSync(filename, uu, 'base64');
    }

    // generateCanvasImg();
}
document.addEventListener("DOMContentLoaded", $f);
