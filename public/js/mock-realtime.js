/**
 * Live mock interview — conversational gpt-realtime-2 via WebRTC.
 * Flow: greet → name → background → 3 AI-generated behavioral questions.
 */
(function (global) {
  'use strict';

  var DEFAULT_TURNS = 5;

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
    this.awaitingWrapUp = false;
    this.wrapUpTimer = null;
    this.deliveryHint = options.deliveryHint || '';
    this.pendingRecruiterText = '';
    this.lastAssistantText = '';
    this.remoteAudioStarted = false;
  }

  MockRealtimeInterview.prototype.tryStartConversation = function () {
    if (this.started) return;
    this.started = true;
    this.onStatus('Rekrytoija aloittaa — kuuntele...');
    this.onPhaseChange({ phase: 'intro', label: 'Tutustuminen', recruiterText: '' });
    this.sendEvent({
      type: 'response.create',
      response: {
        instructions: 'Aloita lyhyellä lämpimällä tervehdyksellä ja kysy hakijan nimi. Vain yksi kysymys — odota vastausta.'
      }
    });
  };

  MockRealtimeInterview.prototype.phaseAt = function (index) {
    return this.phases[index] || { id: 'turn', label: 'Kysymys ' + (index + 1), tag: '' };
  };

  MockRealtimeInterview.prototype.sendEvent = function (event) {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(event));
    }
  };

  MockRealtimeInterview.prototype.handleServerEvent = function (event) {
    if (!event || !event.type) return;

    if (event.type === 'session.created') {
      this.tryStartConversation();
      return;
    }
    if (event.type === 'session.updated') {
      return;
    }

    if (
      event.type === 'response.output_audio_transcript.done' ||
      event.type === 'response.audio_transcript.done' ||
      event.type === 'response.output_text.done'
    ) {
      const text = String(event.transcript || event.text || '').trim();
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

    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      const transcript = String(event.transcript || '').trim();
      if (!transcript) return;

      const qIndex = this.answerCount;
      if (qIndex >= this.expectedTurns) return;

      const phase = this.phaseAt(qIndex);
      const question = this.pendingRecruiterText || this.lastAssistantText || '';

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

      if (this.answerCount >= this.expectedTurns) {
        this.awaitingWrapUp = true;
        this.onStatus('Viimeinen vastaus kuultu — rekrytoija päättää...');
        this.onPhaseChange({ phase: 'done', label: 'Valmis', recruiterText: '' });
      } else {
        const next = this.phaseAt(this.answerCount);
        this.onStatus('Rekrytoija jatkaa — kuuntele seuraavaa kysymystä.');
        this.onPhaseChange({ phase: next.id, label: next.label, recruiterText: '' });
      }
      return;
    }

    if (event.type === 'response.done' && this.awaitingWrapUp) {
      clearTimeout(this.wrapUpTimer);
      this.wrapUpTimer = setTimeout(() => {
        this.finish('complete');
      }, 2200);
      return;
    }

    if (event.type === 'error') {
      this.onError(event.error || event);
    }
  };

  MockRealtimeInterview.prototype.onDataChannelOpen = function () {
    if (this.deliveryHint) {
      this.sendEvent({
        type: 'session.update',
        session: {
          type: 'realtime',
          instructions: this.deliveryHint
        }
      });
    }
    this.tryStartConversation();
  };

  MockRealtimeInterview.prototype.setupRemoteAudio = function (stream) {
    const audio = this.audioEl;
    if (!audio || !stream) return;
    audio.srcObject = stream;
    audio.volume = 1;
    audio.muted = false;
    if (!this.remoteAudioStarted) {
      this.remoteAudioStarted = true;
      this.onRemoteAudio();
    }
    const playPromise = audio.play();
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

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    this.pc = pc;

    const mount = document.getElementById('mockAudioMount') || document.body;
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.id = 'mockRealtimeAudio';
    audio.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none';
    this.audioEl = audio;
    mount.appendChild(audio);

    const self = this;
    pc.ontrack = function (e) {
      if (e.streams && e.streams[0]) self.setupRemoteAudio(e.streams[0]);
    };

    const cfgPromise = fetch('/api/ai/realtime/config', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });

    const micPromise = navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1
      }
    });

    const [cfg, ms] = await Promise.all([cfgPromise, micPromise]);

    if (cfg) {
      if (cfg.deliveryHint) this.deliveryHint = cfg.deliveryHint;
      if (Array.isArray(cfg.phases)) this.phases = cfg.phases;
      if (cfg.expectedTurns) this.expectedTurns = cfg.expectedTurns;
    }

    this.mediaStream = ms;
    ms.getTracks().forEach(function (track) {
      pc.addTrack(track, ms);
    });

    const dc = pc.createDataChannel('oai-events');
    this.dc = dc;
    dc.addEventListener('open', function () { self.onDataChannelOpen(); });
    dc.addEventListener('message', function (e) {
      try {
        self.handleServerEvent(JSON.parse(e.data));
      } catch (err) {
        console.warn('[mock-realtime] event parse', err);
      }
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpResponse = await fetch('/api/ai/realtime/session', {
      method: 'POST',
      body: offer.sdp,
      headers: { 'Content-Type': 'application/sdp' },
      credentials: 'include',
      signal: AbortSignal.timeout(35000)
    });

    if (!sdpResponse.ok) {
      let msg = 'Live-yhteys epäonnistui';
      try {
        const err = await sdpResponse.json();
        if (err.error) msg = err.error;
      } catch (e) {}
      throw new Error(msg);
    }

    const answerSdp = await sdpResponse.text();
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    this.connected = true;
    this.onStatus('● Live — rekrytoija kysyy nimesi');
  };

  MockRealtimeInterview.prototype.finish = function (reason) {
    if (!this.connected && reason === 'complete') return;
    const wasConnected = this.connected;
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
  };

  global.MockRealtimeInterview = MockRealtimeInterview;
})(typeof window !== 'undefined' ? window : global);
