O2.extendClass('Stub.Game', O876_Raycaster.Engine, {
	sGeneratorUrl : '../../dynamics/laby/laby.php',
	///////////// EVENEMENTS /////////////
//LEVEL_DATA.demo
	/**
	 * Evènement appelé lorsqu'un niveau a été chargé
	 * Permet l'initialisation des objet nouvellement créés (comme la caméra)
	 */
	onEnterLevel: function() {
		this.oRaycaster.nPlaneSpacing = 64;
		var oCT = new O876_Raycaster.FirstPersonThinker();
		oCT.oMouse = this.getMouseDevice(this.oRaycaster.getScreenCanvas());
		oCT.oKeyboard = this.getKeyboardDevice();
		oCT.oGame = this;
		this.oRaycaster.oCamera.setThinker(oCT);
		oCT.on('use.down', (function() {
			this.oGame.activateWall(this.oMobile);    
		}).bind(oCT));

		this.oRaycaster.oCamera.fSpeed = 6;
		this.oRaycaster.bSky = true;
		this.oRaycaster.bFlatSky = true;
	},

	/**
	 * Evènement appelé par le processeur
	 * Ici on lance les animation de textures
	 */
	onDoomLoop: function() {
		this.processKeys();
		this.oRaycaster.textureAnimation();
	},
	
	processKeys: function() {
		switch (this.getKeyboardDevice().inputKey()) {
			case KEYS.ALPHANUM.I:
				this.oRaycaster.fViewHeight += 0.1;
				break;
				
			case KEYS.ALPHANUM.O: 
				this.oRaycaster.fViewHeight -= 0.1;
				break;
		}
	},
	
	
	/**
	 * Evènement appelé à chaque rendu de frame
	 */
	onFrameRendered: function() {
	},
	
	/** 
	 * Appelé par le thinker de caméra
	 */
	activateWall: function(m) {
		var oBlock = m.getFrontCellXY(); 
		this.openDoor(oBlock.x, oBlock.y);
	}
});
MAIN.autorun(CONFIG);