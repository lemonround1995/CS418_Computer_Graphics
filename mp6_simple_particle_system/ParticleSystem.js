/**
 * A ParticleSystem class which adds, controls and resets spheres
 */

class ParticleSystem {
	/**
	 * Create a sphereList which contains each sphere object
	 */
	constructor() {
		this.sphereList = [];
	}
	
	get sphereList(){
		return this._sphereList;
	}

	set sphereList(list) {
		this._sphereList = list;
	}

    /**
     * Add a sphere to the list, this function will be called when a user presses the keyboard
     */
	addSphere(){
		this.sphereList.push(new Sphere());
	}
    
    /**
     * Move all the spheres from the list, this function will be called when a user presses the keyboard
     */
	resetSphere(){
		this.sphereList = [];
	}
    /**
     * Control the behavior of each sphere in the list
     */
	tick(timeDelta) {
		for(var i = 0; i < this.sphereList.length; i++){

			this.sphereList[i].tick(timeDelta);
		}
	}
}