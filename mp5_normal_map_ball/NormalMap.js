/**
 * @file MP3C
 * @author Mengyuan Li (ml26)
 */

 var gl;
 var canvas;
 var shaderProgram;

 
 var sphereVertexPositionBuffer;
 var sphereVertexNormalBuffer;
 var sphereTangentBuffer;
 var sphereBitangentBuffer;
 var sphereUVBuffer;

 // Define the number of triangles
 var numT;

 
 var normtex;
 var normImage;

 var nMatrix = mat3.create();
 var mvMatrix = mat4.create();
 var pMatrix = mat4.create();
 var mvMatrixStack = [];

 var angle = 0;
 var scale = vec3.fromValues(1.5, 1.5, 1.5);
 

 // View parameters
var eyePt = vec3.fromValues(0.0,0.0,5.0);               
var viewDir = vec3.fromValues(0.0,0.0,-1.0);           
var up = vec3.fromValues(0.0,1.0,0.0);                 
var viewPt = vec3.fromValues(0.0,0.0,0.0);             


//Light parameters
var lightPosition = [1.0, 1.0, 1.0];
var lAmbient = [0,5, 0.5, 0.5];
var lDiffuse = [1, 1, 1];
var lSpecular =[0.5, 0.5, 0.5];

//Material parameters
var kAmbient = [1.0,1.0,1.0];
var kTerrainDiffuse = [192.0/255.0, 192.0/255.0, 192.0/255.0];
var kSpecular = [0.0,0.0,0.0];
var shininess = 23;

//sphereFromSubdivision

//----------------------------------------------------------------------------------
/**
* Creates a context for WebGL.
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
*/
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);     
  
  
  if (!shaderScript) {
    return null;
  }
  
 
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { 
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
* creates variables for our shaders and attribute
*/

function setupShaders() {
  vertexShader = loadShaderFromDOM("shader_sphere-vs");
  fragmentShader = loadShaderFromDOM("shader_sphere-fs");         
                                                           
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
    
  shaderProgram.vertexTangentAttribute = gl.getAttribLocation(shaderProgram, "aVertexTangent");
  gl.enableVertexAttribArray(shaderProgram.vertexTangentAttribute);
    
    shaderProgram.vertexBitangentAttribute = gl.getAttribLocation(shaderProgram, "aVertexBitangent");
  gl.enableVertexAttribArray(shaderProgram.vertexBitangentAttribute);
  
  shaderProgram.vertexTexCoordAttribute = gl.getAttribLocation(shaderProgram, "aVertexTextureCoords");
  gl.enableVertexAttribArray(shaderProgram.vertexTexCoordAttribute);
    
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
    
}

//----------------------------------------------------------------------------------
/**
 * Sends mv matrix to the sphere's vertex shader.
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Sends projection matrix to the sphere's vertex shader.
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}


//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the sphere's vertex shader.
 */
function uploadNormalMatrixToShader() {
  
  mat3.fromMat4(nMatrix,mvMatrix);
    
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
    
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 */
function setLightUniforms(loc, a, d, s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);       
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 */
function setMaterialUniforms(alpha,a,d,s) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}



//----------------------------------------------------------------------------------
/**
 * Push the sphere's Modelview matrix onto the modelview matrix stack.
 * @param: void
 * @return: void
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

//----------------------------------------------------------------------------------
/**
 * Pop the sphere's Modelview matrix off of the modelview matrix stack.
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends the sphere's projection/modelview/normal matrices to the vertex shader.
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
* Translates degrees to radians
*/
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
* This function is just a relay to call the function that actually set up the buffers.
*/
function setupBuffers() {
    
	var sphereSoup=[];
	var sphereNormals=[];
    var tangents=[];
    var bitangents=[];
    var uvs=[];
	numT=sphereFromSubdivision(6,sphereSoup,sphereNormals);
    calculateTangents(numT*3, sphereSoup, sphereNormals, tangents, bitangents, uvs);
	sphereVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer); 
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereSoup), gl.STATIC_DRAW);
	sphereVertexPositionBuffer.itemSize = 3;
	sphereVertexPositionBuffer.numItems = numT*3;

	// Specify normals to be able to do lighting calculations
	sphereVertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals),
	gl.STATIC_DRAW);
	sphereVertexNormalBuffer.itemSize = 3;
	sphereVertexNormalBuffer.numItems = numT*3;
    
    sphereTangentBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sphereTangentBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangents), gl.STATIC_DRAW);
	sphereTangentBuffer.itemSize = 3;
	sphereTangentBuffer.numItems = numT*3;
    
    sphereBitangentBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sphereBitangentBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bitangents), gl.STATIC_DRAW);
	sphereBitangentBuffer.itemSize = 3;
	sphereBitangentBuffer.numItems = numT*3;
    
    sphereUVBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sphereUVBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
	sphereUVBuffer.itemSize = 2;       //size is 2, but numItems still 3*numT because there are 3 per face
	sphereUVBuffer.numItems = numT*3;
}

//------------------------------------------------------------------------------------
function setupTextures() {

  normtex = gl.createTexture();                    
  normImage = new Image();
  normImage.onload = function() { handleTextureLoaded(normImage, normtex); }       //handle the given texture and image
  normImage.src = "image/normal_map.jpg"; 
}

//----------------------------------------------------------------------------------
/**
 * Texture handling. Generates mipmap and sets texture parameters.
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
  console.log("leaving text loaded")
}

//----------------------------------------------------------------------------------
/**
 * This function checks if the value is a power of 2
 */
function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}




function calculateTangents(verticesNums, vertices, normals, tangents, bitangents, uvs) {
	
    var deltaPos1 = vec3.create();
    var deltaPos2 = vec3.create();
    var deltaUV1 = vec2.create();
    var deltaUV2 = vec2.create();
    var tangent = vec3.create();
    var bitangent = vec3.create();
    
    
    for (var i = 0; i < verticesNums; i += 3){

       
        var v0 = vec3.fromValues(vertices[i*3],vertices[i*3+1],vertices[i*3+2]);
        var v1 = vec3.fromValues(vertices[(i+1)*3],vertices[(i+1)*3+1],vertices[(i+1)*3+2]);
        var v2 = vec3.fromValues(vertices[(i+2)*3],vertices[(i+2)*3+1],vertices[(i+2)*3+2]);

        vec3.sub(deltaPos1, v1, v0);
        vec3.sub(deltaPos2, v2, v0); 
        
        // Because it is a sphere center at the origin, so the normal vector equals to the vertex vector
        var n0 = vec3.fromValues(normals[i*3],normals[i*3+1],normals[i*3+2]);
        var n1 = vec3.fromValues(normals[(i+1)*3],normals[(i+1)*3+1],normals[(i+1)*3+2]);
        var n2 = vec3.fromValues(normals[(i+2)*3],normals[(i+2)*3+1],normals[(i+2)*3+2]);
        
        // Calcualte the texture coordinates
        var uv0 = vec2.fromValues((Math.atan2(n0[0], n0[2])/(2*Math.PI)) + 0.5, (n0[1] * 0.5 + 0.5));
        var uv1 = vec2.fromValues((Math.atan2(n1[0], n1[2])/(2*Math.PI)) + 0.5, (n1[1] * 0.5 + 0.5));
        var uv2 = vec2.fromValues((Math.atan2(n2[0], n2[2])/(2*Math.PI)) + 0.5, (n2[1] * 0.5 + 0.5));

        uvs.push(uv0[0]);
        uvs.push(uv0[1]);
        uvs.push(uv1[0]);
        uvs.push(uv1[1]);
        uvs.push(uv2[0]);
        uvs.push(uv2[1]);
          
        
        vec2.sub(deltaUV1, uv1, uv0);       
        vec2.sub(deltaUV2, uv2, uv0);
        
        var r = (1.0 / (deltaUV1[0] * deltaUV2[1] - deltaUV1[1] * deltaUV2[0]));
        
        tangent[0] = (deltaPos1[0] * deltaUV2[1] - deltaPos2[0] * deltaUV1[1])*r;      
        tangent[1] = (deltaPos1[1] * deltaUV2[1] - deltaPos2[1] * deltaUV1[1])*r;
        tangent[2] = (deltaPos1[2] * deltaUV2[1] - deltaPos2[2] * deltaUV1[1])*r;
        bitangent[0] = (deltaPos2[0] * deltaUV1[0] - deltaPos1[0] * deltaUV2[0])*r;
        bitangent[1] = (deltaPos2[1] * deltaUV1[0] - deltaPos1[1] * deltaUV2[0])*r;
        bitangent[2] = (deltaPos2[2] * deltaUV1[0] - deltaPos1[2] * deltaUV2[0])*r;
       
        for(j = 0; j < 3; j++) {
        	tangents.push(tangent[0]); 
        	tangents.push(tangent[1]);
        	tangents.push(tangent[2]);
        }
      
        for (k = 0; k < 3; k++) {
        	bitangents.push(bitangent[0]);
        	bitangents.push(bitangent[1]);
        	bitangents.push(bitangent[2]);	
        }
        }
}


//----------------------------------------------------------------------------------
/**
* This function draws our sphere using the buffer data, texture, and normal map.
*/
function drawSphere(){ 
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);
    
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, sphereVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);
    
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereTangentBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexTangentAttribute, sphereTangentBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);
    
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereBitangentBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexBitangentAttribute, sphereBitangentBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereUVBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexTexCoordAttribute, sphereUVBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
    
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, normtex);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uNormalSampler"), 1);  
 
  //var ext = gl.getExtension('OES_element_index_uint'); 
  gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);      

}

function draw() { 
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);         
    var i;
    var transformVec = vec3.create();

    mat4.perspective(pMatrix,degToRad(60), gl.canvas.width/ gl.canvas.height, 0.1, 200.0);
    
    
    vec3.add(viewPt, eyePt, viewDir);              
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);
    
    mvPushMatrix();
    mat4.scale(mvMatrix, mvMatrix, scale);
    mat4.rotateY(mvMatrix, mvMatrix, angle);
  
    setMatrixUniforms();

    setLightUniforms(lightPosition, lAmbient, lDiffuse, lSpecular);
    setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular); 
        
    drawSphere();

    mvPopMatrix();  

}

//----------------------------------------------------------------------------------
function startup() { 
  
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupTextures();
  setupShaders();
  setupBuffers();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick();                   
}

//----------------------------------------------------------------------------------
function tick() {
    requestAnimFrame(tick);
    draw();         //draw the sphere
    //animate();             
}
