/**
 * @file MP1: Dancing Logo
 * @author Hwanseo Choi <hwanseo2@illinois.edu>
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

/** @global The vertex array object for the triangle */
var vertexArrayObject;

/** @global The modelVertices array contains three floats for every traingle of the model */
var modelVertices = [];

/** @global The colors array contains four floats for every vertex of the model */
var modelColors = [];

/** @global The ModelView matrix contains any modeling and viewing transformations */
var modelViewMatrix = glMatrix.mat4.create();

/** @global Records time last frame was rendered */
var previousTime = 0;

/** @global The rotation angle of our triangle */
var rotAngle = 0;

/** @global The coordinate of mouse when it hovers over the cursor */
var mouseX = 0;
var mouseY = 0;


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
  var context = null;
  context = canvas.getContext("webgl2");
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}


/**
 * Loads a shader.
 * Retrieves the source code from the HTML document and compiles it.
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
    
  var shaderSource = shaderScript.text;
 
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
 * Set up the fragment and vertex shaders.
 */
function setupShaders() {
  // Compile the shaders' source code.
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  // Link the shaders together into a program.
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  // We only use one shader program for this example, so we can just bind
  // it as the current program here.
  gl.useProgram(shaderProgram);
    
  // Query the index of each attribute in the list of attributes maintained
  // by the GPU. 
  shaderProgram.vertexPositionAttribute =
    gl.getAttribLocation(shaderProgram, "aVertexPosition");
  shaderProgram.vertexColorAttribute =
    gl.getAttribLocation(shaderProgram, "aVertexColor");
    
  //Get the index of the Uniform variable as well
  shaderProgram.modelViewMatrixUniform =
    gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
}


/**
 * Set up the buffers to hold the triangle's vertex positions and colors.
 */
function setupBuffers() {
  // Create the vertex array object, which holds the list of attributes for
  // the triangle.
  vertexArrayObject = gl.createVertexArray();
  gl.bindVertexArray(vertexArrayObject); 

  // Create a buffer for positions, and bind it to the vertex array object.
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelVertices), gl.STATIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numItems = modelVertices.length / 3;
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  
  // Do the same steps for the color buffer.
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelColors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = modelColors.length / 4;
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 
                         vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

  // Enable each attribute we are using in the VAO.  
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
    
  // Unbind the vertex array object to be safe.
  gl.bindVertexArray(null);
}


/**
 * Draws a frame to the screen.
 */
function draw() {
  // Transform the clip coordinates so the render fills the canvas dimensions.
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

  // Clear the screen.
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Use the vertex array object that we set up.
  gl.bindVertexArray(vertexArrayObject);
    
  // Send the ModelView matrix with our transformations to the vertex shader.
  gl.uniformMatrix4fv(shaderProgram.modelViewMatrixUniform,
                      false, modelViewMatrix);
    
  // Render the triangle. 
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numItems);
  
  // Unbind the vertex array object to be safe.
  gl.bindVertexArray(null);
}


/**
 * Animates the triangle by updating the ModelView matrix with a rotation
 * each frame.
 */
function animate(currentTime) {
  // Read the speed slider from the web page.
  var speed = document.getElementById("speed").value;

  // Convert the time to seconds.
  currentTime *= 0.001;
  // Subtract the previous time from the current time.
  var deltaTime = currentTime - previousTime;
  // Remember the current time for the next frame.
  previousTime = currentTime;

  // Update geometry to rotate 'speed' degrees per second.
  rotAngle += speed * deltaTime;

  // These are the I shaped triangles
  modelVertices = [
    -0.4,  0.6,  0.0,
    -0.4,  0.4,  0.0,
     0.4,  0.6,  0.0,
     0.4,  0.4,  0.0,
    -0.4,  0.4,  0.0,
     0.4,  0.6,  0.0,
    -0.10, 0.4,  0.0,
     0.10, 0.4,  0.0,
    -0.10,-0.4,  0.0,
     0.10,-0.4,  0.0,
     0.10, 0.4,  0.0,
    -0.10,-0.4,  0.0,
    -0.4, -0.6,  0.0,
    -0.4, -0.4,  0.0,
     0.4, -0.6,  0.0,
     0.4, -0.4,  0.0,
    -0.4, -0.4,  0.0,
     0.4, -0.6,  0.0,
  ];

  // generate urbana orange colors array for every vertex in the I
  modelColors = [];
  for (var i=0; i<modelVertices.length; i++) {
    modelColors = modelColors.concat([232/256, 74/256, 39/256, 1.0]);
  }

  if (document.getElementById("logo").checked === true) {
    // this is the affine transformation uniform variable for the view matrix
    modelViewMatrix = glMatrix.mat4.create();
    // tell the view matrix to follow the cursor
    glMatrix.mat4.translate(modelViewMatrix, modelViewMatrix, glMatrix.vec3.fromValues(mouseX, mouseY, 0));
    // tell the view matrix to rotate around the cursor
    glMatrix.mat4.rotateZ(modelViewMatrix, modelViewMatrix, -degToRad(rotAngle));

    // the translated i oscillates in circles around the cursor
    // The radius oscillates, and the I is translated to the radius
    var radius = 0.1 + 0.3 * Math.cos(degToRad(rotAngle*3));
    var x = radius * Math.cos(degToRad(rotAngle));
    var y = radius * Math.sin(degToRad(rotAngle));

    // deep copy the modelVertices array to have two models
    var modelVerticesCopy = Array.from(modelVertices);
    // translate by x and y
    for (var i=0; i<modelVerticesCopy.length/3; i++) {
      modelVerticesCopy[i*3+0] = modelVertices[i*3+0]+x;
      modelVerticesCopy[i*3+1] = modelVertices[i*3+1]+y;
    }
    // concatenate new model into old model
    modelVertices = modelVertices.concat(modelVerticesCopy);
    // concatenate colors for new model
    for (var i=0; i<modelVerticesCopy.length; i++) {
      modelColors = modelColors.concat([232/256, 74/256, 39/256, 1.0]);
    }

    modelVerticesCopy = Array.from(modelVertices);
    // rotate around the transform
    for (var i=0; i<modelVerticesCopy.length/3; i++) {
      var vertex = glMatrix.vec3.fromValues(modelVerticesCopy[i*3+0],
                                            modelVerticesCopy[i*3+1],
                                            modelVerticesCopy[i*3+2]);
      glMatrix.vec3.rotateZ(vertex, vertex, glMatrix.vec3.create(), degToRad(rotAngle)*Math.sqrt(2));
      modelVerticesCopy[i*3+0] = vertex[0];
      modelVerticesCopy[i*3+1] = vertex[1];
      modelVerticesCopy[i*3+2] = vertex[2];
    }

    // concatenate new model and colors into old
    modelVertices = modelVertices.concat(modelVerticesCopy);
    for (var i=0; i<modelVerticesCopy.length; i++) {
      modelColors = modelColors.concat([232/256, 74/256, 39/256, 1.0]);
    }
  }

  if (document.getElementById("creative").checked === true) {
    // reset view model to default
    modelViewMatrix = glMatrix.mat4.create();

    // clear the illini I vertices and colors
    modelVertices = [];
    modelColors = [];

    // create concentric moving triangles. radius increases as rotAngle increases.
    for (r=1.0+0.1*(rotAngle/30)%1; r>=0; r-=0.1){
      // draw equilateral triangle with radius r
      modelVertices = modelVertices.concat([                0,    r, 0]);
      modelVertices = modelVertices.concat([-r*Math.sqrt(3)/2, -r/2, 0]);
      modelVertices = modelVertices.concat([ r*Math.sqrt(3)/2, -r/2, 0]);
  
      // color them black, with a shade proportional to r
      // as r increases, it gets brighter
      modelColors = modelColors.concat([r, r, r, 1.0]);
      modelColors = modelColors.concat([r, r, r, 1.0]);
      modelColors = modelColors.concat([r, r, r, 1.0]);  
    }
  }

  setupBuffers();     

  // Draw the frame.
  draw();
  
  // Animate the next frame. The animate function is passed the current time in
  // milliseconds.
  requestAnimationFrame(animate);
}


/**
 * Startup function called from html code to start the program.
 */
 function startup() {
  console.log("Starting animation...");
  canvas = document.getElementById("myGLCanvas");
  // modify mouseX and mouseY whenver mouse is moved on canvas
  canvas.addEventListener('mousemove', (e) => {
    mouseX = (e.offsetX-canvas.width/2)/(canvas.width/2);
    mouseY = (-e.offsetY+canvas.height/2)/(canvas.height/2);
  });
  gl = createGLContext(canvas);
  setupShaders(); 
  setupBuffers();
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  requestAnimationFrame(animate); 
}
