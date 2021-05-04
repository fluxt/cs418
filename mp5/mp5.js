/**
 * @file MP5.js - A simple WebGL rendering engine
 * @author Ian Rudnick <itr2@illinois.edu>
 * @author Hwanseo Choi <hwanseo2@illinois.edu>
 * @brief Starter code for CS 418 MP5 at the University of Illinois at
 * Urbana-Champaign.
 *
 * Updated Spring 2021 for WebGL 2.0/GLSL 3.00 ES.
 * Modified Spring 2021 for assignment completion.
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas to draw on */
var canvas;

/** @global The GLSL shader program */
var shaderProgram;

/** @global An object holding the geometry for your 3D model */
var sphere1;

// Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0, 1.0, 1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kDiffuse = [1.0, 1.0, 1.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [1.0, 1.0, 1.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 2;

/** @global Ambient light color */
const lAmbient = [0.4, 0.4, 0.4];
/** @global Diffuse light color */
const lDiffuse = [0.5, 0.5, 0.5];
/** @global Specular  light color */
const lSpecular = [0.1, 0.1, 0.1];

/** @global Previous frame time used for animate(currentTime) */
let previousTime;
/** @global Particle instances */
let particles = [];

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

//-----------------------------------------------------------------------------
// Setup functions (run once when the webpage loads)
/**
 * Startup function called from the HTML code to start program.
 */
function startup() {
  document.addEventListener("keypress", e => {
    if (e.key === "q") {
      particles.push(new Particle());
      particles.push(new Particle());
      particles.push(new Particle());
    }
    else if (e.key === "w") particles = [];
  });
  
  // Set up the canvas with a WebGL context.
  canvas = document.getElementById("glCanvas");
  gl = createGLContext(canvas);

  // Compile and link a shader program.
  setupShaders();

  // Create a sphere mesh and set up WebGL buffers for it.
  sphere1 = new Sphere(5);
  sphere1.setupBuffers(shaderProgram);

  // Set the background color to black (you can change this if you like).
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  // Start animating.
  requestAnimationFrame(animate);
}


/**
 * Creates a WebGL 2.0 context.
 * @param {element} canvas The HTML5 canvas to attach the context to.
 * @return {Object} The WebGL 2.0 context.
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
 * Loads a shader from the HTML document and compiles it.
 * @param {string} id ID string of the shader script to load.
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);

  // Return null if we don't find an element with the specified id
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
 * Sets up the vertex and fragment shaders.
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

  // If you have multiple different shader programs, you'll need to move this
  // function to draw() and call it whenever you want to switch programs
  gl.useProgram(shaderProgram);

  // Query the index of each attribute and uniform in the shader program.
  shaderProgram.locations = {};
  shaderProgram.locations.vertexPosition = gl.getAttribLocation(shaderProgram, "vertexPosition");
  shaderProgram.locations.vertexNormal = gl.getAttribLocation(shaderProgram, "vertexNormal");

  shaderProgram.locations.modelViewMatrix = gl.getUniformLocation(shaderProgram, "modelViewMatrix");
  shaderProgram.locations.projectionMatrix = gl.getUniformLocation(shaderProgram, "projectionMatrix");
  shaderProgram.locations.normalMatrix = gl.getUniformLocation(shaderProgram, "normalMatrix");

  shaderProgram.locations.kAmbient = gl.getUniformLocation(shaderProgram, "kAmbient");
  shaderProgram.locations.kDiffuse = gl.getUniformLocation(shaderProgram, "kDiffuse");
  shaderProgram.locations.kSpecular = gl.getUniformLocation(shaderProgram, "kSpecular");
  shaderProgram.locations.shininess = gl.getUniformLocation(shaderProgram, "shininess");

  shaderProgram.locations.lightPosition = gl.getUniformLocation(shaderProgram, "lightPosition");
  shaderProgram.locations.ambientLightColor = gl.getUniformLocation(shaderProgram, "ambientLightColor");
  shaderProgram.locations.diffuseLightColor = gl.getUniformLocation(shaderProgram, "diffuseLightColor");
  shaderProgram.locations.specularLightColor = gl.getUniformLocation(shaderProgram, "specularLightColor");
}

//-----------------------------------------------------------------------------
// Animation functions (run every frame)
/**
 * Draws the current frame and then requests to draw the next frame.
 * @param {number} currentTime The elapsed time in milliseconds since the
 *    webpage loaded.
 */
function animate(currentTime) {
  // Add code here using currentTime if you want to add animations
  // https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
  if (previousTime === undefined) {
    previousTime = currentTime;
  }
  const elapsedTime = currentTime - previousTime;
  previousTime = currentTime;

  // Set up the canvas for this frame
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const projectionMatrix = glMatrix.mat4.create();
  const viewMatrix = glMatrix.mat4.create();
  const modelMatrix = glMatrix.mat4.create();
  const modelViewMatrix = glMatrix.mat4.create();
  const normalMatrix = glMatrix.mat3.create();

  // calculate projectionMatrix
  const near = 0.1;
  const far = 200.0;
  glMatrix.mat4.perspective(projectionMatrix, degToRad(60),
                            gl.viewportWidth / gl.viewportHeight,
                            near, far);
  // calculate viewMatrix
  const lookAtPt = glMatrix.vec3.fromValues(0.0, 0.0, 0.0);
  const eyePt = glMatrix.vec3.fromValues(0.0, 0.0, 8.0);
  const up = glMatrix.vec3.fromValues(0.0, 1.0, 0.0);
  glMatrix.mat4.lookAt(viewMatrix, eyePt, lookAtPt, up);

  // Transform the light position to view coordinates
  var lightPosition = glMatrix.vec3.fromValues(5, 5, -5);
  glMatrix.vec3.transformMat4(lightPosition, lightPosition, viewMatrix);
  setLightUniforms(lAmbient, lDiffuse, lSpecular, lightPosition);

  particles.forEach(particle => {
    // update particle movement
    particle.update(elapsedTime / 1000);
    // calculate modelMatrix
    glMatrix.mat4.fromTranslation(modelMatrix, particle.position);
    glMatrix.mat4.scale(modelMatrix, modelMatrix, glMatrix.vec3.fromValues(particle.radius, particle.radius, particle.radius));
    // calculate ModelViewMatrix
    glMatrix.mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
    // calculate normalMatrix
    glMatrix.mat3.fromMat4(normalMatrix,modelViewMatrix);
    glMatrix.mat3.transpose(normalMatrix,normalMatrix);
    glMatrix.mat3.invert(normalMatrix,normalMatrix);
    // pass the matrices uniform
    setMatrixUniforms(modelViewMatrix, projectionMatrix, normalMatrix);
    // pass the color
    setMaterialUniforms(particle.color, particle.color, kSpecular, shininess);
    // draw the sphere with the modified matrices
    sphere1.bindVAO();
    gl.drawArrays(gl.TRIANGLES, 0, sphere1.numTriangles*3);
    sphere1.unbindVAO();
  });

  // Use this function as the callback to animate the next frame.
  requestAnimationFrame(animate);
}


/**
 * Sends the three matrix uniforms to the shader program.
 */
function setMatrixUniforms(modelViewMatrix, projectionMatrix, normalMatrix) {
  gl.uniformMatrix4fv(shaderProgram.locations.modelViewMatrix, false, modelViewMatrix);
  gl.uniformMatrix4fv(shaderProgram.locations.projectionMatrix, false, projectionMatrix);
  gl.uniformMatrix3fv(shaderProgram.locations.normalMatrix, false, normalMatrix);
}


/**
 * Sends material properties to the shader program.
 * @param {Float32Array} a Ambient material color.
 * @param {Float32Array} d Diffuse material color.
 * @param {Float32Array} s Specular material color.
 * @param {Float32} alpha shininess coefficient
 */
function setMaterialUniforms(a, d, s, alpha) {
  gl.uniform3fv(shaderProgram.locations.kAmbient, a);
  gl.uniform3fv(shaderProgram.locations.kDiffuse, d);
  gl.uniform3fv(shaderProgram.locations.kSpecular, s);
  gl.uniform1f(shaderProgram.locations.shininess, alpha);
}


/**
 * Sends light information to the shader program.
 * @param {Float32Array} a Ambient light color/intensity.
 * @param {Float32Array} d Diffuse light color/intensity.
 * @param {Float32Array} s Specular light color/intensity.
 * @param {Float32Array} loc The light position, in view coordinates.
 */
function setLightUniforms(a, d, s, loc) {
  gl.uniform3fv(shaderProgram.locations.ambientLightColor, a);
  gl.uniform3fv(shaderProgram.locations.diffuseLightColor, d);
  gl.uniform3fv(shaderProgram.locations.specularLightColor, s);
  gl.uniform3fv(shaderProgram.locations.lightPosition, loc);
}

