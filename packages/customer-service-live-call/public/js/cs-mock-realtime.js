/**
 * Live customer-service call — AI plays caller, student plays agent (4 turns).
 * Clone of mock-realtime.js adapted for asiakaspalvelu.
 */
(function (global) {
  'use strict';

  var DEFAULT_TURNS = 4;
  var ECHO_GUARD_MS = 1500;
  var MIN_ANSWER_LEN = 2;
  var MIN_OPENING_LEN = 8;
  var API_BASE = '/api/cs-call';

  function isMeaningfulAnswer(text, phaseId) {
    var t = String(text || '').trim();
    if (t.length < MIN_ANSWER_LEN) return false;
    if (/^(äh+|öh+|hm+|hmm+|mmm+|ja|joo|ok|okay|no|hei|\.+|,+|!+|\?+)$/i.test(t)) return false;
    if (phaseId === 'opening' && t.length < MIN_OPENING_LEN) return false;
    return true;
  }

  function CsMockRealtimeCall(options) {
    this.scenarioId = options.scenarioId || 'wrong_bill';
    this.customScenarioText = options.customScenarioText || '';
    this.phases = options.phases || [];
    this.expectedTurns = options.expectedTurns || DEFAULT_TURNS;
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
    this.remoteAudioStarted = false;
    this.remoteAudioPlaying = false;
    this.pendingResponseDone = false;
    this.responseAudioFallbackTimer = null;
    this.eventQueue = [];
    this.agentAnswers = {};
  }

  CsMockRealtimeCall.prototype.apiQuery = function () {
    var q = 'scenario=' + encodeURIComponent(this.scenarioId);
    if (this.scenarioId === 'custom' && this.customScenarioText) {
      q += '&custom=' + encodeURIComponent(this.customScenarioText);
    }
    return q;
  };

  CsMockRealtimeCall.prototype.phaseAt = function (index) {
    return this.phases[index] || { id: 'turn', label: 'Vaihe ' + (index + 1), tag: '' };
  };

  CsMockRealtimeCall.prototype.buildContext = function (lastAnswer) {
    return {
      lastAnswer: lastAnswer || '',
      opening: this.agentAnswers.opening || '',
      problem: this.agentAnswers.problem || '',
      escalation: this.agentAnswers.escalation || ''
    };
  };

  CsMockRealtimeCall.prototype.sendEvent = function (event) {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(event));
    } else {
      this.eventQueue.push(event);
    }
  };

  CsMockRealtimeCall.prototype.flushEventQueue = function () {
    if (!this.dc || this.dc.readyState !== 'open') return;
    while (this.eventQueue.length) {
      this.dc.send(JSON.stringify(this.eventQueue.shift()));
    }
  };

  CsMockRealtimeCall.prototype.buildResponseInstructions = function (phase, ctx) {
    var opening = ctx.opening || '';
    var last = ctx.lastAnswer || '';

    if (phase === 0) {
      return [
        'Olet asiakas joka soittaa asiakaspalveluun. Tervehdi lyhyesti ja kerro MIKSI soitat — yksi selkeä ongelma.',
        'Max 2–3 lausetta. Älä ratkaise itse. Lopeta — odota palvelijan vastausta.'
      ].join(' ');
    }
    if (phase === 1) {
      return [
        'Palvelija vastasi: "' + last + '".',
        'Anna yksi konkreettinen yksityiskohta (luku, päivä, tilausnumero, mitä meni pieleen).',
        'Ole hieman kärsimätön mutta kohtuullinen. Max 3 lausetta. Lopeta — odota.'
      ].join(' ');
    }
    if (phase === 2) {
      return [
        'Palvelija vastasi: "' + last + '".',
        'Olet pettynyt — sano että tämä ei riitä tai haluat selvityksen nyt. Ei uhkailua.',
        'Max 2 lausetta. Lopeta — odota.'
      ].join(' ');
    }
    if (phase === 3) {
      return [
        'Palvelija vastasi: "' + last + '".',
        'Pyydä selkeä seuraava askel: hyvitys, vaihto, soitto takaisin, esimies.',
        'Jos palvelija oli empaattinen, voit hieman lieventää. Max 2 lausetta. Lopeta — odota.'
      ].join(' ');
    }
    return 'Kiitä lyhyesti tai sano "toivottavasti tämä selviää" — älä anna palautetta palvelijalle. Max 1 lause.';
  };

  CsMockRealtimeCall.prototype.requestClientResponse = function (phase, ctx) {
    this.aiResponding = true;
    this.awaitingUserAnswer = false;
    this.sendEvent({
      type: 'response.create',
      response: {
        instructions: this.buildResponseInstructions(phase, ctx || {})
      }
    });
  };

  CsMockRealtimeCall.prototype.tryStartConversation = function () {
    if (this.started) return;
    if (!this.dc || this.dc.readyState !== 'open') return;
    this.started = true;
    this.onStatus('Asiakas soittaa — kuuntele...');
    this.onPhaseChange({ phase: 'opening', label: 'Puhelun alku', clientText: '' });
    this.requestClientResponse(0, {});
  };

  CsMockRealtimeCall.prototype.handleUserTranscript = function (transcript) {
    if (!this.awaitingUserAnswer || this.aiResponding || this.awaitingWrapUp) return;
    if (Date.now() - this.responseDoneAt < ECHO_GUARD_MS) return;

    var qIndex = this.answerCount;
    if (qIndex >= this.expectedTurns) return;
    var phase = this.phaseAt(qIndex);

    if (!isMeaningfulAnswer(transcript, phase.id)) {
      if (phase.id === 'opening') {
        this.onStatus('Tervehdi asiakasta ja kysy miten voit auttaa — odota ja vastaa uudelleen.');
      } else {
        this.onStatus('En kuullut selvästi — vastaa uudelleen kun olet valmis.');
      }
      return;
    }

    var clientLine = this.pendingClientText || this.lastAssistantText || '';
    this.agentAnswers[phase.id] = transcript;

    this.answerCount++;
    this.onUserTranscript({
      index: qIndex,
      phase: phase.id,
      tag: phase.tag,
      label: phase.label,
      question: clientLine,
      clientText: clientLine,
      transcript: transcript
    });

    this.pendingClientText = '';
    var ctx = this.buildContext(transcript);

    if (this.answerCount >= this.expectedTurns) {
      this.awaitingWrapUp = true;
      this.onStatus('Viimeinen vastaus kuultu — asiakas päättää puhelun...');
      this.onPhaseChange({ phase: 'done', label: 'Valmis', clientText: '' });
      this.requestClientResponse('wrapup', ctx);
      return;
    }

    var next = this.phaseAt(this.answerCount);
    this.onStatus('Vastaus tallennettu — asiakas jatkaa...');
    this.onPhaseChange({ phase: next.id, label: next.label, clientText: '' });
    this.requestClientResponse(this.answerCount, ctx);
  };

  CsMockRealtimeCall.prototype.clearResponseAudioFallback = function () {
    if (this.responseAudioFallbackTimer) {
      clearTimeout(this.responseAudioFallbackTimer);
      this.responseAudioFallbackTimer = null;
    }
  };

  CsMockRealtimeCall.prototype.scheduleResponseAudioFallback = function (ms) {
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

  CsMockRealtimeCall.prototype.setRemoteAudioMuted = function (muted) {
    if (this.audioEl) this.audioEl.muted = !!muted;
  };

  CsMockRealtimeCall.prototype.onResponseAudioFinished = function () {
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
    var waitingPhase = this.phaseAt(this.answerCount);
    var waitMsg = waitingPhase.id === 'opening'
      ? 'Sinun vuoro — tervehdi asiakasta ja kysy miten voit auttaa.'
      : 'Sinun vuoro — vastaa asiakkaalle rauhallisesti ja selkeästi.';
    this.onStatus(waitMsg);
    this.onPhaseChange({
      phase: waitingPhase.id,
      label: waitingPhase.label,
      clientText: this.pendingClientText || this.lastAssistantText || ''
    });
  };

  CsMockRealtimeCall.prototype.handleServerEvent = function (event) {
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
      this.onStatus('Asiakas puhuu — kuuntele...');
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
        var phase = this.phaseAt(this.answerCount);
        this.onPhaseChange({
          phase: phase.id,
          label: phase.label,
          clientText: text
        });
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

  CsMockRealtimeCall.prototype.onDataChannelOpen = function () {
    this.flushEventQueue();
    this.tryStartConversation();
  };

  CsMockRealtimeCall.prototype.ensureRemoteAudioPlaying = function () {
    var audio = this.audioEl;
    if (!audio || !audio.srcObject) return;
    var playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {});
    }
  };

  CsMockRealtimeCall.prototype.setupRemoteAudio = function (stream) {
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
    if (!this.remoteAudioStarted) {
      this.remoteAudioStarted = true;
      this.onRemoteAudio();
    }
    this.ensureRemoteAudioPlaying();
  };

  CsMockRealtimeCall.prototype.start = async function () {
    if (!global.RTCPeerConnection) throw new Error('Selaimesi ei tue live-ääntä (WebRTC).');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Mikrofoni ei ole käytettävissä.');
    }

    this.onStatus('Yhdistetään asiakkaaseen...');
    var apiQ = this.apiQuery();

    var pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    this.pc = pc;

    var mount = document.getElementById('csAudioMount') || document.body;
    var audio = document.createElement('audio');
    audio.autoplay = true;
    audio.setAttribute('playsinline', 'true');
    audio.id = 'csRealtimeAudio';
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
    }

    this.mediaStream = results[1];
    this.mediaStream.getTracks().forEach(function (track) {
      pc.addTrack(track, self.mediaStream);
    });

    var dc = pc.createDataChannel('oai-events');
    this.dc = dc;
    dc.addEventListener('open', function () { self.onDataChannelOpen(); });
    dc.addEventListener('message', function (e) {
      try { self.handleServerEvent(JSON.parse(e.data)); } catch (err) { console.warn('[cs-realtime]', err); }
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
      try {
        var err = await sdpResponse.json();
        if (err.error) msg = err.error;
      } catch (e) {}
      throw new Error(msg);
    }

    await pc.setRemoteDescription({ type: 'answer', sdp: await sdpResponse.text() });
    this.connected = true;
    this.onStatus('● Live — odota asiakkaan avauspuhelua');
  };

  CsMockRealtimeCall.prototype.finish = function (reason) {
    if (!this.connected && reason === 'complete') return;
    var wasConnected = this.connected;
    this.stop();
    if (wasConnected) {
      this.onComplete({ reason: reason || 'stopped', answerCount: this.answerCount });
    }
  };

  CsMockRealtimeCall.prototype.stop = function () {
    this.clearResponseAudioFallback();
    clearTimeout(this.wrapUpTimer);
    this.wrapUpTimer = null;
    this.connected = false;
    this.started = false;
    this.awaitingUserAnswer = false;
    this.aiResponding = false;
    try {
      if (this.mediaStream) this.mediaStream.getTracks().forEach(function (t) { t.stop(); });
    } catch (e) {}
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

  global.CsMockRealtimeCall = CsMockRealtimeCall;
})(typeof window !== 'undefined' ? window : global);
