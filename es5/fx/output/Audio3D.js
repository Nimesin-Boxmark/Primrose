"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

Primrose.Output.Audio3D = function () {
  "use strict";

  // polyfill

  Window.prototype.AudioContext = Window.prototype.AudioContext || Window.prototype.webkitAudioContext || function () {};

  pliny.class({
    parent: "Primrose.Output",
    name: "Audio3D",
    description: "| [under construction]"
  });

  var Audio3D = function () {
    function Audio3D() {
      var _this = this;

      _classCallCheck(this, Audio3D);

      try {
        this.context = new AudioContext();
        this.sampleRate = this.context.sampleRate;
        this.mainVolume = this.context.createGain();

        var vec = new THREE.Vector3(),
            up = new THREE.Vector3(),
            left = new THREE.Matrix4().identity(),
            right = new THREE.Matrix4().identity(),
            swap = null;

        this.setVelocity = this.context.listener.setVelocity.bind(this.context.listener);
        this.setPlayer = function (obj) {
          var head = obj;
          left.identity();
          right.identity();
          while (head !== null) {
            left.fromArray(head.matrix.elements);
            left.multiply(right);
            swap = left;
            left = right;
            right = swap;
            head = head.parent;
          }
          swap = left;
          var mx = swap.elements[12],
              my = swap.elements[13],
              mz = swap.elements[14];
          swap.elements[12] = swap.elements[13] = swap.elements[14] = 0;

          _this.context.listener.setPosition(mx, my, mz);
          vec.set(0, 0, 1);
          vec.applyProjection(right);
          vec.normalize();
          up.set(0, -1, 0);
          up.applyProjection(right);
          up.normalize();
          _this.context.listener.setOrientation(vec.x, vec.y, vec.z, up.x, up.y, up.z);
          right.elements[12] = mx;
          right.elements[13] = my;
          right.elements[14] = mz;
        };
        this.isAvailable = true;
        this.start();
      } catch (exp) {
        console.error(exp);
        console.error("AudioContext not available.");
        this.isAvailable = false;
        this.setPlayer = function () {};
        this.setVelocity = function () {};
        this.start = function () {};
        this.stop = function () {};
        this.error = exp;
      }
    }

    _createClass(Audio3D, [{
      key: "start",
      value: function start() {
        this.mainVolume.connect(this.context.destination);
      }
    }, {
      key: "stop",
      value: function stop() {
        this.mainVolume.disconnect();
      }
    }, {
      key: "loadURL",
      value: function loadURL(src) {
        var _this2 = this;

        return Primrose.HTTP.getBuffer(src).then(function (data) {
          return new Promise(function (resolve, reject) {
            return _this2.context.decodeAudioData(data, resolve, reject);
          });
        });
      }
    }, {
      key: "loadURLCascadeSrcList",
      value: function loadURLCascadeSrcList(srcs, index) {
        var _this3 = this;

        index = index || 0;
        if (index >= srcs.length) {
          return Promise.reject("Failed to load a file from " + srcs.length + " files.");
        } else {
          return this.loadURL(srcs[index]).catch(function (err) {
            console.error(err);
            return _this3.loadURLCascadeSrcList(srcs, index + 1);
          });
        }
      }
    }, {
      key: "createRawSound",
      value: function createRawSound(pcmData) {
        if (pcmData.length !== 1 && pcmData.length !== 2) {
          throw new Error("Incorrect number of channels. Expected 1 or 2, got " + pcmData.length);
        }

        var frameCount = pcmData[0].length;
        if (pcmData.length > 1 && pcmData[1].length !== frameCount) {
          throw new Error("Second channel is not the same length as the first channel. Expected " + frameCount + ", but was " + pcmData[1].length);
        }

        var buffer = this.context.createBuffer(pcmData.length, frameCount, this.sampleRate);
        for (var c = 0; c < pcmData.length; ++c) {
          var channel = buffer.getChannelData(c);
          for (var i = 0; i < frameCount; ++i) {
            channel[i] = pcmData[c][i];
          }
        }
        return buffer;
      }
    }, {
      key: "createSound",
      value: function createSound(loop, buffer) {
        var snd = {
          volume: this.context.createGain(),
          source: this.context.createBufferSource()
        };
        snd.source.buffer = buffer;
        snd.source.loop = loop;
        snd.source.connect(snd.volume);
        return snd;
      }
    }, {
      key: "create3DMediaStream",
      value: function create3DMediaStream(x, y, z, stream) {
        console.log(stream);
        var element = document.createElement("audio"),
            snd = {
          audio: element,
          source: this.context.createMediaElementSource(element)
        };
        if (isChrome) {
          element.src = URL.createObjectURL(stream);
        } else {
          element.srcObject = stream;
        }
        element.autoplay = true;
        element.controls = true;
        element.muted = true;
        snd.source.connect(this.mainVolume);
        //snd.source.connect(snd.volume):
        //snd.volume.connect(snd.panner);
        //snd.panner.connect(this.mainVolume);
        //snd.panner.setPosition(x, y, z);
        return snd;
      }
    }, {
      key: "create3DSound",
      value: function create3DSound(x, y, z, snd) {
        snd.panner = this.context.createPanner();
        snd.panner.setPosition(x, y, z);
        snd.panner.connect(this.mainVolume);
        snd.volume.connect(snd.panner);
        return snd;
      }
    }, {
      key: "createFixedSound",
      value: function createFixedSound(snd) {
        snd.volume.connect(this.mainVolume);
        return snd;
      }
    }, {
      key: "loadSource",
      value: function loadSource(sources, loop) {
        var _this4 = this;

        pliny.method({
          parent: "Primrose.Output.Audio3D",
          name: "loadSound",
          returns: "Promise<MediaElementAudioSourceNode>",
          parameters: [{ name: "sources", type: "String|Array<String>", description: "A string URI to an audio source, or an array of string URIs to audio sources. Will be used as a collection of HTML5 &lt;source> tags as children of an HTML5 &lt;audio> tag." }, { name: "loop", type: "Boolean", optional: true, description: "indicate that the sound should be played on loop." }],
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

        return new Promise(function (resolve, reject) {
          if (!(sources instanceof Array)) {
            sources = [sources];
          }
          var audio = document.createElement("audio");
          audio.autoplay = true;
          audio.loop = loop;
          sources.map(function (src) {
            var source = document.createElement("source");
            source.src = src;
            return source;
          }).forEach(audio.appendChild.bind(audio));
          audio.oncanplay = function () {
            if (_this4.context) {
              audio.oncanplay = null;
              var snd = {
                volume: _this4.context.createGain(),
                source: _this4.context.createMediaElementSource(audio)
              };
              snd.source.connect(snd.volume);
            }
            resolve(snd);
          };
          audio.onerror = reject;
          document.body.appendChild(audio);
        });
      }
    }, {
      key: "load3DSound",
      value: function load3DSound(src, loop, x, y, z) {
        return this.loadSource(src, loop).then(this.create3DSound.bind(this, x, y, z));
      }
    }, {
      key: "loadFixedSound",
      value: function loadFixedSound(src, loop) {
        return this.loadSource(src, loop).then(this.createFixedSound.bind(this));
      }
    }, {
      key: "playBufferImmediate",
      value: function playBufferImmediate(buffer, volume) {
        var _this5 = this;

        var snd = this.createSound(false, buffer);
        snd = this.createFixedSound(snd);
        snd.volume.gain.value = volume;
        snd.source.addEventListener("ended", function (evt) {
          snd.volume.disconnect(_this5.mainVolume);
        });
        snd.source.start(0);
        return snd;
      }
    }], [{
      key: "setAudioStream",
      value: function setAudioStream(element, stream) {
        if (isFirefox) {
          element.srcObject = stream;
        } else {
          element.src = URL.createObjectURL(stream);
        }
        element.muted = true;
        return stream;
      }
    }, {
      key: "chain",
      value: function chain() {
        var args = Array.prototype.slice.call(arguments);
        for (var i = 0; i < args.length - 1; ++i) {
          args[i].connect(args[i + 1]);
        }
      }
    }]);

    return Audio3D;
  }();

  return Audio3D;
}();