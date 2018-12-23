/**
 * A sphere class which contains attributes and methods of a particle.
 * The arrtributes include: radius, position(vec3), velocity(vec3), speed(scalar), mass and color
 * The methods will be used to change a particle's behavior
 */

 class Sphere {

 	/** 
 	 * A constructor function for sphere class
 	 * @ para {radius} Radius(size) of a particle, and it's a random value
 	 * @ para {speed} Initial speed of a particle, and it;s a random scalar
 	 */

 	 constructor(){
 	 	//const BOUNDS = 2.0;
 	 	//var posInBox = 2 * BOUNDS;
 	 	this.radius = Math.random() * 0.5;
 	 	this.speed = Math.random() * 100;
 	 	
 	 	this.position = vec3.create();
 	 	this.position = vec3.random(this.position, 10 - this.radius);

 	 	//this.position = vec3.fromValues(this.shuffle(posInBox - this.radius), this.shuffle(posInBox - this.radius), this.shuffle(posInBox - this.radius));


 	 	this.velocity = vec3.create();
 	 	this.velocity = vec3.random(this.velocity, this.speed);

 	 	this.mass = 1;

 	 	this.color = vec3.fromValues(Math.random(), Math.random(), Math.random());


 	 }
 	 shuffle(value) {
 	 	return value * Math.random() - (value/2);
 	 }

 	 get radius() {
 	 	return this._radius;
 	 }

 	 set radius(radius) {
 	 	this._radius = radius;
 	 }

 	 get position() {
 	 	return this._position;
 	 }

 	 set position(position) {
 	 	this._position = position;
 	 }

 	 get velocity() {
 	 	return this._velocity;
 	 }

 	 set velocity(velocity) {
 	 	this._velocity = velocity;
 	 	this.speed = vec3.length(this.velocity);
 	 }

 	 get speed() {
 	 	return this._speed;
 	 }

 	 set speed(speed) {
 	 	this._speed = Math.max(speed, -speed);
 	 }

 	 get mass(){
 	 	return this._mass;
 	 }

 	 set mass(mass) {
 	 	this._mass = mass;
 	 }

 	 get color() {
 	 	return this._color;
 	 }

 	 set color(color){
 	 	this._color = color;
 	 }

 

 	 frictionFactor(timeDelta) {
 	 	return Math.pow(0.9, timeDelta);
 	 }

 	 get gravity() {
 	 	var gravity = -0.032;
 	 	return vec3.fromValues(0, gravity, 0);
 	 }

 	 //get acceleration() {
 	 	//var gravity = this.gravityForce;
 	 	//vec3.scale(gravity, gravity, 1/this.mass);
 	 	//return gravity;
 	 //}

 	 updateVelocity (timeDelta) {
 	 	var acceleration = this.gravity;
 	 	//vec3.scale(acceleration, acceleration, timeDelta);

 	 	var velocity = this.velocity;
 	 	// Or inverse scale and velocity?
 	 	vec3.add(velocity, velocity, acceleration);
 	 	vec3.scale(velocity, velocity, this.frictionFactor(timeDelta));

 	 	//vec3.add(velocity, velocity, acceleration);
 	 	this.velocity = velocity;

 	 	return this.velocity
 	 }

 	 updatePosition (timeDelta) {
 	 	var velocity = vec3.clone(this.updateVelocity(timeDelta));

 	 	var distance = vec3.create();
 	 	vec3.scale(distance, velocity, timeDelta);

 	 	var position = this.position;
 	 	vec3.add(position, position, velocity);
 	 	this.position = position;

 	 	return this.position;
 	 }

 	 handleCollision(timeDelta) {
 	 	var [x, y, z] = this.position;
 	 	var [xV, yV, zV] = this.velocity;

 	 	// The bounding range is (-1, 1, -1, 1, -1, 1)
 	 	// Accoording to bounding range, calculate the bounding position
 	 	var xMin = -10 + this.radius;
 	 	var xMax = 10 - this.radius;
 	 	var yMin = -10 + this.radius;
 	 	var yMax = 10 - this.radius;
 	 	var zMin = -10 + this.radius;
 	 	var zMax = 10 - this.radius;

 	 	if (x <= xMin){
 	 		x = xMin;
 	 		xV *= -0.9;
 	 	}

 	 	if (x >= xMax) {
 	 		x = xMax;
 	 		xV *= -0.9;
 	 	}

 	 	if (y <= yMin) {
 	 		y = yMin;
 	 		yV *= -0.9;
 	 	}

 	 	if (y >= yMax) {
 	 		y = yMax;
 	 		yV *= -0.9;
 	 	}

 	 	if (z <= zMin) {
 	 		z = zMin;
 	 		zV *= -0.9;
 	 	}

 	 	if (z >= zMax) {
 	 		z = zMax;
 	 		zV *= -0.9;
 	 	}

 	 	this.position = vec3.fromValues(x, y, z);
 	 	this.velocity = vec3.fromValues(xV, yV, zV);
 	 }

 	 tick(timeDelta) {
 	 	this.updatePosition(timeDelta);
 	 	this.handleCollision(timeDelta);
 	 }


 }