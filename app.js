
var $f = function () {
    var tileSize = 16;
    var scale = 4;
    var imageLoader = document.getElementById('uploader-input');
    var imageDownloader = document.getElementById('downloader-input');
    var $img = document.getElementById('uploader-img');
    imageLoader.addEventListener('change', handleImage, false);
    imageDownloader.addEventListener('click', downloadImage, false);
    $img.addEventListener('click', function (e) {
        imageLoader.click();
    }, false);
    document.getElementById('tile_size').addEventListener('change', function (e) {
        tileSize = this.value;
        console.log(tileSize);
        generateCanvasImg();
    }, false);

    var canvas = document.getElementById("composer-img-canvas");
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.scale(scale, scale);
    $img.addEventListener("load", function (e) {
        generateCanvasImg();
        console.log("autotile generated");
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
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    }

    function downloadImage(e) {
        var im = new Image();
        im.src = canvas.toDataURL();
        im.onload = function () {
            var canvas2 = document.createElement("canvas");
            var ctx2 = canvas2.getContext("2d");
            ctx2.imageSmoothingEnabled = false;
            ctx2.scale(1 / scale, 1 / scale);
            ctx2.drawImage(im, 0, 0);

            document.body.innerHTML = ('<img src="' + canvas2.toDataURL() + '" />' +
                '<br><br><a href="javascript:window.location.reload();">&xlArr; Back</a>');
        }
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
    }

    generateCanvasImg();
}
document.addEventListener("DOMContentLoaded", $f);
