/**
 * @file mp1: Draw a badge and add animation
 * @author ml26 (Mengyuan Li) 
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The WebGL buffer holding the triangle */
var vertexPositionBuffer;

/** @global The WebGL buffer holding the vertex colors */
var vertexColorBuffer;

/** @global The angle of rotation around the x axis */
var defAngle = 0;

/** @global The array that contains the current vertices' coordinates */
var triangleVertices = [];

/** @global pMatrix */
var pMatrix = mat4.create();

/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  gl.useProgram(shaderProgram);
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
}

/**
 * Populate buffers with data
 */
function loadVertices() {
    vertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    triangleVertices = [
        44.0,  50.0,  0.0,
        84.0,  120.0, 0.0,
        44.0,  120.0, 0.0,
        
        44.0,  50.0,  0.0,
        170.0, 120.0, 0.0,
        84.0,  120.0, 0.0,
        
        44.0,  50.0,  0.0,
        314.0, 120.0, 0.0,
        170.0, 120.0, 0.0,
        
        44.0,  50.0,  0.0,
        440.0, 50.0,  0.0,
        314.0, 120.0, 0.0,
        
        440.0, 50.0,  0.0,
        400.0, 120.0, 0.0,
        314.0, 120.0, 0.0,
        
        440.0, 50.0,  0.0,
        440.0, 120.0, 0.0,
        400.0, 120.0, 0.0,
        
        84.0,  120.0, 0.0,
        170.0, 120.0, 0.0,
        84.0,  327.0, 0.0,
        
        170.0, 120.0, 0.0,
        170.0, 175.0, 0.0,
        84.0,  327.0, 0.0,
        
        170.0, 175.0, 0.0,
        170.0, 272.0, 0.0,
        84.0,  327.0, 0.0,
        
        170.0, 175.0, 0.0,
        200.0, 175.0, 0.0,
        170.0, 272.0, 0.0,
        
        200.0, 175.0, 0.0,
        200.0, 272.0, 0.0,
        170.0, 272.0, 0.0,
        
        170.0, 272.0, 0.0,
        170.0, 327.0, 0.0,
        84.0,  327.0, 0.0,
        
        400.0, 120.0, 0.0,
        400.0, 327.0, 0.0,
        314.0, 120.0, 0.0,
        
        314.0, 120.0, 0.0,
        400.0, 327.0, 0.0,
        314.0, 175.0, 0.0,
        
        314.0, 175.0, 0.0,
        400.0, 327.0, 0.0,
        314.0, 272.0, 0.0,
        
        284.0, 175.0, 0.0,
        314.0, 175.0, 0.0,
        314.0, 272.0, 0.0,
        
        284.0, 175.0, 0.0,
        314.0, 272.0, 0.0,
        284.0, 272.0, 0.0,
        
        314.0, 272.0, 0.0,
        400.0, 327.0, 0.0,
        314.0, 327.0, 0.0,
        
        84.0,  343.0, 0.0,
        112.0, 388.0, 0.0,
        84.0,  371.0, 0.0,
        
        84.0,  343.0, 0.0,
        112.0, 343.0, 0.0,
        112.0, 388.0, 0.0,
        
        142.0, 343.0, 0.0,
        170.0, 424.0, 0.0,
        142.0, 406.0, 0.0,
        
        142.0, 343.0, 0.0,
        170.0, 343.0, 0.0,
        170.0, 424.0, 0.0,
        
        200.0, 343.0, 0.0,
        228.0, 461.0, 0.0,
        200.0, 438.0, 0.0,
        
        200.0, 343.0, 0.0,
        228.0, 343.0, 0.0,
        228.0, 461.0, 0.0,
        
        256.0, 343.0, 0.0,
        284.0, 343.0, 0.0,
        256.0, 461.0, 0.0,
        
        284.0, 343.0, 0.0,
        284.0, 438.0, 0.0,
        256.0, 461.0, 0.0,
        
        314.0, 343.0, 0.0,
        342.0, 343.0, 0.0,
        314.0, 424.0, 0.0,
        
        342.0, 343.0, 0.0,
        342.0, 406.0, 0.0,
        314.0, 424.0, 0.0,
        
        372.0, 343.0, 0.0,
        400.0, 343.0, 0.0,
        372.0, 388.0, 0.0,
        
        400.0, 343.0, 0.0,
        400.0, 371.0, 0.0,
        372.0, 388.0, 0.0
];


gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);
vertexPositionBuffer.itemSize = 3;
vertexPositionBuffer.numberOfItems = 90;
}


/**
 * Populate buffers with color data
 */
function loadColors() {
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  var colors = [];
    
    
    // Define the RGB value of blue color
    var r1 = 22/256;
    var g1 = 40/256;
    var b1 = 76/256;
    
    // Define the RGB value of orange color
    var r2 = 232/256;
    var g2 = 74/256;
    var b2 = 54/256;
    
    // Define the alpha value
    var alpha = 1.0;
    
    // Define the number of blue points and the number of orange points
    var numBlue = 54;
    var numOrange = 36;
    
    // Fill the color array
    for(var i=0;i<numBlue;i++){
        colors.push(r1);
        colors.push(g1);
        colors.push(b1);
        colors.push(alpha);
    }
    
    for(var i=0; i<numOrange;i++){
        colors.push(r2);
        colors.push(g2);
        colors.push(b2);
        colors.push(alpha);
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    vertexColorBuffer.itemSize = 4;
    vertexColorBuffer.numItems = 90;
}

/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  
    
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
}

/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders(); 
  loadVertices();
  loadColors();
  gl.clearColor(1.0, 1.0, 1.0, 0.0);
  gl.enable(gl.DEPTH_TEST);
  mat4.ortho(pMatrix, 0, 503, 498, 0, -1, 1);
  //gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
  tick();
}


/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function animate() { 
   // Define movement angle, the angle increases everytime animate function is called
   defAngle= defAngle+0.04;
    
   vertexPositionBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
   
   // Add animation on part of the graphic
   var [...curTriangleVertices] = triangleVertices;
   for(var i = 54;i < 90;i=i+3) {
       console.log(curTriangleVertices[i])
       curTriangleVertices[i] = curTriangleVertices[i] + 6.0 * Math.cos(defAngle);
   }
    
   // Add translation animination for the whole graphic
   var translateMatrix = mat4.create();
   var translateVec = vec3.fromValues(-0.3*Math.cos(defAngle), -0.3*Math.cos(defAngle), 0.0);
   mat4.fromTranslation(translateMatrix, translateVec);
   console.log(pMatrix)
   mat4.multiply(translateMatrix, translateMatrix, pMatrix);
    
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(curTriangleVertices), gl.STATIC_DRAW);
   vertexPositionBuffer.itemSize = 3;
   vertexPositionBuffer.numberOfItems = 90;
   gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, translateMatrix);
}

/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}


