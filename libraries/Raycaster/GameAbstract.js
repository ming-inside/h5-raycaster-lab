/* globals O2, O876, O876_Raycaster, CONFIG, Marker */
/**
 * @class O876_Raycaster.GameAbstract
 * @extends O876_Raycaster.Engine
 *
 *
 *
 *
 *
 * EVENTS :

 init
 - pas de paramètre
 Appelé au démarrage du jeu


 error
 - message : libellé du message
 - data : exception ayant déclenché l'erreur
 Appelé dès qu'une exception non gérée est déclenchée




 leveldata
 - data : objet à remplir contenant le niveau qu'il faut charger


 load
 - phase : numéro de phase
 - progress : progression de la phase
 - max : maximuml de la valeur de progression possible


 enter
 - pas de paramètre
 se lance lorsqu'on entre dans le niveau.
 tout les objets sont chargés/instanciés à ce niveau.


 doomloop
 - pas de paramètre
 se lance à chaque update des entités.


 frame
 - pas de paramètre
 se lance chaque fois qu'une frame est rendue.


 framecount
 - fps : nombre d'image par seconde actuellement calculé
 - avg : moyenne des images par secondes
 - time : temps écoulé
 permet d'obtenir des information sur les performances.


 key.down & key.up
 - k : code de la touche
 permet de déterminer facilement lorsqu'une touche est appuyée ou relachée.


 door
 - x & y : position de la porte
 - door : effet permettant de refermer manuellement la porte
 se déclenche à l'ouverture d'une porte.



 *
 */
O2.extendClass('O876_Raycaster.GameAbstract', O876_Raycaster.Engine, {
	_oScreenShot: null,
	_oTagData: null,
	_sTag: '',
	_xTagProcessing: 0,
	_yTagProcessing: 0,
	_oMapData: null,

	/** 
	 * Evènement apellé lors de l'initialisation du jeu
	 * Appelé une seule fois.
	 */
	onInitialize: function() {
		this.on('tag', this.onTagTriggered.bind(this));
		if ('init' in this) {
			this.init();
		}
		this.trigger('init');
	},

	
	_halt: function(sError, oError) {
		__inherited(sError, oError);
		if (sError) {
			this.trigger('error', {message: sError, data: oError});
		}
	},

	
	/**
	 * Evènement appelé lors du chargement d'un niveau,
	 * cet évènement doit renvoyer des données au format du Raycaster.
	 * @return object
	 */
	onRequestLevelData: function() {
		var wd = {data: {}};
		this.trigger('leveldata', wd);
		return wd.data;
	},


	/**
	 * Appelé à l'interieur d'un requestAnimationFrame
	 */
	onVsync: function() {
		this.trigger('vsync');
	},


	
	/**
	 * Evènement appelé quand une ressource et chargée
	 * sert à faire des barres de progressions
	 */
	onLoading: function(sPhase, nProgress, nMax) {
		this.trigger('load', { phase: sPhase, progress: nProgress, max: nMax });
	},
	
	/**
	 * Evènement appelé lorsqu'un niveau a été chargé
	 * Permet l'initialisation des objet nouvellement créés (comme la caméra)
	 */
	onEnterLevel: function() {
		this.getMouseDevice(this.oRaycaster.getScreenCanvas());
		this.oRaycaster.bSky = true;
		this.oRaycaster.bFlatSky = true;
		var oCT;
		if (('controlThinker' in this._oConfig.game) && (this._oConfig.game.controlThinker)) {
			var ControlThinkerClass = O2.loadObject(this._oConfig.game.controlThinker);
			oCT = new ControlThinkerClass();
		} else {
			if (this._oConfig.game.fpsControl) {
				oCT = new O876_Raycaster.FirstPersonThinker();
			} else {
				oCT = new O876_Raycaster.CameraKeyboardThinker();
			}
			oCT.on('use.down', (function() {
				this.oGame.activateWall(this.oMobile);    
			}).bind(oCT));
		}
		oCT.oGame = this;
		var oCamera = this.oRaycaster.oCamera;
		oCamera.setThinker(oCT);
		oCamera.setXY(oCamera.x, oCamera.y);
		// Tags data
		var iTag, oTag;
		var aTags = this.oRaycaster.aWorld.tags;
		this._oMapData = Marker.create();
		this._oTagData = Marker.create();
		for (iTag = 0; iTag < aTags.length; ++iTag) {
			oTag = aTags[iTag];
			Marker.markXY(this._oTagData, oTag.x, oTag.y, oTag.tag);
		}
		// decals
		var oRC = this.oRaycaster;
		if ('decals' in oRC.aWorld) {
			oRC.aWorld.decals.forEach(function(d) {
				var x = d.x;
				var y = d.y;
				var nSide = d.side;
				var sImage = d.tile;
				oRC.cloneWall(x, y, nSide, function(rc, oCanvas, xw, yw, sw) {
					var oImage = rc.oHorde.oTiles[sImage].oImage;
					var wt = rc.oHorde.oTiles[sImage].nWidth;
					var ht = rc.oHorde.oTiles[sImage].nHeight;
					oCanvas.getContext('2d').drawImage(
						oImage,
						0,
						0,
						wt,
						ht,
						(rc.xTexture - wt) >> 1, 
						(rc.yTexture - ht) >> 1, 
						wt,
						ht
					);
				});
			});
		}
		this.oRaycaster.oCamera.fSpeed = 6;
		this.setDoomloop('stateTagProcessing');
	},

	stateTagProcessing: function() {
		var nSize = this.oRaycaster.nMapSize;
		var x = this._xTagProcessing;
		var y = this._yTagProcessing;
		var nStart = Date.now();
		var nStepMax = 10;
		var nStep = 0;
		var tf = this.TIME_FACTOR;
		while (y < nSize) {
			while (x < nSize) {
				this.triggerTag(x, y, this.getBlockTag(x, y), true);
				++x;
				nStep = (nStep + 1) % nStepMax;
				if (nStep === 0 && (Date.now() - nStart) >= tf) {
					this._xTagProcessing = x;
					this._yTagProcessing = y;
					this.onLoading('tag', y * nSize + x, nSize * nSize);
					return;
				}
			}
			++y;
			x = 0;
		}
		this.setDoomloop('stateRunning', this._oConfig.game.doomLoop);
		this.trigger('enter');
	},


	/**
	 * Evènement appelé par le processeur
	 * Ici on lance les animation de textures
	 */
	onDoomLoop: function() {
		this._processKeys();
		this.oRaycaster.textureAnimation();
		this.trigger('doomloop');
	},
	
	
	/** 
	 * Evènement appelé à chaque changement de tag
	 * Si on entre dans une zone non taggée, la valeur du tag sera une chaine vide
	 * @param int x
	 * @param int y position du tag
	 * @param string sTag valeur du tag 
	 */
	onTagTriggered: function(x, y, sTag) {
		if (sTag) {
			var rc = this.oRaycaster;
			var oMsg = rc.addGXEffect(O876_Raycaster.GXMessage);
			oMsg.setMessage(sTag);
		}
	},
	
	
	/**
	 * Evènement appelé à chaque rendu de frame
	 */
	onFrameRendered: function() {
		this._detectTag();
		this.trigger('frame');
	},
	
	onFrameCount: function(nFPS, nAVG, nTime) {
		this.trigger('framecount', {
			fps: nFPS, 
			avg: nAVG, 
			time: nTime
		});
	},




	////// PROTECTED FUNCTIONS ////// PROTECTED FUNCTIONS ////// PROTECTED FUNCTIONS //////
	////// PROTECTED FUNCTIONS ////// PROTECTED FUNCTIONS ////// PROTECTED FUNCTIONS //////
	////// PROTECTED FUNCTIONS ////// PROTECTED FUNCTIONS ////// PROTECTED FUNCTIONS //////

	/**
	 * Reads key from keyborad device
	 * and trigger events
	 */
	_processKeys: function() {
		var nKey = this.getKeyboardDevice().inputKey();
		if (nKey > 0) {
			this.trigger('key.down', {k: nKey});
		} else if (nKey < 0) {
			this.trigger('key.up', {k: -nKey});
		}
	},

	/**
	 * Effectue une vérification du block actuellement traversé
	 * Si on entre dans une zone taggée (ensemble des blocks contigüs portant le même tag), on déclenche l'évènement.
	 */
	_detectTag: function() {
		var rc = this.oRaycaster;
		var rcc = rc.oCamera;
		var x = rcc.xSector;
		var y = rcc.ySector;
		var sTag = this.getBlockTag(x, y);
		if (sTag && sTag !== this._sTag) {
			sTag = this.triggerTag(x, y, sTag);
		}
		this._sTag = sTag;
	},
	

	////// RAYCASTER PUBLIC API ////// RAYCASTER PUBLIC API ////// RAYCASTER PUBLIC API //////
	////// RAYCASTER PUBLIC API ////// RAYCASTER PUBLIC API ////// RAYCASTER PUBLIC API //////
	////// RAYCASTER PUBLIC API ////// RAYCASTER PUBLIC API ////// RAYCASTER PUBLIC API //////
	
	/**
	 * Affiche un message popup
	 * @param string sMessage contenu du message
	 */
	popupMessage: function(sMessage, oVariables) {
		var rc = this.oRaycaster;
		var r;
		if (oVariables !== undefined) {
			for (var v in oVariables) {
				r = new RegExp('\\' + v, 'g');
				sMessage = sMessage.replace(r, oVariables[v]);
			}
		}
		// suppression des ancien messages;
		rc.oEffects.removeEffect(function(e) {
			return e.sClass === 'Message';
		});

		var oMsg = rc.addGXEffect(O876_Raycaster.GXMessage);
		oMsg.setMessage(sMessage);
		this._sLastPopupMessage = sMessage;
		return oMsg;
	},
	
	/**
	 * permet de définir l'apparence des popups
	 * l'objet spécifié peut contenir les propriété suivantes :
	 * - background : couleur de fond
	 * - border : couleur de bordure
	 * - text : couleur du texte
	 * - shadow : couleur de l'ombre du texte
	 * - width : taille x
	 * - height : taille y
	 * - speed : vitesse de frappe
	 * - font : propriété de police
	 * - position : position y du popup
	 */
	setPopupStyle: function(oProp) {
		var sProp = '';
		var gmxp = O876_Raycaster.GXMessage.prototype.oStyle;
		for (sProp in oProp) {
			gmxp[sProp] = oProp[sProp];
		}
	},


	/**
	 * Effectue un screenshot de l'écran actuellement rendu
	 * L'image (canvas) générée est stockée dans la propriété _oScreenShot
	 * @param bPure si true, alors l'image est redessinée (sans les effect GX et sans la 3D)
	 */
	screenShot: function(w, h) {
		if (w === undefined) {
			w = 192;
		}
		this.oRaycaster.drawScreen();
		var oCanvas = O876.CanvasFactory.getCanvas();
		var wr = this.oRaycaster.xScrSize;
		var hr = this.oRaycaster.yScrSize << 1;
		h = h || (hr * w / wr | 0);
		oCanvas.width = w;
		oCanvas.height = h;
		var oContext = oCanvas.getContext('2d');
		oContext.drawImage(this.oRaycaster.getRenderCanvas(), 0, 0, wr, hr, 0, 0, w, h);
		return this._oScreenShot = oCanvas;
	},

	/**
	 * TriggerTag
	 * Active volontaire le tag s'il existe à la position spécifiée
	 */
	triggerTag: function(x, y, sTag, bInit) {
		if (sTag) {
			var aTags = sTag.split(';');
			var sNewTag = aTags.filter(function(s) {
				var aTag = s.replace(/^ +/, '').replace(/ +$/, '').split(' ');
				var sCmd = aTag.shift();
				var oData = {x: x, y: y, data: aTag.join(' '), remove: false};
				var aEvent = [(bInit ? 'i' : '') + 'tag', sCmd];
				this.trigger(aEvent.join('.'), oData);
				return !oData.remove;
			}, this).join(';');
			if (this.getBlockTag(x, y) != sTag) {
				throw new Error('tag modification is not allowed during trigger phase... [x: ' +x + ', y: ' + y + ', tag: ' + this.getBlockTag(x, y) + ']');
			}
			this.setBlockTag(x, y, sNewTag);
			return sNewTag;
		} else {
			return sTag;
		}
	},


	/**
	 * Répond à l'évènement : le player à activé un block mural (celui en face de lui) 
	 * Si le block mural activé est porteur d'un tag : déclencher l'evènement onTagTriggered
	 * Si le block est une porte : ouvrir la porte 
	 */
	activateWall: function(m) {
		var oBlock = m.getFrontCellXY();
		var x = oBlock.x;
		var y = oBlock.y;
		if (this.isDoor(x, y)) {
			var oEffect = this.openDoor(x, y);
			if (oEffect) {
				this.trigger('door', {x: x, y: y, door: oEffect});
			}
		}
		this.triggerTag(x, y, this.getBlockTag(x, y));
	},

	/**
	 * Renvoie le tag associé au block
	 * @param int x
	 * @param int y position du block qu'on interroge
	 */
	getBlockTag: function(x, y, sSeek) {
		var s = this.oRaycaster.nMapSize;
		if (x >= 0 && y >= 0 && x < s && y < s) {
			var sTag = Marker.getMarkXY(this._oTagData, x, y);
			if (sTag === undefined) {
				return '';
			}
			if (sSeek !== undefined) {
				var sFound = null;
				sTag.split(';').some(function(t) {
					var a = t.split(' ');
					var s = a.shift();
					if (s == sSeek) {
						sFound = a.join(' ');
						return true;
					}
					return false;
				});
				return sFound;
			} else {
				return sTag;
			}
		} else {
			return null;
		}
	},

	/**
	 * Ajoute un tag de block
	 * si le tag est null on le vire
	 * @param int x
	 * @param int y position du block
	 * @param string sTag tag
	 */
	setBlockTag: function(x, y, sTag) {
		var s = this.oRaycaster.nMapSize;
		if (x >= 0 && y >= 0 && x < s && y < s) {
			Marker.markXY(this._oTagData, x, y, sTag);
		} else {
			return null;
		}		
	},

	/**
	 * sets or gets values from the map data array
	 * @param x {int} block coordinates
	 * @param y {int}
	 * @param sVariable {string} variable name
	 * @param xValue {*} variable value
	 */
	mapData: function(x, y, sVariable, xValue) {
		var s = this.oRaycaster.nMapSize;
		var md = this._oMapData;
		var oVars, bDefined;
		if (x >= 0 && y >= 0 && x < s && y < s) {
			oVars = Marker.getMarkXY(md, x, y);
			bDefined = typeof oVars === 'object';
			if (xValue === undefined) {
				// getting variable
				if (bDefined) {
					return oVars[sVariable];
				} else {
					return null;
				}
			} else {
				// setting variable
				if (bDefined) {
					oVars[sVariable] = xValue;
				} else {
					oVars = {};
					oVars[sVariable] = xValue;
					Marker.markXY(md, x, y, oVars);
				}
			}
		}
	}
});

O2.mixin(O876_Raycaster.GameAbstract, O876.Mixin.Events);
