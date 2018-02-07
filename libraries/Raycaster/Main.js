/**
 * The MAIN object
 */
O2.createObject('MAIN', {
	
	game: null,
	screen: null,
	config: null,
	pointerlock: null,


	configure: function(c) {
		MAIN.config = c;
	},


	setupScreen: function() {
		var screen = document.getElementById(MAIN.config.raycaster.canvas);
		if (screen === null) {
			throw new Error('the final canvas does not exist');
		}
		MAIN.screen = screen;
		if (MAIN.config.raycaster.canvasAutoResize) {
			MAIN.screenResize();
			window.addEventListener('resize', MAIN.screenResize);
		}
	},

	setupPointerlock: function() {
		var PL = MAIN.pointerlock = new O876_Raycaster.PointerLock();
		if (MAIN.config.game.fpsControl && PL.init()) {
			MAIN.screen.addEventListener('click', function(oEvent) {
				MAIN.lockPointer();
			});
		}
	},

	setupGameInstance: function(oGameInstance) {
		if (oGameInstance) {
			MAIN.game = oGameInstance;
		} else {
			var sNamespace = MAIN.config.game.namespace;
			MAIN.game = new window[sNamespace].Game();
			MAIN.game.setConfig(MAIN.config);
		}
	},

	/**
	 * Will start a game
	 * requires a CONFIG object
	 */
	run: function(oGameInstance) {
		if (!(MAIN.config)) {
			throw new Error('Where is my CONFIG object ? (use MAIN.configure)');
		}
		MAIN.setupScreen();
		MAIN.setupPointerlock();
		MAIN.setupGameInstance(oGameInstance);
	},
	
	/**
	 * Entre en mode pointerlock
	 * @param oElement
	 * @returns {Boolean}
	 */
	lockPointer: function() {
		var G = MAIN.game;
		var rc = G.oRaycaster;
		var oElement = rc.getScreenCanvas();
		var rcc = rc.oCamera;
		var rcct = rcc.oThinker;
		if (!rcc || !rcct) {
			return false;
		}
		if (MAIN.pointerlock.locked()) {
			return false;
		}
		if (MAIN.config.game.fullScreen) {
			O876_Raycaster.FullScreen.changeEvent = function(e) {
				if (O876_Raycaster.FullScreen.isFullScreen()) {
					MAIN.pointerlock.requestPointerLock(oElement);
					//MAIN.pointerlock.on('mousemove', G.oRaycaster.oCamera.oThinker.readMouseMovement.bind(G.oRaycaster.oCamera.oThinker));
				}
			};
			O876_Raycaster.FullScreen.enter(oElement);
		} else {
			MAIN.pointerlock.requestPointerLock(oElement);
			//MAIN.pointerlock.on('mousemove', rcct.readMouseMovement.bind(rcct));
		}
		return true;
	},


	screenResize: function(oEvent) {
		var nPadding = 24;
		var h = innerHeight;
		var w = innerWidth;
		var r = (h - nPadding) / w;
		var oCanvas = MAIN.screen;
		var ch = oCanvas.height;
		var cw = oCanvas.width;
		var rBase = ch / cw; 
		var wf, hf;
		if (r < rBase) { // utiliser height
			h -= nPadding;
			hf = h;
			wf = h * cw / ch;
		} else { // utiliser width
			wf = w;
			hf = w * ch / cw;
		}
		oCanvas.style.width = (wf | 0).toString() + 'px';
		oCanvas.style.height = (hf | 0).toString() + 'px';
		oCanvas.__aspect = wf / cw;
		if (oCanvas.style.position === 'absolute' && oCanvas.style['margin-left'] === 'auto') {
			oCanvas.style.left = ((w - wf) >> 1 | 0).toString() + 'px';
		}
	}
});

