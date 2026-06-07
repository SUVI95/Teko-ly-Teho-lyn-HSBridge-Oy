/**
 * Live mock interview via OpenAI Realtime API + WebRTC (gpt-realtime-2).
 * Browser mic/speaker stream directly — lower latency than record→Whisper→TTS.
 */
(function (global) {
  'use strict';

  function MockRealtimeInterview(options) {
    this.questions = options.questions || [];
    this.totalQuestions = this.questions.length;
    this.onStatus = options.onStatus || function () {};
    this.onQuestionChange = options.onQuestionChange || function () {};
    this.onUserTranscript = options.onUserTranscript || function () {};
    this.onAssistantText = options.onAssistantText || function () {};
    this.onComplete = options.onComplete || function () {};
    this.onError = options.onError || function () {};

    this.pc = null;
    this.dc = null;
    this.audioEl = null;
    this.mediaStream = null;
    this.connected = false;
    this.started = false;
    this.answerCount = 0;
    this.awaitingWrapUp = false;
    this.wrapUpTimer = null;
    this.sessionStartedAt = 0;
  }

  MockRealtimeInterview.prototype.sendEvent = function (event) {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(event));
    }
  };

  MockRealtimeInterview.prototype.handleServerEvent = function (event) {
    if (!event || !event.type) return;

    if (event.type === 'session.created' || event.type === 'session.updated') {
      if (!this.started) {
        this.started = true;
        this.onStatus('Rekrytoija aloittaa — kuuntele...');
        this.sendEvent({
          type: 'response.create',
          response: {
            instructions: 'Aloita haastattelu lämpimällä tervehdyksellä ja esitä ensimmäinen kysymys listalta.'
          }
        });
      }
      return;
    }

    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      const transcript = String(event.transcript || '').trim();
      if (!transcript) return;

      const qIndex = this.answerCount;
      if (qIndex >= this.totalQuestions) return;

      const q = this.questions[qIndex] || {};
      this.answerCount++;
      this.onUserTranscript({
        index: qIndex,
        tag: q.tag || '',
        question: q.text || '',
        transcript
      });
      this.onQuestionChange(Math.min(this.answerCount, this.totalQuestions - 1));

      if (this.answerCount >= this.totalQuestions) {
        this.awaitingWrapUp = true;
        this.onStatus('Viimeinen vastaus kuultu — rekrytoija päättää...');
      } else {
        this.onStatus('Rekrytoija reagoi — vastaa seuraavaan kysymykseen kun kuulet sen.');
      }
      return;
    }

    if (
      event.type === 'response.output_audio_transcript.done' ||
      event.type === 'response.audio_transcript.done'
    ) {
      const text = String(event.transcript || '').trim();
      if (text) this.onAssistantText(text);
      return;
    }

    if (event.type === 'response.done' && this.awaitingWrapUp) {
      clearTimeout(this.wrapUpTimer);
      this.wrapUpTimer = setTimeout(() => {
        this.finish('complete');
      }, 1800);
      return;
    }

    if (event.type === 'error') {
      this.onError(event.error || event);
    }
  };

  MockRealtimeInterview.prototype.onDataChannelOpen = function () {
    this.onStatus('Yhteys valmis — odota rekrytoijaa...');
  };

  MockRealtimeInterview.prototype.start = async function () {
    if (!global.RTCPeerConnection) {
      throw new Error('Selaimesi ei tue live-ääntä (WebRTC).');
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Mikrofoni ei ole käytettävissä.');
    }

    this.onStatus('Yhdistetään live-rekrytoijaan...');
    this.sessionStartedAt = Date.now();

    const pc = new RTCPeerConnection();
    this.pc = pc;

    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.setAttribute('playsinline', 'true');
    this.audioEl = audio;
    document.body.appendChild(audio);

    pc.ontrack = function (e) {
      if (e.streams && e.streams[0]) audio.srcObject = e.streams[0];
    };

    const ms = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    this.mediaStream = ms;
    ms.getTracks().forEach(function (track) {
      pc.addTrack(track, ms);
    });

    const dc = pc.createDataChannel('oai-events');
    this.dc = dc;
    const self = this;
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
    this.onStatus('● Live — puhu normaalisti kun rekrytoija on kysynyt');
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

    if (this.audioEl && this.audioEl.parentNode) {
      this.audioEl.parentNode.removeChild(this.audioEl);
    }

    this.mediaStream = null;
    this.dc = null;
    this.pc = null;
    this.audioEl = null;
  };

  global.MockRealtimeInterview = MockRealtimeInterview;
})(typeof window !== 'undefined' ? window : global);
