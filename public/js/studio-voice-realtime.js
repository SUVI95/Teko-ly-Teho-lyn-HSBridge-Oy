/**
 * Studio live voice-to-voice engine (Tomi 3 — AI-keskustelustudio).
 * WebRTC → OpenAI Realtime API. AI plays the counterpart, user speaks freely.
 * Generalized clone of cs-mock-realtime.js: scenario persona lives server-side,
 * this engine drives turn-taking and surfaces transcripts for Claude feedback.
 */
(function (global) {
  'use strict';

  var DEFAULT_TURNS = 3;
  var ECHO_GUARD_MS = 1500;
  var MIN_ANSWER_LEN = 2;
  var API_BASE = '/api/studio-voice';

  function isMeaningfulAnswer(text) {
    var t = String(text || '').trim();
    if (t.length < MIN_ANSWER_LEN) return false;
    if (/^(äh+|öh+|hm+|hmm+|mmm+|ja|joo|ok|okei|no|hei|\.+|,+|!+|\?+)$/i.test(t)) return false;
    return true;
  }

  function StudioVoiceCall(options) {
    options = options || {};
    // Pass the caller's scenario through verbatim (latu/tori/kajaani/kriisi …);
    // the persona lives server-side and is keyed by this exact string.
    this.scenario = options.scenario ? String(options.scenario) : 'latu';
    this.brief = options.brief || '';
    this.instructions = ''; // persona + rules, fetched from /config; kept alive on every response
    this.phases = options.phases || [];
    this.expectedTurns = options.expectedTurns || DEFAULT_TURNS;
    this.audioMount = options.audioMount || null;
    this.onStatus = options.onStatus || function () {};
    this.onPhaseChange = options.onPhaseChange || function () {};
    this.onUserTranscript = options.onUserTranscript || function () {};
    this.onAssistantText = options.onAssistantText || function () {};
    this.onComplete = options.onComplete || function () {};
    this.onError = options.onError || function () {};
    this.onRemoteAudio = options.onRemoteAudio || function () {};

    this.pc = null;
    this.dc = null;
    this.audioEl = null;
    this.mediaStream = null;
    this.connected = false;
    this.started = false;
    this.answerCount = 0;
    this.awaitingUserAnswer = false;
    this.aiResponding = false;
    this.responseDoneAt = 0;
    this.awaitingWrapUp = false;
    this.wrapUpTimer = null;
    this.pendingClientText = '';
    this.lastAssistantText = '';
    this.remoteAudioPlaying = false;
    this.pendingResponseDone = false;
    this.responseAudioFallbackTimer = null;
    this.eventQueue = [];
  }

  StudioVoiceCall.prototype.apiQuery = function () {
    var q = 'scenario=' + encodeURIComponent(this.scenario);
    if (this.brief) q += '&brief=' + encodeURIComponent(String(this.brief).slice(0, 700));
    return q;
  };

  StudioVoiceCall.prototype.phaseAt = function (index) {
    return this.phases[index] || { id: 'turn', label: 'Vaihe ' + (index + 1), tag: '' };
  };

  StudioVoiceCall.prototype.sendEvent = function (event) {
    if (this.dc && this.dc.readyState === 'open') this.dc.send(JSON.stringify(event));
    else this.eventQueue.push(event);
  };

  StudioVoiceCall.prototype.flushEventQueue = function () {
    if (!this.dc || this.dc.readyState !== 'open') return;
    while (this.eventQueue.length) this.dc.send(JSON.stringify(this.eventQueue.shift()));
  };

  StudioVoiceCall.prototype.buildResponseInstructions = function (phase, lastAnswer) {
    var last = lastAnswer || '';
    var task;
    if (phase === 0) {
      task = 'Aloita keskustelu roolissasi. Esitä ensimmäinen puheenvuorosi: yksi lyhyt avaus ja täsmälleen yksi kysymys tai siirto. Enintään 2–3 lausetta. Lopeta ja odota käyttäjän vastausta.';
    } else if (phase === 'wrapup') {
      task = 'Käyttäjä sanoi: "' + last + '". Päätä keskustelu lyhyesti roolissasi. Älä anna palautetta äläkä arvioi suoritusta. Enintään 1–2 lausetta.';
    } else {
      task = 'Käyttäjä vastasi: "' + last + '". Pysy roolissasi. Reagoi lyhyesti ja esitä täsmälleen yksi täsmällinen jatkokysymys tai vastasiirto. Enintään 2–3 lausetta. Lopeta ja odota.';
    }
    // response.create instructions REPLACE the session instructions, so we must
    // repeat the persona here every turn or the model reverts to a generic bot.
    if (this.instructions) {
      return this.instructions + '\n\n--- TÄMÄN VUORON TEHTÄVÄ ---\n' + task;
    }
    return task;
  };

  StudioVoiceCall.prototype.requestResponse = function (phase, lastAnswer) {
    this.aiResponding = true;
    this.awaitingUserAnswer = false;
    this.sendEvent({
      type: 'response.create',
      response: { instructions: this.buildResponseInstructions(phase, lastAnswer) }
    });
  };

  StudioVoiceCall.prototype.tryStartConversation = function () {
    if (this.started) return;
    if (!this.dc || this.dc.readyState !== 'open') return;
    this.started = true;
    this.onStatus('Vastapuoli aloittaa — kuuntele…');
    this.onPhaseChange({ phase: 'opening', label: this.phaseAt(0).label, clientText: '' });
    this.requestResponse(0, '');
  };

  StudioVoiceCall.prototype.handleUserTranscript = function (transcript) {
    if (!this.awaitingUserAnswer || this.aiResponding || this.awaitingWrapUp) return;
    if (Date.now() - this.responseDoneAt < ECHO_GUARD_MS) return;

    var qIndex = this.answerCount;
    if (qIndex >= this.expectedTurns) return;
    if (!isMeaningfulAnswer(transcript)) {
      this.onStatus('En kuullut selvästi — vastaa uudelleen kun olet valmis.');
      return;
    }

    var phase = this.phaseAt(qIndex);
    this.answerCount++;
    this.onUserTranscript({ index: qIndex, phase: phase.id, label: phase.label, transcript: transcript });
    this.pendingClientText = '';

    if (this.answerCount >= this.expectedTurns) {
      this.awaitingWrapUp = true;
      this.onStatus('Viimeinen vastaus kuultu — vastapuoli päättää…');
      this.onPhaseChange({ phase: 'done', label: 'Valmis', clientText: '' });
      this.requestResponse('wrapup', transcript);
      return;
    }

    var next = this.phaseAt(this.answerCount);
    this.onStatus('Vastaus tallennettu — vastapuoli jatkaa…');
    this.onPhaseChange({ phase: next.id, label: next.label, clientText: '' });
    this.requestResponse(this.answerCount, transcript);
  };

  StudioVoiceCall.prototype.clearResponseAudioFallback = function () {
    if (this.responseAudioFallbackTimer) {
      clearTimeout(this.responseAudioFallbackTimer);
      this.responseAudioFallbackTimer = null;
    }
  };

  StudioVoiceCall.prototype.scheduleResponseAudioFallback = function (ms) {
    var self = this;
    this.clearResponseAudioFallback();
    this.responseAudioFallbackTimer = setTimeout(function () {
      self.responseAudioFallbackTimer = null;
      if (!self.pendingResponseDone) return;
      self.pendingResponseDone = false;
      self.setRemoteAudioMuted(true);
      self.onResponseAudioFinished();
    }, ms || 12000);
  };

  StudioVoiceCall.prototype.setRemoteAudioMuted = function (muted) {
    if (this.audioEl) this.audioEl.muted = !!muted;
  };

  StudioVoiceCall.prototype.onResponseAudioFinished = function () {
    this.clearResponseAudioFallback();
    this.responseDoneAt = Date.now();

    if (this.awaitingWrapUp) {
      clearTimeout(this.wrapUpTimer);
      this.wrapUpTimer = setTimeout(function (self) {
        self.finish('complete');
      }, 1200, this);
      return;
    }

    this.awaitingUserAnswer = true;
    this.onStatus('Sinun vuorosi — puhu rauhallisesti, yksi ajatus kerrallaan.');
    this.onPhaseChange({
      phase: this.phaseAt(this.answerCount).id,
      label: this.phaseAt(this.answerCount).label,
      clientText: this.pendingClientText || this.lastAssistantText || ''
    });
  };

  StudioVoiceCall.prototype.handleServerEvent = function (event) {
    if (!event || !event.type) return;

    if (event.type === 'session.created') {
      this.tryStartConversation();
      return;
    }
    if (event.type === 'output_audio_buffer.started') {
      this.remoteAudioPlaying = true;
      this.setRemoteAudioMuted(false);
      this.ensureRemoteAudioPlaying();
      return;
    }
    if (event.type === 'output_audio_buffer.stopped') {
      this.remoteAudioPlaying = false;
      this.setRemoteAudioMuted(true);
      if (this.pendingResponseDone) {
        this.pendingResponseDone = false;
        this.onResponseAudioFinished();
      }
      return;
    }
    if (event.type === 'response.created') {
      this.aiResponding = true;
      this.awaitingUserAnswer = false;
      this.setRemoteAudioMuted(false);
      this.ensureRemoteAudioPlaying();
      this.onStatus('Vastapuoli puhuu — kuuntele…');
      return;
    }
    if (
      event.type === 'response.output_audio_transcript.done' ||
      event.type === 'response.audio_transcript.done' ||
      event.type === 'response.output_text.done'
    ) {
      var text = String(event.transcript || event.text || '').trim();
      if (text) {
        this.lastAssistantText = text;
        this.pendingClientText = text;
        this.onAssistantText(text);
      }
      return;
    }
    if (event.type === 'response.done') {
      this.aiResponding = false;
      this.pendingResponseDone = true;
      if (this.remoteAudioPlaying) {
        this.scheduleResponseAudioFallback(15000);
        return;
      }
      this.pendingResponseDone = false;
      this.setRemoteAudioMuted(true);
      this.onResponseAudioFinished();
      return;
    }
    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      this.handleUserTranscript(String(event.transcript || '').trim());
      return;
    }
    if (event.type === 'error') {
      this.onError(event.error || event);
    }
  };

  StudioVoiceCall.prototype.onDataChannelOpen = function () {
    this.flushEventQueue();
    this.tryStartConversation();
  };

  StudioVoiceCall.prototype.ensureRemoteAudioPlaying = function () {
    var audio = this.audioEl;
    if (!audio || !audio.srcObject) return;
    var playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(function () {});
  };

  StudioVoiceCall.prototype.setupRemoteAudio = function (stream) {
    var audio = this.audioEl;
    if (!audio || !stream) return;
    var track = stream.getAudioTracks()[0];
    if (!track) return;
    if (!audio.srcObject) audio.srcObject = new MediaStream();
    var existing = audio.srcObject.getAudioTracks();
    var hasTrack = false;
    existing.forEach(function (t) {
      if (t === track) { hasTrack = true; return; }
      audio.srcObject.removeTrack(t);
      try { t.stop(); } catch (e) {}
    });
    if (!hasTrack) audio.srcObject.addTrack(track);
    audio.volume = 1;
    audio.muted = true;
    this.onRemoteAudio();
    this.ensureRemoteAudioPlaying();
  };

  StudioVoiceCall.prototype.start = async function () {
    if (!global.RTCPeerConnection) throw new Error('Selaimesi ei tue live-ääntä (WebRTC).');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Mikrofoni ei ole käytettävissä tässä selaimessa.');
    }

    this.onStatus('Yhdistetään vastapuoleen…');
    var apiQ = this.apiQuery();

    var pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.pc = pc;

    var mount = this.audioMount || document.getElementById('studioAudioMount') || document.body;
    var audio = document.createElement('audio');
    audio.autoplay = true;
    audio.setAttribute('playsinline', 'true');
    audio.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none';
    this.audioEl = audio;
    mount.appendChild(audio);

    var self = this;
    pc.ontrack = function (e) {
      if (e.streams && e.streams[0]) self.setupRemoteAudio(e.streams[0]);
    };

    var cfgPromise = fetch(API_BASE + '/realtime/config?' + apiQ, { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });

    var micPromise = navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
    });

    var results = await Promise.all([cfgPromise, micPromise]);
    if (results[0]) {
      if (Array.isArray(results[0].phases)) this.phases = results[0].phases;
      if (results[0].expectedTurns) this.expectedTurns = results[0].expectedTurns;
      if (results[0].instructions) this.instructions = String(results[0].instructions);
    }

    this.mediaStream = results[1];
    this.mediaStream.getTracks().forEach(function (track) { pc.addTrack(track, self.mediaStream); });

    var dc = pc.createDataChannel('oai-events');
    this.dc = dc;
    dc.addEventListener('open', function () { self.onDataChannelOpen(); });
    dc.addEventListener('message', function (e) {
      try { self.handleServerEvent(JSON.parse(e.data)); } catch (err) { console.warn('[studio-voice]', err); }
    });

    var offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    var sdpResponse = await fetch(API_BASE + '/realtime/session?' + apiQ, {
      method: 'POST',
      body: offer.sdp,
      headers: { 'Content-Type': 'application/sdp' },
      credentials: 'include',
      signal: AbortSignal.timeout(35000)
    });

    if (!sdpResponse.ok) {
      var msg = 'Live-yhteys epäonnistui';
      try { var err = await sdpResponse.json(); if (err.error) msg = err.error; } catch (e) {}
      throw new Error(msg);
    }

    await pc.setRemoteDescription({ type: 'answer', sdp: await sdpResponse.text() });
    this.connected = true;
    this.onStatus('● Live — odota vastapuolen avausta');
  };

  StudioVoiceCall.prototype.finish = function (reason) {
    if (!this.connected && reason === 'complete') return;
    var wasConnected = this.connected;
    this.stop();
    if (wasConnected) this.onComplete({ reason: reason || 'stopped', answerCount: this.answerCount });
  };

  StudioVoiceCall.prototype.stop = function () {
    this.clearResponseAudioFallback();
    clearTimeout(this.wrapUpTimer);
    this.wrapUpTimer = null;
    this.connected = false;
    this.started = false;
    this.awaitingUserAnswer = false;
    this.aiResponding = false;
    try { if (this.mediaStream) this.mediaStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    try { if (this.dc) this.dc.close(); } catch (e) {}
    try { if (this.pc) this.pc.close(); } catch (e) {}
    if (this.audioEl) {
      try { this.audioEl.pause(); } catch (e) {}
      if (this.audioEl.srcObject) this.audioEl.srcObject = null;
      if (this.audioEl.parentNode) this.audioEl.parentNode.removeChild(this.audioEl);
    }
    this.mediaStream = null;
    this.dc = null;
    this.pc = null;
    this.audioEl = null;
    this.eventQueue = [];
  };

  global.StudioVoiceCall = StudioVoiceCall;
})(typeof window !== 'undefined' ? window : global);
