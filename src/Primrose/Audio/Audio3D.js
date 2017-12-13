/*
pliny.class({
  parent: "Primrose.Audio",
  name: "Audio3D",
  description: "Positional audio rendering engine.",
  parameters: [{
    name: "options",
    type: "Primrose.Audio.Audio3D.optionsHash",
    description: "Optional settings."
  }]
});

pliny.record({
  parent: "Primrose.Audio.Audio3D",
  name: "optionsHash",
  parameters: [{
    name: "ambientSound",
    type: "String",
    optional: true,
    description: "The sound to play on loop in the background."
  }]
});
*/

let VECTOR = new Vector3(),
  UP = new Vector3(),
  TEMP = new Matrix4();

import { Vector3, Matrix4 } from "three";

import { isiOS } from "../../flags";
import BasePlugin from "../BasePlugin";
import getBuffer from "../HTTP/getBuffer";
import cascadeElement from "../DOM/cascadeElement"

export default class Audio3D extends BasePlugin {

  static setAudioStream(stream, id) {
    const audioElementCount = document.querySelectorAll("audio")
      .length,
      element = cascadeElement(id || ("audioStream" + audioElementCount), "audio", HTMLAudioElement, true);
    setAudioProperties(element);
    element.srcObject = stream;
    return element;
  }

  static setAudioProperties(element){
    element.autoplay = true;
    element.controls = false;
    element.crossOrigin = "anonymous";
  }

  constructor(options) {
    super("Audio3D", options);

    this.ready = new Promise((resolve, reject) => {
      try{
        if(Audio3D.isAvailable) {
          const finishSetup = () => {
            try{
              this.sampleRate = this.context.sampleRate;
              this.mainVolume = this.context.createGain();
              this.start();
              resolve();
            }
            catch(exp){
              reject(exp);
            }
          };

          if(!isiOS) {
            this.context = new AudioContext();
            finishSetup();
          }
          else {
            const unlock = () => {
              try{
                this.context = this.context || new AudioContext();
                const source = this.context.createBufferSource();
                source.buffer = this.createRawSound([[0]]);
                source.connect(this.context.destination);
                source.start();
                setTimeout(() => {
                  if((source.playbackState === source.PLAYING_STATE || source.playbackState === source.FINISHED_STATE)) {
                    window.removeEventListener("mouseup", unlock);
                    window.removeEventListener("touchend", unlock);
                    window.removeEventListener("keyup", unlock);
                    source.disconnect();
                    finishSetup();
                  }
                }, 0);
              }
              catch(exp){
                reject(exp);
              }
            };

            window.addEventListener("mouseup", unlock, false);
            window.addEventListener("touchend", unlock, false);
            window.addEventListener("keyup", unlock, false);
          }
        }
      }
      catch(exp) {
        reject(exp);
      }
    });
  }

  get requirements() {
    return [];
  }

  install(env) {
    env.audio = this;

    if (this.options.ambientSound) {
      this.load3DSound(this.options.ambientSound, true, -1, 1, -1)
        .then((aud) => {
          if (!(aud.source instanceof MediaElementAudioSourceNode)) {
            aud.volume.gain.value = 0.1;
            aud.source.start();
          }
        })
        .catch(console.error.bind(console, "Audio3D loadSource"));
    }
  }

  start() {
    if(this.mainVolume){
      this.mainVolume.connect(this.context.destination);
    }
    if(this.context && this.context.resume) {
      this.context.resume();
    }
  }

  stop() {
    if(this.context && this.context.suspend) {
      this.context.suspend();
    }
    if(this.mainVolume){
      this.mainVolume.disconnect();
    }
  }

  postUpdate(env, dt) {
    if(this.context && this.context.listener) {
      var m = env.head.mesh.matrixWorld,
        e = m.elements,
        mx = e[12],
        my = e[13],
        mz = e[14];

      if(!isNaN(mx + my + mz)) {

        this.context.listener.setPosition(mx, my, mz);

        VECTOR.set(0, 0, -1)
          .applyMatrix4(m)
          .normalize();
        UP.set(0, 1, 0)
          .applyMatrix4(m)
          .normalize();

        this.context.listener.setOrientation(VECTOR.x, VECTOR.y, VECTOR.z, UP.x, UP.y, UP.z);
      }
    }
  }

  setVelocity(x, y, z) {
    if(this.context) {
      this.context.listener.setVelocity(x, y, z);
    }
  }

  loadURL(src) {
    return this.ready.then(() => {
      console.log("Loading " + src + " from URL");
      getBuffer(src);
    })
      .then((data) => new Promise((resolve, reject) =>
        this.context.decodeAudioData(data, resolve, reject)))
      .then((dat) => {
        console.log(src + " loaded");
        return dat;
      })
      .catch((err) => {
        console.error("Couldn't load " + src + ". Reason: " + err);
      });
  }

  createRawSound(pcmData) {
    if (pcmData.length !== 1 && pcmData.length !== 2) {
      throw new Error("Incorrect number of channels. Expected 1 or 2, got " + pcmData.length);
    }

    var frameCount = pcmData[0].length;
    if (pcmData.length > 1 && pcmData[1].length !== frameCount) {
      throw new Error(
        "Second channel is not the same length as the first channel. Expected " + frameCount + ", but was " + pcmData[1].length);
    }

    var buffer = this.context.createBuffer(pcmData.length, frameCount, this.sampleRate || 22050);
    for (var c = 0; c < pcmData.length; ++c) {
      var channel = buffer.getChannelData(c);
      for (var i = 0; i < frameCount; ++i) {
        channel[i] = pcmData[c][i];
      }
    }
    return buffer;
  }

  create3DSound(x, y, z, snd) {
    snd.panner = this.context.createPanner();
    snd.panner.setPosition(x, y, z);
    snd.panner.connect(this.mainVolume);
    snd.volume.connect(snd.panner);
    return snd;
  }

  createFixedSound(snd) {
    snd.volume.connect(this.mainVolume);
    return snd;
  }

  loadSource(sources, loop) {

    /*
    pliny.method({
      parent: "Primrose.Output.Audio3D",
      name: "loadSound",
      returns: "Promise<MediaElementAudioSourceNode>",
      parameters: [{
        name: "sources",
        type: "String|Array<String>",
        description: "A string URI to an audio source, or an array of string URIs to audio sources. Will be used as a collection of HTML5 &lt;source> tags as children of an HTML5 &lt;audio> tag."
      }, {
        name: "loop",
        type: "Boolean",
        optional: true,
        description: "indicate that the sound should be played on loop."
      }],
      description: "Loads the first element of the `sources` array for which the browser supports the file format as an HTML5 &lt;audio> tag to use as an `AudioSourceNode` attached to the current `AudioContext`. This does not load all of the audio files. It only loads the first one of a list of options that could work, because all browsers do not support the same audio formats.",
      examples: [{
        name: "Load a single audio file.",
        description: "There is no one, good, compressed audio format supported in all browsers, but they do all support uncompressed WAV. You shouldn't use this on the Internet, but it might be okay for a local solution.\n\
\n\
  grammar(\"JavaScript\");\n\
  var audio = new Primrose.Output.Audio3D();\n\
  audio.loadSource(\"mySong.wav\").then(function(node){\n\
    node.connect(audio.context.destination);\n\
  });"
      }, {
        name: "Load a single audio file from a list of options.",
        description: "There is no one, good, compressed audio format supported in all browsers. As a hack around the problem, HTML5 media tags may include one or more &lt;source> tags as children to specify a cascading list of media sources. The browser will select the first one that it can successfully decode.\n\
\n\
  grammar(\"JavaScript\");\n\
  var audio = new Primrose.Output.Audio3D();\n\
  audio.loadSource([\n\
    \"mySong.mp3\",\n\
    \"mySong.aac\",\n\
    \"mySong.ogg\"\n\
  ]).then(function(node){\n\
    node.connect(audio.context.destination);\n\
  });"
      }, {
        name: "Load an ambient audio file that should be looped.",
        description: "The only audio option that is available is whether or not the audio file should be looped. You specify this with the second parameter to the `loadSource()` method, a `Boolean` value to indicate that looping is desired.\n\
\n\
  grammar(\"JavaScript\");\n\
  var audio = new Primrose.Output.Audio3D();\n\
  audio.loadSource([\n\
    \"mySong.mp3\",\n\
    \"mySong.aac\",\n\
    \"mySong.ogg\"\n\
  ], true).then(function(node){\n\
    node.connect(audio.context.destination);\n\
  });"
      }]
    });
    */

    return this.ready.then(() => new Promise((resolve, reject) => {
      console.log("Loading " + sources);
      if (!(sources instanceof Array)) {
        sources = [sources];
      }
      var audio = document.createElement("audio");
      audio.autoplay = true;
      audio.preload = "auto";
      audio["webkit-playsinline"] = true;
      audio.playsinline = true;
      audio.loop = loop;
      audio.crossOrigin = "anonymous";
      sources.map((src) => {
          var source = document.createElement("source");
          source.src = src;
          return source;
        })
        .forEach(audio.appendChild.bind(audio));
      audio.onerror = reject;
      audio.oncanplay = () => {
        audio.oncanplay = null;
        const snd = {
          volume: this.context.createGain(),
          source: this.context.createMediaElementSource(audio)
        };
        snd.source.connect(snd.volume);
        resolve(snd);
      };
      audio.play();
      document.body.appendChild(audio);
    }))
      .then((dat) => {
        console.log(sources + " loaded");
        return dat;
      })
      .catch((err) => {
        console.error("Couldn't load " + sources + ". Reason: " + err);
      });
  }

  load3DSound(src, loop, x, y, z) {
    return this.loadSource(src, loop)
      .then(this.create3DSound.bind(this, x, y, z));
  }

  loadFixedSound(src, loop) {
    return this.loadSource(src, loop)
      .then(this.createFixedSound.bind(this));
  }
}

Audio3D.isAvailable = !!window.AudioContext && !!AudioContext.prototype.createGain;
