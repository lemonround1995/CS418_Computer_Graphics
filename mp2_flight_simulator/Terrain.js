/**
* @Terrain Generator - MP2A
* @author Mengyuan Li (ml26)
*/

/** Class implementing 3D terrain. */
class Terrain {
/**
 * Initialize members of a Terrain object
 * @param {number} div Number of triangles along x axis and y axis
 * @param {number} minX Minimum X coordinate value
 * @param {number} maxX Maximum X coordinate value
 * @param {number} minY Minimum Y coordinate value
 * @param {number} maxY Maximum Y coordinate value
 */
 
    constructor(div, minX, maxX, minY, maxY) {
        this.div = div;
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
        
        // Allocate vertex array (Cords of Kth vertex: start-3(K-1), end-3K-1)
        this.vBuffer = [];
        // Allocate triangle array (specified by vertext indices)
        this.fBuffer = [];
        // Allocate normal array
        this.nBuffer = [];
        // Allocate array for edges so we can draw wireframe
        this.eBuffer = [];
        
        console.log("Terrain: Allocate buffers");
        
        this.generateTriangles();
        console.log("Terrain: Generated triangles");
        this.printBuffers();
        
        console.log("Terrain: Generate vertex normals")
        this.generateNormals();
        
        this.generateLines();
        console.log("Terrain: Generated lines");
        
        // Get extension for 4 byte integer indices for drwElements
        var ext = gl.getExtension('OES_element_index_uint');
        if (ext ==null){
            alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
        
    }
}

/** 
 * Define a function for random sample between [lower bound, upper bound]
 * @param {number} lower, the lower bound
 * @param {number} upper, the upper bound
 */
     getRndNum(lower, upper) {
        return Math.random() * (upper - lower) + lower;
     }

/**
 * Set the x,y,z coords of a vertex at location(i,j)
 * @param {Object} v an an array of length 3 holding x,y,z coordinates
 * @param {number} i the ith row of vertices
 * @param {number} j the jth column of vertices
 */
    setVertex(v,i,j) {
        // vid: vertex id or the number of vertices before vertex at location(i, j)
        // i,j should be in range [0, this.div]
        var vid = 3*(i*(this.div+1) + j);
        this.vBuffer[vid] = v[0];
        this.vBuffer[vid+1] = v[1];
        this.vBuffer[vid+2] = v[2];
    }
    
/**
 * Return the x,y,z coordinates of a vertex at location (i,j)
 * @param {Object} v an an array of length 3 holding x,y,z coordinates
 * @param {number} i the ith row of vertices
 * @param {number} j the jth column of vertices
 */
    getVertex(v,i,j) {
        var vid = 3*(i*(this.div+1) + j);
        v[0] = this.vBuffer[vid];
        v[1] = this.vBuffer[vid+1];
        v[2] = this.vBuffer[vid+2];
    }
    
/** 
 * Fill the vertex and triangle buffer (vbuffer and fbuffer) by Diamond-Square Alg
 */
    generateTriangles() {
        var x_amount = (this.maxX - this.minX) / this.div;
        var y_amount = (this.maxY - this.minY) / this.div;

        for (var i = 0; i <= this.div; i++) {
            for (var j = 0; j <= this.div; j++) {
                this.vBuffer.push(j*x_amount + this.minX);
                this.vBuffer.push(this.minY + i*y_amount);
                this.vBuffer.push(0);
            }
         }

        // Initialize height
        var height = [];
        for (var i = 0; i <= this.div; i++) {
            var row = [];
            for (var j = 0; j <= this.div; j++){
                row.push(0.0);
            }
            height.push(row);
        }
        //console.log("height", height[4][0]);

        // Initialize the step size
        var stepSize = this.div;
         // Set the interval for random sample
        var lower = -0.16; // -3 / this.div
        var upper = 0.16;
        var rand = 0.0;
        
        // Diamond-Square Alg
        while (stepSize > 1) {
            var halfStep = Math.floor(stepSize / 2);

            // Diamond step
            for (var i = 0; i < this.div; i += stepSize){
                
                for (var j = 0; j < this.div; j += stepSize) {
                    var topLeft = height[i][j];
                    var topRight = height[i][j + stepSize];
                    var botLeft = height[i + stepSize][j];
                    // console.log("botLeft", height[i + stepSize][j]);
                    var botRight = height[i + stepSize][j + stepSize];

                    
                    var avg = (topLeft + topRight + botLeft + botRight) / 4.0;
                    rand = this.getRndNum(lower, upper);
            

                    height[i + halfStep][j + halfStep] = avg + rand;
                }
            }
            lower *= 0.9;
            upper *= 0.9;
           

            // Square step
            var even = true;
            
            for (var i = 0; i <= this.div; i += halfStep){
                    var jStart = even ? halfStep : 0; 
                    for (var j = jStart; j <= this.div; j += stepSize){
                        
                        var left = j - halfStep < 0 ? 0.0 : height[i][j - halfStep];
                        var right = j + halfStep > this.div? 0.0 : height[i][j + halfStep];
                        var top = i - halfStep < 0 ? 0.0 : height[i - halfStep][j];
                        var bot = i + halfStep > this.div? 0.0 : height[i + halfStep][j];
                        
                        if (left == 0.0 || right == 0.0 || top == 0.0 || bot ==0.0){
                            avg = (left + right + top + bot) / 3.0;
                        
                        } else {
                            avg = (left + right + top + bot) / 4.0;
                        }
                        rand = this.getRndNum(lower, upper);
                      
                        height[i][j] = avg + rand;
                    }
                    even = !even;
                }
            stepSize /= 2;
            lower *= 0.9;
            upper *= 0.9;

            }
        


         // Insert height to the vBuffer
         for (var i = 0; i <= this.div; i++) {
            for (var j = 0; j <= this.div; j++){
                var vid = 3*(i*(this.div+1) + j);
                this.vBuffer[vid + 2] = height[i][j];
            }
         }
         //console.log("height", height);
        
        for (var i = 0; i < this.div; i++){
            for (var j = 0; j < this.div; j++){
            var vid = i * (this.div + 1) + j;
                
            this.fBuffer.push(vid);
            this.fBuffer.push(vid + this.div+1);
            this.fBuffer.push(vid + this.div+2);

            this.fBuffer.push(vid);
            this.fBuffer.push(vid+1);
            this.fBuffer.push(vid + this.div+2);
            }
        }
    
        this.numVertices = this.vBuffer.length/3;
        this.numFaces = this.fBuffer.length/3;
}


/** 
 * Calculate per vertex normals and push it into nBuffer
 */
    generateNormals() {
        // Create an object, where the key is the vertex index, and the value is normals of all triangle meshes this vertex belongs to
        var meshNormals = {};
        for (var vertexIndex = 0; vertexIndex < this.numVertices; vertexIndex++) {
            meshNormals[vertexIndex] = [];
        }
        for (var i=0; i < this.numFaces; i++) {
            var vertexNormal = vec3.create();
            var edge1 = vec3.create();
            var edge2 = vec3.create();

            var vertexIndex1 = this.fBuffer[3*i];
            var vertexIndex2 = this.fBuffer[3*i+1];
            var vertexIndex3 = this.fBuffer[3*i+2];
            var vertex1 = vec3.fromValues(this.vBuffer[3*vertexIndex1], this.vBuffer[vertexIndex1+1], this.vBuffer[vertexIndex1+2]);
            var vertex2 = vec3.fromValues(this.vBuffer[3*vertexIndex2], this.vBuffer[3*vertexIndex2+1], this.vBuffer[3*vertexIndex2+2]);
            var vertex3 = vec3.fromValues(this.vBuffer[3*vertexIndex3 ], this.vBuffer[3*vertexIndex3 +1], this.vBuffer[3*vertexIndex3+2]);
            console.log("vertex1:", vertex1);
            console.log("vertex2:", vertex2);
            console.log("vertex3:", vertex3);

            
            vec3.subtract(edge1, vertex2, vertex1);
            vec3.subtract(edge2, vertex3, vertex1);
            vec3.cross(vertexNormal, edge1, edge2);
            vec3.normalize(vertexNormal, vertexNormal);
            if (vertexNormal[2] < 0) {
                vertexNormal[0] = -vertexNormal[0];
                vertexNormal[1] = -vertexNormal[1];
                vertexNormal[2] = -vertexNormal[2];
            }
            //console.log("vertexNormal", vertexNormal);
            meshNormals[vertexIndex1].push(vertexNormal);
            meshNormals[vertexIndex2].push(vertexNormal);
            meshNormals[vertexIndex3].push(vertexNormal);
        }
        //console.log("meshNormalsMap", meshNormals[0][0]);
        
        // Calculate vertex normals
        for (var vertexIndex in meshNormals) {
            console.log("vertexIndex: ", vertexIndex)
            var normalSum = vec3.fromValues(0.0, 0.0, 0.0)
            for (var i = 0; i < meshNormals[vertexIndex].length;i++) {
                var normal = meshNormals[vertexIndex][i];
                console.log("normal: ", normal);
                vec3.add(normalSum, normalSum, normal);
            }
            console.log("normalSum: ", normalSum);
            vec3.normalize(normalSum, normalSum);
            this.nBuffer[3*vertexIndex] = normalSum[0];
            this.nBuffer[3*vertexIndex+1] = normalSum[1];
            this.nBuffer[3*vertexIndex+2] = normalSum[2];
        }
        console.log("nBuffer: ", this.nBuffer);
       
    }

 
 /**
  * Send the buffer objects to WebGL for rendering 
  */
    loadBuffers()
    {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);      
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionBuffer.numItems, " vertices");
    
        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
                  gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");
    
        // Specify faces of the terrain 
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.fBuffer),
                  gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.fBuffer.length;
        console.log("Loaded ", this.numFaces, " triangles");
    
        //Setup Edges  
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.eBuffer),
                  gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.eBuffer.length;
        
        console.log("triangulatedPlane: loadBuffers");
    }
    
    /**
     * Render the triangles 
     */
    drawTriangles(){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT,0);
    }
    
    /**
     * Render the triangle edges wireframe style 
     */
    drawEdges(){
    
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
        //Draw 
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT,0);   
    }
    
/**
 * Print vertices and triangles to console for debugging
 */
    printBuffers() {
        
    for(var i=0;i<this.numVertices;i++)
          {
           console.log("v ", this.vBuffer[i*3], " ", 
                             this.vBuffer[i*3 + 1], " ",
                             this.vBuffer[i*3 + 2], " ");
           // console.log("vBuffer length:", this.vBuffer.length);            
          }
    
      for(var i=0;i<this.numFaces;i++)
          {
           console.log("f ", this.fBuffer[i*3], " ", 
                             this.fBuffer[i*3 + 1], " ",
                             this.fBuffer[i*3 + 2], " ");
                       
          }
        
    }

/**
 * Generates line values from faces in faceArray
 * to enable wireframe rendering
 */
    generateLines() {
    var numTris=this.fBuffer.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        console.log("fid", fid)
        console.log("fBuffer[fid]",this.fBuffer[fid] )
        this.eBuffer.push(this.fBuffer[fid]);
        this.eBuffer.push(this.fBuffer[fid+1]);
        
        this.eBuffer.push(this.fBuffer[fid+1]);
        this.eBuffer.push(this.fBuffer[fid+2]);
        
        this.eBuffer.push(this.fBuffer[fid+2]);
        this.eBuffer.push(this.fBuffer[fid]);
    }
    
}
    
}