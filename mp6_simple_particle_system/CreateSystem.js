/**
 * @file MP4
 * @author Mengyuan Li (ml26)
 */

var gl;
var canvas;

var shaderProgram;
var vertexShader;
var fragmentShader;

/** @global A variable stores the present time */
var now = Date.now();
/** @global A variable stores the end time of last timestep*/
var then = 0;

/** @global A buffer stores position of spheres in a particle system */
var vertexPositionBuffer;
/** @gloabl A buffer stores vertices used to constitue an individual sphere */
var sphereVertexPositionBuffer;
/** @global A buffer stores normals of each sphere */
var sphereVertexNormalBuffer;

var eyePt = vec3.fromValues(0.0, 0.0, 20.0);
var viewDir = vec3.fromValues(0.0, 0.0, -1.0);
var up = vec3.fromValues(0.0, 1.0, 0.0);
var viewPt = vec3.fromValues(0.0, 0.0, 0.0);

var nMatrix = mat3.create();
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var mvMatrixStack = [];

/** @global An object used to store events from the keyboard **/
var keys = {};

/** @global An variable representing current particle system (an object of particle system class) */
var system;

/**
 * Create a GL context given an HTML canvas element
 * @param {any} canvas HTML canvas element to create a GL context out of 
 * @returns GL context created
 */
function createGLContext (canvas) {
  var names = ['webgl', 'experimental-webgl'];
  var context = null;
  for (var i = 0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch (e) { }
    if (context) {
      break
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    window.alert('Failed to create WebGL context!');
  }
  return context;
}

/**
 * Given the CSS id of a shader element in HTML, buffer the string program from the HTML
 * @param {any} id Element id to scrape from
 * @returns Shader loaded from the DOM
 */
function loadShaderFromDOM (id) {
  var shaderScript = document.getElementById(id);

  // If we don't find an element with the specified id
  // we do an early exit
  if (!shaderScript) {
    return null;
  }

  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = '';
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType === 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  var shader;
  if (shaderScript.type === 'x-shader/x-fragment') {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type === 'x-shader/x-vertex') {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    window.alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

/**
 * Setup shaders and create the program to use in the application 
 */
function setupShaders () {
  vertexShader = loadShaderFromDOM('shader-vs');
  fragmentShader = loadShaderFromDOM('shader-fs');

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    window.alert('Failed to setup shaders');
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, 'aVertexNormal');
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, 'uMVMatrix');
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, 'uPMatrix');
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, 'uNMatrix');

  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, 'uLightPosition');
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, 'uAmbientLightColor');
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, 'uDiffuseLightColor');
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, 'uSpecularLightColor');

  shaderProgram.uniformAmbientMatColorLoc = gl.getUniformLocation(shaderProgram, 'uAmbientMaterialColor');
  shaderProgram.uniformDiffuseMatColorLoc = gl.getUniformLocation(shaderProgram, 'uDiffuseMaterialColor');
  shaderProgram.uniformSpecularMatColorLoc = gl.getUniformLocation(shaderProgram, 'uSpecularMaterialColor');
}

/**
 * Instantiate the sphere buffers to be used later in rendering code
 */
function setupSphereBuffers () {
  var sphereVertex = [];
  var sphereNormals = [];

  var numT = sphereFromSubdivision(6, sphereVertex, sphereNormals);


  sphereVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereVertex), gl.STATIC_DRAW);

  sphereVertexPositionBuffer.itemSize = 3;
  sphereVertexPositionBuffer.numItems = numT * 3;
 

 
  sphereVertexNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals), gl.STATIC_DRAW);
  sphereVertexNormalBuffer.itemSize = 3;
  sphereVertexNormalBuffer.numItems = numT * 3;

}


/**
 * Draw a sphere using the information currently in the buffers
 */
function drawSphere () {
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Bind normal buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, sphereVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);
}

/**
 * Upload mvMatrix to the shader
 */
function uploadModelViewMatrixToShader () {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * Upload pMatrix to the shader
 */
function uploadProjectionMatrixToShader () {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

/**
 * Upload nMatrix to the shader
 */
function uploadNormalMatrixToShader () {
  mat3.fromMat4(nMatrix, mvMatrix);
  mat3.transpose(nMatrix, nMatrix);
  mat3.invert(nMatrix, nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

/**
 * Push the current mvMatrix onto the mvMatrix stack
 */
function mvPushMatrix () {
  var copy = mat4.clone(mvMatrix);
  mvMatrixStack.push(copy);
}

/**
 * Pop the top mvMatrix from the mvMatrix stack
 */
function mvPopMatrix () {
  if (mvMatrixStack.length === 0) {
    throw Error('Invalid popMatrix!');
  }

  mvMatrix = mvMatrixStack.pop();
}

/**
 * Set matrix uniform variables in the shader
 */
function setMatrixUniforms () {
  uploadModelViewMatrixToShader();
  uploadNormalMatrixToShader();
  uploadProjectionMatrixToShader();
}

/**
 * Given an angle in degrees, convert the angle to radians
 *
 * @param {any} degrees Degrees to convert to radians
 * @returns degrees converted to radians
 */
function degToRad (degrees) {
  return degrees * Math.PI / 180;
}



/**
 * Given information about the light, upload the light to the program to use in rendering
 *
 * @param {any} location vec3 location of the light
 * @param {any} ambient vec3 ambient light color
 * @param {any} diffuse vec3 diffuse light color
 * @param {any} specular vec3 specular light color
 */
function uploadLightsToShader (location, ambient, diffuse, specular) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, location);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, ambient);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, diffuse);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, specular);
}

/**
 * Upload the given information about lighting the current material
 *
 * @param {any} ambient vec3 ambient light reflectivity
 * @param {any} diffuse vec3 diffuse light reflectivity
 * @param {any} specular vec3 specular light reflectivity
 */
function uploadMaterialToShader (ambient, diffuse, specular) {
  gl.uniform3fv(shaderProgram.uniformAmbientMatColorLoc, ambient);
  gl.uniform3fv(shaderProgram.uniformDiffuseMatColorLoc, diffuse);
  gl.uniform3fv(shaderProgram.uniformSpecularMatColorLoc, specular);
}

/**
 * Set up buffers to be used by the rendering program
 */
function setupBuffers () {
  setupSphereBuffers();
}

/**
 * Draw each particle system scene
 */

 function draw() {
 	  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
 	  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      //var transformVec = vec3.create();
      //vec3.set(transformVec, 5.0, 5.0, 5.0);

      var lAmbient = vec3.fromValues(1.0, 1.0, 1.0);
  	  var lDiffuse = vec3.fromValues(1.0, 1.0, 1.0);
  	  var lSpecular = vec3.fromValues(1.0, 1.0, 1.0);

  	  mat4.perspective(pMatrix, degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

  	  system.sphereList.forEach(sphere => {
  	  	vec3.add(viewPt, eyePt, viewDir);
  	  	mat4.lookAt(mvMatrix, eyePt, viewPt, up);

  	  	var lightPosEye4 = vec4.fromValues(-10.0, 40.0, -10.0, 1.0);
    	lightPosEye4 = vec4.transformMat4(lightPosEye4, lightPosEye4, mvMatrix);
    	var lightPosEye = vec3.fromValues(lightPosEye4[0], lightPosEye4[1], lightPosEye4[2]);

    	var ka = sphere.color;
    	var kd = sphere.color;
    	var ks = sphere.color;

    	mat4.scale(mvMatrix, mvMatrix, vec3.fromValues(sphere.radius, sphere.radius, sphere.radius));

    	mat4.translate(mvMatrix, mvMatrix, sphere.position);

    	uploadLightsToShader(lightPosEye, lAmbient, lDiffuse, lSpecular);
    	uploadMaterialToShader(ka, kd, ks);
    	setMatrixUniforms();
    	drawSphere();

  	  })
  	}

  	 

  	  function handleKeyDown(event) {
  	  	keys[event.keyCode] = true;
  	  }

  	  function handleKeyUp (event) {
  	  	if(event.keyCode == 65){
  	  		system.addSphere();
  	  	}
  	  	if(event.keyCode == 82){
  	  		system.resetSphere();
  	  	}
  	  }

  	  function animate() {
  	  	if (then === 0) {
  	  		then = Date.now();
  	  	} else {
  	  		now = Date.now();

            // convert to seconds
  	  		now *= 0.001

  	  		system.tick(now - then);

  	  		then = now
  	  	}
  	  }

  	  function startup() {
  	  	canvas = document.getElementById('canvas');
  		gl = createGLContext(canvas);

  		system = new ParticleSystem();

  		setupShaders();
  		setupBuffers();

  		gl.clearColor(0.0, 0.0, 0.0, 1.0);
  		gl.enable(gl.DEPTH_TEST);
  		tick();
  	  }

  	  function tick() {
  	  	requestAnimFrame(tick);
  	  	animate();
  	  	draw();
  	  }
 

