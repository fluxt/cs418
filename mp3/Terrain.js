/**
 * @file Terrain.js - A simple 3D terrain model for WebGL
 * @author Ian Rudnick <itr2@illinois.edu>
 * @brief Starter code for CS 418 MP2 at the University of Illinois at
 * Urbana-Champaign.
 *
 * Updated Spring 2021 for WebGL 2.0/GLSL 3.00 ES.
 *
 * You'll need to implement the following functions:
 * setVertex(v, i) - convenient vertex access for 1-D array
 * getVertex(v, i) - convenient vertex access for 1-D array
 * generateTriangles() - generate a flat grid of triangles
 * shapeTerrain() - shape the grid into more interesting terrain
 * calculateNormals() - calculate normals after warping terrain
 *
 * Good luck! Come to office hours if you get stuck!
 */

class Terrain {
    /**
     * Initializes the members of the Terrain object.
     * @param {number} div Number of triangles along the x-axis and y-axis.
     * @param {number} minX Minimum X coordinate value.
     * @param {number} maxX Maximum X coordinate value.
     * @param {number} minY Minimum Y coordinate value.
     * @param {number} maxY Maximum Y coordinate value.
     */
    constructor(div, minX, maxX, minY, maxY) {
        this.div = div;
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;

        // Allocate the vertex array
        this.positionData = [];
        // Allocate the normal array.
        this.normalData = [];
        // Allocate the triangle array.
        this.faceData = [];
        // Allocate the colors array.
        this.colorData = [];
        // Allocate an array for edges so we can draw a wireframe.
        this.edgeData = [];
        console.log("Terrain: Allocated buffers");

        this.generateTriangles();
        console.log("Terrain: Generated triangles");

        this.generateLines();
        console.log("Terrain: Generated lines");

        this.shapeTerrain();
        console.log("Terrain: Sculpted terrain");

        this.calculateNormals();
        console.log("Terrain: Generated normals");

        this.generateColors();
        console.log("Terrain: Generated colors");

        // You can use this function for debugging your buffers:
        // this.printBuffers();
    }


    //-------------------------------------------------------------------------
    // Vertex access and triangle generation - your code goes here!
    /**
     * Set the x,y,z coords of the ith vertex
     * @param {Object} v An array of length 3 holding the x,y,z coordinates.
     * @param {number} i The index of the vertex to set.
     */
    setVertex(v, i) {
        // MP2: Implement this function!
        this.positionData[i*3+0] = v[0];
        this.positionData[i*3+1] = v[1];
        this.positionData[i*3+2] = v[2];
    }


    /**
     * Returns the x,y,z coords of the ith vertex.
     * @param {Object} v An array of length 3 to hold the x,y,z coordinates.
     * @param {number} i The index of the vertex to get.
     */
    getVertex(v, i) {
        // MP2: Implement this function!
        v[0] = this.positionData[i*3+0];
        v[1] = this.positionData[i*3+1];
        v[2] = this.positionData[i*3+2];
    }

    /**
     * Converts the x,y coords of terrain to index of the vertex.
     * @param {number} x x coordinate
     * @param {number} y t coordinate
     * @returns {number} The index of the vertex
     */
    coordinateToIndex(x, y) {
        return x + y * (this.div+1);
    }

    /**
     * generates terrain grid with zero heights for positionData (vertices), faceData
     */
    generateTriangles() {
        // MP2: Implement the rest of this function!
        var deltaX=(this.maxX-this.minX)/this.div;
        var deltaY=(this.maxY-this.minY)/this.div;

        for(var i=0;i<=this.div;i++)
        for(var j=0;j<=this.div;j++) {
            this.positionData.push(this.minX+deltaX*j);
            this.positionData.push(this.minY+deltaY*i);
            this.positionData.push(0);
        }

        for(var i=0;i<this.div;i++)
        for(var j=0;j<this.div;j++) {
            var v0 = this.coordinateToIndex(j, i);     // bottom left
            var v1 = this.coordinateToIndex(j+1, i);   // bottom right
            var v2 = this.coordinateToIndex(j, i+1);   // top left
            var v3 = this.coordinateToIndex(j+1, i+1); // top right

            this.faceData.push(v0, v1, v2);
            this.faceData.push(v1, v2, v3);
        }

        // We'll need these to set up the WebGL buffers.
        this.numVertices = this.positionData.length/3;
        this.numFaces = this.faceData.length/3;
    }


    /**
     * generates terrain heights based on the faulting method
     */
    shapeTerrain() {
        // MP2: Implement this function!
        var iterations = 100;
        var deltaHeight = 0.015;
        var H = 0.01;

        for (var iteration = 0; iteration < iterations; iteration++) {
            // random position p
            var p_x = this.minX + Math.random() * (this.maxX - this.minX);
            var p_y = this.minY + Math.random() * (this.maxY - this.minY);
            var p = glMatrix.vec2.fromValues(p_x, p_y);
            // random normal vector n
            var n = glMatrix.vec2.create(); glMatrix.vec2.random(n);
            for (var i=0; i<this.numVertices; i++) {
                var b = glMatrix.vec3.create();
                this.getVertex(b, i);

                // diff = p - b
                var diff = b.slice(0, 2);
                glMatrix.vec2.sub(diff, p, b);
                var dot_product = glMatrix.vec2.dot(diff, n);

                // if dot product is positive -> increase, else -> decrease
                if (dot_product > 0) {
                    b[2] += deltaHeight;
                } else {
                    b[2] -= deltaHeight;
                }

                this.setVertex(b, i);
            }
            // decay delta value for future iterations
            deltaHeight = deltaHeight / Math.pow(2, H);
        }
    }


    /**
     * calculates the per-vertex normal vectors for each vertex 
     * to be used for shading
     */
    calculateNormals() {
        // MP2: Implement this function!
        for(var i=0;i<=this.div;i++)
        for(var j=0;j<=this.div;j++) {
            var normalSum = glMatrix.vec3.create();

            // temporary vec3 variables to calculate the normals
            var normal = glMatrix.vec3.create();
            var v0 = glMatrix.vec3.create();
            var v1 = glMatrix.vec3.create();
            var v2 = glMatrix.vec3.create();

            // bottom left single face
            if (i-1 >= 0 && j-1 >= 0) {
                this.getVertex(v1, this.coordinateToIndex(j, i)); // center
                this.getVertex(v2, this.coordinateToIndex(j-1, i)); // left
                this.getVertex(v0, this.coordinateToIndex(j, i-1)); // bottom
                this.calculateNormal(normal, v0, v1, v2);
                glMatrix.vec3.add(normalSum, normalSum, normal);
            }

            // bottom right two faces
            if (i-1 >= 0 && j+1 <= this.div) {
                this.getVertex(v1, this.coordinateToIndex(j, i)); // center
                this.getVertex(v2, this.coordinateToIndex(j, i-1)); // bottom
                this.getVertex(v0, this.coordinateToIndex(j+1, i-1)); // bottom right
                this.calculateNormal(normal, v0, v1, v2);
                glMatrix.vec3.add(normalSum, normalSum, normal);

                this.getVertex(v1, this.coordinateToIndex(j, i)); // center
                this.getVertex(v2, this.coordinateToIndex(j+1, i-1)); // bottom right
                this.getVertex(v0, this.coordinateToIndex(j+1, i)); // right
                this.calculateNormal(normal, v0, v1, v2);
                glMatrix.vec3.add(normalSum, normalSum, normal);
            }

            // top left two faces
            if (i+1 <= this.div && j-1 >= 0) {
                this.getVertex(v1, this.coordinateToIndex(j, i)); // center
                this.getVertex(v2, this.coordinateToIndex(j-1, i+1)); // top left
                this.getVertex(v0, this.coordinateToIndex(j-1, i)); // left
                this.calculateNormal(normal, v0, v1, v2);
                glMatrix.vec3.add(normalSum, normalSum, normal);

                this.getVertex(v1, this.coordinateToIndex(j, i)); // center
                this.getVertex(v2, this.coordinateToIndex(j, i+1)); // top
                this.getVertex(v0, this.coordinateToIndex(j-1, i+1)); // top left
                this.calculateNormal(normal, v0, v1, v2);
                glMatrix.vec3.add(normalSum, normalSum, normal);
            }

            // top right single face
            if (i+1 <= this.div && j+1 <= this.div) {
                this.getVertex(v1, this.coordinateToIndex(j, i)); // center
                this.getVertex(v2, this.coordinateToIndex(j+1, i)); // right
                this.getVertex(v0, this.coordinateToIndex(j, i+1)); // top right
                this.calculateNormal(normal, v0, v1, v2);
                glMatrix.vec3.add(normalSum, normalSum, normal);
            }

            glMatrix.vec3.normalize(normalSum, normalSum);
            this.normalData.push(normalSum[0], normalSum[1], normalSum[2]);
        }
    }

    /**
     * Calculates the normal vector based on three vertices. (in counter-clockwise order)
     * @param {vec3} normal The index of the vertex
     * @param {vec3} v0 vertex
     * @param {vec3} v1 vertex
     * @param {vec3} v2 vertex
     */
    calculateNormal(normal, v0, v1, v2) {
        var edgeRight = glMatrix.vec3.create(); glMatrix.vec3.sub(edgeRight, v1, v0);
        var edgeUp = glMatrix.vec3.create(); glMatrix.vec3.sub(edgeUp, v2, v0);
        glMatrix.vec3.cross(normal, edgeRight, edgeUp);
        glMatrix.vec3.normalize(normal, normal);
    }

    /**
     * Generates color data for shading.
     */
    generateColors() {
        var max = -10000;
        var min = 10000;
        // calculate max and min
        for(var i=0;i<=this.div;i++)
        for(var j=0;j<=this.div;j++) {
            var vertex = glMatrix.vec3.create();
            this.getVertex(vertex, this.coordinateToIndex(j, i));
            var height = vertex[2];
            if (height > max) max = height;
            if (height < min) min = height;
        }
        // calculate hue based on height
        for(var i=0;i<=this.div;i++)
        for(var j=0;j<=this.div;j++) {
            this.getVertex(vertex, this.coordinateToIndex(j, i));
            var height = vertex[2];
            var ratio = (height-min)/(max-min);

            // hsl to rgb conversion formulae
            // https://en.wikipedia.org/wiki/HSL_and_HSV#Color_conversion_formulae
            var h = ratio * 360;
            var s = 1.0;
            var l = 0.5;
            var c = (1-Math.abs(2*l-1))*s;
            var hp = h/60;
            var x = c*(1-Math.abs(hp%2-1));
            var r = 0; var g = 0; var b = 0;
            if        (0<=hp && hp<1) {
                r = c; g = x; b = 0;
            } else if (1<=hp && hp<2) {
                r = x; g = c; b = 0;
            } else if (2<=hp && hp<3) {
                r = 0; g = c; b = x;
            } else if (3<=hp && hp<4) {
                r = 0; g = x; b = c;
            } else if (4<=hp && hp<5) {
                r = x; g = 0; b = c;
            } else if (5<=hp && hp<6) {
                r = c; g = 0; b = x;
            }
            r += l-c/2; g += l-c/2; b += l-c/2;

            this.colorData.push(r, g, b, 1);
        }
    }

    //-------------------------------------------------------------------------
    // Setup code (run once)
    /**
     * Generates line data from the faces in faceData for wireframe rendering.
     */
    generateLines() {
        for (var f = 0; f < this.faceData.length/3; f++) {
            // Calculate index of the face
            var fid = f*3;
            this.edgeData.push(this.faceData[fid]);
            this.edgeData.push(this.faceData[fid+1]);

            this.edgeData.push(this.faceData[fid+1]);
            this.edgeData.push(this.faceData[fid+2]);

            this.edgeData.push(this.faceData[fid+2]);
            this.edgeData.push(this.faceData[fid]);
        }
    }


    /**
     * Sets up the WebGL buffers and vertex array object.
     * @param {object} shaderProgram The shader program to link the buffers to.
     */
    setupBuffers(shaderProgram) {
        // Create and bind the vertex array object.
        this.vertexArrayObject = gl.createVertexArray();
        gl.bindVertexArray(this.vertexArrayObject);

        // Create the position buffer and load it with the position data.
        this.vertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positionData),
                      gl.STATIC_DRAW);
        this.vertexPositionBuffer.itemSize = 3;
        this.vertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.vertexPositionBuffer.numItems, " vertices.");

        // Link the position buffer to the attribute in the shader program.
        gl.vertexAttribPointer(shaderProgram.locations.vertexPosition,
                               this.vertexPositionBuffer.itemSize, gl.FLOAT,
                               false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.locations.vertexPosition);

        // Specify normals to be able to do lighting calculations
        this.vertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normalData),
                      gl.STATIC_DRAW);
        this.vertexNormalBuffer.itemSize = 3;
        this.vertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.vertexNormalBuffer.numItems, " normals.");

        // Link the normal buffer to the attribute in the shader program.
        gl.vertexAttribPointer(shaderProgram.locations.vertexNormal,
                               this.vertexNormalBuffer.itemSize, gl.FLOAT,
                               false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.locations.vertexNormal);

        // Specify colors to be able to do lighting calculations
        this.vertexColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colorData),
                      gl.STATIC_DRAW);
        this.vertexColorBuffer.itemSize = 4;
        this.vertexColorBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.vertexColorBuffer.numItems, " colors.");

        // Link the color buffer to the attribute in the shader program.
        gl.vertexAttribPointer(shaderProgram.locations.vertexColor,
                               this.vertexColorBuffer.itemSize, gl.FLOAT,
                               false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.locations.vertexColor);

        // Set up the buffer of indices that tells WebGL which vertices are
        // part of which triangles.
        this.triangleIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.faceData),
                      gl.STATIC_DRAW);
        this.triangleIndexBuffer.itemSize = 1;
        this.triangleIndexBuffer.numItems = this.faceData.length;
        console.log("Loaded ", this.triangleIndexBuffer.numItems, " triangles.");

        // Set up the index buffer for drawing edges.
        this.edgeIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.edgeData),
                      gl.STATIC_DRAW);
        this.edgeIndexBuffer.itemSize = 1;
        this.edgeIndexBuffer.numItems = this.edgeData.length;

        // Unbind everything; we want to bind the correct element buffer and
        // VAO when we want to draw stuff
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }


    //-------------------------------------------------------------------------
    // Rendering functions (run every frame in draw())
    /**
     * Renders the terrain to the screen as triangles.
     */
    drawTriangles() {
        gl.bindVertexArray(this.vertexArrayObject);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.triangleIndexBuffer.numItems,
                        gl.UNSIGNED_INT,0);
    }


    /**
     * Renders the terrain to the screen as edges, wireframe style.
     */
    drawEdges() {
        gl.bindVertexArray(this.vertexArrayObject);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);
        gl.drawElements(gl.LINES, this.edgeIndexBuffer.numItems,
                        gl.UNSIGNED_INT,0);
    }


    //-------------------------------------------------------------------------
    // Debugging
    /**
     * Prints the contents of the buffers to the console for debugging.
     */
    printBuffers() {
        for (var i = 0; i < this.numVertices; i++) {
            console.log("v ", this.positionData[i*3], " ",
                              this.positionData[i*3 + 1], " ",
                              this.positionData[i*3 + 2], " ");
        }
        for (var i = 0; i < this.numVertices; i++) {
            console.log("n ", this.normalData[i*3], " ",
                              this.normalData[i*3 + 1], " ",
                              this.normalData[i*3 + 2], " ");
        }
        for (var i = 0; i < this.numFaces; i++) {
            console.log("f ", this.faceData[i*3], " ",
                              this.faceData[i*3 + 1], " ",
                              this.faceData[i*3 + 2], " ");
        }
    }

} // class Terrain
