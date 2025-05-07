// This allows us to process/render the descriptions, which are in Markdown!
// More about Markdown: https://en.wikipedia.org/wiki/Markdown
let markdownIt = document.createElement('script')
markdownIt.src = 'https://cdn.jsdelivr.net/npm/markdown-it@14.0.0/dist/markdown-it.min.js'
document.head.appendChild(markdownIt)

// Okay, Are.na stuff!
let channelSlug = 'the-art-and-function-of-maps'


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
// The code uses SVG path and GSAP (Animation library) to achieve dynamic curve path animation, similar to the effect of graffiti.
//Here is a class called Squiggle written, and its function is: on a canvas
class Squiggle {
  //Save the grid and stage
  constructor(stage, settings, grid) {
    //sqwigs is an empty array. We will add lines to it later.
      this.grid = grid;
      this.stage = stage;
      this.sqwigs = [];
      //state refers to the current state. It is first marked as "animating", indicating that the line is moving
      this.state = 'animating';
      //At the beginning, the width of the line is 0 and it is invisible
      settings.width = 0;
      //The opacity is 1, indicating that it is completely opaque
      settings.opacity = 1;
//Generate a basic line pat using these Settings
      let path = this.createLine(settings);
      //draw a total of three such lines
      let sqwigCount = 3;
      //Use a loop to generate these three lines
      for(let i = 0; i < sqwigCount; i++) {
        //Use JSON.parse for settings. 
        //Make a deep copy to ensure that each line has its own independent Settings
          this.createSqwig(i, sqwigCount, path, JSON.parse(JSON.stringify(settings)), i == sqwigCount - 1);
      }
  }

  //A path (path/line) was created in SVG format, and its shape was set using the PATH passed in front of it
  createSqwig(index, total, path, settings, forceWhite) {
      let sqwig = document.createElementNS("http://www.w3.org/2000/svg", 'path');
      sqwig.setAttribute('d', path);
      //If forceWhite is true, it forces the line to be dark gray.
      sqwig.style.fill = 'none';
      //Otherwise, randomly use this.getColor() to generate the color
      sqwig.style.stroke = forceWhite ? '#303030' : this.getColor();
      sqwig.style.strokeLinecap = "round";
      //just want the line to have an animation effect of "segments", so I calculate the total length first and then use one sixth of the length
      settings.length = sqwig.getTotalLength();
      settings.chunkLength = settings.length / 6;
      settings.progress = settings.chunkLength;

      //strokeDasharray is like a "dotted line template" : draw a little first and then skip over a very long one
    //Where should the Stroke as Hoffset be drawn? The control line should move forward slowly
      sqwig.style.strokeDasharray = `${settings.chunkLength}, ${settings.length + settings.chunkLength}`;
      sqwig.style.strokeDashoffset = `${settings.progress}`;

      //Add this line to the stage (canvas) and record it in this.sqwigs
      this.stage.appendChild(sqwig);
      this.sqwigs.unshift({path: sqwig, settings: settings});
//Make animations with GSAP
//Let the lines gradually "draw from the beginning to the end"
//The indices of different lines are not the same, so a delay is added
//After the animation ends, set the status of the last line to ended and delete the line without taking up memory
      gsap.to(settings, {
          duration: settings.sections * 0.1,
          progress: -settings.length,
          width: settings.sections * 0.9,
          ease: "power1.out",
          delay: index * (settings.sections * 0.01),
          onComplete: () => {
              if(index == total - 1) this.state = 'ended';
              sqwig.remove();
          }
      });
  }

  //path: The actual SVG line element
  update() {
    //settings: Control the animation status of this line like progress, thickness, opacity
      this.sqwigs.forEach(set => {
        //Set where the line starts to be drawn - the dynamic control line is how much has been drawn
          set.path.style.strokeDashoffset = `${set.settings.progress}`;
          set.path.style.strokeWidth = `${set.settings.width}px`;
          set.path.style.opacity = `${set.settings.opacity}`;
      });
  }

  //Take out the coordinates of the initial point and the current forward direction 
//These values determine where this line starts and in which direction it is drawn.
  createLine(settings) {
      let x = settings.x;
      let y = settings.y;
      let dx = settings.directionX;
      let dy = settings.directionY;
      //path is an array of SVG path strings
      //M x y means move to this point
      let path = ['M', x, y, "Q"];

      //Initialize the step counter
      let steps = settings.sections;
      let step = 0;
      
      //direction: Is it x or y 
  //goAnywhere: Can one walk completely randomly 
  //If goAnywhere = false, it follows the originally given direction (for example, always to the right). 
  //If goAnywhere = true, it randomly decides to go left/right, up/down. 
  //It can make the lines walk regularly and also move randomly, looking as if they are growing freely.
      const getNewDirection = (direction, goAnywhere) => {
          if(!goAnywhere && settings['direction' + direction.toUpperCase()] != 0) 
              return settings['direction' + direction.toUpperCase()];
          return Math.random() < 0.5 ? -1 : 1;
      }

      //Each Bezier curve requires two points (one control point and one target point), so the overall step is sections * 2
      while(step < steps * 2) {
        //Move the position a little each time to allow the line to continue extending. 
//dx and dy are directions. For example, to the right is dx = 1. 
//step / 30 Make the changes in each step a little larger. This makes the lines more natural. 
//this.grid is the unit distance
          step++;
          x += (dx * (step/ 30)) * this.grid;
          y += (dy * (step/ 30)) * this.grid;
          //Except for the first point, all the others should be added before the coordinates
          if(step != 1) path.push(',');
          path.push(x);
          path.push(y);
          
          if(step % 2 != 0) {
              dx = dx == 0 ? getNewDirection('x', step > 8) : 0;
              dy = dy == 0 ? getNewDirection('y', step > 8) : 0;
          }
      }
      //Finally, combine all the instructions in the array into a string
      return path.join(' ');
  }

  //First, randomly select an integer between 0 and 100. This offset is for creating color changes
  getColor() {
    //Use the Math.sin() function to make the RGB color values smoother and more natural. 
//The three channels (red, green, and blue) use different phases (+0, +2, +4) to produce different changes
      let offset = Math.round(Math.random() * 100);
      let r = Math.sin(0.3 * offset) * 100 + 155;
      let g = Math.sin(0.3 * offset + 2) * 100 + 155;
      let b = Math.sin(0.3 * offset + 4) * 100 + 155;
      return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
  }
//Convert numbers (such as 200) to hexadecimal (such as "c8")
  componentToHex(c) {
      let hex = Math.round(c).toString(16);
      return hex.length == 1 ? "0" + hex : hex;
  }
}

//Create a class called App, which is the core controller of the animation application
class App {
  constructor(container) {
      this.container = container;
      this.svg = document.getElementById('stage');
      this.squiggles = [];
      this.grid = 40;
      this.lastMousePosition = null;
      this.isDrawing = false;
      
      this.onResize();
      this.setupInput();
      this.tick();
      
      window.addEventListener('resize', () => this.onResize());
  }
  
  //Set up the mouse/touch input listener. 
 
//getPosition is an auxiliary function that helps you obtain the position of the mouse or finger on the page. 
 
//This function will be used later in events such as mousedown and mousemove
  setupInput() {
      const getPosition = (e) => {
          const evt = e.touches ? e.touches[0] : e;
          return {
              x: evt.clientX,
              y: evt.clientY
          };
      };
      
//When the mouse moves over the page, obtain the position of the mouse
      this.container.addEventListener('mousemove', (e) => {
          const position = getPosition(e);
          //If the mouse position has been recorded before, generate two squiggle animation lines near the current position to create ripples or a sense of trajectory following the mouse movement
          if (this.lastMousePosition) {
              for(let i = 0; i < 2; i++) {
                  this.createSqwigFromMouse(position);
              }
          }
          this.lastMousePosition = position;
      });
      
      // Reset when mouse leaves container
      this.container.addEventListener('mouseleave', () => {
          this.lastMousePosition = null;
      });

      // Touch event support
      this.container.addEventListener('touchmove', (e) => {
          e.preventDefault();
          const position = getPosition(e);
          if (this.lastMousePosition) {
              for(let i = 0; i < 2; i++) {
                  this.createSqwigFromMouse(position);
              }
          }
          this.lastMousePosition = position;
      });

      this.container.addEventListener('touchend', () => {
          this.lastMousePosition = null;
      });
  }

  createSqwigFromMouse(position) {
      if(!this.lastMousePosition) return;
      
      let sections = 4;
      let newDirection = {x: 0, y: 0};
      let xAmount = Math.abs(this.lastMousePosition.x - position.x);
      let yAmount = Math.abs(this.lastMousePosition.y - position.y);

      if(xAmount > yAmount) {
          newDirection.x = this.lastMousePosition.x - position.x < 0 ? 1 : -1;
          sections += Math.round(xAmount/4);
      } else {
          newDirection.y = this.lastMousePosition.y - position.y < 0 ? 1 : -1;
          sections += Math.round(yAmount/4);
      }
      
      let settings = {
          x: this.lastMousePosition.x,
          y: this.lastMousePosition.y,
          directionX: newDirection.x,
          directionY: newDirection.y,
          sections: Math.min(sections, 20)
      };
      
      let newSqwig = new Squiggle(this.svg, settings, 10 + Math.random() * (sections * 1.5));
      this.squiggles.push(newSqwig);
  }

  onResize() {
      this.width = this.container.offsetWidth;
      this.height = this.container.offsetHeight;
      this.svg.setAttribute('width', this.width);
      this.svg.setAttribute('height', this.height);
  }

  tick() {
      let step = this.squiggles.length - 1;
      while(step >= 0) {
          if(this.squiggles[step].state != 'ended') {
              this.squiggles[step].update();
          } else {
              this.squiggles.splice(step, 1);
          }
          --step;
      }
      requestAnimationFrame(() => this.tick());
  }
}

// ask for claude
// Adds a character-by-character typing effect to the desc element
document.addEventListener('DOMContentLoaded', function() {
  // Get description element
  const descElement = document.querySelector('.desc');
  
  if (descElement) {
      //Save original text
      const originalText = descElement.innerText;
      
      // Clear text content
      descElement.innerHTML = '';
      
      // Create a text container and cursor elements
      const textContainer = document.createElement('span');
      const cursor = document.createElement('span');
      cursor.className = 'cursor';
      
      descElement.appendChild(textContainer);
      descElement.appendChild(cursor);
      
      // Add text character by character
      let charIndex = 0;
      const typingSpeed = 50; // Print speed per character (milliseconds)
      
      function typeNextChar() {
          if (charIndex < originalText.length) {
              // Add the next character
              textContainer.innerHTML += originalText.charAt(charIndex);
              charIndex++;
              setTimeout(typeNextChar, typingSpeed);
          } else {
              // After typing, delete the cursor
              setTimeout(() => {
                  cursor.style.display = 'none';
              }, 1000);
          }
      }
      
      // Start typing
      typeNextChar();
  }
});

fetch(`https://api.are.na/v2/channels/${channelSlug}?per=100`, { cache: 'no-store' })
.then((response) => response.json()) 
.then((data) => { 
  // Set channel link
  document.getElementById('channel-link').href = `https://www.are.na/channel/${channelSlug}`;
  
  // combine with claude
  // Classification type
  const categorizedBlocks = {};
  data.contents.reverse().forEach((block) => {
      if (!categorizedBlocks[block.class]) {
          categorizedBlocks[block.class] = [];
      }
      categorizedBlocks[block.class].push(block);
  });
  console.log(232,categorizedBlocks);
  for (const category in categorizedBlocks) {
      const blocks = categorizedBlocks[category];
      const rowElement = document.querySelector('.row');
      blocks.forEach((block) => {
          const newDiv = document.createElement('div');
          newDiv.className = 'block ' + block.class;
          let blockItem = '';
          let categoryId = '';
          


          // links！
          if (block.class === 'Link') {
              categoryId = 'links';
              blockItem = `
                  <div class="show">  <img src="${ block.image?.original?.url || '' }" alt="${ block.title || 'Link' }"></div>
                  <div class="overlay">
                      <p class="title">${block.title || ''}</p>
                      <p class="descption">${block.description || ''}</p>
                      <p class="exten"><a href="${ block.source?.url || '#' }" target="_blank">See the original ↗</a></p>
                  </div>`;


           // Images！
          } else if (block.class === 'Image') {
              categoryId = 'images';
              blockItem = `
                  <div class="descc">${block.description || ''}</div>
                  <div class="info">
                      <div class="name">${block.title || ''}</div>
                      <div class="cont">
                          <img src="${ block.image?.original?.url || '' }" alt="${ block.title || 'Image' }">
                      </div>
                  </div>
                  `;
          } else if (block.attachment && block.attachment.content_type && block.attachment.content_type.includes('pdf')) {
              categoryId = 'pdfs';
              blockItem = `
                  <div class="list"><embed src="${ block.attachment.url }" type="application/pdf" ></div>
                  <div class="name"> <p><a href="${ block.attachment.url }" target="_blank">Download PDF →</a></p></div>
              `;



                   // Audios！
          } else if (block.embed && block.embed.type && block.embed.type.includes('rich')) {
              categoryId = 'audios';
              blockItem = ` <div > 
                      ${ block.embed.html } </div >`; 



                           // Texts！
          } else if (block.class == 'Text') {
              categoryId = 'text';
              blockItem = `${ block.content }`;
          } else if (block.class == 'Media') {
            blockItem = '';
            let embed = block.embed?.type || '';
            console.log(280,embed);
            // Linked video!
            if (embed.includes('video')) {
              blockItem = `
                <div class="content-block">
                <div class="video">
                  <p><em>Video</em></p>
                  ${ block.embed.html }
                  <p><em><a href="${ block.source?.url || '#' }" target="_blank">Watch original ↗</a></em></p>
                </div>
                </div>
                `;
              } else if (embed.includes('rich')) {


            // Linked audio!
              blockItem = `
              <div class="content-block">
              <div class="audio">
                <p><em>Audio</em></p>
                ${ block.embed.html }
                ${block.image?.original?.url ? `<img src="${ block.image.original.url }">` : ''}
                <p><em><a href="${ block.source?.url || '#' }" target="_blank">Listen ↗</a></em></p>
              </div>
              </div>
              `;
            }



          } else if (block.class == 'Attachment') {
            let attachment = block.attachment?.content_type || ''; // Save us some repetition
            
            // Uploaded videos!
            if (attachment.includes('video')) {
              console.log('Attached video: ', block);
              blockItem = `
                <div class="content-block">
                <div class="video">
                  <p><em>Video</em></p>
                  <video controls src="${ block.attachment.url }"></video>
                </div>
                </div>
                `;
            }
        
            // Uploaded PDFs!
            else if (attachment.includes('pdf')) {
              blockItem = `
                <div class="content-block">
                  <div class="image"> 
                    <picture>
                      <source media="(max-width: 428px)" srcset="${ block.image?.thumb?.url || '' }">
                      <source media="(max-width: 640px)" srcset="${ block.image?.large?.url || '' }">
                      <img src="${ block.image?.original?.url || '' }">
                    </picture>
                  </div>
                  <div class="data">
                    <p><em>PDF</em></p>
                    <h2>${ block.title || '' }</h2>
                    <p class="description">${ block.description_html || '' }</p>
                    <p><a href="${ block.source?.url || '#' }" target="_blank">See the original ↗</a></p>
                  </div>
                </div>
                `;
            }
        
            // Uploaded audio!
            else if (attachment.includes('audio')) {
              blockItem = `
                <div>
                  <p><em>Audio</em></p>
                  <audio controls src="${ block.attachment.url }"></audio>
                </div>
                `;
            }
          }
          
          if (blockItem) {
            newDiv.innerHTML = blockItem;
            rowElement.appendChild(newDiv);
          }
      });
  }

  // Make all blocks visible initially
  setTimeout(() => {
    const allBlocks = document.querySelectorAll('.block');
    allBlocks.forEach(block => {
      block.classList.add('visible');
    });
  }, 500);

  // Setup visibility check for scrolling
  function checkVisibility() {
    const blocks = document.querySelectorAll('.block');
    const viewportHeight = window.innerHeight;
    
    blocks.forEach(block => {
      const blockTop = block.getBoundingClientRect().top;
      // Include all blocks, including Media class
      if (blockTop < viewportHeight + 200 && blockTop > -block.offsetHeight) {
        block.classList.add('visible');
      } else {
        block.classList.remove('visible');
      }
    });
  }

  window.addEventListener('scroll', checkVisibility);
  window.addEventListener('resize', () => {
    checkVisibility();
  });

  // Initial check
  checkVisibility();
})



// found it on:https://codepen.io/kevinnewcombe/pen/XMVoKv
// want make it become a navigation bar in my page
var scene = new THREE.Scene();
var viewport, renderer, camera, controls, particleDistance, centerPoint = {};
var transitionDuration = 1000;
var baseURL = '';
var mountainGeometry, mountainParticles;
var loader = new THREE.JSONLoader();
var pointsPlot = new Array();
var geoname;
var mapMarkers = []; // Array to store marker objects
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
  
  // Add instructional text above the map
  const instructionPanel = document.createElement('div');
  instructionPanel.className = 'map-instructions';
  instructionPanel.innerHTML = `
    <div class="instruction-content">
      <h3>EXPLORE CONTENT CATEGORIES</h3>
      <p>Rotate the map to discover content markers. Click any pin to view related content.</p>
    </div>
  `;
  viewport.parentNode.insertBefore(instructionPanel, viewport);

renderer = new THREE.WebGLRenderer();
renderer = new THREE.WebGLRenderer({ antialias: 0, clearAlpha: 0, alpha:true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setClearColor( 0x000000, 0 ); // the default
renderer.shadowMap.enabled = true;
viewport.appendChild(renderer.domElement);
window.addEventListener( 'resize', onWindowResize, false );

scene.fog = new THREE.Fog( 0x111111, 22000, 25000 );

camera = new THREE.PerspectiveCamera(10, WIDTH / HEIGHT, 0.1, 200000);
camera.position.set(0, 10000, -20000 );
scene.add(camera);

controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.autoRotate = true;
createGroundPlane();
createTopLevelButtons();
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
  
  // Update marker positions after terrain is loaded
  updateVisualMarkerPositions(data);
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
  
  // make the mark always face to the camera
  mapMarkers.forEach(markerGroup => {
    markerGroup.children.forEach(child => {
      if (child.userData && child.userData.type === 'label') {
        child.quaternion.copy(camera.quaternion);
      }
    });
  });
  
  renderer.render(scene, camera);
  controls.update();
}

document.addEventListener('DOMContentLoaded',function() {
document.querySelector('select[name="geo"]').onchange=loadGeography;
},false);
const app = new App(document.getElementsByTagName('body')[0]);

"use strict";

const NB_SQUARES_MIN = 20; // number of squares in lRef(geometric mean of canvas width and height)
const NB_SQUARES_MAX = 30;
const WINDOW_WIDTH_DURATION = 20; // in seconds; used for horizontal scrolling speed : time to cross the screen horizontally
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
// ask for GPT and claude
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
canv.style.position = "fixed"; // Hold the viewport in a fixed position
canv.style.top = "0";
canv.style.left = "0";
canv.style.zIndex = "-1"; // Make Canvas lower than text but higher than body::before
/*    canv.setAttribute ('title','click me'); */
} // CANVAS creation
canv.addEventListener("click", mouseClick);
messages = [{ message: "reset" }];
requestAnimationFrame(animate);

// Function to create top level buttons
function createTopLevelButtons() {
  // Clear mapMarkers array (we're not creating visual markers anymore)
  mapMarkers = [];
  
  // Define 5 content type buttons
  const contentTypes = [
    { name: "PDFs", color: "#ff5252" },
    { name: "Images", color: "#4caf50" },
    { name: "Links", color: "#2196f3" },
    { name: "Videos", color: "#ff9800" },
    { name: "Audios", color: "#9c27b0" }
  ];
  
  // Create a container for the buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.id = 'content-type-buttons';
  buttonsContainer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1500;
    pointer-events: none; /* Allow clicks to pass through the container */
  `;
  
  // Define irregular positions for the buttons (percentage-based)
  // Adjust positions to be more centered for better mobile display
  const isMobile = window.innerWidth <= 768;
  const buttonPositions = isMobile ? [
    { top: '20%', left: '30%' },
    { top: '35%', left: '65%' },
    { top: '55%', left: '25%' },
    { top: '45%', left: '50%' },
    { top: '70%', left: '60%' }
  ] : [
    { top: '15%', left: '25%' },
    { top: '30%', left: '70%' },
    { top: '60%', left: '20%' },
    { top: '45%', left: '50%' },
    { top: '75%', left: '65%' }
  ];
  
  // Create a button for each content type
  contentTypes.forEach((contentType, index) => {
    // Create marker container
    const markerContainer = document.createElement('div');
    markerContainer.className = 'map-marker-container';
    markerContainer.style.cssText = `
      position: absolute;
      top: ${buttonPositions[index].top};
      left: ${buttonPositions[index].left};
      transform: translate(-50%, -100%);
      pointer-events: auto;
      cursor: pointer;
      z-index: 1500;
      transition: all 0.3s ease;
    `;
    
    // Create the pin/marker element
    const marker = document.createElement('div');
    marker.className = 'map-marker';
    marker.style.cssText = `
      width: ${isMobile ? '24px' : '30px'};
      height: ${isMobile ? '24px' : '30px'};
      background-color: ${contentType.color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      position: relative;
      animation: marker-bounce 1s ease-in-out infinite alternate;
    `;
    
    // Create inner circle for the marker
    const markerInner = document.createElement('div');
    markerInner.className = 'map-marker-inner';
    markerInner.style.cssText = `
      width: ${isMobile ? '12px' : '15px'};
      height: ${isMobile ? '12px' : '15px'};
      background-color: white;
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;
    
    // Create label for the marker
    const markerLabel = document.createElement('div');
    markerLabel.className = 'map-marker-label';
    markerLabel.textContent = contentType.name;
    markerLabel.style.cssText = `
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: ${isMobile ? '3px 6px' : '4px 8px'};
      border-radius: 4px;
      font-size: ${isMobile ? '10px' : '12px'};
      font-weight: bold;
      white-space: nowrap;
      margin-top: 5px;
      opacity: 0;
      transition: opacity 0.3s ease;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    `;
    
    // Add shadow/base for the marker
    const markerShadow = document.createElement('div');
    markerShadow.className = 'map-marker-shadow';
    markerShadow.style.cssText = `
      width: ${isMobile ? '12px' : '15px'};
      height: 3px;
      background-color: rgba(0, 0, 0, 0.3);
      border-radius: 50%;
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      filter: blur(2px);
      transition: all 0.3s ease;
    `;
    
    // Add hover effects
    markerContainer.addEventListener('mouseover', () => {
      marker.style.transform = 'rotate(-45deg) scale(1.2)';
      markerLabel.style.opacity = '1';
      markerShadow.style.width = isMobile ? '16px' : '20px';
      markerShadow.style.opacity = '0.5';
    });
    
    markerContainer.addEventListener('mouseout', () => {
      marker.style.transform = 'rotate(-45deg) scale(1)';
      markerLabel.style.opacity = '0';
      markerShadow.style.width = isMobile ? '12px' : '15px';
      markerShadow.style.opacity = '0.3';
    });
    
    // Add click event
    markerContainer.addEventListener('click', () => {
      showContentByType(null, index);
    });
    
    // Assemble the marker
    marker.appendChild(markerInner);
    markerContainer.appendChild(marker);
    markerContainer.appendChild(markerLabel);
    markerContainer.appendChild(markerShadow);
    buttonsContainer.appendChild(markerContainer);
  });
  
  // Add CSS for animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes marker-bounce {
      0% {
        transform: rotate(-45deg) translateY(0);
      }
      100% {
        transform: rotate(-45deg) translateY(-5px);
      }
    }
    
    .map-marker-container:nth-child(1) .map-marker {
      animation-delay: 0s;
    }
    .map-marker-container:nth-child(2) .map-marker {
      animation-delay: 0.1s;
    }
    .map-marker-container:nth-child(3) .map-marker {
      animation-delay: 0.2s;
    }
    .map-marker-container:nth-child(4) .map-marker {
      animation-delay: 0.3s;
    }
    .map-marker-container:nth-child(5) .map-marker {
      animation-delay: 0.4s;
    }
    
    /* Responsive styles for map markers */
    @media (max-width: 768px) {
      .map-marker-container {
        transform: translate(-50%, -100%) scale(0.9);
      }
    }
  `;
  document.head.appendChild(style);
  
  // Add buttons to the viewport (map card)
  const viewport = document.getElementById('viewport');
  if (viewport) {
    viewport.style.position = 'relative'; // Ensure the container has position relative
    viewport.appendChild(buttonsContainer);
  } else {
    // Fallback to body if viewport not found
    document.body.appendChild(buttonsContainer);
  }
  
  // Add lights to the scene instead of markers
  createVisualMapMarkers(contentTypes);
  
  // Add window resize listener to adjust marker positions
  window.addEventListener('resize', () => {
    // Remove existing buttons
    const existingButtons = document.getElementById('content-type-buttons');
    if (existingButtons) {
      existingButtons.remove();
    }
    // Recreate buttons with new positions
    createTopLevelButtons();
  });
}

// Create visual markers on the map (no interaction)
function createVisualMapMarkers(contentTypes) {
  // Define positions that correspond to the button positions
  const markerPositions = [
    { x: -800, z: -400, height: 400 },  // PDFs
    { x: 700, z: 600, height: 300 },    // Images
    { x: -600, z: 900, height: 350 },   // Links
    { x: 0, z: 0, height: 500 },        // Videos
    { x: 600, z: -500, height: 450 }    // Audios
  ];
  
  // We're not creating visual markers anymore, but we'll keep the function
  // for compatibility with the rest of the code
  
  // Add lights at marker positions to highlight areas without showing spheres
  markerPositions.forEach((pos, index) => {
    // Add a light at each position to create a subtle highlight
    const pointLight = new THREE.PointLight(contentTypes[index].color.replace('#', '0x'), 0.8, 800);
    pointLight.position.set(pos.x, pos.height + 150, pos.z);
    scene.add(pointLight);
  });
}

// Function to update marker positions after terrain is loaded
function updateVisualMarkerPositions(data) {
  // This function would update the positions of markers based on terrain data
  // Implementation depends on how you want to position markers on the terrain
}

// Function to display content for a specific content type
function showContentByType(contentType, buttonIndex) {
  const sidePanel = document.getElementById('side-panel');
  if (!sidePanel) {
    createSidePanel();
  }
  
  // Show the side panel
  document.getElementById('side-panel').style.right = '0';
  
  // Define content titles for messages
  const contentTitles = ["PDF Documents", "Image Gallery", "Web Links", "Video Content", "Audio Content"];
  
  // Get all blocks based on the button index (not content type)
  let contentBlocks = [];
  
  // Get all blocks (excluding the first two special blocks)
  const allBlocks = document.querySelectorAll('.block:not(.b1):not(.b2)');
  
  switch(buttonIndex) {
    case 0: // PDFs
      contentBlocks = Array.from(allBlocks).filter(block => {
        return (block.classList.contains('Attachment') && 
                (block.innerHTML.includes('pdf') || 
                 block.innerHTML.includes('application/pdf'))) ||
               (block.innerHTML.includes('embed') && 
                block.innerHTML.includes('pdf'));
      });
      break;
      
    case 1: // Images
      contentBlocks = Array.from(allBlocks).filter(block => {
        return block.classList.contains('Image') || 
               (block.classList.contains('Link') && block.querySelector('img') && 
                !block.innerHTML.includes('video') && 
                !block.innerHTML.includes('audio'));
      });
      break;
      
    case 2: // Links
      contentBlocks = Array.from(allBlocks).filter(block => {
        return block.classList.contains('Link') && 
               block.querySelector('.exten a');
      });
      break;
      
    case 3: // Videos
      contentBlocks = Array.from(allBlocks).filter(block => {
        return (block.classList.contains('Media') && 
                (block.querySelector('.video') || 
                 (block.innerHTML.includes('embed') && 
                  block.innerHTML.includes('video')))) ||
               (block.classList.contains('Attachment') && 
                block.innerHTML.includes('video'));
      });
      break;
      
    case 4: // Audios
      contentBlocks = Array.from(allBlocks).filter(block => {
        return (block.classList.contains('Media') && 
                (block.querySelector('.audio') || 
                 (block.innerHTML.includes('embed') && 
                  block.innerHTML.includes('audio')))) ||
               (block.classList.contains('Attachment') && 
                block.innerHTML.includes('audio'));
      });
      break;
  }
  
  // Clear existing content in the side panel
  const contentContainer = document.getElementById('side-panel-content');
  contentContainer.innerHTML = '';
  
  // Create cards container
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'cards';
  contentContainer.appendChild(cardsContainer);
  
  // If no content blocks found, show a message and close button only
  if (contentBlocks.length === 0) {
    // Just show the close button with a message
    const noContentMessage = document.createElement('div');
    noContentMessage.className = 'no-content-message';
    noContentMessage.textContent = `No ${contentTitles[buttonIndex]} available`;
    noContentMessage.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 24px;
      text-align: center;
    `;
    contentContainer.appendChild(noContentMessage);
  } else {
    // Add swipe hint only if there are multiple cards
    if (contentBlocks.length > 1) {
      const swipeHint = document.createElement('div');
      swipeHint.className = 'swipe-hint';
      swipeHint.innerHTML = '→';
      contentContainer.appendChild(swipeHint);
      
      // Listen for scroll to hide swipe hint
      cardsContainer.addEventListener('scroll', () => {
        if (cardsContainer.scrollLeft > 50) {
          swipeHint.style.opacity = '0';
        }
      });
    }
    
    // Add content blocks to cards
    Array.from(contentBlocks).forEach((block, index) => {
      // Create card
      const card = document.createElement('div');
      card.className = 'card';
      
      // Check if we're on mobile
      const isMobile = window.innerWidth <= 768;
      
      // Create card inner container
      const cardInner = document.createElement('div');
      cardInner.className = 'card__inner';
      
      // On mobile, make card height auto to avoid scrolling
      if (isMobile) {
        card.style.height = 'auto';
        card.style.minHeight = '90vh';
        cardInner.style.position = 'relative';
        cardInner.style.height = 'auto';
        cardInner.style.minHeight = '90vh';
      }
      
      // Create content container
      const cardContent = document.createElement('div');
      cardContent.className = 'card__content';
      
      // Clone block content
      const clonedBlock = block.cloneNode(true);
      clonedBlock.style.display = 'block';
      clonedBlock.style.width = '100%';
      clonedBlock.style.height = 'auto';
      clonedBlock.style.minHeight = 'auto';
      clonedBlock.style.marginTop = '0';
      clonedBlock.style.paddingTop = '0';
      
      // Optimize media elements for card display
      const images = clonedBlock.querySelectorAll('img');
      images.forEach(img => {
        img.style.maxWidth = '100%';
        img.style.maxHeight = isMobile ? '50vh' : '70vh';
        img.style.objectFit = 'contain';
        img.style.margin = '0 auto';
      });
      
      const videos = clonedBlock.querySelectorAll('video, iframe');
      videos.forEach(video => {
        video.style.width = '100%';
        video.style.height = 'auto';
        video.style.maxHeight = isMobile ? '50vh' : '70vh';
        video.style.margin = '0 auto';
      });
      
      // Special handling for different content types
      if (buttonIndex === 0) { // PDFs
        // Ensure PDF embeds are properly sized
        const pdfEmbeds = clonedBlock.querySelectorAll('embed[type="application/pdf"]');
        pdfEmbeds.forEach(embed => {
          embed.style.width = '100%';
          embed.style.height = isMobile ? '50vh' : '70vh';
          embed.style.display = 'block';
          embed.style.margin = '0 auto';
          // Add attributes to improve PDF viewing
          embed.setAttribute('toolbar', '1');
          embed.setAttribute('navpanes', '1');
          embed.setAttribute('scrollbar', '1');
          embed.setAttribute('statusbar', '1');
        });
        
        // Also handle PDF in list divs
        const pdfLists = clonedBlock.querySelectorAll('.list');
        pdfLists.forEach(list => {
          list.style.width = '100%';
          list.style.height = isMobile ? '50vh' : '70vh';
          const embedInList = list.querySelector('embed');
          if (embedInList) {
            embedInList.style.width = '100%';
            embedInList.style.height = '100%';
            // Add attributes to improve PDF viewing
            embedInList.setAttribute('toolbar', '1');
            embedInList.setAttribute('navpanes', '1');
            embedInList.setAttribute('scrollbar', '1');
            embedInList.setAttribute('statusbar', '1');
          }
        });
        
        // Improve PDF download links
        const pdfLinks = clonedBlock.querySelectorAll('.name a');
        pdfLinks.forEach(link => {
          link.style.display = 'inline-block';
          link.style.margin = isMobile ? '5px auto' : '10px auto';
          link.style.padding = isMobile ? '6px 12px' : '8px 16px';
          link.style.backgroundColor = '#2196f3';
          link.style.color = 'white';
          link.style.textDecoration = 'none';
          link.style.borderRadius = '4px';
          link.style.fontWeight = 'bold';
          link.style.textAlign = 'center';
          link.style.fontSize = isMobile ? '14px' : '16px';
          link.target = '_blank';
        });
        
        // Ensure the name div is properly styled
        const nameDiv = clonedBlock.querySelector('.name');
        if (nameDiv) {
          nameDiv.style.width = '100%';
          nameDiv.style.textAlign = 'center';
          nameDiv.style.marginTop = '10px';
          
          // Add a "View in Full Screen" button for small screens
          const pdfUrl = nameDiv.querySelector('a')?.getAttribute('href');
          if (pdfUrl) {
            const viewFullScreenBtn = document.createElement('a');
            viewFullScreenBtn.href = pdfUrl;
            viewFullScreenBtn.target = '_blank';
            viewFullScreenBtn.textContent = 'View in Full Screen';
            viewFullScreenBtn.style.cssText = `
              display: inline-block;
              margin: ${isMobile ? '5px auto' : '10px auto'};
              padding: ${isMobile ? '6px 12px' : '8px 16px'};
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              font-weight: bold;
              text-align: center;
              margin-left: 10px;
              font-size: ${isMobile ? '14px' : '16px'};
            `;
            nameDiv.appendChild(viewFullScreenBtn);
          }
        }
      } else if (buttonIndex === 2) { // Links
        // Enhance link display
        const linkElements = clonedBlock.querySelectorAll('a');
        linkElements.forEach(link => {
          link.style.color = '#2196f3';
          link.style.textDecoration = 'none';
          link.style.fontWeight = 'bold';
          link.style.display = 'inline-block';
          link.style.marginTop = '10px';
          link.target = '_blank';
        });
      }
      
      // Add to DOM
      cardContent.appendChild(clonedBlock);
      cardInner.appendChild(cardContent);
      card.appendChild(cardInner);
      cardsContainer.appendChild(card);
    });
    
    // Adjust card width based on number of cards
    const cards = cardsContainer.querySelectorAll('.card');
    if (cards.length === 1) {
      // If only one card, make it full width
      cards[0].style.width = '100%';
      cards[0].style.margin = '0';
    } else {
      // Multiple cards, use the existing styling
      Array.from(cards).forEach(card => {
        card.style.width = '90%';
      });
      cards[0].style.marginLeft = '5%';
      cards[cards.length - 1].style.marginRight = '5%';
    }
  }
  
  // Setup card stack effect only if there are multiple cards
  if (contentBlocks.length > 1) {
    setupCardStackEffect();
  }
}

// Create side panel structure
function createSidePanel() {
  // Create side panel if it doesn't exist
  if (!document.getElementById('side-panel')) {
    const sidePanel = document.createElement('div');
    sidePanel.id = 'side-panel';
    document.body.appendChild(sidePanel);
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.id = 'close-panel';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', closeSidePanel);
    sidePanel.appendChild(closeButton);
    
    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.id = 'side-panel-content';
    sidePanel.appendChild(contentContainer);
    
    // Create cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards';
    contentContainer.appendChild(cardsContainer);
    
    // Add swipe hint
    const swipeHint = document.createElement('div');
    swipeHint.className = 'swipe-hint';
    swipeHint.innerHTML = '→';
    contentContainer.appendChild(swipeHint);
    
    // Hide swipe hint after 5 seconds
    setTimeout(() => {
      swipeHint.style.display = 'none';
    }, 5000);
  }
  
  // When opening the side panel, ensure it's properly positioned
  const sidePanel = document.getElementById('side-panel');
  if (sidePanel) {
    // Show the panel
    sidePanel.style.right = '0';
    
    // Ensure cards are visible without scrolling
    setTimeout(() => {
      const cards = document.querySelectorAll('.card');
      cards.forEach((card, index) => {
        // Reset any transforms that might be affecting visibility
        card.style.transform = 'translateY(0)';
        card.style.paddingTop = index === 0 ? '0' : '10px';
        
        const cardInner = card.querySelector('.card__inner');
        if (cardInner) {
          cardInner.style.transform = 'scale(1)';
          cardInner.style.filter = 'brightness(1)';
        }
      });
      
      // Scroll to the first card to ensure it's visible
      const cardsContainer = document.querySelector('.cards');
      if (cardsContainer) {
        cardsContainer.scrollLeft = 0;
      }
    }, 100); // Small delay to ensure DOM is updated
  }
}

// Function to close the side panel
function closeSidePanel() {
  const sidePanel = document.getElementById('side-panel');
  if (sidePanel) {
    sidePanel.style.right = '-100vw';
  }
}

// Setup card stack effect
function setupCardStackEffect() {
  const cardsContainer = document.querySelector('.cards');
  if (!cardsContainer) return;
  
  const cards = document.querySelectorAll('.card');
  if (!cards.length) return;
  
  // Set container properties
  cardsContainer.style.setProperty('--cards-count', cards.length);
  cardsContainer.style.setProperty('--card-height', `${cards[0].clientHeight}px`);
  
  // Make sure first card is fully visible without scrolling
  if (cards[0]) {
    const firstCardInner = cards[0].querySelector('.card__inner');
    if (firstCardInner) {
      firstCardInner.style.transform = 'scale(1)';
      firstCardInner.style.filter = 'brightness(1)';
    }
    cards[0].style.paddingTop = '0';
  }
  
  // Initialize other cards with minimal padding
  Array.from(cards).forEach((card, index) => {
    if (index === 0) return; // Skip first card as we already set it
    
    // Use minimal padding to avoid pushing content down
    const offsetTop = 10;
    card.style.paddingTop = `${offsetTop}px`;
    
    const cardInner = card.querySelector('.card__inner');
    if (cardInner) {
      // Ensure card is visible
      cardInner.style.transform = 'scale(1)';
      cardInner.style.filter = 'brightness(1)';
    }
  });
}

// Create a scroll observer for card animations
function createScrollObserver(element, container, callback) {
  if (!element || !container || !callback) return;
  
  const getIntersectionRatio = () => {
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Calculate the visible portion ratio
    const visibleWidth = Math.min(elementRect.right, containerRect.right) - 
                          Math.max(elementRect.left, containerRect.left);
    const ratio = Math.max(0, Math.min(1, visibleWidth / elementRect.width));
    
    return ratio;
  };
  
  const onScroll = () => {
    requestAnimationFrame(() => {
      const ratio = getIntersectionRatio();
      callback(ratio);
    });
  };
  
  container.addEventListener('scroll', onScroll);
  window.addEventListener('resize', onScroll);
  
  // Initial call
  onScroll();
  
  // Return cleanup function
  return () => {
    container.removeEventListener('scroll', onScroll);
    window.addEventListener('resize', onScroll);
  };
}