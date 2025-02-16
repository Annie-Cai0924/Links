// This allows us to process/render the descriptions, which are in Markdown!
// More about Markdown: https://en.wikipedia.org/wiki/Markdown
let markdownIt = document.createElement('script')
markdownIt.src = 'https://cdn.jsdelivr.net/npm/markdown-it@14.0.0/dist/markdown-it.min.js'
document.head.appendChild(markdownIt)

// Okay, Are.na stuff!
let channelSlug = 'the-art-and-function-of-maps' // The “slug” is just the end of the URL

// First, let’s lay out some *functions*, starting with our basic metadata:
let placeChannelInfo = (data) => {
	// Target some elements in your HTML:
	let channelTitle = document.querySelector('#channel-title')
	let channelDescription = document.querySelector('#channel-description')
	let channelCount = document.querySelector('#channel-count')
	let channelLink = document.querySelector('#channel-link')

	// Then set their content/attributes to our data:
	channelTitle.innerHTML = data.title
	channelDescription.innerHTML = window.markdownit().render(data.metadata.description) // Converts Markdown → HTML
	channelCount.innerHTML = data.length
	channelLink.href = `https://www.are.na/channel/${channelSlug}`
}


// Function to ensure category container exists
function ensureCategoryContainer(categoryId) {
    let container = document.querySelector(`#${categoryId}`);
    if (!container) {
        container = document.createElement('ul');
        container.id = categoryId;
        container.classList.add('block-category');
        document.querySelector('#channel-blocks').appendChild(container);
    }
    return container;
}


// Then our big function for specific-block-type rendering:
let renderBlock = (block) => {
	// To start, a shared `ul` where we’ll insert all our blocks
	let channelBlocks = document.querySelector('#channel-blocks')




/*      Wanted to use it as a backdrop. Found it at codepen：https://codepen.io/Dillo/pen/raBqEZy

        Very, very much inspired by Ben Matthews' pen: https://codepen.io/tsuhre/full/BaXJrgw
        though I did not have a look at his code
        */

/* each kind of piece in this tiling is assigned a number which tells in binary which sides are crossed by a line:
           1 for top
           2 for left
           4 for right
           8 for bottom
           for example, the tile with a quater circle in its top-left corner has a line crossings its to and left sides=> encoded1+2=3
           Only tiles with numbers 3,5,6,9,10 and 12 actually exist (4-bit numbers with two 1s)
        */

const NB_SQUARES_MIN = 20; // number of squares in lRef(geometric mean of canvas width and height)
const NB_SQUARES_MAX = 30;
const WINDOW_WIDTH_DURATION = 50; // in seconds; used for horizontal scrolling speed : time to cross the screen horizontally

let canv, ctx; // canvas and context
let maxx, maxy; // canvas dimensions

let lRef, nbx, nby, drawnbx;
let size; // of square
let shiftX; //left position of canvas
let offsY; // offset to draw squares
let speed; // in pix/ms

// for animation
let messages;

let grid;
let chains; // array of chains

// shortcuts for Math.
const mrandom = Math.random;
const mfloor = Math.floor;
const mround = Math.round;
const mceil = Math.ceil;
const mabs = Math.abs;
const mmin = Math.min;
const mmax = Math.max;

const mPI = Math.PI;
const mPIS2 = Math.PI / 2;
const mPIS3 = Math.PI / 3;
const m2PI = Math.PI * 2;
const m2PIS3 = (Math.PI * 2) / 3;
const msin = Math.sin;
const mcos = Math.cos;
const matan2 = Math.atan2;

const mhypot = Math.hypot;
const msqrt = Math.sqrt;

const rac3 = msqrt(3);
const rac3s2 = rac3 / 2;

//------------------------------------------------------------------------

function alea(mini, maxi) {
  // random number in given range

  if (typeof maxi == "undefined") return mini * mrandom(); // range 0..mini

  return mini + mrandom() * (maxi - mini); // range mini..maxi
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function intAlea(mini, maxi) {
  // random integer in given range (mini..maxi - 1 or 0..mini - 1)
  //
  if (typeof maxi == "undefined") return mfloor(mini * mrandom()); // range 0..mini - 1
  return mini + mfloor(mrandom() * (maxi - mini)); // range mini .. maxi - 1
}

//------------------------------------------------------------------------
class Chain {
  constructor() {
    this.cells = new Set();
    this.strokeStyle = `hsl(${intAlea(360)} 100% 50%)`;
    this.lineWidth = alea(5, 15);
  }
} // Chain

//------------------------------------------------------------------------

class Cell {
  constructor(kx, ky, kind) {
    // kind = one of 3, 5, 6, 9, 10 or 12
    this.kx = kx;
    this.ky = ky;
    this.kind = kind;
    // we know cells are always added in the same order, so that only top and left sides need to be checked for connection to existing chain
    let chn1, chn2;
    if (ky > 0 && kind & 1) chn1 = grid[kx][ky - 1].chain; // connected to this chain by top side
    if (kx > 0 && kind & 2) chn2 = grid[kx - 1][ky].chain; // connected to this chain by left side
    if (!chn1 && !chn2) {
      // not connected to any chain
      chn1 = new Chain();
      chains.push(chn1); // add this new chain to chains
      this.chain = chn1;
    } else if (chn1 && !chn2) {
      this.chain = chn1;
    } else if (!chn1 && chn2) {
      this.chain = chn2;
    } else {
      // connected to both chains
      let idx1 = chains.indexOf(chn1);
      let idx2 = chains.indexOf(chn2);
      if (idx1 == -1 || idx2 == -1) throw "???";
      if (idx1 > idx2) {
        //chain1 youngest, swap chains to keep the oldest
        [chn1, chn2] = [chn2, chn1];
        [idx1, idx2] = [idx2, idx1];
      }
      this.chain = chn1;
      if (idx1 != idx2) {
        chn2.cells.forEach((c) => (c.chain = chn1)); // affect chn1 to cells of chn2
        chn1.cells = chn1.cells.union(chn2.cells); // append cells of chn2 to chn1
        chains.splice(idx2, 1); // remove chn2 from array (no longer exists)
      }
    }
    this.chain.cells.add(this);
  }

  draw() {
    drawSquare(this.kx, this.ky, this.kind);
    ctx.lineWidth = this.chain.lineWidth;
    ctx.strokeStyle = this.chain.strokeStyle;
    ctx.stroke();
    this.drawEdges();
  }

  drawEdges() {
    let x0 = this.kx * size; // left of square
    let y0 = offsY + this.ky * size; // top of square
    ctx.beginPath();
    if ((this.kind & 1) == 0) {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + size, y0);
    }
    if ((this.kind & 2) == 0) {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0, y0 + size);
    }
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#888";
    let nb = mround(size / 12);
    ctx.lineDashOffset = -size / nb / 4;
    ctx.setLineDash([size / nb / 2]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
} // class cell

//------------------------------------------------------------------------
function createGrid() {
  grid = [];
  chains = [];

  for (let kx = 0; kx < nbx; ++kx) {
    addColumn();
  } // // for kx
} // createGrid

//------------------------------------------------------------------------
function addColumn() {
  let column = [];
  const kx = grid.length;
  grid[kx] = column;
  for (let ky = 0; ky < nby; ++ky) {
    let poss = new Set([3, 5, 6, 9, 10, 12]);
    // remove from possibilities according to already placed neighboring tiles
    if (kx > 0) {
      if (grid[kx - 1][ky].kind & 4) {
        poss.delete(5);
        poss.delete(9);
        poss.delete(12);
      } else {
        poss.delete(3);
        poss.delete(6);
        poss.delete(10);
      }
    }
    if (ky > 0) {
      if (column[ky - 1].kind & 8) {
        poss.delete(6);
        poss.delete(10);
        poss.delete(12);
      } else {
        poss.delete(3);
        poss.delete(5);
        poss.delete(9);
      }
    }
    if (poss.length == 0) throw "???"; // should not occur
    poss = Array.from(poss);
    column[ky] = new Cell(kx, ky, poss[intAlea(poss.length)]); // random choice between possibilities
  } // for ky
} // add Column
//------------------------------------------------------------------------
function removeColumn() {
  /* column 0 is removed from grid */
  let removed = grid.splice(0, 1)[0];
  grid.forEach((column, kx) => column.forEach((cell) => (cell.kx = kx))); // re-number columns (--cell.kx should work too)
  // delete unused chains
  removed.forEach((cell) => {
    let chain = cell.chain;
    chain.cells.delete(cell);
    if (chain.cells.size == 0) {
      // this chain no longer in use
      let idx = chains.indexOf(chain);
      if (idx == -1) throw "???";
      chains.splice(idx, 1); // remove it from array of chains
    }
  });
}
//------------------------------------------------------------------------

function drawSquare(kx, ky, kind) {
  let x0 = (kx + 0.5) * size; // center of square
  let y0 = offsY + (ky + 0.5) * size;

  ctx.beginPath();
  switch (kind) {
    case 3:
      ctx.moveTo(x0, y0 - size / 2);
      ctx.arc(x0 - size / 2, y0 - size / 2, size / 2, 0, mPI / 2);
      break;
    case 5:
      ctx.moveTo(x0 + size / 2, y0);
      ctx.arc(x0 + size / 2, y0 - size / 2, size / 2, mPI / 2, mPI);
      break;
    case 6:
      ctx.moveTo(x0 - size / 2, y0);
      ctx.lineTo(x0 + size / 2, y0);
      break;
    case 9:
      ctx.moveTo(x0, y0 - size / 2);
      ctx.lineTo(x0, y0 + size / 2);
      break;
    case 10:
      ctx.moveTo(x0 - size / 2, y0);
      ctx.arc(x0 - size / 2, y0 + size / 2, size / 2, -mPI / 2, 0);
      break;
    case 12:
      ctx.moveTo(x0, y0 + size / 2);
      ctx.arc(x0 + size / 2, y0 + size / 2, size / 2, -mPI, -mPI / 2);
      break;
  } // switch
  /*
                        ctx.strokeStyle = "#fff";
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
            */
}

//------------------------------------------------------------------------

let animate;

{
  // scope for animate

  let animState = 0;
  let tdraw;
  animate = function (tStamp) {
    let message, dt, column;

    message = messages.shift();
    if (message && message.message == "reset") animState = 0;
    if (message && message.message == "click") animState = 0;
    window.requestAnimationFrame(animate);

    switch (animState) {
      case 0:
        if (startOver()) {
          ++animState;
          shiftX = 0;
          tdraw = tStamp;
        }
        break;

      case 1:
        dt = tStamp - tdraw;
        tdraw = tStamp;
        if (dt > 100) dt = 100; // speed limit

        shiftX -= speed * dt;
        if (shiftX > -size) {
          canv.style.left = `${shiftX}px`;
        } else {
          shiftX += size;
          addColumn();
          removeColumn();
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, canv.width, canv.height);
          canv.style.left = `${shiftX}px`;
          for (let kx = 0; kx <= drawnbx; ++kx) {
            column = grid[kx];
            column.forEach((v, ky) => {
              v.draw();
            });
          }
        }

        break;

      case 2:
        break;
    } // switch
  }; // animate
} // scope for animate

//------------------------------------------------------------------------
//------------------------------------------------------------------------

function startOver() {
  // canvas dimensions

  maxx = window.innerWidth;
  maxy = window.innerHeight;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, maxx, maxy);

  lRef = msqrt(maxx * maxy);
  size = lRef / alea(NB_SQUARES_MIN, NB_SQUARES_MAX);
  drawnbx = mceil(maxx / size);
  nby = mceil(maxy / size);

  offsY = (maxy - nby * size) / 2;

  canv.width = maxx + mceil(size);
  canv.height = maxy;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  /* when we add a tile on the right side, which connects together two previoulsy existing chains,
            one of these chains MUST change of color
            we try to hide it by adding extra rows on the right side
             */
  nbx = drawnbx + nby;

  speed = maxx / WINDOW_WIDTH_DURATION / 1000;
  createGrid();
  grid.forEach((column, kx) => {
    column.forEach((v, ky) => {
      v.draw();
    });
  });

  return true;
} // startOver

//------------------------------------------------------------------------

function mouseClick(event) {
  messages.push({ message: "click" });
} // mouseClick

//------------------------------------------------------------------------
//------------------------------------------------------------------------
// beginning of execution

{
  canv = document.createElement("canvas");
  canv.style.position = "absolute";
  document.body.appendChild(canv);
  ctx = canv.getContext("2d");
  /*    canv.setAttribute ('title','click me'); */
} // CANVAS creation
canv.addEventListener("click", mouseClick);
messages = [{ message: "reset" }];
requestAnimationFrame(animate);

canv.style.position = "fixed"; // Hold the viewport in a fixed position
canv.style.top = "0";
canv.style.left = "0";
canv.style.zIndex = "-1"; // Make Canvas lower than text but higher than body::before








let categoryId;
let blockItem = '';

	// ======================= Links! ======================
if (block.class === 'Link') {
    categoryId = 'links';
    blockItem = `
        <li class="block-item image-block">
 				<img src="${ block.image.original.url }" alt="${ block.title }">
             <div class="overlay">
                 <p>${block.title}</p>
 			<p>${block.description}</p>
             </div>
            <p><a href="${ block.source.url }">See the original ↗</a></p>
         </li>`;





         
// ======================= Images! ======================
} else if (block.class === 'Image') {
    categoryId = 'images';
    blockItem = `
        <li class="block-item image-block">
 				<img src="${ block.image.original.url }" alt="${ block.title }">
                 <div class="overlay">
                <p>${block.title}</p>
 			<p>${block.description}</p>
                  </div>
 			</li>`;





// ======================= PDFs! ======================
} else if (block.attachment && block.attachment.content_type.includes('pdf')) {
    categoryId = 'pdfs';
    blockItem = `
        <li>
 				<embed src="${ block.attachment.url }" type="application/pdf" width="600" height="400">
 				<p><a href="${ block.attachment.url }" target="_blank">Download PDF →</a></p>
 			</li>`;




// ======================= Audios! ======================
} else if (block.embed && block.embed.type.includes('rich')) {
    categoryId = 'audios';
    blockItem = ` <li>
 			${ block.embed.html } </li>`;




  // ======================= Texts! ======================
} else if (block.class == 'Text') {
    categoryId = 'text'
    blockItem = `<li>
    				<blockquote>${ block.content }</blockquote>
     			</li>`
}

if (categoryId) {
    let container = ensureCategoryContainer(categoryId);
    container.insertAdjacentHTML('beforeend', blockItem);
}
}




function toggleCell(row, col) {
	let cell = cells[row][col]; //create cell
	let currentColor = cell.style.backgroundColor; //create current color 

	if (currentColor === "black") {
	  cell.style.backgroundColor = "white";
	} else if (currentColor === "white") {
	  cell.style.backgroundColor = "black";
	}
  
	count[row][col]++; // increase toggle count by 1;
  
	// if count is more than the threshold set earlier, become transparent
	if (count[row][col] >= threshold) {
	  cell.style.backgroundColor = "transparent";
	}
	console.log("togglecell worked")
  }









// It‘s always good to credit your work:
let renderUser = (user, container) => { // You can have multiple arguments for a function!
	let userAddress =
		`
		<address>
			<img src="${ user.avatar_image.display }">
			<h3>${ user.first_name }</h3>
			<p><a href="https://are.na/${ user.slug }">Are.na profile ↗</a></p>
		</address>
		`
	container.insertAdjacentHTML('beforeend', userAddress)
}



// Now that we have said what we can do, go get the data:
fetch(`https://api.are.na/v2/channels/${channelSlug}?per=100`, { cache: 'no-store' })
	.then((response) => response.json()) // Return it as JSON data
	.then((data) => { // Do stuff with the data
		console.log(data) // Always good to check your response!
		placeChannelInfo(data) // Pass the data to the first function

		// Loop through the `contents` array (list), backwards. Are.na returns them in reverse!
		data.contents.reverse().forEach((block) => {
			// console.log(block) // The data for a single block
			renderBlock(block) // Pass the single block data to the render function
		})

		// Also display the owner and collaborators:
		let channelUsers = document.querySelector('#channel-users') // Show them together
		data.collaborators.forEach((collaborator) => renderUser(collaborator, channelUsers))
		renderUser(data.user, channelUsers)
	})

document.querySelectorAll(".navbar a").forEach(link => {
    link.addEventListener("click", function(event) {
        event.preventDefault(); // 阻止默认跳转
        let targetId = this.getAttribute("href");
        let targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: "smooth" });
        }
    });
});










        // found that on:https://codepen.io/kevinnewcombe/pen/XMVoKv
        var scene = new THREE.Scene();
        var viewport, renderer, camera, controls, particleDistance, centerPoint = {};
        var transitionDuration = 1000;
        var baseURL = '';
        var mountainGeometry, mountainParticles;
        var loader = new THREE.JSONLoader();
        var pointsPlot = new Array();
        var geoname;
        THREE.ImageUtils.crossOrigin = ""
        THREE.ImageUtils.crossOrigin = "anonymous"
        init();


        function init() {
            baseURL = 'https://s3.ca-central-1.amazonaws.com/kevinnewcombe/three-terrain/';
        // set up the scene and camera
        scene = new THREE.Scene();
        var WIDTH = window.innerWidth * 0.8,
            HEIGHT = window.innerHeight;

        viewport = document.getElementById('viewport');

        renderer = new THREE.WebGLRenderer();
        renderer = new THREE.WebGLRenderer({ antialias: 0, clearAlpha: 0, alpha:true });
        renderer.setSize(WIDTH, HEIGHT);
        renderer.setClearColor( 0x000000, 0 ); // the default
        renderer.shadowMap.enabled = true;
        viewport.appendChild(renderer.domElement);
        window.addEventListener( 'resize', onWindowResize, false );

        scene.fog = new THREE.Fog( 0x111111, 22000, 25000 );

        /* ************** */
        /*                */
        /*     camera     */
        /*                */
        /* ************** */
        camera = new THREE.PerspectiveCamera(10, WIDTH / HEIGHT, 0.1, 200000);
        camera.position.set(0, 10000, -20000 );
        scene.add(camera);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.25; 
        createGroundPlane();
        animates();
        }

        function createGroundPlane(){
        mountainGeometry = new THREE.Geometry();
        mountainGeometry.dynamic = true;
        mountainGeometry.__dirtyVertices = true;
        mountainGeometry.verticesNeedUpdate = true;

        var material = new THREE.PointsMaterial();
        material.sizeAttenuation = false;
        centerX = 0;
        centerZ = 0;

        totalX = 150;
        totalZ = 150;

        particleDistance = 25;
        for ( var x = 0; x < totalX; x ++ ) {
            xplot = x - Math.round((totalX-1)/2);
            zArray = new Array();
            for ( var z = 0; z < totalZ; z ++ ) {
            var vertex = new THREE.Vector3();
            vertex.x = x*particleDistance - particleDistance*(totalX-1)/2;
            vertex.z = z*particleDistance - particleDistance*(totalZ-1)/2;
            zplot = z - Math.round((totalZ-1)/2);
            zArray[zplot] = vertex;
            mountainGeometry.vertices.push( vertex );
            }
            pointsPlot[xplot] = zArray;
        }
        
        mountainParticles = new THREE.Points( mountainGeometry, material );
        mountainParticles.sortParticles = true;
        mountainParticles.position.y = -700;
        scene.add( mountainParticles );
        loadGeography('everest');
        }

        function loadGeography(filename){
        e = document.querySelector('select[name="geo"]');
        select = e.options[e.selectedIndex].value;
        if(select){
            filename = select;
        } 
        var request = new XMLHttpRequest();
        request.open('GET', baseURL+'_terrain/'+filename+'.json?v=2');
        request.onprogress = function(evt){
            document.getElementById('loading').innerHTML = Math.round((evt.loaded / evt.total)*100)+'%';
        }
        request.onload = function() {
            document.getElementById('loading').innerHTML = '';
            if (request.status >= 200 && request.status < 400) {
            var data = JSON.parse(request.responseText);
            centerPoint.lat = data.boundaries[2] + (data.boundaries[0] - data.boundaries[2]) / 2;
            centerPoint.lng = data.boundaries[3] + (data.boundaries[1] - data.boundaries[3]) / 2;
            document.getElementById('map-link').setAttribute('href', 'https://www.google.ca/maps/place/'+centerPoint.lat+','+centerPoint.lng);
            console.log(centerPoint.lat+','+centerPoint.lng);
            for(var i = 0; i<data.coords.length; i++){
                m = data.coords[i];
                x = m[0];
                y = m[1];
                z = m[2];

                v = pointsPlot[x][z];

                target = { 
                y:(y - data.lowest_point)*particleDistance, 
                ease:Power3.easeOut
                }

                tween = TweenMax.to(v, 1.5, target );
                target.onUpdate = function () {
                mountainGeometry.verticesNeedUpdate = true;
                };  
            }
            } else {
            alert('Sorry, there was an error loading the geography.');
            }
        };

        request.onerror = function() {
            alert('Sorry, there was an error loading the geography.');
        };
        request.send();
        }

        function onWindowResize( event ) {
        SCREEN_HEIGHT = window.innerHeight;
        SCREEN_WIDTH  = window.innerWidth;
        renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
        camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
        camera.updateProjectionMatrix();
        }

        function animates() {
            requestAnimationFrame(animates);
            renderer.render(scene, camera);
            controls.update();
        }

        document.addEventListener('DOMContentLoaded',function() {
        document.querySelector('select[name="geo"]').onchange=loadGeography;
        },false);
