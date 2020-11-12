var scene, renderer;
var cameras = [];

var geometry;

var clock = new THREE.Clock();

//Flags used to determine which camera will be actived
var ort_camera = false;
var pers_camera = false;
var moving_camera = false;
//Variable used to determine which camera is active
var which_camera = 0;

//variable with the number of balls
var num_balls = 15;
//Array used to store the balls
var balls = [];
//Array used to store the balls colors
var balls_colors = [0xF1D302, 0x044B7F, 0xF42B03, 0x541388, 0xEC7505, 0x013220, 0x95190C];

//Array used to store the sticks
var sticks = [];
//Array used to store the sticks material
var sticks_material = [];
//Flags to select the sticks 
var sticks_selected = [false, false, false, false, false, false]
//Flags to rotate the selected sticks
var rotate_sticks_left = false;
var rotate_sticks_right = false;
//Flag for when the player shoots
var shoot = false;
//Flag to enable camera usage since at least one ball was shot
var ball_shot = false; 

//Checks if a position is valid
var has_correct_position = false;

//Array used to store the holes
var holes = [];

//Ball to follow with camera 3
var ball_to_follow;

//Constants for the sizes
const TABLE_WIDTH = 600;
const TABLE_DEPTH = 300;
const TABLE_THICKNESS = 5;
const TABLE_HEIGTH = 75;
const BALL_RADIUS = 12.5;
const HOLE_RADIUS = 17.5;
const HOLE_THICKNESS = 5.1;
const HOLE_DIST = 30;
const NUMBER_HOLES = 6;
const STICK_RADIUS_BOTTOM = 3;
const STICK_RADIUS_TOP = 6;
const STICK_SIZE = 180;
const STICK_ANGLE = Math.PI/8;
const STICK_PROXIMITY = 20;

function hasWallsVCollision(ball) {
	//Checks if there is a collision with the vertical walls
	return (ball.position.x - BALL_RADIUS < -TABLE_WIDTH/2 + TABLE_THICKNESS/2 || 
		ball.position.x + BALL_RADIUS > TABLE_WIDTH/2 - TABLE_THICKNESS/2)
}

function hasWallsHCollision(ball) {
	//Checks if there is a collision with the horizontal walls
	return (ball.position.z - BALL_RADIUS < -TABLE_DEPTH/2  + TABLE_THICKNESS/2 || 
		ball.position.z + BALL_RADIUS > TABLE_DEPTH/2 - TABLE_THICKNESS/2)
}

function ballsCollision(ball, old_position) {

	//ball to ball collision
	for(var j = 0; j < num_balls; j++) {
		
		//Handling of a ball-ball collision
		//We assume that all balls have the same mass
		if (ball != balls[j] && ball.position.distanceTo(balls[j].position) <= 2*BALL_RADIUS){
			
			//We place the ball in its old position so that it leaves some space between the balls otherwise they often get stuck together
			ball.position.x = old_position.x;
			ball.position.z = old_position.z;

			//Calculating the vector that will give difference of positions between the two colliding balls
			var collision_angle = new THREE.Vector3();
			collision_angle.copy(ball.position).sub(balls[j].position).normalize();

			//Calculating the vector that will give difference of velocities between the two colliding balls
			var collision_velocity = new THREE.Vector3(); 
			collision_velocity.copy(ball.velocity).sub(balls[j].velocity);
			
			//Calculating the dot product between the collision angle vector and the collision velocity vector
			var dot_product = collision_velocity.dot(collision_angle);

			//Multiply the collision angle by the dot product
			collision_angle = collision_angle.multiplyScalar(dot_product);

			//We decrease the speed of the ball that collided
			ball.velocity.sub(collision_angle);
			//We increase the speed of the ball that was hit
			balls[j].velocity.add(collision_angle);

			//We put the y velocities to 0 so that the balls don't lift from the ground
			ball.velocity.y = 0;
			balls[j].velocity.y = 0;
		}
	}	

	//holes interception
	for(var i = 0; i < NUMBER_HOLES; i++) {
		//If the center of the ball is inside the hole the ball will fall (taking into account that the center of the hole is inside the table)
		//Pythagoras Theorem
		//Distance to from center of hole to ball is sqrt((hole radius)^2 + (distance from the center of the hole to the value of height of the ball)^2)
		if(ball.position.distanceTo(holes[i].position) <= Math.sqrt(Math.pow(HOLE_RADIUS, 2) + Math.pow(TABLE_THICKNESS/2+BALL_RADIUS, 2))) {
			ball.velocity.set(0, -100, 0);
			break;
		}
	}
	
	//walls collision 
	//Handling of a vertical wall collision
	if(hasWallsVCollision(ball)) {
		//Backtracking the ball position so that it won't get stuck in the wall
		ball.position.x = old_position.x;
		ball.position.z = old_position.z;
		
		ball.velocity.set(-1*ball.velocity.x, ball.velocity.y, ball.velocity.z);
	}

	//Handling of a horizontal wall collision
	if(hasWallsHCollision(ball)) {
		//Backtracking the ball position so that it won't get stuck in the wall
		ball.position.x = old_position.x;
		ball.position.z = old_position.z;
		
		ball.velocity.set(ball.velocity.x, ball.velocity.y, -1*ball.velocity.z);
	}
}

//====Function used to create the table top====
function createTableTop() {
	'use strict';
	
	geometry = new THREE.BoxGeometry(TABLE_WIDTH, TABLE_THICKNESS, TABLE_DEPTH);
	var material = new THREE.MeshBasicMaterial({color: 0x004731});

	var table_top = new THREE.Mesh(geometry, material);
	
	scene.add(table_top);
}

//====Function used to create the table walls====
function createTableWalls() {
	'use strict';
	
	//Create lateral walls
	geometry = new THREE.BoxGeometry(TABLE_THICKNESS, TABLE_HEIGTH, TABLE_DEPTH+TABLE_THICKNESS);
	var material = new THREE.MeshBasicMaterial({color: 0x663300});

	var wall_left = new THREE.Mesh(geometry, material);
	wall_left.position.set(-TABLE_WIDTH/2,0,0);
	
	scene.add(wall_left);

	var wall_right = new THREE.Mesh(geometry, material);
	wall_right.position.set(TABLE_WIDTH/2,0,0);
	
	scene.add(wall_right);

	//Create central walls
	geometry = new THREE.BoxGeometry(TABLE_WIDTH, TABLE_HEIGTH, TABLE_THICKNESS);
	var material = new THREE.MeshBasicMaterial({color: 0x663300});

	var wall_far = new THREE.Mesh(geometry, material);
	wall_far.position.set(0,0,-TABLE_DEPTH/2);
	
	scene.add(wall_far);

	var wall_near = new THREE.Mesh(geometry, material);
	wall_near.position.set(0,0,TABLE_DEPTH/2);
	
	scene.add(wall_near);
}

//====Function used to create the white balls====
function createBalls() {
	'use strict';

	for(var i = 0; i < num_balls; i++){
		var x_coordinate;
		var z_coordinate;

		//each ball starts without a position; lets find one
		has_correct_position = false;

		//creates ball
		geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32 );
		var material = new THREE.MeshBasicMaterial({color: balls_colors[i%7]});

		var ball = new THREE.Mesh(geometry, material);
		ball.add(new THREE.AxesHelper(30));
		
		//founds a correct position for the ball
		while(!has_correct_position){
			x_coordinate = THREE.MathUtils.randFloat(-TABLE_WIDTH/2+BALL_RADIUS+TABLE_THICKNESS, TABLE_WIDTH/2-BALL_RADIUS-TABLE_THICKNESS);
			z_coordinate = THREE.MathUtils.randFloat(-TABLE_DEPTH/2+BALL_RADIUS+TABLE_THICKNESS, TABLE_DEPTH/2-BALL_RADIUS-TABLE_THICKNESS);

			//first ball
			if(i==0){
				has_correct_position = true;
				var material = new THREE.MeshBasicMaterial({color: 0x000000});

				var ball = new THREE.Mesh(geometry, material);
				ball.add(new THREE.AxesHelper(30));
				break;
			}
			
			//go through every ball already created
			for(var j = 0; j < i; j++){

				//formula : d = ((x2-x1)^2 + (z2-z1)^2)^1/2
		
				var aux = Math.pow(x_coordinate - balls[j].position.x,2) + Math.pow(z_coordinate - balls[j].position.z,2);

				var distance = Math.pow(aux, 0.5);

				if(distance <= 2*BALL_RADIUS){
					has_correct_position = false
					break;
				}

				else
					has_correct_position = true;
			}

		}

		ball.position.set(x_coordinate, TABLE_THICKNESS/2+BALL_RADIUS, z_coordinate);

		//sets random values for ball velocity
		ball.velocity = new THREE.Vector3(THREE.MathUtils.randFloat(-100, 100), 0, THREE.MathUtils.randFloat(-100, 100));
		
		balls.push(ball);
		scene.add(ball);
	}
}


//====Function used to create the holes====
function createHoles() {
	'use strict';

	for(var i = 0; i < NUMBER_HOLES; i++) {
		var cylinder_geometry = new THREE.CylinderGeometry(HOLE_RADIUS, HOLE_RADIUS, HOLE_THICKNESS, 32);
		var material = new THREE.MeshBasicMaterial({color: 0xA9A9A9});

		var hole = new THREE.Mesh(cylinder_geometry, material);
		
		switch(i){
			case 0:
				hole.position.set(-TABLE_WIDTH/2+HOLE_DIST/2+TABLE_THICKNESS, 0, TABLE_DEPTH/2-HOLE_DIST/2-TABLE_THICKNESS);
				break;

			case 1:
				hole.position.set(0, 0, TABLE_DEPTH/2-HOLE_DIST/2-TABLE_THICKNESS);
				break;

			case 2:
				hole.position.set(TABLE_WIDTH/2-HOLE_DIST/2-TABLE_THICKNESS, 0, TABLE_DEPTH/2-HOLE_DIST/2-TABLE_THICKNESS);
				break;		
		
			case 3:
				hole.position.set(-TABLE_WIDTH/2+HOLE_DIST/2+TABLE_THICKNESS, 0, -TABLE_DEPTH/2+HOLE_DIST/2+TABLE_THICKNESS);
				break;

			case 4:
				hole.position.set(0, 0, -TABLE_DEPTH/2+HOLE_DIST/2+TABLE_THICKNESS);
				break;

			case 5:
				hole.position.set(TABLE_WIDTH/2-HOLE_DIST/2-TABLE_THICKNESS, 0, -TABLE_DEPTH/2+HOLE_DIST/2+TABLE_THICKNESS);
				break;
		}

		holes.push(hole);
		scene.add(hole);
	}
}

//====Function used to create the sticks====
function createSticks() {
	'use strict';

	geometry = new THREE.CylinderGeometry(STICK_RADIUS_TOP, STICK_RADIUS_BOTTOM, STICK_SIZE, 32);

	var stick1_material = new THREE.MeshBasicMaterial({color: 0xB06C49});
	sticks_material.push(stick1_material);

	var stick2_material = new THREE.MeshBasicMaterial({color: 0xB06C49});
	sticks_material.push(stick2_material);

	var stick3_material = new THREE.MeshBasicMaterial({color: 0xB06C49});
	sticks_material.push(stick3_material);

	var stick4_material = new THREE.MeshBasicMaterial({color: 0xB06C49});
	sticks_material.push(stick4_material);

	var stick5_material = new THREE.MeshBasicMaterial({color: 0xB06C49});
	sticks_material.push(stick5_material);

	var stick6_material = new THREE.MeshBasicMaterial({color: 0xB06C49});
	sticks_material.push(stick6_material);

	for(var i = 0; i < 6; i++){

		var stick = new THREE.Mesh(geometry, sticks_material[i]);

		switch(i){
			case 0:
				stick.position.set(-TABLE_WIDTH/2-STICK_SIZE/2+STICK_PROXIMITY, TABLE_HEIGTH, 0);
				stick.rotation.z += Math.PI/2 - STICK_ANGLE;
				break;

			case 1:
				stick.position.set(-TABLE_WIDTH/4, TABLE_HEIGTH, TABLE_DEPTH/2+STICK_SIZE/2-STICK_PROXIMITY);
				stick.rotation.x += Math.PI/2 - STICK_ANGLE;
				break;

			case 2:
				stick.position.set(TABLE_WIDTH/4, TABLE_HEIGTH, TABLE_DEPTH/2+STICK_SIZE/2-STICK_PROXIMITY);
				stick.rotation.x += Math.PI/2 - STICK_ANGLE;
				break;		
		
			case 3:
				stick.position.set(TABLE_WIDTH/2+STICK_SIZE/2-STICK_PROXIMITY, TABLE_HEIGTH, 0);
				stick.rotation.z -= Math.PI/2 - STICK_ANGLE;
				break;

			case 4:
				stick.position.set(TABLE_WIDTH/4, TABLE_HEIGTH, -TABLE_DEPTH/2-STICK_SIZE/2+STICK_PROXIMITY);
				stick.rotation.x -= Math.PI/2 - STICK_ANGLE;
				break;

			case 5:
				stick.position.set(-TABLE_WIDTH/4, TABLE_HEIGTH, -TABLE_DEPTH/2-STICK_SIZE/2+STICK_PROXIMITY);
				stick.rotation.x -= Math.PI/2 - STICK_ANGLE;
				break;
		}

		sticks.push(stick);
		scene.add(stick);
	}
}

//====Function used to create the camera====
function createCameras() {
	'use strict';
	
	var orthograpic_camera1 = new THREE.OrthographicCamera(-window.innerWidth/2, window.innerWidth/2, window.innerHeight/2, -window.innerHeight/2, -1000, 1000);
	var perspective_camera2 = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 1000);
	var perspective_camera3 = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 1000);
	
	cameras.push(orthograpic_camera1);
	cameras.push(perspective_camera2);
	cameras.push(perspective_camera3);

	cameras[0].position.set(0,10,0);
	cameras[1].position.set(250,400,250);

	cameras[0].lookAt(scene.position);
	cameras[1].lookAt(scene.position);
}

//====Function used to create the scene====
function createScene() {
	'use strict';
	
	scene = new THREE.Scene();

	createTableTop();
	createTableWalls();
	createBalls();
	createHoles();
	createSticks();
}

//====Function used to render the scene====
function render() {
	'use strict';

	renderer.render(scene, cameras[which_camera]);
}

//====Function used when the window is resized====
function onResize() {
	'use strict';
	
	renderer.setSize(window.innerWidth, window.innerHeight);
	
	if (window.innerHeight > 0 && window.innerWidth > 0) {
		if(which_camera == 0) {
			cameras[0].left = -window.innerWidth/2;
			cameras[0].right = window.innerWidth/2;
			cameras[0].top = window.innerHeight/2;
			cameras[0].bottom = -window.innerHeight/2; 
			cameras[0].aspect = window.innerWidth / window.innerHeight;
			cameras[0].updateProjectionMatrix();
		}
		else if(which_camera == 1 || which_camera == 2) {
			cameras[which_camera].aspect = renderer.getSize().width / renderer.getSize().height;
			cameras[which_camera].updateProjectionMatrix();
		}
	}
}

//====Function used to handle the event of a key being pressed====
function onKeyDown(e) {
	'use strict';
	
	switch (e.keyCode) {
		case 49: //1 Activating orthographic camera
			ort_camera = true
			break;
			
		case 50: //2 Activating perspective camera
			pers_camera = true
			break;
		
		case 51: //3 Activating moving camera
			moving_camera = true;
			break;	

		case 52: //4 
			sticks_selected[0] = !sticks_selected[0];
			break;
			
		case 53: //5 
			sticks_selected[1] = !sticks_selected[1];
			break;

		case 54: //6 
			sticks_selected[2] = !sticks_selected[2];
			break;	
		
		case 55: //7 
			sticks_selected[3] = !sticks_selected[3];
			break;
			
		case 56: //8 
			sticks_selected[4] = !sticks_selected[4];
			break;

		case 57: //9 
			sticks_selected[5] = !sticks_selected[5];
			break;	

		case 37: //left arrow
			rotate_sticks_left = true;
			break;

		case 39: //right arrow
			rotate_sticks_right = true;
			break;
		
		case 32: //space bar
			shoot = true;
			break; 
	}
}


//====Function used to animate the scene====
function animate() {
	'use strict';

	if(ort_camera){
		moving_camera = false;
		which_camera = 0;
		ort_camera = false;
	}

	else if(pers_camera) {
		moving_camera = false;
		which_camera = 1;
		pers_camera = false;
	} 

	else if(moving_camera && ball_shot) {
		which_camera = 2;
		
		//we didnt add the camera to the ball since the ball would be rotating so the camera would rotate too which is undesired
		cameras[2].position.set(ball_to_follow.position.x-Math.sign(ball_to_follow.velocity.x)*30, 
			ball_to_follow.position.y+60, 
			ball_to_follow.position.z-Math.sign(ball_to_follow.velocity.z)*30);

		cameras[2].lookAt(ball_to_follow.position);
	}

	for(var i = 0; i< sticks_selected.length; i++) {
		if(sticks_selected[i])
			sticks[i].material.color.setHex(0xFFC200);
		else
			sticks[i].material.color.setHex(0xB06C49);
	}

	var delta = clock.getDelta();
	
	//Rotation of the sticks limited to the interval of [-PI/6, PI/6]
	if(rotate_sticks_left) {										
		for (var i = 0; i < sticks_selected.length; i++) {
			if(sticks_selected[i]){
				if(i == 0 || i == 3) {
					if(sticks[i].rotation.y >= Math.PI/6)
						sticks[i].rotation.y = Math.PI/6;
	
					else
						sticks[i].rotation.y += 0.5*delta;
				}

				else if(i == 1 || i == 2){

					if(sticks[i].rotation.z <= -Math.PI/6)
						sticks[i].rotation.z = -Math.PI/6;
					else
						sticks[i].rotation.z -= 0.5*delta;
				}

				else if(i == 4 || i == 5) {
					if(sticks[i].rotation.z >= Math.PI/6)
						sticks[i].rotation.z = Math.PI/6;
					else
						sticks[i].rotation.z += 0.5*delta;
				}
			}
		}
		
		rotate_sticks_left = false;
	}

	if(rotate_sticks_right) {										
		for (var i = 0; i < sticks_selected.length; i++) {
			if(sticks_selected[i]) {

				if(i == 0 || i == 3) {

					if (sticks[i].rotation.y <= -Math.PI/6) 
						sticks[i].rotation.y = -Math.PI/6;
					
					else
						sticks[i].rotation.y -= 0.5*delta;
				}
				
				else if(i == 1 || i == 2){
					if(sticks[i].rotation.z >= Math.PI/6) 
						sticks[i].rotation.z = Math.PI/6;
					
					else
						sticks[i].rotation.z += 0.5*delta;
				}

				else if(i == 4 || i == 5){
					if(sticks[i].rotation.z <= -Math.PI/6) 
					sticks[i].rotation.z = -Math.PI/6;
				
				else
					sticks[i].rotation.z -= 0.5*delta;
				}
			}
		}	

		rotate_sticks_right = false;
	}

	//creation and shot of the sticks white balls
	if(shoot) {

		for(var i = 0;i < sticks_selected.length; i++) {
			if(sticks_selected[i]) {
				geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32 );
				var material = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
		
				var ball = new THREE.Mesh(geometry, material);
				ball.add(new THREE.AxesHelper(30));
				balls.push(ball);

				var temp_ball_pos = new THREE.Vector3();

				if(i == 0) {
					
					temp_ball_pos.set(sticks[0].position.x + STICK_SIZE/2, TABLE_THICKNESS + BALL_RADIUS, sticks[0].position.z);

					//checks if the stick has rotated
					if(sticks[0].rotation.y >= 0)
						temp_ball_pos.set(temp_ball_pos.x, temp_ball_pos.y, temp_ball_pos.z - Math.tan(sticks[0].rotation.y)*(STICK_SIZE/2));
					else
						temp_ball_pos.set(temp_ball_pos.x, temp_ball_pos.y, temp_ball_pos.z + Math.tan(Math.abs(sticks[0].rotation.y))*(STICK_SIZE/2));
					
					for(var j = 0;j < balls.length; j++) {
						while(temp_ball_pos.distanceTo(balls[j].position) <= 2*BALL_RADIUS) 
							temp_ball_pos.x += BALL_RADIUS;
					}
					
					ball.position.set(temp_ball_pos.x, temp_ball_pos.y, temp_ball_pos.z);

					//sets random values for ball velocity
					ball.velocity = new THREE.Vector3(200, 0, 200*(-sticks[0].rotation.y));
				}

				else if(i == 1 || i == 2) {

					temp_ball_pos.set(sticks[i].position.x, TABLE_THICKNESS + BALL_RADIUS, sticks[i].position.z - STICK_SIZE/2);

					//checks if the stick has rotated
					if(sticks[i].rotation.z >= 0)
						temp_ball_pos.set(temp_ball_pos.x + Math.tan(sticks[i].rotation.z)*(STICK_SIZE/2), temp_ball_pos.y, temp_ball_pos.z);
					else
						temp_ball_pos.set(temp_ball_pos.x - Math.tan(Math.abs(sticks[i].rotation.z))*(STICK_SIZE/2), temp_ball_pos.y, temp_ball_pos.z);
					
					for(var j = 0;j < balls.length; j++) {
						while(temp_ball_pos.distanceTo(balls[j].position) <= 2*BALL_RADIUS) 
							temp_ball_pos.z -= BALL_RADIUS;
					}					
					
					ball.position.set(temp_ball_pos.x, temp_ball_pos.y, temp_ball_pos.z);

					//sets random values for ball velocity
					ball.velocity = new THREE.Vector3(200*sticks[i].rotation.z, 0, -200);
				}

				else if(i == 3) {

					temp_ball_pos.set(sticks[3].position.x - STICK_SIZE/2, TABLE_THICKNESS + BALL_RADIUS, sticks[3].position.z);

					//checks if the stick has rotated
					if(sticks[3].rotation.y >= 0)
						temp_ball_pos.set(temp_ball_pos.x, temp_ball_pos.y, temp_ball_pos.z + Math.tan(sticks[3].rotation.y)*(STICK_SIZE/2));
					else
						temp_ball_pos.set(temp_ball_pos.x, temp_ball_pos.y, temp_ball_pos.z - Math.tan(Math.abs(sticks[3].rotation.y))*(STICK_SIZE/2));
					
					for(var j = 0;j < balls.length; j++) {
						while(temp_ball_pos.distanceTo(balls[j].position) <= 2*BALL_RADIUS) 
							temp_ball_pos.x -= BALL_RADIUS;
					}					
						
					ball.position.set(temp_ball_pos.x, temp_ball_pos.y, temp_ball_pos.z);
	
					//sets random values for ball velocity
					ball.velocity = new THREE.Vector3(-200, 0, 200*sticks[3].rotation.y);
				}

				else if(i == 4 || i == 5) {

					temp_ball_pos.set(sticks[i].position.x, TABLE_THICKNESS + BALL_RADIUS, sticks[i].position.z + STICK_SIZE/2);

					//checks if the stick has rotated
					if(sticks[i].rotation.z >= 0)
						temp_ball_pos.set(temp_ball_pos.x + Math.tan(sticks[i].rotation.z)*(STICK_SIZE/2), temp_ball_pos.y, temp_ball_pos.z);
					else
						temp_ball_pos.set(temp_ball_pos.x - Math.tan(Math.abs(sticks[i].rotation.z))*(STICK_SIZE/2), temp_ball_pos.y, temp_ball_pos.z);
	
					for(var j = 0;j < balls.length; j++) {
						while(temp_ball_pos.distanceTo(balls[j].position) <= 2*BALL_RADIUS) 
							temp_ball_pos.z += BALL_RADIUS;
					}					
						
					ball.position.set(temp_ball_pos.x, temp_ball_pos.y, temp_ball_pos.z);

					//sets random values for ball velocity
					ball.velocity = new THREE.Vector3(200*sticks[i].rotation.z, 0, 200);
				}
				
				scene.add(ball);
				ball_to_follow = ball;
				num_balls++;
			}
		}
		ball_shot = true;
		shoot = false;
	}
	
	var old_position = new THREE.Vector3();
	
	for (var i = 0; i < num_balls ; i++){

		//calculate the new possible position given a velocity 
		old_position.copy(balls[i].position);
		balls[i].position.addScaledVector(balls[i].velocity, delta);

		//DETECTION OF COLLISION AFTER UPDATING POSITION
		ballsCollision(balls[i], old_position);	

		if(Math.abs(balls[i].velocity.x) < 5)
			balls[i].velocity.set(0, balls[i].velocity.y, balls[i].velocity.z); 

		if(Math.abs(balls[i].velocity.z) < 5)
			balls[i].velocity.set(balls[i].velocity.x, balls[i].velocity.y, 0); 
		
		//decrease velocity
		if(Math.abs(balls[i].velocity.x) >= 5 || Math.abs(balls[i].velocity.z) >= 5){
			if(balls[i].velocity.x > 0) {
				balls[i].velocity.x -= 7*delta;
				balls[i].rotation.z -= 0.05*balls[i].velocity.x*delta;
			}
			else if(balls[i].velocity.x < 0){
				balls[i].velocity.x += 7*delta;
				balls[i].rotation.z += -0.05*balls[i].velocity.x*delta;
			}
				
			if(balls[i].velocity.z > 0) {
				balls[i].velocity.z -= 7*delta;
				balls[i].rotation.x += 0.05*balls[i].velocity.z*delta;
			}
			else if(balls[i].velocity.z < 0){
				balls[i].velocity.z += 7*delta;
				balls[i].rotation.x -= -0.05*balls[i].velocity.z*delta;
			}
		}		
	}

	render();
	
	requestAnimationFrame(animate);
}

//====Function used to initialize the core elements====
function init() {
	'use strict';
	
	renderer = new THREE.WebGLRenderer( {antialias: true } );
	
	renderer.setSize(window.innerWidth, window.innerHeight);
	
	document.body.appendChild(renderer.domElement);
	
	createScene();
	createCameras();
	
	render();
	
	window.addEventListener("resize", onResize);
	window.addEventListener("keydown", onKeyDown);
}