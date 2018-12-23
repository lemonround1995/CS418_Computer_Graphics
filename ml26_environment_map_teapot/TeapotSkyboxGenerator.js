/**
 * @file MP3
 * @author Mengyuan Li (ml26)
 */

/** @global The WebGL context*/
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global The shaderprogram for skybox and teapot */
var shaderProgramSkybox;
var shaderProgramTeapot;

/** @global The number of images for texture mapping */
var imageLoadCounter = 0;

/** @global The parameters for skybox*/
var skyboxVertexBuffer;
var skyboxFaceBuffer;
var skyboxCubeMap;
var skyboxVertex = [];
var skyboxFace = [];

/** @global Define places to store images for texture mapping */
var skyboxImage0;
var skyboxImage1;
var skyboxImage2;
var skyboxImage3;
var skyboxImage4;
var skyboxImage5;
var skyboxImages = [skyboxImage0, skyboxImage1, skyboxImage2, skyboxImage3, skyboxImage4, skyboxImage5];


/** @global Quaternion variables for camera */
var quatCamera = quat.create();


/** @global The ModelView matrix */
var mvMatrix = mat4.create();

/** @global The projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

// Create the view matrix
var vMatrix = mat4.create();

/** @global The inverse matirx of mvMatrix, and this will be used for fixing the light position */
var inverseViewTransform = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

// Rotation parameters
//var lastTime = 0;
/** @global The angle for teapot rotation left/right */
var teapotRotationValue = 0.0;
/** @global The angle for teapot flip up/down */
var teapotFlipValue = 0.0;
/** @global The angle for world(skybox) rotation left/right */
var worldRotationValue = 0.0;
/** @global The angle for world(skybox) flip up/down */
var worldFlipValue = 0.0;

// View parameters
/** @global Location of the camera in WORLD coordinates */
var eyePt = vec3.fromValues(0.0, 0.0, 0.0);
/** @global Direction of the view in WORLD coordinates */
var viewDir = vec3.fromValues(0.0, 0.0, -1);
/** @global Up vector for view matrix creation in WORLD coordinates */
var up = vec3.fromValues(0.0, 1.0, 0.0);
/** @global Location of a point along viewDir in WORLD coordinates */
var viewPt = vec3.create();

// Light parameters
/** @global Light position in VIEW coordinates */
// var lightPosEye = vec4.fromValues(0.0, 0.0, 0.0, -5.0);
//var lightPosEye = vec4.fromValues(0.25, 0.25, -4.0, 1.0);
var lightPosEye = [1.0, 1.0, 1.0];

// Set up light parameters
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = vec3.fromValues(0.0, 0.0, 0.0);
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = vec3.fromValues(1.0, 1.0, 1.0);
/** @global Specular light color/intensity for Phong reflection */
var lSpecular = vec3.fromValues(0.5, 0.5, 0.5);

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0, 1.0, 1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kDiffuse = [192.0/255.0, 192.0/255.0, 192.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [0.5, 0.5, 0.5];
/** @global Shininess exponent for Phong reflection */
var shininess = 100;

/** @global An object holding the geometry for a 3D mesh */
var myMesh;

//------------------------------------------------------------------------------------------------
/**
 * Initialized webgl context by verifying whether WebGL rendering is supported or not.
 * This code is from lecture sample.
 *
 * @param {gl.canvas} canvas A canvas object from web browser
 * @return {gl} context A webgl context
 */
function createGLContext(canvas) {
    var names = ["webgl", "experimental-webgl"];
    var context = null;
    for (var i = 0; i < names.length; i++) {
        try {
            context = canvas.getContext(names[i]);
        } catch (e) {
        }
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

//------------------------------------------------------------------------------------------------
/**
 * Load shader data from the provided id using DOM. This code is from lecture sample.
 *
 * @param {String} id An id of target object
 * @return shader The shader data
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
        if (currentChild.nodeType === 3) { // 3 corresponds to TEXT_NODE
            shaderSource += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
    }

    var shader;
    if (shaderScript.type === "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type === "x-shader/x-vertex") {
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

//------------------------------------------------------------------------------------------------
/**
 * Load shader data from the provided id using DOM and return the linked shader program.
 * Modified from base code form lecture sample.
 *
 * @param {String} vertexShaderID the string of vertex shader id
 * @param {String} fragmentShaderID the string of vertex shader id
 * @return {gl.shaderProgram} the shader program with requested vertex and fragment shader
 */
function setupShaders(vertexShaderID, fragmentShaderID) {
    var shaderProgram;
    var fragmentShader = loadShaderFromDOM(fragmentShaderID);
    var vertexShader = loadShaderFromDOM(vertexShaderID);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        throw "Link error in program:  " + gl.getProgramInfoLog(shaderProgram);
    }

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    // gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    // Attach normal for lighting calculation
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    // gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    // gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");

    // Attach lightning related variables
    shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
    shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
    shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
    shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");

    shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");    
    shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");  
    shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
    shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");

    shaderProgram.skyboxSampler = gl.getUniformLocation(shaderProgram, "uSkyboxSampler");
    shaderProgram.inverseViewTransform = gl.getUniformLocation(shaderProgram, "uInverseViewTransform");
    shaderProgram.uniformIfReflectLoc = gl.getUniformLocation(shaderProgram, "uIfReflect");

    
    return shaderProgram;

}

//------------------------------------------------------------------------------------------------
/**
 * Upload mvMatrix data to shader program.
 *
 * @param {gl.shaderProgram} shaderProgram the target shader program to upload light data
 */
function uploadModelViewMatrixToShader(shaderProgram) {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//------------------------------------------------------------------------------------------------
/**
 * Upload pMatrix data to shader program.
 *
 * @param {gl.shaderProgram} shaderProgram the target shader program to upload light data
 */
function uploadProjectionMatrixToShader(shaderProgram) {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform,
        false, pMatrix);
}

//------------------------------------------------------------------------------------------------
/**
 * Upload inverseViewTransform matrix data to shader program.
 *
 * @param {gl.shaderProgram} shaderProgram the target shader program to upload light data
 */
function uploadinverseViewTransformMatrixToShader(shaderProgram) {
    gl.uniformMatrix3fv(shaderProgram.inverseViewTransform, false, inverseViewTransform);
}

//------------------------------------------------------------------------------------------------
/**
 * Upload nMatrix data to shader program.
 *
 * @param {gl.shaderProgram} shaderProgram the target shader program to upload light data
 */
function uploadNormalMatrixToShader(shaderProgram) {
    mat3.fromMat4(nMatrix, mvMatrix);
    mat3.transpose(nMatrix, nMatrix);
    mat3.invert(nMatrix, nMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//------------------------------------------------------------------------------------------------
/**
 *  This function will upload required matrix to the shaderprogram.
 *  Based on sample code on lecture website.
 *
 *  @Param {gl.ShaderProgram} the shader program to upload uniform maxtrix
 */
function setMatrixUniforms(shaderProgram) {
    uploadModelViewMatrixToShader(shaderProgram);
    uploadProjectionMatrixToShader(shaderProgram);
    uploadNormalMatrixToShader(shaderProgram);
    setLightUniforms(shaderProgram, lightPosEye, lAmbient, lDiffuse, lSpecular);
    //setLightUniforms(shaderProgram, kAmbient, kDiffuse, kSpecular);
}

//------------------------------------------------------------------------------------------------
/**
 * Upload lightning related data to shader program.
 * This code is identical to lecture sample code.
 *
 * @param {gl.shaderProgram} shaderProgram the target shader program to upload light data
 * @param {vec3} loc Vector of light source location
 * @param {vec3} a Vector of ambient lightning color
 * @param {vec3} d Vector of diffuse lightning color
 * @param {vec3} s Vector of specular lightning color
 */
function setLightUniforms(shaderProgram, loc, a, d, s) {
    gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
    gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
    gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
    gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//------------------------------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 * @param {int} t 1: Turn on reflection 0: Turn on shader
 */
function setMaterialUniforms(shaderProgram, alpha,a,d,s) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
  //gl.uniform1i(shaderProgram.uniformIfReflectLoc, t);
}

//------------------------------------------------------------------------------------------------
/**
 * This function provides mvMatrix stack pop.
 */
function mvPopMatrix() {
    if (mvMatrixStack.length === 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//------------------------------------------------------------------------------------------------
/**
 * This function provides mvMatrix stack push.
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

//------------------------------------------------------------------------------------------------
/**
 * Convert degree value to radian. This code is from lecture sample.
 *
 * @param {number} degrees A degree value to be converted to radian
 * @return {number} a degree value in radian
 */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}



//-------------------------------------------------------------------------
/**
 * Asynchronously read a server-side text file
 * @param {String} url The path of the obj file, from which we read the teapot data
 */
function asyncGetTextFile(url) {
  console.log("Getting text file");
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = () => resolve(xhr.responseText);
    xhr.onerror = () => reject(xhr.statusText);
    xhr.send();
    console.log("Made promise");  
  });
}

//----------------------------------------------------------------------------------
/**
 * Build teapot model from teapot.obj file
 @param {String} filename The file name of the obj file
 */
function setupTeapotBuffer(filename) {
    myMesh = new TriMesh();
    myPromise = asyncGetTextFile(filename);
    // We define what to do when the promise is resolved with the then() call,
    // and what to do when the promise is rejected with the catch() call
    myPromise.then((retrievedText) => {
        myMesh.loadFromOBJ(retrievedText);
        console.log("Yay! got the file");
    })
    .catch(
        // Log the rejection reason
       (reason) => {
            console.log('Handle rejected promise ('+reason+') here.');
        });
}

//----------------------------------------------------------------------------------
/**
 * This function will bind buffer data and draw the teapot.
 */
function drawTeapot() {

    // Translate transformation : Move the teapot to a proper position (the center of our view)
    mat4.translate(mvMatrix, mvMatrix, [0.1, -1.0, -5.0]);
    // Rotation transformation: Right/Left rotation on the teapot
    // The teapotRotationValue and teapotFlipValue will be controlled by the keyboard
    mat4.rotateY(mvMatrix, mvMatrix, degToRad(teapotRotationValue));
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(teapotFlipValue));
    // Scale transformatin: Scale the teapot to a porper size
    mat4.scale(mvMatrix, mvMatrix, [0.4, 0.4, 0.4]);
    // Calculate the nMatrix according to mvMatrix
    mat3.normalFromMat4(nMatrix, mvMatrix);
    //mat4.multiply(mvMatrix, vMatrix, mvMatrix);

    // Set texture for the teapot to make refelction effects (This is for MP3B)
    setTexture(shaderProgramTeapot);
    // Assign values to the uniforms in shader
    setMatrixUniforms(shaderProgramTeapot);
    setMaterialUniforms(shaderProgramTeapot, shininess, kAmbient, kDiffuse, kSpecular);
    
    // Make sure all the teapot data has been readed before we draw the triangles
    if(myMesh.loaded() == true){
        // Choose whether to use reflection on teapot or just use a solid color
        if (document.getElementById("ON").checked){
             gl.uniform1i(shaderProgramTeapot.uniformIfReflectLoc, 1);
        } else{
             gl.uniform1i(shaderProgramTeapot.uniformIfReflectLoc, 0);
        }
        //console.log("after loading teapot data", myMesh.nBuffer.length);
        myMesh.drawTriangles(shaderProgramTeapot);
    }
}

//----------------------------------------------------------------------------------
/**
 * This function will bind buffer data and draw the skybox cube.
 */
function drawSkybox() {

    // Translate transformation: Put the skybox into a proper place
    mat4.translate(mvMatrix, mvMatrix, [0.0, 0.0, -1.0]);

    // Rotation transformation: Do Left/Right rotation or Up/Down flip rotation on the skybox
    mat4.rotateY(mvMatrix, mvMatrix, degToRad(worldRotationValue));
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(worldFlipValue));
    //mat4.multiply(mvMatrix, vMatrix, mvMatrix);

    // Set texture for the skybox
    setTexture(shaderProgramSkybox);

    // Bind the skybox buffer, read the vertex data and mesh indices from the buffer, and draw the skybox
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxVertexBuffer);
    gl.vertexAttribPointer(shaderProgramSkybox.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    setMatrixUniforms(shaderProgramSkybox);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxFaceBuffer);
    gl.drawElements(gl.TRIANGLES, skyboxFace.length, gl.UNSIGNED_SHORT, 0);

}

//----------------------------------------------------------------------------------
/**
 * Setup the necessary buffer for Skybox drawing
 */
function setupSkyboxBuffer() {

    // Set skybox vertices (skybox is a cube)
    skyboxVertex = [
        // Front face
        -1.0, -1.0, 1.0,
        1.0, -1.0, 1.0,
        1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0,

        // Back face
        -1.0, -1.0, -1.0,
        -1.0, 1.0, -1.0,
        1.0, 1.0, -1.0,
        1.0, -1.0, -1.0,

        // Top face
        -1.0, 1.0, -1.0,
        -1.0, 1.0, 1.0,
        1.0, 1.0, 1.0,
        1.0, 1.0, -1.0,

        // Bottom face
        -1.0, -1.0, -1.0,
        1.0, -1.0, -1.0,
        1.0, -1.0, 1.0,
        -1.0, -1.0, 1.0,

        // Right face
        1.0, -1.0, -1.0,
        1.0, 1.0, -1.0,
        1.0, 1.0, 1.0,
        1.0, -1.0, 1.0,

        // Left face
        -1.0, -1.0, -1.0,
        -1.0, -1.0, 1.0,
        -1.0, 1.0, 1.0,
        -1.0, 1.0, -1.0
    ];

    skyboxVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(skyboxVertex), gl.STATIC_DRAW);

    // Set skybox mesh indices
    skyboxFace = [
        0.0, 1.0, 2.0, 0.0, 2.0, 3.0,    // front
        4.0, 5.0, 6.0, 4.0, 6.0, 7.0,    // back
        8.0, 9.0, 10.0, 8.0, 10.0, 11.0,   // top
        12.0, 13.0, 14.0, 12.0, 14.0, 15.0,   // bottom
        16.0, 17.0, 18.0, 16.0, 18.0, 19.0,   // right
        20.0, 21.0, 22.0, 20.0, 22.0, 23.0    // left
    ];

    skyboxFaceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxFaceBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(skyboxFace), gl.STATIC_DRAW);

}


//----------------------------------------------------------------------------------
/**
 * Draw the teapot and the skybox 
 */
function draw() {
    // var transformVec = vec3.create();

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), 
                     gl.viewportWidth / gl.viewportHeight,
                     0.1, 500.0);

    var newUp = vec3.create();
    var newViewDir = vec3.create();


    // Perform quaternion rotation on up vector
    vec3.transformQuat(newUp, up, quatCamera);

    // Perform quaternion rotation on view vector
    vec3.transformQuat(newViewDir, viewDir, quatCamera);

    // Create a new lookat point from quaternion-rotated parameters
    vec3.add(viewPt, eyePt, newViewDir);

    // Generate lookat matrix from new parameters
    //mat4.lookAt(mvMatrix, eyePt, viewPt, newUp);
    mat4.lookAt(mvMatrix, eyePt, viewPt, newUp);
    //mat4.lookAt(vMatrix, eyePt, viewPt, newUp);

    // Make sure we have loaded 6 images for texture mapping before we draw the skybox and the teapot
    if (imageLoadCounter == 6) {

        //draw skybox
        gl.useProgram(shaderProgramSkybox);
        gl.depthMask(false);

        mvPushMatrix();
        gl.enableVertexAttribArray(shaderProgramSkybox.vertexPositionAttribute);
        drawSkybox();
        gl.disableVertexAttribArray(shaderProgramSkybox.vertexPositionAttribute);
        mat3.fromMat4(inverseViewTransform, mvMatrix);
        mvPopMatrix();


        //draw Teapot
        mat3.invert(inverseViewTransform, inverseViewTransform);
        mat3.normalFromMat4(nMatrix, mvMatrix);
        //lightPosEye = inverseViewTransform * lightPosEye;
        gl.useProgram(shaderProgramTeapot);
        uploadinverseViewTransformMatrixToShader(shaderProgramTeapot);
        gl.depthMask(true);
        gl.enableVertexAttribArray(shaderProgramTeapot.vertexPositionAttribute);
        gl.enableVertexAttribArray(shaderProgramTeapot.vertexNormalAttribute);
        mvPushMatrix();
        drawTeapot();
        //mat3.fromMat4(inverseViewTransform, mvMatrix);
        mvPopMatrix();
        //mat3.invert(inverseViewTransform, inverseViewTransform);
        
        gl.disableVertexAttribArray(shaderProgramTeapot.vertexPositionAttribute);
        gl.disableVertexAttribArray(shaderProgramTeapot.vertexNormalAttribute);
    }
}

//-------------------------------------------------------------------------
/**
 * Asynchronously read a Image file
 * @param {String} url The path of the image file
 * @param {Number} face The number of which face will use the relevant image for texture mapping
 */
function asyncGetImageFile(url, face) {
  console.log("Getting image");
  return new Promise((resolve, reject) => {
    skyboxImages[face] = new Image();
    skyboxImages[face].onload = () => resolve({url, status: 'ok'});
    skyboxImages[face].onerror = () => reject({url, status: 'error'});
    skyboxImages[face].src = url
    console.log("Made promise");  
  });
}

//----------------------------------------------------------------------------------
/**
 * Setup a promise to load a texture
 * @param {String} filename The filename of the image file
 * @param {Number} face The number of which face will use the relevant image for texture mapping
 */
function setupPromise(filename, face) {
    myPromise = asyncGetImageFile(filename, face);
    // We define what to do when the promise is resolved with the then() call,
    // and what to do when the promise is rejected with the catch() call
    //texturesLoaded
    myPromise.then((status) => {
        handleTextureLoaded(skyboxImages[face], face);
        console.log("Yay! got the file");
    })
    .catch(
        // Log the rejection reason
       (reason) => {
            console.log('Handle rejected promise ('+reason+') here.');
        });
}

//----------------------------------------------------------------------------------
/**
 * Creates textures for application to cube.
 */
function setupTextures() {

  skyboxCubeMap = gl.createTexture();
  setupPromise("image/pos-z.jpg", 0);
  setupPromise("image/neg-z.jpg", 1);
  setupPromise("image/pos-y.jpg", 2);
  setupPromise("image/neg-y.jpg", 3);
  setupPromise("image/pos-x.jpg", 4);
  setupPromise("image/neg-x.jpg", 5);

}
//----------------------------------------------------------------------------------
/**
 * Texture handling. Generates mipmap and sets texture parameters.
 * @param {Object} image Image for cube application
 * @param {Number} face Which face of the skyBoxCubeMap to add texture to
 */

function handleTextureLoaded(image, face) {

  console.log("handleTextureLoaded, image = " + image);
  // Count the loaded textures
  imageLoadCounter++;
  
  // Bind the cube map
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxCubeMap);
  // Check which face we have to fill
  if (face == 0) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  } else if (face == 1) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  } else if (face == 2) {
   gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  } else if (face == 3) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  } else if (face == 4) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  } else if (face == 5) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }

  // Clamping
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Filtering
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

}

/**
 * This function will load the texture data for shader program.
 *
 * @param {gl.shaderProgram} shaderProgram to load the texture data
 */
function setTexture(shaderProgram) {

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxCubeMap);
    gl.uniform1i(shaderProgram.skyboxSampler, 0);

}


//----------------------------------------------------------------------------------
/**
 *  the first function to be called when page loaded. It will load canvas element from web browser
 and initialized the required WebGL setup then called the tick function to draw and animate world.
 */
function startup() {

    //importTeapotData();
    //calculateNormalTeapot();

    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    shaderProgramSkybox = setupShaders("shader-vs-skybox", "shader-fs-skybox");
    shaderProgramTeapot = setupShaders("shader-vs-teapot", "shader-fs-teapot");

    gl.useProgram(shaderProgramSkybox);
    //mat4.perspective(pMatrix, degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
    //setMatrixUniforms(shaderProgramSkybox);
    setupTextures();
    setupSkyboxBuffer();

    gl.useProgram(shaderProgramTeapot);
    // mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
    //setMatrixUniforms(shaderProgramTeapot);
    setupTeapotBuffer("teapot.obj");
    //myMesh.generateNormals();
    //console.log("after loading teapot data", myMesh.vBuffer.length);
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    //setupKeyboardEvent();
    tick();
}

/**
 *  helper function which was provided from external library. It provided each frame information
 before the rendering engine draw the image. So, we can modify the shader information before
 rendering each frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    //animate();
}

//----------------------------------------------------------------------------------
//Code to handle user interaction
var currentlyPressedKeys = {};

function handleKeyDown(event) {
        //console.log("Key down ", event.key, " code ", event.code);
        currentlyPressedKeys[event.key] = true;

          if (currentlyPressedKeys["ArrowLeft"]) { // Make teapot do left rotation
            event.preventDefault();
            teapotRotationValue += 5;
         } else if (currentlyPressedKeys["ArrowRight"]) { // Make teapot do right rotation
            event.preventDefault();
            teapotRotationValue -= 5;
         } else if (currentlyPressedKeys["ArrowUp"]) { // Make teapot flip up
            event.preventDefault();
            teapotFlipValue -= 5;
         } else if (currentlyPressedKeys["ArrowDown"]) { // Make teapot flip down
            event.preventDefault();
            teapotFlipValue += 5;
         }
    
        if (currentlyPressedKeys["a"]){ // Make the world/skybox do left rotation
            //event.preventDefault();
            worldRotationValue += 2;
            teapotRotationValue += 2;
        } else if (currentlyPressedKeys["d"]){ // Make the world/skybox do right rotation
            //event.preventDefault();
            worldRotationValue -= 2;
            teapotRotationValue -= 2;
        } else if (currentlyPressedKeys["w"]) {// Make the world/skybox flip up
            //event.preventDefault();
            worldFlipValue += 2;
            teapotFlipValue += 2;
        } else if (currentlyPressedKeys["s"]) { // Make the world/skybox flip down
            //event.preventDefault();
            worldFlipValue -= 2;
            teapotFlipValue -= 2;

        }
}

function handleKeyUp(event) {
        //console.log("Key up ", event.key, " code ", event.code);
        currentlyPressedKeys[event.key] = false;
}









