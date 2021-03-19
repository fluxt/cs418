/**
 * @file MP2.js - A simple WebGL rendering engine
 * @author Ian Rudnick <itr2@illinois.edu>
 * @brief Starter code for CS 418 MP2 at the University of Illinois at
 * Urbana-Champaign.
 * 
 * Updated Spring 2021 for WebGL 2.0/GLSL 3.00 ES.
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas to draw on */
var canvas;

/** @global The GLSL shader program */
var shaderProgram;

/** @global An object holding the geometry for your 3D terrain */
var myTerrain;

/** @global The Model matrix */
var modelViewMatrix = glMatrix.mat4.create();
/** @global The Projection matrix */
var projectionMatrix = glMatrix.mat4.create();
/** @global The Normal matrix */
var normalMatrix = glMatrix.mat3.create();

// Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [255/255, 255/255, 255/255];
/** @global Diffuse material color/intensity for Phong reflection */
var kDiffuse = [255/255, 255/255, 255/255];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [255/255, 255/255, 255/255];
/** @global Shininess exponent for Phong reflection */
var shininess = 2;

// Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [0, 2, 2];
/** @global Ambient light color/intensity for Phong reflection */
var ambientLightColor = [0.1, 0.1, 0.1];
/** @global Diffuse light color/intensity for Phong reflection */
var diffuseLightColor = [0.6, 0.6, 0.6];
/** @global Specular light color/intensity for Phong reflection */
var specularLightColor = [0.3, 0.3, 0.3];

/** @global Edge color for black wireframe */
var kEdgeBlack = [0.0, 0.0, 0.0];
/** @global Edge color for white wireframe */
var kEdgeWhite = [0.7, 0.7, 0.7];

/** @global Zoom level from 0 to infinity changed by mouse wheel **/
var zoom = 1.0;
/** @global Mouse X location from -1 to 1 **/
var mouseX = 0.5;
/** @global Mouse Y location from -1 to 1 **/
var mouseY = 0.5;

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

// MP2: Modify the shaders to implement Phong shading instead of Gourand!
var shader_vs = `#version 300 es
// Vertex Shader
// Implements Gourand shading. See the lecture on "Basic Shading" for details.

// Use high-precision floats if available on this device.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

in vec3 vertexPosition;
in vec3 vertexNormal;
in vec4 vertexColor;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

out vec3 interpolatedPosition;
out vec3 interpolatedNormal;
out vec4 interpolatedColor;

void main(void) {
    // pass the position, normal, and color to be interpolated by the fragrance shader
    interpolatedPosition = vertexPosition;
    interpolatedNormal = vertexNormal;
    interpolatedColor = vertexColor;

    gl_Position =
        projectionMatrix * modelViewMatrix * vec4(vertexPosition, 1.0);
}
`

var shader_fs = `#version 300 es
// Fragment Shader
// Implements Gourand shading. See the lecture on "Basic Shading" for details.

// Use high-precision floats if available on this device.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

in vec3 interpolatedPosition;
in vec3 interpolatedNormal;
in vec4 interpolatedColor;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

uniform vec3 kAmbient;
uniform vec3 kDiffuse;
uniform vec3 kSpecular;
uniform float shininess;

uniform vec3 lightPosition;
uniform vec3 ambientLightColor;
uniform vec3 diffuseLightColor;
uniform vec3 specularLightColor;

out vec4 fragmentColor;

void main(void) {
  // Transform the vertex position and normal to view coordinates
  vec3 vertexPositionView =(modelViewMatrix * vec4(interpolatedPosition, 1.0)).xyz;
  vec3 vertexNormalView = normalize(normalMatrix * interpolatedNormal);

  // The camera is at the origin in view coordinates
  vec3 cameraPositionView = vec3(0.0, 0.0, 0.0);
  
  // Calculate the three other vectors we need: l, r, and v
  vec3 lightVector = normalize(lightPosition - vertexPositionView);
  vec3 reflectionVector = normalize(reflect(-lightVector, vertexNormalView));
  vec3 viewVector = normalize(cameraPositionView - vertexPositionView);

  // Calculate diffuse light weighting: (n dot l)
  float diffuseWeight = max(dot(vertexNormalView, lightVector), 0.0);
  
  // Calculate the specular light weighting: (r dot v)^(shininess)
  float rDotV = max(dot(reflectionVector, viewVector), 0.0);
  float specularWeight = pow(rDotV, shininess);

  // Sum up all three lighting components into the color for the vertex,
  // and send it to the fragment shader.
  fragmentColor = vec4((  kAmbient * ambientLightColor * interpolatedColor.xyz
                      + kDiffuse * diffuseLightColor * diffuseWeight * interpolatedColor.xyz
                      + kSpecular * specularLightColor * specularWeight), 1.0);
}
`

//-----------------------------------------------------------------------------
// Setup functions (run once)
/**
 * Startup function called from the HTML code to start program.
 */
function startup() {
  // Set up the canvas with a WebGL context.
  canvas = document.getElementById("glCanvas");
  gl = createGLContext(canvas);

  // Compile and link the shader program.
  setupShaders();

  // Let the Terrain object set up its own buffers.
  myTerrain = new Terrain(64, -1, 1, -1, 1);
  myTerrain.setupBuffers(shaderProgram);

  // Set the background color to sky blue (you can change this if you like).
  gl.clearColor(0.82, 0.93, 0.99, 1.0);

  gl.enable(gl.DEPTH_TEST);

  // modify mouseX and mouseY whenver mouse is moved on canvas
  canvas.addEventListener('mousemove', (e) => {
    mouseX = (e.offsetX-canvas.width/2)/(canvas.width/2);
    mouseY = (-e.offsetY+canvas.height/2)/(canvas.height/2);
  });
  canvas.addEventListener('wheel', (e) => {
    zoom *= 1+e.deltaY*0.001;
    zoom = Math.min(Math.max(1/8, zoom), 8);
  });

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
 * Sets up the vertex and fragment shaders.
 */
function setupShaders() {
  // Compile the shaders' source code.
  vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, shader_vs);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(vertexShader));
    return null;
  } 

  fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, shader_fs);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(fragmentShader));
    return null;
  } 


  // Link the shaders together into a program.
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  // We only need the one shader program for this rendering, so we can just
  // bind it as the current program here.
  gl.useProgram(shaderProgram);

  // Query the index of each attribute and uniform in the shader program.
  shaderProgram.locations = {};
  shaderProgram.locations.vertexPosition =
    gl.getAttribLocation(shaderProgram, "vertexPosition");
  shaderProgram.locations.vertexNormal =
    gl.getAttribLocation(shaderProgram, "vertexNormal");
  shaderProgram.locations.vertexColor =
    gl.getAttribLocation(shaderProgram, "vertexColor");


  shaderProgram.locations.modelViewMatrix =
    gl.getUniformLocation(shaderProgram, "modelViewMatrix");
  shaderProgram.locations.projectionMatrix =
    gl.getUniformLocation(shaderProgram, "projectionMatrix");
  shaderProgram.locations.normalMatrix =
    gl.getUniformLocation(shaderProgram, "normalMatrix");

  shaderProgram.locations.kAmbient =
    gl.getUniformLocation(shaderProgram, "kAmbient");
  shaderProgram.locations.kDiffuse =
    gl.getUniformLocation(shaderProgram, "kDiffuse");
  shaderProgram.locations.kSpecular =
    gl.getUniformLocation(shaderProgram, "kSpecular");
  shaderProgram.locations.shininess =
    gl.getUniformLocation(shaderProgram, "shininess");
  
  shaderProgram.locations.lightPosition =
    gl.getUniformLocation(shaderProgram, "lightPosition");
  shaderProgram.locations.ambientLightColor =
    gl.getUniformLocation(shaderProgram, "ambientLightColor");
  shaderProgram.locations.diffuseLightColor =
  gl.getUniformLocation(shaderProgram, "diffuseLightColor");
  shaderProgram.locations.specularLightColor =
  gl.getUniformLocation(shaderProgram, "specularLightColor");
}

/**
 * Draws the terrain to the screen.
 */
function draw() {
  // Transform the clip coordinates so the render fills the canvas dimensions.
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  // Clear the color buffer and the depth buffer.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Generate the projection matrix using perspective projection.
  const near = 0.1;
  const far = 200.0;
  glMatrix.mat4.perspective(projectionMatrix, degToRad(45), 
                            gl.viewportWidth / gl.viewportHeight,
                            near, far);

  // spherical coordinates calculation (use ISO convention)
  // https://en.wikipedia.org/wiki/Spherical_coordinate_system
  var r = 2.5 * zoom; // distance
  var phi = degToRad(-90-90*mouseX);
  var theta = degToRad(45+45*mouseY);
  var eyeX = r * Math.sin(theta) * Math.cos(phi);
  var eyeY = r * Math.sin(theta) * Math.sin(phi);
  var eyeZ = r * Math.cos(theta);

  // Generate the view matrix using lookat.
  const lookAtPt = glMatrix.vec3.fromValues(0.0, 0.0, -0.2);
  const eyePt = glMatrix.vec3.fromValues(eyeX, eyeY, eyeZ);
  const up = glMatrix.vec3.fromValues(0.0, 0.0, 1.0);
  glMatrix.mat4.lookAt(modelViewMatrix, eyePt, lookAtPt, up);

  setMatrixUniforms();
  setLightUniforms(ambientLightColor, diffuseLightColor, specularLightColor,
                   lightPosition);
  
  // Draw the triangles, the wireframe, or both, based on the render selection.
  if (document.getElementById("polygon").checked) { 
    setMaterialUniforms(kAmbient, kDiffuse, kSpecular, shininess);
    myTerrain.drawTriangles();
  }
  else if (document.getElementById("wirepoly").checked) {
    setMaterialUniforms(kAmbient, kDiffuse, kSpecular, shininess); 
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1, 1);
    myTerrain.drawTriangles();
    gl.disable(gl.POLYGON_OFFSET_FILL);
    setMaterialUniforms(kEdgeBlack, kEdgeBlack, kEdgeBlack, shininess);
    myTerrain.drawEdges();
  }
  else if (document.getElementById("wireframe").checked) {
    setMaterialUniforms(kEdgeBlack, kEdgeBlack, kEdgeBlack, shininess);
    myTerrain.drawEdges();
  }
}


/**
 * Sends the three matrix uniforms to the shader program.
 */
function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.locations.modelViewMatrix, false,
                      modelViewMatrix);
  gl.uniformMatrix4fv(shaderProgram.locations.projectionMatrix, false,
                      projectionMatrix);

  // We want to transform the normals by the inverse-transpose of the
  // Model/View matrix
  glMatrix.mat3.fromMat4(normalMatrix,modelViewMatrix);
  glMatrix.mat3.transpose(normalMatrix,normalMatrix);
  glMatrix.mat3.invert(normalMatrix,normalMatrix);

  gl.uniformMatrix3fv(shaderProgram.locations.normalMatrix, false,
                      normalMatrix);
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

/**
 * Animates...allows user to change the geometry view between
 * wireframe, polgon, or both.
 */
 function animate(currentTime) {
  // Draw the frame.
  draw();
  // Animate the next frame. 
  requestAnimationFrame(animate);
}