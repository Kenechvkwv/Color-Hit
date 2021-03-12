let game;

let gameOptions = {
  targetRadius: 250,

  targetColors: [0xff0000, 0x00ff00, 0x0000ff],

  targetY: 1 / 4,

  rotationSpeed: 3,

  throwSpeed: 150,

  minAngle: 5,

  rotationVariation: 2,

  changeTime: 2000,

  maxRotationSpeed: 6
};

window.onload = function() {
  let gameConfig = {
    type: Phaser.AUTO,
    backgroundColor: "#000000",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      parent: "thegame",
      width: 750,
      height: 1334
    },
    scene: playGame
  };
  game = new Phaser.Game(gameConfig);
  window.focus();
};

// PlayGame scene
class playGame extends Phaser.Scene {
  constructor() {
    super("PlayGame");
  }

  preload() {
    this.load.image("knife", "knife.png");
    this.load.audio("jaunty", ["jaunty.mp3"]);
  }

  create() {
    //adding background music
    this.backgroundMusic = this.sound.add("jaunty", { loop: true });
    //play background music
    this.backgroundMusic.play();
    let graphics = this.make.graphics({
      x: 0,
      y: 0,
      add: false
    });

    this.sliceAngle = (2 * Math.PI) / gameOptions.targetColors.length;

    //looping through all colours
    for (let i = 0; i < gameOptions.targetColors.length; i++) {
      // set fill stile
      graphics.fillStyle(gameOptions.targetColors[i], 1);

      // draw a target slice
      graphics.slice(
        gameOptions.targetRadius,
        gameOptions.targetRadius,
        gameOptions.targetRadius,
        2 * Math.PI - this.sliceAngle * i,
        2 * Math.PI - this.sliceAngle * (i + 1),
        true
      );

      // close and fill the path
      graphics.fillPath();
    }

    // generate wheel texture from the graphics
    graphics.generateTexture(
      "wheel",
      gameOptions.targetRadius * 2,
      gameOptions.targetRadius * 2
    );

    // at the beginning of the game, both current rotation speed and new rotation speed are set to default rotation speed
    this.currentRotationSpeed = gameOptions.rotationSpeed;
    this.newRotationSpeed = gameOptions.rotationSpeed;

    this.canThrow = true;

    // group to store all rotating knives
    this.knifeGroup = this.add.group();

    // add the knife
    this.knife = this.add.sprite(
      game.config.width / 2,
      (game.config.height / 5) * 4,
      "knife"
    );

    // random color of the target to hit
    this.knife.target = Phaser.Math.Between(
      0,
      gameOptions.targetColors.length - 1
    );

    // tint the knife accordingly
    this.knife.tint = gameOptions.targetColors[this.knife.target];

    // add the target
    this.target = this.add.sprite(
      game.config.width / 2,
      game.config.height * gameOptions.targetY,
      "wheel"
    );

    // move the target to front
    this.target.depth = 1;

    this.input.on("pointerdown", this.throwKnife, this);

    //loop timed event
    let timedEvent = this.time.addEvent({
      // delay, in milliseconds
      delay: gameOptions.changeTime,

      // callback function
      callback: this.changeSpeed,

      // callback scope
      callbackScope: this,

      // the event will repeat endlessly
      loop: true
    });
  }

  // method to change the rotation speed of the target
  changeSpeed() {
    // random number between -gameOptions.rotationVariation and gameOptions.rotationVariation
    let variation = Phaser.Math.FloatBetween(
      -gameOptions.rotationVariation,
      gameOptions.rotationVariation
    );

    // new rotation speed
    this.newRotationSpeed =
      (this.currentRotationSpeed + variation) * Phaser.Math.RND.sign();

    // set new rotation speed limits
    this.newRotationSpeed = Phaser.Math.Clamp(
      this.newRotationSpeed,
      -gameOptions.maxRotationSpeed,
      gameOptions.maxRotationSpeed
    );
  }

  throwKnife() {
    if (this.canThrow) {
      this.canThrow = false;
      // tween to throw the knife
      this.tweens.add({
        // add the knife to tween targets
        targets: [this.knife],

        // y destination
        y: this.target.y + this.target.width / 2,

        // tween duration
        duration: gameOptions.throwSpeed,

        // callback scope
        callbackScope: this,

        // function to be executed once the tween has been completed
        onComplete: function(tween) {
          // at the moment, this is a legal hit
          let legalHit = true;

          // if the knife hit the wrong color...
          if (
            Math.floor(
              Phaser.Math.Angle.Normalize(this.target.rotation - Math.PI / 2) /
                this.sliceAngle
            ) != this.knife.target
          ) {
            // ... not a legal hit
            legalHit = false;
          }

          // if still a legal hit...
          else {
            // get an array with all rotating knives
            let children = this.knifeGroup.getChildren();

            // loop through rotating knives
            for (let i = 0; i < children.length; i++) {
              // is the knife too close to the i-th knife?
              if (
                Math.abs(
                  Phaser.Math.Angle.ShortestBetween(
                    this.target.angle,
                    children[i].impactAngle
                  )
                ) < gameOptions.minAngle
              ) {
                // this is not a legal hit
                legalHit = false;

                // no need to continue with the loop
                break;
              }
            }
          }

          // is this a legal hit?
          if (legalHit) {
            // player can now throw again
            this.canThrow = true;

            // adding the rotating knife in the same place of the knife just landed on target
            let knife = this.add.sprite(this.knife.x, this.knife.y, "knife");

            // impactAngle property saves the target angle when the knife hits the target
            knife.impactAngle = this.target.angle;

            knife.tint = gameOptions.targetColors[this.knife.target];

            // add the rotating knife to knifeGroup group
            this.knifeGroup.add(knife);

            // bring back the knife to its starting position
            this.knife.y = (game.config.height / 5) * 4;

            // set a new random color target
            this.knife.target = Phaser.Math.Between(
              0,
              gameOptions.targetColors.length - 1
            );

            // tint the knife accordingly
            this.knife.tint = gameOptions.targetColors[this.knife.target];
          }

          // in case this is not a legal hit
          else {
            // tween to make the knife fall down
            this.tweens.add({
              // add the knife to tween targets
              targets: [this.knife],

              // y destination
              y: game.config.height + this.knife.height,

              // rotation destination, in radians
              rotation: 5,

              // tween duration
              duration: gameOptions.throwSpeed * 4,

              // callback scope
              callbackScope: this,

              // function to be executed once the tween has been completed
              onComplete: function(tween) {
                // restart the game
                this.scene.start("PlayGame");
              }
            });
          }
        }
      });
    }
  }

  // method to be executed at each frame. Please notice the arguments.
  update(time, delta) {
    // rotate the target
    this.target.angle += this.currentRotationSpeed;

    // get an array with all rotating knives
    let children = this.knifeGroup.getChildren();

    // loop through rotating knives
    for (let i = 0; i < children.length; i++) {
      // rotate the knife
      children[i].angle += this.currentRotationSpeed;

      // turn knife angle in radians
      let radians = Phaser.Math.DegToRad(children[i].angle + 90);

      // trigonometry to make the knife rotate around target center
      children[i].x =
        this.target.x + (this.target.width / 2) * Math.cos(radians);
      children[i].y =
        this.target.y + (this.target.width / 2) * Math.sin(radians);
    }

    // adjust current rotation speed using linear interpolation
    this.currentRotationSpeed = Phaser.Math.Linear(
      this.currentRotationSpeed,
      this.newRotationSpeed,
      delta / 1000
    );
  }
}
