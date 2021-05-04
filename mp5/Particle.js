/**
 * @fileoverview Particle.js - Class for spherical particles with wall collision.
 * @author Hwanseo Choi <hwanseo2@illinois.edu>
 */

class Particle {
    constructor() {
        function randomNumber(min, max) { 
            return Math.random() * (max - min) + min;
        }

        // let's simulate a baseball on a moon.
        // box with xyz +- 2 meters
        this.boxSize = 2;
        // confined within box with xyz +- 2 meters
        this.position = glMatrix.vec3.fromValues(0, randomNumber(0, 2), -1);
        // 4 m/s = 14.4 km/h
        this.velocity = glMatrix.vec3.create();
        glMatrix.vec3.random(this.velocity, 8);
        // drag force = dragCoefficient * v^2
        this.dragCoefficient = 0.05;
        // gravitational acceleration
        this.gravAcceleration = glMatrix.vec3.fromValues(0, -10, 0);
        // 0.20 meter (basketball) in radius to 0.05 meters (ping pong ball)
        this.radius = Math.random() * (0.30-0.05) + 0.05;
        // random color
        this.color = glMatrix.vec3.fromValues(Math.random(), Math.random(), Math.random());
        // mass
        this.mass = 1;
        // boolean flag to indicate if it stopped moving
        this.stopUpdating = false;
    }

    update(timeElapsed) {
        if (this.stopUpdating) return;
        if (glMatrix.vec3.length(this.velocity) < 0.01) {
            this.stopUpdating = true;
            return;
        }

        // acceleration due to drag = drag force / mass = v^2 dragCoefficient / mass
        const dragMagnitude = -1*glMatrix.vec3.length(this.velocity) * glMatrix.vec3.length(this.velocity) * this.dragCoefficient / this.mass;
        const drag = glMatrix.vec3.create();
        glMatrix.vec3.scale(drag, this.velocity, dragMagnitude);
        // calculate total acceleration
        const totalAcceleration = glMatrix.vec3.create();
        glMatrix.vec3.add(totalAcceleration, this.gravAcceleration, drag);
        // new velocity = current velocity + timeElapsed * acceleration;
        const newVelocity = glMatrix.vec3.create();
        glMatrix.vec3.scale(newVelocity, totalAcceleration, timeElapsed);
        glMatrix.vec3.add(newVelocity, this.velocity, newVelocity);
        // new position = current position + timeElapsed * velocity;
        const newPosition = glMatrix.vec3.create();
        glMatrix.vec3.scale(newPosition, newVelocity, timeElapsed);
        glMatrix.vec3.add(newPosition, this.position, newPosition);

        glMatrix.vec3.copy(this.velocity, newVelocity);
        glMatrix.vec3.copy(this.position, newPosition);
    }
    
}