/**
 * @class O876_Raycaster.Engine
 * @extends O876_Raycaster.Transistate
 */
O2.extendClass('O876_Raycaster.Engine', O876_Raycaster.Transistate, {
	// Juste une copie du TIME_FACTOR du raycaster
	TIME_FACTOR : 50, // Doit être identique au TIME_FACTOR du raycaster

	// public
	oRaycaster : null,
	oKbdDevice : null,
	oMouseDevice : null,
	oMotionDevice: null,
	oThinkerManager : null,
	
	// protected
	_oFrameCounter: null,
	_nTimeStamp : 0,
	_nTicks: 0,
	_nShadedTiles : 0,
	_nShadedTileCount : 0,
	_oConfig: null,
	
	__construct : function(oConfig) {
		if (!O876.Browser.checkHTML5('O876 Raycaster Engine')) {
			throw new Error('browser is not full html 5');
		}
		this.setConfig(oConfig);
        this._callGameEvent('onInitialize');
	},

	/**
	 * Définition du fichier de configuration
	 */
	setConfig: function(c) {
		this._oConfig = c;
	},

	getConfig: function() {
		return this._oConfig;
	},

	initRaycaster: function(oData) {
        this.TIME_FACTOR = this.nInterval = this._oConfig.game.interval;
        this._oConfig.game.doomloop = this._oConfig.game.doomloop || 'raf';
        if (this.oRaycaster) {
            this.oRaycaster.finalize();
        } else {
            this.oRaycaster = new O876_Raycaster.Raycaster();
            this.oRaycaster.TIME_FACTOR = this.TIME_FACTOR;
        }
        this.oRaycaster.setConfig(this._oConfig.raycaster);
        this.oRaycaster.initialize();
        this.oThinkerManager = this.oRaycaster.oThinkerManager;
        this.oThinkerManager.oGameInstance = this;
        this._callGameEvent('onLoading', 'lvl', 0, 2);
        if (!oData) {
			oData = this._callGameEvent('onRequestLevelData');
			if (!oData) {
				throw new Error('request level data did not send data');
			}
		}
		this.oRaycaster.defineWorld(oData);
        this.setDoomloop('stateBuildLevel');
	},


	/**
	 * Déclenche un évènement
	 * 
	 * @param sEvent
	 *            nom de l'évènement
	 * @param oParam
	 *            paramètre optionnels à transmettre à l'évènement
	 * @return retour éventuel de la fonction évènement
	 */
	_callGameEvent : function(sEvent) {
		if (sEvent in this && this[sEvent]) {
			var pFunc = this[sEvent];
			var aParams = Array.prototype.slice.call(arguments, 1);
			return pFunc.apply(this, aParams);
		}
		return null;
	},

	/**
	 * Arret du moteur et affichage d'une erreur
	 * 
	 * @param sError
	 *            Message d'erreur
	 */
	_halt : function(sError, oError) {
		if (('console' in window) && ('log' in window.console) && (sError)) {
			console.error(sError);
			if (oError) {
				console.error(oError.toString());
			}
		}
		this.pause();
		this.setDoomloop('stateEnd');
		if (this.oKbdDevice) {
			this.oKbdDevice.unplugHandlers();
		}
		if (this.oMouseDevice) {
			this.oMouseDevice.unplugHandlers();
		}
		if (this.oRaycaster) {
			this.oRaycaster.finalize();
			this.oRaycaster = null;
		}
	},

	/**
	 * Renvoie une instance du périphérique clavier
	 * 
	 * @return KeyboardDevice
	 */
	getKeyboardDevice : function() {
		if (this.oKbdDevice === null) {
			var kbd = null;
			var cfgGame = this._oConfig.game;
			if ('devices' in cfgGame) {
				var cfgDev = cfgGame.devices;
				if (typeof cfgDev !== 'object') {
					throw new Error('config.game.devices must be an object');
				}
				if (!cfgDev) {
                    throw new Error('config.game.devices must not be null');
				}
				if ('keyboard' in cfgDev) {
                    var pClass = new O2.loadObject(cfgDev.keyboard);
                    kbd = new pClass();
				}
			}
			if (!kbd) {
				kbd = new O876_Raycaster.KeyboardDevice();
			}
            kbd.plugHandlers();
			this.oKbdDevice = kbd;
		}
		return this.oKbdDevice;
	},

	getMouseDevice : function(oElement) {
		if (this.oMouseDevice === null) {
			if (oElement === undefined) {
				throw new Error('no target element specified for the mouse device');
			}
			this.oMouseDevice = new O876_Raycaster.MouseDevice();
			this.oMouseDevice.plugHandlers(oElement);
		}
		return this.oMouseDevice;
	},
	
	getMotionDevice: function() {
		if (this.oMotionDevice === null) {
			this.oMotionDevice = new O876_Raycaster.MotionDevice();
			this.oMotionDevice.plugHandlers();
		}
		return this.oMotionDevice;
	},
	
	/**
	 * Renvoie le temps actuel en millisecondes
	 * @return {int}
	 */
	getTime: function() {
		return this._nTimeStamp;
	},

	/**
	 * Nombre de fois que la doomloop a calculé d'updates
	 * @return {number}
	 */
	getTicks: function() {
		return this._nTicks;
	},

	/**
	 * Define time
	 * May be usefull whn using pause, to update the last time stamp
	 * and avoid a large amount of compensating calc.
	 */
	setTime: function(n) {
		this._nTimeStamp = n;
	},

	// ////////// METHODES PUBLIQUES API ////////////////


	/**
	 * Returns true if the block at the specified coordinates
	 * is a door or a secret passage
	 * @param x
	 * @param y coordinates
	 * @return bool
	 */
	isDoor: function(x, y) {
		var nPhys = this.oRaycaster.getMapPhys(x, y);
		return nPhys >= 2 && nPhys <= 9;
	},

	getDoorEffectAt: function(x, y) {
		return Marker.getMarkXY(this.oRaycaster.oDoors, x, y);
	},

	/**
	 * Active un effet d'ouverture de porte ou passage secret sur un block
	 * donné. L'effet d'ouverture inclue la modification temporaire de la
	 * propriété du block permettant ainsi le libre passage des mobiles le temps
	 * d'ouverture (ce comportement est codé dans le GXDoor). Le bloc doit
	 * comporte un code physique correspondant à une porte : Un simple mur (code
	 * 1) ne peut pas faire office de porte
	 * 
	 * @param x
	 *            coordonnées du bloc-porte
	 * @param y
	 *            coordonnées du bloc-porte
	 * @param bStayOpen
	 *            désactive autoclose et garde la porte ouverte
	 * 
	 */
	openDoor : function(x, y, bStayOpen) {
		var rc = this.oRaycaster;
		var nPhys = rc.getMapPhys(x, y);
		var o = null;
		switch (nPhys) {
			case 2: // Raycaster::PHYS_FIRST_DOOR
			case 3:
			case 4:
			case 5:
			case 6:
			case 7:
			case 8: // Raycaster::PHYS_LAST_DOOR
				if (!Marker.getMarkXY(rc.oDoors, x, y)) {
					// c'est dégueu mais c'est l'effet GXDoor qui va mettre à jour oDoors...
					o = rc.addGXEffect(O876_Raycaster.GXDoor);
					o.x = x;
					o.y = y;
					if (bStayOpen) {
						o.setAutoClose(0);
					}
				}
				break;
	
			case 9: // Raycaster::PHYS_SECRET_BLOCK
				if (!Marker.getMarkXY(rc.oDoors, x, y)) {
					o = rc.addGXEffect(O876_Raycaster.GXSecret);
					o.x = x;
					o.y = y;
				}
				break;
		}
		return o;
	},

	/**
	 * Fermeture manuelle d'une porte à la position X Y Utilisé avec les portes
	 * sans autoclose. S'il n'y a pas de porte ouverte en X Y -> aucun effet
	 * 
	 * @param x
	 *            coordonnées du bloc-porte
	 * @param y
	 *            coordonnées du bloc-porte
	 * @param bForce
	 *            force la fermeture même en case de présence de mobile
	 */
	closeDoor : function(x, y, bForce) {
		var oDoor = Marker.getMarkXY(this.oRaycaster.oDoors, x, y);
		if (oDoor) {
			oDoor.setAutoClose(1);
			oDoor.close();
		}
		return oDoor;
	},


	/**
	 * Création d'un nouveau mobile à la position spécifiée
	 * 
	 * @param sBlueprint
	 *            blueprint de l'objet à créer
	 * @param x
	 *            coordonnées initiales
	 * @param y
	 * @param fAngle
	 *            angle initial
	 * @return objet créé
	 */
	spawnMobile : function(sBlueprint, x, y, fAngle) {
		return this.oRaycaster.oHorde.spawnMobile(sBlueprint, x, y, fAngle);
	},
	
	// /////////// EVENEMENTS /////////////

	// onInitialize: null,

	// onRequestLevelData: null,

	// onLoading: null,

	// onEnterLevel: null,

	// onDoomLoop: null,

	// onFrameRendered: null,

	// ////////////// ETATS ///////////////


	/**
	 * Prépare le chargement du niveau. RAZ de tous les objets.
	 */
	stateBuildLevel : function() {
		// Evènement chargement de niveau
		try {
			this.oRaycaster.buildLevel();
		} catch (e) {
			console.log(e.stack);
			this._halt('invalid world data (' + e.message + ')');
			return;
		}

		// calculer le nombre de shading à faire
		this._nShadedTileCount = 0;
		var iStc = '';
		for (iStc in this.oRaycaster.oHorde.oTiles) {
			if (this.oRaycaster.oHorde.oTiles[iStc].bShading) {
				++this._nShadedTileCount;
			}
		}
		this.setDoomloop('stateLoadComplete');
	},

	/**
	 * Patiente jusqu'à ce que les ressource soient chargée
	 */
	stateLoadComplete : function() {
		this._callGameEvent('onLoading', 'gfx', this.oRaycaster.oImages.countLoaded(), this.oRaycaster.oImages.countLoading() + this._nShadedTileCount);
		if (this.oRaycaster.oImages.complete()) {
			this.oRaycaster.backgroundRedim();
			this._nShadedTiles = 0;
			this.setDoomloop('stateShading');
		}
	},

	/**
	 * Procède à l'ombrage des textures
	 */
	stateShading : function() {
		this._callGameEvent('onLoading', 'shd', this.oRaycaster.oImages.countLoaded() + this._nShadedTiles, this.oRaycaster.oImages.countLoading() + this._nShadedTileCount);
		++this._nShadedTiles;
		if (!this.oRaycaster.shadeProcess()) {
			return;
		}
		// this._callGameEvent('onLoading', 'shd', 1, 1);
		this._oFrameCounter = new O876_Raycaster.FrameCounter();
		this.setDoomloop('stateRunning', 'interval');
		this._callGameEvent('onLoading', 'end', 1, 1);
		this._callGameEvent('onEnterLevel');
	},

    stateRunning: function() {
        this.setDoomloop('stateUpdate', 'interval');
	},

    stateUpdate: function() {
		var nTime = performance.now();
        var nLoops = 0;
        var rc = this.oRaycaster;
        if (this._nTimeStamp === null) {
            this._nTimeStamp = nTime;
        }
        while (this._nTimeStamp < nTime) {
            rc.frameProcess();
            this._callGameEvent('onDoomLoop');
            this._nTimeStamp += this.nInterval;
            nLoops++;
            if (nLoops > 10) {
                // too many frames, the window has been minimized for too long
                // restore time stamp
                this._nTimeStamp = nTime;
            }
        }
        if (nLoops) {
        	this._nTicks += nLoops;
            rc.frameRender();
            var eng = this;
            this._callGameEvent('onFrameRendered');
            requestAnimationFrame(function() {
                rc.flipBuffer();
                eng._callGameEvent('onVsync');
            });
        }
	},



	/**
	 * Fin du programme
	 * 
	 */
	stateEnd : function() {
		this.pause();
	},

	/**
	 * If the boolean parameter is false : it will stop the timer, 
	 * effectively freezing all activities.
	 * If the boolean parameter is true : it will only pause the raycaster
	 * rendering process.
	 */
	pause: function(bSoft) {
		if (bSoft) {
			if (this.oRaycaster) {
				this.oRaycaster.bPause = true;
			}
		} else {
			__inherited();
		}
	},

	resume: function() {
		if (this.oRaycaster) {
			this.oRaycaster.bPause = false;
		}
		__inherited();
	}
});
