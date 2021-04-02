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
var shininess = 20;

// Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [0, 2, 2];
/** @global Ambient light color/intensity for Phong reflection */
var ambientLightColor = [0.1, 0.1, 0.1];
/** @global Diffuse light color/intensity for Phong reflection */
var diffuseLightColor = [0.5, 0.5, 0.5];
/** @global Specular light color/intensity for Phong reflection */
var specularLightColor = [0.4, 0.4, 0.4];

/** @global Edge color for black wireframe */
var kEdgeBlack = [0.0, 0.0, 0.0];
/** @global Edge color for white wireframe */
var kEdgeWhite = [0.7, 0.7, 0.7];

/** @global Records time last frame was rendered */
var previousTime = 0;

/** @global the camera's current position */
var camPosition = glMatrix.vec3.fromValues(-1.0, 0.0, 0.3);
/** @global the camera's current orientation */
var camOrientation = glMatrix.quat.create();
/** @global the camera's current speed in the forward direction */
var camSpeed = 0.02;

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

uniform bool fogEnabled;

out vec4 fragmentColor;

void main(void) {
  // Transform the vertex position and normal to view coordinates
  vec3 vertexPositionView =(modelViewMatrix * vec4(interpolatedPosition, 1.0)).xyz;
  vec3 vertexNormalView = normalize(normalMatrix * interpolatedNormal);
  vec3 lightPositionView = (modelViewMatrix * vec4(lightPosition, 1.0)).xyz;

  // The camera is at the origin in view coordinates
  vec3 cameraPositionView = vec3(0.0, 0.0, 0.0);

  // Calculate the three other vectors we need: l, r, and v
  vec3 lightVector = normalize(lightPositionView - vertexPositionView);
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

  // use LOG2 equation to calculate fog, from slides
  if (fogEnabled) {
    #define LOG2 1.442695
    float fogDistance = length(vertexPositionView);
    float fogAmount = 1.0 - exp2(-0.8 * 0.8 * fogDistance * fogDistance * LOG2);
    fogAmount = clamp(fogAmount, 0.0, 1.0);
    fragmentColor = fragmentColor * (1.0-fogAmount) + vec4(0.82, 0.93, 0.99, 1.0) * fogAmount;
  }
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
  myTerrain = new Terrain(128, -1, 1, -1, 1);
  myTerrain.setupBuffers(shaderProgram);

  // Set the background color to sky blue (you can change this if you like).
  gl.clearColor(0.82, 0.93, 0.99, 1.0);

  gl.enable(gl.DEPTH_TEST);

  // modify mouseX and mouseY whenver mouse is moved on canvas
  document.addEventListener('keydown', handleKeyDown);

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

  shaderProgram.locations.fogEnabled =
  gl.getUniformLocation(shaderProgram, "fogEnabled");
}

/**
 * Draws the terrain to the screen.
 */
function draw(eyePt, lookAtPt, up) {
  // Transform the clip coordinates so the render fills the canvas dimensions.
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  // Clear the color buffer and the depth buffer.
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Generate the projection matrix using perspective projection.
  var near = 0.1;
  var far = 200.0;
  glMatrix.mat4.perspective(projectionMatrix, degToRad(45),
                            gl.viewportWidth / gl.viewportHeight,
                            near, far);

  // Generate the view matrix using lookat.
  glMatrix.mat4.lookAt(modelViewMatrix, eyePt, lookAtPt, up);

  setMatrixUniforms();
  setLightUniforms(ambientLightColor, diffuseLightColor, specularLightColor,
                   lightPosition);
  gl.uniform1i(shaderProgram.locations.fogEnabled, document.getElementById("fogEnabled").checked);

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
 * Handles Up Down Left Right WASDQE buttons for camera orientation quat
 * @param {KeyboardEvent} e Keydown Event
 */
function handleKeyDown(e) {
  // handle speed adjustments and resets here
  // if none of the keys match, return
  switch (e.key) {
    case "-":
    case "_":
      camSpeed = camSpeed / 1.5;
      return;
    case "=":
    case "+":
      camSpeed = camSpeed * 1.5;
      return;
    case "Escape":
      camPosition = glMatrix.vec3.fromValues(-1.0, 0.0, 0.5);
      camOrientation = glMatrix.quat.create();
      camSpeed = 0.05;
      return;
    case "ArrowUp":
    case "w":
    case "ArrowDown":
    case "s":
    case "ArrowLeft":
    case "a":
    case "ArrowRight":
    case "d":
    case "q":
    case "e":
      break;
    default:
      return;
  }

  // normalize camOrientation to calculate local euler axes
  glMatrix.quat.normalize(camOrientation, camOrientation);
  // Forward Axis
  var qQuat = glMatrix.quat.clone(camOrientation);
  var pQuat = glMatrix.quat.fromValues(1.0, 0.0, 0.0, 0.0);
  glMatrix.quat.multiply(pQuat, qQuat, pQuat);
  glMatrix.quat.conjugate(qQuat, qQuat);
  glMatrix.quat.multiply(pQuat, pQuat, qQuat);
  var forwardAxis = glMatrix.vec3.fromValues(pQuat[0], pQuat[1], pQuat[2]);
  glMatrix.vec3.normalize(forwardAxis, forwardAxis);

  // Left Axis
  var qQuat = glMatrix.quat.clone(camOrientation);
  var pQuat = glMatrix.quat.fromValues(0.0, 1.0, 0.0, 0.0);
  glMatrix.quat.multiply(pQuat, qQuat, pQuat);
  glMatrix.quat.conjugate(qQuat, qQuat);
  glMatrix.quat.multiply(pQuat, pQuat, qQuat);
  var leftAxis = glMatrix.vec3.fromValues(pQuat[0], pQuat[1], pQuat[2]);
  glMatrix.vec3.normalize(leftAxis, leftAxis);

  // Up Axis
  var qQuat = glMatrix.quat.clone(camOrientation);
  var pQuat = glMatrix.quat.fromValues(0.0, 0.0, 1.0, 0.0);
  glMatrix.quat.multiply(pQuat, qQuat, pQuat);
  glMatrix.quat.conjugate(qQuat, qQuat);
  glMatrix.quat.multiply(pQuat, pQuat, qQuat);
  var upAxis = glMatrix.vec3.fromValues(pQuat[0], pQuat[1], pQuat[2]);
  glMatrix.vec3.normalize(upAxis, upAxis);

  // adjust camera orientation
  switch (e.key) {
    case "ArrowUp":
    case "w":
      var deltaCam = glMatrix.quat.setAxisAngle(glMatrix.quat.create(), leftAxis, degToRad(-5));
      glMatrix.quat.multiply(camOrientation, deltaCam, camOrientation);
      break;
    case "ArrowDown":
    case "s":
      var deltaCam = glMatrix.quat.setAxisAngle(glMatrix.quat.create(), leftAxis, degToRad(5));
      glMatrix.quat.multiply(camOrientation, deltaCam, camOrientation);
      break;
    case "a":
      var deltaCam = glMatrix.quat.setAxisAngle(glMatrix.quat.create(), upAxis, degToRad(5));
      glMatrix.quat.multiply(camOrientation, deltaCam, camOrientation);
      break;
    case "d":
      var deltaCam = glMatrix.quat.setAxisAngle(glMatrix.quat.create(), upAxis, degToRad(-5));
      glMatrix.quat.multiply(camOrientation, deltaCam, camOrientation);
      break;
    case "ArrowLeft":
    case "q":
      var deltaCam = glMatrix.quat.setAxisAngle(glMatrix.quat.create(), forwardAxis, degToRad(-5));
      glMatrix.quat.multiply(camOrientation, deltaCam, camOrientation);
      break;
    case "ArrowRight":
    case "e":
      var deltaCam = glMatrix.quat.setAxisAngle(glMatrix.quat.create(), forwardAxis, degToRad(5));
      glMatrix.quat.multiply(camOrientation, deltaCam, camOrientation);
      break;
  }
}

/**
 * Animates...allows user to change the geometry view between
 * wireframe, polgon, or both.
 */
function animate(currentTime) {
  // Convert the time to seconds.
  currentTime *= 0.001;
  // Subtract the previous time from the current time.
  var deltaTime = currentTime - previousTime;
  // Remember the current time for the next frame.
  previousTime = currentTime;

  // camLookDir = (q p q^-1)
  var qQuat = glMatrix.quat.clone(camOrientation);
  var pQuat = glMatrix.quat.fromValues(1.0, 0.0, 0.0, 0.0);
  glMatrix.quat.multiply(pQuat, qQuat, pQuat);
  glMatrix.quat.conjugate(qQuat, qQuat);
  glMatrix.quat.multiply(pQuat, pQuat, qQuat);
  var camLookDir = pQuat.slice(0,3);

  // camUpDir = (q p q^-1)
  var qQuat = glMatrix.quat.clone(camOrientation);
  var pQuat = glMatrix.quat.fromValues(0.0, 0.0, 1.0, 0.0);
  glMatrix.quat.multiply(pQuat, qQuat, pQuat);
  glMatrix.quat.conjugate(qQuat, qQuat);
  glMatrix.quat.multiply(pQuat, pQuat, qQuat);
  var camUpDir = pQuat.slice(0,3);

  var lookAtPt = glMatrix.vec3.create();
  glMatrix.vec3.add(lookAtPt, camPosition, camLookDir);

  // Draw the frame.
  draw(camPosition, lookAtPt, camUpDir);

  // camPosition = camPosition + deltaTime * camLookDir;
  glMatrix.vec3.scale(camLookDir, camLookDir, deltaTime*camSpeed);
  glMatrix.vec3.add(camPosition, camPosition, camLookDir);

  // Animate the next frame.
  requestAnimationFrame(animate);
}
