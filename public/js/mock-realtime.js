/**
 * Live mock interview — conversational gpt-realtime-2 via WebRTC.
 * Manual turn control: AI speaks only when triggered; waits for validated user answers.
 */
(function (global) {
  'use strict';

  var DEFAULT_TURNS = 5;
  var ECHO_GUARD_MS = 1500;
  var MIN_ANSWER_LEN = 2;

  function isMeaningfulAnswer(text) {
    var t = String(text || '').trim();
    if (t.length < MIN_ANSWER_LEN) return false;
    if (/^(äh+|öh+|hm+|hmm+|mmm+|ja|joo|ok|okay|no|\.+|,+|!+|\?+)$/i.test(t)) return false;
    return true;
  }

  function MockRealtimeInterview(options) {
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
    this.pendingRecruiterText = '';
    this.lastAssistantText = '';
    this.remoteAudioStarted = false;
    this.eventQueue = [];
    this.userAnswers = {};
  }

  MockRealtimeInterview.prototype.phaseAt = function (index) {
    return this.phases[index] || { id: 'turn', label: 'Kysymys ' + (index + 1), tag: '' };
  };

  MockRealtimeInterview.prototype.sendEvent = function (event) {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(event));
    } else {
      this.eventQueue.push(event);
    }
  };

  MockRealtimeInterview.prototype.flushEventQueue = function () {
    if (!this.dc || this.dc.readyState !== 'open') return;
    while (this.eventQueue.length) {
      this.dc.send(JSON.stringify(this.eventQueue.shift()));
    }
  };

  MockRealtimeInterview.prototype.buildResponseInstructions = function (phase, ctx) {
    var last = ctx.lastAnswer || '';
    var name = ctx.candidateName || last;

    if (phase === 0) {
      return [
        'Tee lyhyt lämmin tervehdys suomeksi (max 1 lause).',
        'Kysy VAIN hakijan nimi — ei mitään muuta.',
        'Lopeta puheenvuoro heti kysymyksen jälkeen. Odota hiljaa vastausta.'
      ].join(' ');
    }
    if (phase === 1) {
      return [
        'Hakija sanoi nimekseen: "' + last + '".',
        'Sano lyhyesti "Mukava tutustua, ' + last + '." (tai vastaava).',
        'Kysy VAIN yksi kysymys taustasta: mistä tulee, mitä on tehnyt tai opiskellut.',
        'Max kaksi lausetta yhteensä. Lopeta — odota hiljaa.'
      ].join(' ');
    }
    if (phase === 2) {
      return [
        'Hakijan nimi: ' + name + '. Tausta: "' + last + '".',
        'Anna yksi lyhyt reaktio ("joo", "selvä", "mukava kuulla").',
        'Kysy VAIN yksi vaikea STAR-kysymys joka liittyy hänen taustaan.',
        'Lopeta — odota hiljaa vastausta.'
      ].join(' ');
    }
    if (phase === 3) {
      return [
        'Hakijan tausta: "' + (ctx.background || '') + '". Edellinen vastaus: "' + last + '".',
        'Lyhyt reaktio (1 lause).',
        'Kysy VAIN yksi kysymys virheestä tai epäonnistumisesta taustaan liittyen.',
        'Lopeta — odota hiljaa.'
      ].join(' ');
    }
    if (phase === 4) {
      return [
        'Hakijan tausta: "' + (ctx.background || '') + '". Edellinen vastaus: "' + last + '".',
        'Lyhyt reaktio (1 lause).',
        'Kysy VAIN yksi kysymys paineen alla tai eri mieltä olemisesta.',
        'Lopeta — odota hiljaa.'
      ].join(' ');
    }
    return 'Hakija vastasi viimeiseen kysymykseen. Kiitä lyhyesti: "Kiitos — hyvä keskustelu." Älä kysy mitään lisää. Älä anna palautetta.';
  };

  MockRealtimeInterview.prototype.requestRecruiterResponse = function (phase, ctx) {
    this.aiResponding = true;
    this.awaitingUserAnswer = false;
    this.sendEvent({
      type: 'response.create',
      response: {
        instructions: this.buildResponseInstructions(phase, ctx || {})
      }
    });
  };

  MockRealtimeInterview.prototype.tryStartConversation = function () {
    if (this.started) return;
    if (!this.dc || this.dc.readyState !== 'open') return;
    this.started = true;
    this.onStatus('Rekrytoija aloittaa — kuuntele...');
    this.onPhaseChange({ phase: 'intro', label: 'Tutustuminen', recruiterText: '' });
    this.requestRecruiterResponse(0, {});
  };

  MockRealtimeInterview.prototype.handleUserTranscript = function (transcript) {
    if (!this.awaitingUserAnswer || this.aiResponding || this.awaitingWrapUp) return;
    if (Date.now() - this.responseDoneAt < ECHO_GUARD_MS) return;
    if (!isMeaningfulAnswer(transcript)) {
      this.onStatus('En kuullut selvästi — vastaa uudelleen kun olet valmis.');
      return;
    }

    var qIndex = this.answerCount;
    if (qIndex >= this.expectedTurns) return;

    var phase = this.phaseAt(qIndex);
    var question = this.pendingRecruiterText || this.lastAssistantText || '';

    this.userAnswers[phase.id] = transcript;
    if (phase.id === 'name') this.userAnswers.candidateName = transcript;

    this.answerCount++;
    this.onUserTranscript({
      index: qIndex,
      phase: phase.id,
      tag: phase.tag,
      label: phase.label,
      question: question,
      transcript: transcript
    });

    this.pendingRecruiterText = '';

    var ctx = {
      lastAnswer: transcript,
      candidateName: this.userAnswers.candidateName || this.userAnswers.name || '',
      background: this.userAnswers.background || ''
    };

    if (this.answerCount >= this.expectedTurns) {
      this.awaitingWrapUp = true;
      this.onStatus('Viimeinen vastaus kuultu — rekrytoija päättää...');
      this.onPhaseChange({ phase: 'done', label: 'Valmis', recruiterText: '' });
      this.requestRecruiterResponse('wrapup', ctx);
      return;
    }

    var next = this.phaseAt(this.answerCount);
    this.onStatus('Vastaus tallennettu — rekrytoija valmistelee seuraavaa kysymystä...');
    this.onPhaseChange({ phase: next.id, label: next.label, recruiterText: '' });
    this.requestRecruiterResponse(this.answerCount, ctx);
  };

  MockRealtimeInterview.prototype.handleServerEvent = function (event) {
    if (!event || !event.type) return;

    if (event.type === 'session.created') {
      this.tryStartConversation();
      return;
    }

    if (event.type === 'response.created') {
      this.aiResponding = true;
      this.awaitingUserAnswer = false;
      this.onStatus('Rekrytoija puhuu — kuuntele...');
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
        this.pendingRecruiterText = text;
        this.onAssistantText(text);
        var phase = this.phaseAt(this.answerCount);
        this.onPhaseChange({
          phase: phase.id,
          label: phase.label,
          recruiterText: text
        });
      }
      return;
    }

    if (event.type === 'response.done') {
      this.aiResponding = false;
      this.responseDoneAt = Date.now();

      if (this.awaitingWrapUp) {
        clearTimeout(this.wrapUpTimer);
        this.wrapUpTimer = setTimeout(function (self) {
          self.finish('complete');
        }, 2800, this);
        return;
      }

      this.awaitingUserAnswer = true;
      var waitingPhase = this.phaseAt(this.answerCount);
      this.onStatus('Sinun vuoro — vastaa kun olet valmis. Ota aikaa miettiä.');
      this.onPhaseChange({
        phase: waitingPhase.id,
        label: waitingPhase.label,
        recruiterText: this.pendingRecruiterText || this.lastAssistantText || ''
      });
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

  MockRealtimeInterview.prototype.onDataChannelOpen = function () {
    this.flushEventQueue();
    this.tryStartConversation();
  };

  MockRealtimeInterview.prototype.setupRemoteAudio = function (stream) {
    var audio = this.audioEl;
    if (!audio || !stream) return;
    audio.srcObject = stream;
    audio.volume = 1;
    audio.muted = false;
    if (!this.remoteAudioStarted) {
      this.remoteAudioStarted = true;
      this.onRemoteAudio();
    }
    var playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {});
    }
  };

  MockRealtimeInterview.prototype.start = async function () {
    if (!global.RTCPeerConnection) {
      throw new Error('Selaimesi ei tue live-ääntä (WebRTC).');
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Mikrofoni ei ole käytettävissä.');
    }

    this.onStatus('Yhdistetään live-rekrytoijaan...');

    var pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    this.pc = pc;

    var mount = document.getElementById('mockAudioMount') || document.body;
    var audio = document.createElement('audio');
    audio.autoplay = true;
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.id = 'mockRealtimeAudio';
    audio.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none';
    this.audioEl = audio;
    mount.appendChild(audio);

    var self = this;
    pc.ontrack = function (e) {
      if (e.streams && e.streams[0]) self.setupRemoteAudio(e.streams[0]);
    };

    var cfgPromise = fetch('/api/ai/realtime/config', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });

    var micPromise = navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1
      }
    });

    var results = await Promise.all([cfgPromise, micPromise]);
    var cfg = results[0];
    var ms = results[1];

    if (cfg) {
      if (Array.isArray(cfg.phases)) this.phases = cfg.phases;
      if (cfg.expectedTurns) this.expectedTurns = cfg.expectedTurns;
    }

    this.mediaStream = ms;
    ms.getTracks().forEach(function (track) {
      pc.addTrack(track, ms);
    });

    var dc = pc.createDataChannel('oai-events');
    this.dc = dc;
    dc.addEventListener('open', function () { self.onDataChannelOpen(); });
    dc.addEventListener('message', function (e) {
      try {
        self.handleServerEvent(JSON.parse(e.data));
      } catch (err) {
        console.warn('[mock-realtime] event parse', err);
      }
    });

    var offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    var sdpResponse = await fetch('/api/ai/realtime/session', {
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

    var answerSdp = await sdpResponse.text();
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    this.connected = true;
    this.onStatus('● Live — odota rekrytoijan tervehdystä');
  };

  MockRealtimeInterview.prototype.finish = function (reason) {
    if (!this.connected && reason === 'complete') return;
    var wasConnected = this.connected;
    this.stop();
    if (wasConnected) {
      this.onComplete({ reason: reason || 'stopped', answerCount: this.answerCount });
    }
  };

  MockRealtimeInterview.prototype.stop = function () {
    clearTimeout(this.wrapUpTimer);
    this.wrapUpTimer = null;
    this.connected = false;
    this.started = false;
    this.awaitingUserAnswer = false;
    this.aiResponding = false;

    try {
      if (this.mediaStream) this.mediaStream.getTracks().forEach(function (t) { t.stop(); });
    } catch (e) {}

    try {
      if (this.dc) this.dc.close();
    } catch (e) {}

    try {
      if (this.pc) this.pc.close();
    } catch (e) {}

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

  global.MockRealtimeInterview = MockRealtimeInterview;
})(typeof window !== 'undefined' ? window : global);
