/**
 * MP2C
 * Author: Mengyuan Li (ml26)
 */
var gl;
var canvas;

var shaderProgram;

// Create a place to store the texture coords for the mesh
var terrainTCoordBuffer;

// Create a place to store terrain geometry
var terrainVertexBuffer;

// Create a place to store the triangles
var terrainTriIndexBuffer;

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

//Create Normal matrix
var nMatrix = mat3.create();


var mvMatrixStack = [];

// Define the parameters to create the terrain square(grid)
var maxX = 3.0;
var minX = -3.0;
var maxY = 3.0;
var minY = -3.0;
// Define the grid size, here we want to create 1024 * 1024 grids
var div = 1024;

// View parameters
// Location of the camera in world coordinates
var eyePt = vec3.fromValues(0.0, 0.0, 0.0);
// Direction of the view in world coordinates
var viewDir = vec3.fromValues(0.0, 0.0, -1.0);
// Up vector for view matrix creation
var up = vec3.fromValues(0.0, 1.0, 0.0);
// Location of a point along viewDir in world coordinates
var viewPt = vec3.fromValues(0.0, 0.0, 0.0);

//light parameters
// Light position in view coordinates
var lightPosition = [-1, 2, -8];
// Ambient light color/intensity for Blinn-Phong reflection
var lAmbient = [0, 0, 0];
// Diffuse light color/intensity for Blinn-Phong reflection
var lDiffuse = [1, 1, 1];
// Specular light color/intensity for Blinn-Phong reflection
var lSpecular = [0.5, 0.5, 0.5];

// Mateiral parameters
// Ambient material color/intensity for Blinn-Phong reflection
var kAmbient = [1.0, 1.0, 1.0];
// Diffuse materila color/ intensity for Blinn-Phong reflection
var kTerrainDiffuse = [205.0/255.0,163.0/255.0,63.0/255.0];
// [205.0/255.0,163.0/255.0,63.0/255.0];
// Specular material color/intensity for Blinn-Phong reflection
var kSpecular = [0.1, 0.1, 0.1];
// Shininess exponent for Blinn-Phong reflection
var shininess = 23;

// Contro whether to use Blinn-Phong or use pre-baked to color the terrain
//var blinnPhong = 0;


// Create a place to store the texture
var colorImage;
var colorTexture;
var heightImage;
var heightTexture;

// For animation 
var then =0;
var modelXRotationRadians = degToRad(-70);
var modelYRotationRadians = degToRad(0);


/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

/**
 * Sends normal matrix to shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}


/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();

}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

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

  gl.useProgram(shaderProgram);

  
  shaderProgram.texCoordAttribute = gl.getAttribLocation(shaderProgram, "aTexCoord");
  console.log("Tex coord attrib: ", shaderProgram.texCoordAttribute);
  gl.enableVertexAttribArray(shaderProgram.texCoordAttribute);
    
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  console.log("Vertex attrib: ", shaderProgram.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");    
  shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");  
  shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
  shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
  shaderProgram.uniformBlinnPhongLoc = gl.getUniformLocation(shaderProgram, "uBlinnPhong");
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha,a,d,s) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends whether to use Blinn-Phong information to the shader
 * @param {Float32} p: if p = 0, use pre-baked; if p = 1, use Blinn-Phong
 */
 function setBlinnPhongUniforms(p) {
  gl.uniform1i(shaderProgram.uniformBlinnPhongLoc, p);
 }



/**
 * Draw a cube based on buffers.
 */
function drawTerrain(){

  // Draw the cube by binding the array buffer to the cube's vertices
  // array, setting attributes, and pushing it to GL.

  gl.bindBuffer(gl.ARRAY_BUFFER, terrainVertexBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

  // Set the texture coordinates attribute for the vertices.

  gl.bindBuffer(gl.ARRAY_BUFFER, terrainTCoordBuffer);
  gl.vertexAttribPointer(shaderProgram.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);

  // Specify the texture to map onto the faces.

  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, colorTexture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uColorSampler"), 4);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, heightTexture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uHeightSampler"), 0);

  // Draw the cube.

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainTriIndexBuffer);
  setMatrixUniforms();
  var ext = gl.getExtension('OES_element_index_uint');
  gl.drawElements(gl.TRIANGLES, terrainTriIndexBuffer.numItems, gl.UNSIGNED_INT, 0);
}

/**
 * Draw call that applies matrix transformations to cube
 */
function draw() { 
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so we create a lookat point in that direction
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookatt matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix, eyePt, viewPt, up);
 
    //Draw 
    mvPushMatrix();
    vec3.set(transformVec,0.0,0.0,-10.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateX(mvMatrix,mvMatrix,modelXRotationRadians);
    mat4.rotateY(mvMatrix,mvMatrix,modelYRotationRadians);
    setMatrixUniforms();
    setLightUniforms(lightPosition, lAmbient, lDiffuse, lSpecular);
    setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular); 

    // Check to see whether to use Blinn-Phong or to use pre-baked (texture mapping) to color the terrain
    if (document.getElementById("ON").checked){
      setBlinnPhongUniforms(1);
      drawTerrain();
    } else {
      setBlinnPhongUniforms(0);
      drawTerrain();
    }

    mvPopMatrix();
  
}

/**
 * Animation to be called from tick. Updates global rotation values.
 */
function animate() {
    if (then==0)
    {
        then = Date.now();
    }
    else
    {
        now=Date.now();
        // Convert to seconds
        now *= 0.001;
        // Subtract the previous time from the current time
        var deltaTime = now - then;
        // Remember the current time for the next frame.
        then = now;

        //Animate the rotation
        modelXRotationRadians += 1.2 * deltaTime;
        modelYRotationRadians += 0.7 * deltaTime;  
    }
}

/**
 * Creates texture for application to cube.
 */
function setupTextures() {
 colorTexture = gl.createTexture();
 //gl.bindTexture(gl.TEXTURE_2D, cubeTexture);

  colorImage = new Image();
  colorImage.onload = function() { handleTextureLoaded(colorImage, colorTexture);}
  colorImage.src = "colorHMBIG.png";
  //"colorHMBIG.png";
  

   heightTexture = gl.createTexture();
   //gl.bindTexture(gl.TEXTURE_2D, heightTexture);

   heightImage = new Image();
   heightImage.onload = function() { handleTextureLoaded(heightImage, heightTexture); }
   heightImage.src = "heightHMBIG.png";
   // https://courses.engr.illinois.edu/cs418/fa2018/mps/heightHMBIG.png
   //"heightHMBIG.png"
}

/**
 * @param {number} value Value to determine whether it is a power of 2
 * @return {boolean} Boolean of whether value is a power of 2
 */
function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

/**
 * Texture handling. Generates mipmap and sets texture parameters.
 * @param {Object} image Image for cube application
 * @param {Object} texture Texture for cube application
 */
function handleTextureLoaded(image, texture) {
  console.log("handleTextureLoaded, image = " + image);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  // Check if the image is a power of 2 in both dimensions.
  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
     // Yes, it's a power of 2. Generate mips.
     gl.generateMipmap(gl.TEXTURE_2D);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
     console.log("Loaded power of 2 texture");
  } else {
     // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     console.log("Loaded non-power of 2 texture");
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

/**
 * Generate terrain vertex position 
 * Here we just set x and y coordinates, and left z coordinates to be zero
 */
 function generateTerrainVertex() {
  console.log("generating terrain vertex");
  var vertices = [];
  var x_amount = (maxX - minX) / div;
  var y_amount = (maxY - minY) / div;

  //console.log("x_amount", x_amount);
  //console.log("y_amount", y_amount);
  //console.log(3 * x_amount + minX);

  for (var i = 0; i <= div; i++) { //y
    for (var j = 0; j<= div; j++) {//x
      vertices.push(j * x_amount + minX);
      vertices.push(minY + i * y_amount);
      vertices.push(0.0);
    }
  }
  return vertices;
 }

 /**
  * Generate terrain texture coordinates according to x and y coordinates of vertices
  */
  function generateTextureCoords() {
    var coords = [];
    for (var i = 0; i <= div; i++) { //y
      for (var j = 0; j <= div; j++){//x
        coords.push(j / div);
        coords.push(i / div);

      }

    }
    return coords;
  }

  /**
  * Generate triangles
  */
  function generateTriangles() {
    var indices = [];
    for (var i = 0; i < div; i++) {
      for(var j = 0; j < div; j++){
        var vid = i * (div + 1) + j;

        indices.push(vid);
        indices.push(vid + div + 1);
        indices.push(vid + div + 2);

        indices.push(vid);
        indices.push(vid + 1);
        indices.push(vid + div + 2);
      }
    }
    return indices;
  }

/**
 * Set up buffers for the terrain and populate buffers with data
 */
function setupBuffers() {

  // Create a buffer for the terrain's vertices.

  terrainVertexBuffer = gl.createBuffer();

  // Select the terrainVertexBuffer as the one to apply vertex
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, terrainVertexBuffer);
  var vertices = generateTerrainVertex();
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  
  // Map texture into terrain
  terrainTCoordBuffer = gl.createBuffer();
  var coords = generateTextureCoords();
  gl.bindBuffer(gl.ARRAY_BUFFER, terrainTCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords),
                gl.STATIC_DRAW);

  // Build the element array buffer; this specifies the indices
  // into the vertex array for each face's vertices.

  terrainTriIndexBuffer = gl.createBuffer();
  var indices = generateTriangles();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainTriIndexBuffer);
  terrainTriIndexBuffer.numItems = indices.length;


  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint32Array(indices), gl.STATIC_DRAW);
}


/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
    
  setupShaders();
  setupBuffers();
  setupTextures();
  tick();
}

/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    //animate();
}
