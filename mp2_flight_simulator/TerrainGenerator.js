
/**
 * @file MP2A
 * @author Mengyuan Li (ml26)
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global The angle of rotation around the y axis */
var viewRot = 10;

/** @global A glmatrix vector to use for transformations */
var transformVec = vec3.create();    

// Initialize the vector....
vec3.set(transformVec,0.0,0.0,-2.0);

/** @global An object holding the geometry for a 3D terrain */
var myTerrain;


// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0, 0.1, 0.0);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0, 0.0, -1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0, 1.0, 0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues();

// Quaterenion variables for camera tracking, roll, pitch and yaw rotation
var quatCamera = quat.create();
var quatRoll = quat.create();
var quatPitch = quat.create();
var quatYaw = quat.create();

// Vector of unit length for roll, ptch and yaw axis
var vecRollAxis = vec3.fromValues(0.0, 0.0, -1.0);
var vecPitchAxis = vec3.fromValues(-1.0, 0.0, 0.0);
var vecYawAxis = vec3.fromValues(0.0, 1.0, 0.0);

// Create a view vector to store the updated view vector after each rotation
var tempView = vec3.create();

// Create keyboard flag to activate the event
var rollLeft = false;
var rollRight = false;
var pitchUp = false;
var pitchDown = false;
var yawLeft = false;
var yawRight = false;
var speedUp = false;
var speedDown = false;

// start time from 0 in animiarion function
var lastTime = 0;

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [0, 1, 0];
var lightPosition4 = vec4.fromValues(0.0, 1.0, 6.0, 1.0);
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0,0,0];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1,1,1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[0,0,0]; // original [0, 0, 0]

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0,1.0,1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [205.0/255.0,163.0/255.0,63.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [0.0,0.0,0.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 23;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0,0.0,0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0,1.0,1.0];




//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
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

//----------------------------------------------------------------------------------
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

//----------------------------------------------------------------------------------
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

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

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
  shaderProgram.uniformOnFogLoc = gl.getUniformLocation(shaderProgram, "onFog");
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha,a,d,s,t) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
  gl.uniform1i(shaderProgram.uniformOnFogLoc, t);
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

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    myTerrain = new Terrain(32, -3.0, 3.0, -3.0, 3.0);
    myTerrain.loadBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), 
                     gl.viewportWidth / gl.viewportHeight,
                     0.1, 200.0); // 200.0

    // Perform quaternion rotation on up vector
    var tempUp = vec3.create();
    vec3.transformQuat(tempUp, up, quatCamera);

    // Perform quaternion rotation on view vector
    //var tempView = vec3.create();
    vec3.transformQuat(tempView, viewDir, quatCamera);

    // Create a new lookat point after the rotation
    vec3.add(viewPt, eyePt, tempView);

    // Generate lookat martix from the new parameters
    mat4.lookAt(mvMatrix, eyePt, viewPt, tempUp);

    // We want to look down -z, so create a lookat point in that direction    
    //vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    //mat4.lookAt(mvMatrix,eyePt,viewPt,up);    

    //Draw Terrain
    mvPushMatrix();
    vec3.set(transformVec,0.0,-0.25,-2.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateY(mvMatrix, mvMatrix, degToRad(viewRot));
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    setMatrixUniforms();

    // Update the light source location
    var tempLight = vec3.create();
    tempLight = vec4.transformMat4(tempLight, lightPosition4, mvMatrix);
    lightPosition = [tempLight[0], tempLight[1], tempLight[2]];
    
    setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);
    
    if (document.getElementById("ON").checked){
        setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular, 1); 
        myTerrain.drawTriangles();
    } else {
        setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular, 0); 
        myTerrain.drawTriangles();
    }
    mvPopMatrix();

  
}

//----------------------------------------------------------------------------------
/**
 * Perform rotation and moving
 */
 function animate() {
    // Set the normal speed
    var speed = 0.06
    // Set the present time 
    var timeNow = new Date().getTime();
    var elapsed = 0;
    if (lastTime !== 0) {
      elapsed = timeNow - lastTime;
    }
    lastTime = timeNow;

    if (pitchDown) {
      // Update the pitch quaternion axix after the pitch operation
      quat.setAxisAngle(quatPitch, vecPitchAxis, degToRad(15.0 * (elapsed / 1000)));
      // Calculate new camera quaternion
      quat.mul(quatCamera, quatCamera, quatPitch);
    }
    if (pitchUp) {
      // Update the pitch quaternion axix after the pitch operation
      quat.setAxisAngle(quatPitch, vecPitchAxis, -degToRad(15.0 * (elapsed / 1000)));
      // Calculate new camera quaternion
      quat.mul(quatCamera, quatCamera, quatPitch);
    }
    if (rollLeft) {
      // Update the pitch quaternion axix after the pitch operation
      quat.setAxisAngle(quatRoll, vecRollAxis, -degToRad(15.0 * (elapsed / 1000)));
      // Calculate new camera quaternion
      quat.mul(quatCamera, quatCamera, quatRoll);
    }
    if (rollRight) {
      // Update the pitch quaternion axix after the pitch operation
      quat.setAxisAngle(quatRoll, vecRollAxis, degToRad(15.0 * (elapsed / 1000)));
      // Calculate new camera quaternion
      quat.mul(quatCamera, quatCamera, quatRoll);
    }
    if (yawLeft) {
      // Update the pitch quaternion axix after the pitch operation
      quat.setAxisAngle(quatYaw, vecYawAxis, degToRad(15.0 * (elapsed / 1000)));
      // Calculate new camera quaternion
      quat.mul(quatCamera, quatCamera, quatYaw);
    }
    if (yawRight) {
      // Update the pitch quaternion axix after the pitch operation
      quat.setAxisAngle(quatYaw, vecYawAxis, -degToRad(15.0 * (elapsed / 1000)));
      // Calculate new camera quaternion
      quat.mul(quatCamera, quatCamera, quatYaw);
    }
    if (speedUp) {
      speed += 0.2;
    }
    if (speedDown) {
      speed -= 0.03
    }

    // move camera forward every tick
    vec3.scale(tempView, tempView, speed * (elapsed / 1000));
    vec3.add(eyePt, eyePt, tempView);

 }

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {


  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(135.0/255.0, 206.0/255.0, 235.0/255.0, 1.0); // Set background color to opaque black
  // midnight blue: 25.0/255.0, 25.0/255.0, 112.0/255.0, 0.9
  // (135.0/255.0, 206.0/255.0, 235.0/255.0, 1.0
  gl.enable(gl.DEPTH_TEST);

  // Add keyboard event handler
      $(function () {
        $(document).keydown(function (event) {
            event.preventDefault();
            if (event.which === 37) { //left_arrow 
                rollLeft = true;
            }
            else if (event.which === 38) { //up_arrow 
                pitchUp = true;
            }
            else if (event.which === 39) { // right_arrow
                rollRight = true;
            }
            else if (event.which === 40) { // down_arrow 
                pitchDown = true;
            }
            else if (event.which === 65) { // yaw left "A"
                yawLeft = true;
            }
            else if (event.which === 68) { // yaw right "D"
                yawRight = true;
            }
            else if (event.which == 87) { // speed up
                 speedUp = true;
            }
            else if (event.which == 83) { // speed down
                 speedDown = true;
            }
            else if (event.which === 81) { // q button
                window.location.reload();
            }
        });

        $(document).keyup(function (event) {
            event.preventDefault();
            if (event.which === 37) { //left_arrow 
                rollLeft = false;
            }
            else if (event.which === 38) { //up_arrow 
                pitchUp = false;
            }
            else if (event.which === 39) { // right_arrow
                rollRight = false;
            }
            else if (event.which === 40) { // down_arrow 
                pitchDown = false;
            }
            else if (event.which === 65) { // yaw left "A"
                yawLeft = false;
            }
            else if (event.which === 68) { // yaw right "D"
                yawRight = false;
            }
            else if (event.which == 87) { // speed up
                 speedUp = false;
            }
            else if (event.which == 83) { // speed down
                 speedDown = false;
            }
        });

        tick();

    });
}

//----------------------------------------------------------------------------------
/**
 * Keeping drawing frames....
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}

