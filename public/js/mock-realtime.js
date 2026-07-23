/**
 * Live mock interview — 4 turns: intro (name+background) + 3 personalized behavioral Qs.
 */
(function (global) {
  'use strict';

  var DEFAULT_TURNS = 4;
  var ECHO_GUARD_MS = 900;
  var MIN_ANSWER_LEN = 2;
  var MIN_INTRO_LEN = 12;

  function isMeaningfulAnswer(text, phaseId) {
    var t = String(text || '').trim();
    if (t.length < MIN_ANSWER_LEN) return false;
    if (/^(äh+|öh+|hm+|hmm+|mmm+|ja|joo|ok|okay|no|\.+|,+|!+|\?+)$/i.test(t)) return false;
    if (phaseId === 'intro' && t.length < MIN_INTRO_LEN) return false;
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
    this.onAnswerReady = options.onAnswerReady || null;

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
    this.remoteAudioPlaying = false;
    this.pendingResponseDone = false;
    this.responseAudioFallbackTimer = null;
    this.eventQueue = [];
    this.userAnswers = {};
    this.pausedForReview = false;
    this.pendingAdvanceCtx = null;
    this.submittingAnswer = false;
    this.submitUnlockTimer = null;
    this.speechActive = false;
    this.hasUncommittedAudio = false;
    this.awaitingTranscript = false;
    this.pendingUserTranscript = '';
  }

  function isBenignRealtimeError(err) {
    var code = String((err && err.code) || '').toLowerCase();
    var msg = String((err && err.message) || err || '').toLowerCase();
    if (code === 'input_audio_buffer_commit_empty') return true;
    if (code === 'conversation_already_has_active_response') return true;
    if (code === 'response_cancel_not_active') return true;
    if (/buffer too small|buffer only has 0|commit_empty|no active response|already has an active response/i.test(msg)) {
      return true;
    }
    return false;
  }

  MockRealtimeInterview.prototype.phaseAt = function (index) {
    return this.phases[index] || { id: 'turn', label: 'Kysymys ' + (index + 1), tag: '' };
  };

  MockRealtimeInterview.prototype.buildContext = function (lastAnswer) {
    return {
      lastAnswer: lastAnswer || '',
      intro: this.userAnswers.intro || '',
      q1: this.userAnswers.q1 || '',
      q2: this.userAnswers.q2 || ''
    };
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

  function cleanRecruiterTranscript(text) {
    var t = String(text || '').trim();
    // Model sometimes speaks stage directions from instructions ("Lopeta — odota" → "— wait").
    t = t.replace(/(?:^|\s)[—–-]\s*(?:wait|odota(?:\s+vastausta)?|stop)\s*[.!]?\s*$/i, '');
    t = t.replace(/\b(?:wait|odota(?:\s+vastausta)?)\s*[.!]?\s*$/i, '');
    t = t.replace(/\s+/g, ' ').trim();
    return t;
  }

  var SPEAK_ONLY =
    'Puhu vain hakijalle suomeksi. ÄLÄ sano ääneen ohjeita kuten wait, odota, lopeta, stop, "odota vastausta". Kun kysymys on esitetty, lopeta puhuminen hiljaa ilman mitään lisäsanaa.';

  MockRealtimeInterview.prototype.buildResponseInstructions = function (phase, ctx) {
    var intro = ctx.intro || '';
    var last = ctx.lastAnswer || '';

    if (phase === 0) {
      return [
        'Tämä on haastattelun ENSIMMÄINEN puheenvuoro.',
        'Sano AINOASTAAN: lyhyt tervehdys (1 lause) + pyyntö kertoa nimi ja lyhyt tausta.',
        'KIELLETTYÄ: käytöskysymykset, STAR, virheet, paine, konfliktit, "kerro tilanteesta".',
        'Max 2 lausetta. Aloita heti.',
        SPEAK_ONLY
      ].join(' ');
    }
    if (phase === 1) {
      return [
        'Hakija esittäytyi juuri: "' + intro + '".',
        '1 lyhyt reaktio hänen esittelyynsä + YKSI STAR-kysymys joka viittaa tuohon taustaan.',
        'Max 2–3 lausetta. Älä kysy kahta asiaa.',
        SPEAK_ONLY
      ].join(' ');
    }
    if (phase === 2) {
      return [
        'Tausta: "' + intro + '". Edellinen vastaus: "' + last + '".',
        '1 lyhyt reaktio + YKSI kysymys virheestä/epäonnistumisesta, kytkettynä taustaan.',
        'Max 2–3 lausetta.',
        SPEAK_ONLY
      ].join(' ');
    }
    if (phase === 3) {
      return [
        'Tausta: "' + intro + '". Edellinen vastaus: "' + last + '".',
        '1 lyhyt reaktio + YKSI kysymys paineesta / eri mielestä, kytkettynä taustaan.',
        'Max 2–3 lausetta. Tämä on viimeinen kysymys.',
        SPEAK_ONLY
      ].join(' ');
    }
    return [
      'Haastattelu on ohi. Kiitä lyhyesti suomeksi, esim. "Kiitos — hyvä keskustelu."',
      'Älä kysy mitään. Älä anna palautetta. Älä sano wait/odota.'
    ].join(' ');
  };

  MockRealtimeInterview.prototype.requestRecruiterResponse = function (phase, ctx) {
    this.aiResponding = true;
    this.awaitingUserAnswer = false;
    this.submittingAnswer = false;
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
    var text = String(transcript || '').trim();
    this.awaitingTranscript = false;
    this.hasUncommittedAudio = false;
    this.speechActive = false;

    // If transcript arrives slightly before our turn flag flips, keep it.
    if (!this.awaitingUserAnswer || this.aiResponding || this.awaitingWrapUp) {
      if (text && !this.pausedForReview) this.pendingUserTranscript = text;
      return;
    }
    if (Date.now() - this.responseDoneAt < ECHO_GUARD_MS && !this.submittingAnswer) {
      if (text) this.pendingUserTranscript = text;
      return;
    }

    var qIndex = this.answerCount;
    if (qIndex >= this.expectedTurns) return;
    var phase = this.phaseAt(qIndex);

    if (!isMeaningfulAnswer(text, phase.id)) {
      this.submittingAnswer = false;
      clearTimeout(this.submitUnlockTimer);
      this.submitUnlockTimer = null;
      if (phase.id === 'intro') {
        this.onStatus('Kerro nimesi ja vähän taustastasi — odota hetki ja vastaa uudelleen.');
      } else {
        this.onStatus('En kuullut selvästi — vastaa uudelleen kun olet valmis.');
      }
      return;
    }

    var question = this.pendingRecruiterText || this.lastAssistantText || '';
    this.userAnswers[phase.id] = text;
    if (phase.id === 'intro') this.userAnswers.intro = text;

    this.answerCount++;
    this.onUserTranscript({
      index: qIndex,
      phase: phase.id,
      tag: phase.tag,
      label: phase.label,
      question: question,
      transcript: text
    });

    this.pendingRecruiterText = '';
    this.pendingUserTranscript = '';
    var ctx = this.buildContext(text);
    this.pausedForReview = true;
    this.awaitingUserAnswer = false;
    this.submittingAnswer = false;
    clearTimeout(this.submitUnlockTimer);
    this.submitUnlockTimer = null;
    this.pendingAdvanceCtx = ctx;

    var isLast = this.answerCount >= this.expectedTurns;
    this.onStatus(isLast
      ? 'Vastaus tallennettu — voit yrittää uudelleen tai päättää haastattelun.'
      : 'Vastaus tallennettu — voit yrittää uudelleen tai jatkaa seuraavaan.');
    if (typeof this.onAnswerReady === 'function') {
      this.onAnswerReady({
        index: qIndex,
        phase: phase.id,
        label: phase.label,
        isLast: isLast,
        transcript: text
      });
      return;
    }

    // Fallback if UI does not handle pause: continue automatically
    this.continueAfterAnswer();
  };

  MockRealtimeInterview.prototype.flushPendingUserTranscript = function () {
    if (!this.pendingUserTranscript) return;
    if (!this.awaitingUserAnswer || this.aiResponding || this.awaitingWrapUp || this.pausedForReview) return;
    var pending = this.pendingUserTranscript;
    this.pendingUserTranscript = '';
    this.handleUserTranscript(pending);
  };

  MockRealtimeInterview.prototype.continueAfterAnswer = function () {
    if (!this.pausedForReview && !this.pendingAdvanceCtx) return false;
    var ctx = this.pendingAdvanceCtx || this.buildContext('');
    this.pausedForReview = false;
    this.pendingAdvanceCtx = null;

    if (this.answerCount >= this.expectedTurns) {
      this.awaitingWrapUp = true;
      this.onStatus('Viimeinen vastaus kuultu — rekrytoija päättää...');
      this.onPhaseChange({ phase: 'done', label: 'Valmis', recruiterText: '' });
      this.requestRecruiterResponse('wrapup', ctx);
      return true;
    }

    var next = this.phaseAt(this.answerCount);
    this.onStatus('Seuraava kysymys — rekrytoija puhuu...');
    this.onPhaseChange({ phase: next.id, label: next.label, tag: next.tag || '', recruiterText: '' });
    this.requestRecruiterResponse(this.answerCount, ctx);
    return true;
  };

  MockRealtimeInterview.prototype.submitAnswer = function () {
    // Manual "Lähetä vastaus" — finalize current speech now.
    // With semantic VAD the buffer is often already committed; committing again
    // throws input_audio_buffer_commit_empty (harmless but noisy).
    if (!this.connected) return false;
    if (this.aiResponding || this.awaitingWrapUp || this.pausedForReview) return false;
    if (!this.awaitingUserAnswer) return false;
    if (this.submittingAnswer) return false;

    if (this.pendingUserTranscript) {
      this.submittingAnswer = true;
      this.flushPendingUserTranscript();
      return true;
    }

    this.submittingAnswer = true;
    this.onStatus('Lähetetään vastaustasi — hetki...');

    if (this.hasUncommittedAudio || this.speechActive) {
      this.awaitingTranscript = true;
      this.sendEvent({ type: 'input_audio_buffer.commit' });
    } else if (this.awaitingTranscript) {
      // VAD already committed — wait for transcription.completed
      this.onStatus('Käsitellään vastaustasi — hetki...');
    } else {
      // No speech detected yet — unlock and ask student to speak
      this.submittingAnswer = false;
      this.onStatus('En kuullut vastausta vielä — puhu ensin, sitten paina Lähetä vastaus.');
      return false;
    }

    var self = this;
    clearTimeout(this.submitUnlockTimer);
    this.submitUnlockTimer = setTimeout(function () {
      self.submittingAnswer = false;
      self.awaitingTranscript = false;
      if (self.awaitingUserAnswer && !self.pausedForReview) {
        self.onStatus('En saanut ääntä — vastaa uudelleen ja paina Lähetä vastaus.');
      }
    }, 8000);
    return true;
  };

  MockRealtimeInterview.prototype.retryCurrentTurn = function () {
    if (!this.pausedForReview) return false;
    if (this.answerCount < 1) return false;

    var qIndex = this.answerCount - 1;
    var phase = this.phaseAt(qIndex);
    this.answerCount = qIndex;
    if (phase && phase.id) delete this.userAnswers[phase.id];
    if (phase && phase.id === 'intro') this.userAnswers.intro = '';

    this.pausedForReview = false;
    this.pendingAdvanceCtx = null;
    this.awaitingUserAnswer = false;
    this.onStatus('Toistetaan kysymys — kuuntele ja vastaa uudelleen...');
    this.onPhaseChange({
      phase: phase.id,
      label: phase.label,
      tag: phase.tag,
      recruiterText: this.lastAssistantText || this.pendingRecruiterText || ''
    });
    this.repeatCurrentQuestion();
    return true;
  };

  MockRealtimeInterview.prototype.repeatCurrentQuestion = function () {
    if (this.aiResponding || this.awaitingWrapUp) return false;
    if (!this.connected) return false;

    var qIndex = this.answerCount;
    var phase = this.phaseAt(qIndex);
    var lastQ = this.lastAssistantText || this.pendingRecruiterText || '';
    this.pausedForReview = false;
    this.awaitingUserAnswer = false;
    this.aiResponding = true;
    this.onStatus('Toistetaan kysymys...');

    var instructions = lastQ
      ? ('Toista tämä kysymys SANASTA SANAAN uudelleen suomeksi, ilman lisäyksiä: "' + lastQ + '". Älä muuta mitään. Lopeta heti kysymyksen jälkeen.')
      : this.buildResponseInstructions(qIndex, this.buildContext(this.userAnswers.intro || ''));

    this.sendEvent({
      type: 'response.create',
      response: { instructions: instructions }
    });
    this.onPhaseChange({
      phase: phase.id,
      label: phase.label,
      tag: phase.tag,
      recruiterText: lastQ || 'Toistetaan...'
    });
    return true;
  };

  MockRealtimeInterview.prototype.clearResponseAudioFallback = function () {
    if (this.responseAudioFallbackTimer) {
      clearTimeout(this.responseAudioFallbackTimer);
      this.responseAudioFallbackTimer = null;
    }
  };

  MockRealtimeInterview.prototype.scheduleResponseAudioFallback = function (ms) {
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

  MockRealtimeInterview.prototype.setRemoteAudioMuted = function (muted) {
    if (this.audioEl) this.audioEl.muted = !!muted;
  };

  MockRealtimeInterview.prototype.onResponseAudioFinished = function () {
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
    this.speechActive = false;
    this.hasUncommittedAudio = false;
    this.awaitingTranscript = false;
    this.setRemoteAudioMuted(true);
    var waitingPhase = this.phaseAt(this.answerCount);
    var waitMsg = waitingPhase.id === 'intro'
      ? 'Sinun vuoro — kerro nimesi ja vähän itsestäsi sekä taustastasi. Ota aikaa.'
      : 'Sinun vuoro — vastaa kun olet valmis. Ota aikaa miettiä.';
    this.onStatus(waitMsg);
    this.onPhaseChange({
      phase: waitingPhase.id,
      label: waitingPhase.label,
      tag: waitingPhase.tag || '',
      recruiterText: this.pendingRecruiterText || this.lastAssistantText || '',
      awaitingAnswer: true
    });
    this.flushPendingUserTranscript();
  };

  MockRealtimeInterview.prototype.handleServerEvent = function (event) {
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
      this.onStatus('Rekrytoija puhuu — kuuntele...');
      return;
    }

    if (
      event.type === 'response.output_audio_transcript.done' ||
      event.type === 'response.audio_transcript.done' ||
      event.type === 'response.output_text.done'
    ) {
      var text = cleanRecruiterTranscript(event.transcript || event.text || '');
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

    if (event.type === 'input_audio_buffer.speech_started') {
      this.speechActive = true;
      this.hasUncommittedAudio = true;
      this.awaitingTranscript = false;
      return;
    }

    if (event.type === 'input_audio_buffer.speech_stopped') {
      this.speechActive = false;
      // Semantic VAD will auto-commit; mark that a transcript should arrive.
      this.awaitingTranscript = true;
      return;
    }

    if (event.type === 'input_audio_buffer.committed') {
      this.hasUncommittedAudio = false;
      this.speechActive = false;
      this.awaitingTranscript = true;
      return;
    }

    if (event.type === 'conversation.item.input_audio_transcription.completed') {
      this.handleUserTranscript(String(event.transcript || '').trim());
      return;
    }

    if (event.type === 'error') {
      var err = event.error || event;
      if (isBenignRealtimeError(err)) {
        // Empty commit after VAD already finalized the buffer — ignore.
        if (this.submittingAnswer && !this.pendingUserTranscript) {
          this.awaitingTranscript = true;
          this.onStatus('Käsitellään vastaustasi — hetki...');
        }
        return;
      }
      this.onError(err);
    }
  };

  MockRealtimeInterview.prototype.onDataChannelOpen = function () {
    this.flushEventQueue();
    this.tryStartConversation();
  };

  MockRealtimeInterview.prototype.ensureRemoteAudioPlaying = function () {
    var audio = this.audioEl;
    if (!audio || !audio.srcObject) return;
    var playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {});
    }
  };

  MockRealtimeInterview.prototype.setupRemoteAudio = function (stream) {
    var audio = this.audioEl;
    if (!audio || !stream) return;

    var track = stream.getAudioTracks()[0];
    if (!track) return;

    if (!audio.srcObject) {
      audio.srcObject = new MediaStream();
    }

    var existing = audio.srcObject.getAudioTracks();
    var hasTrack = false;
    existing.forEach(function (t) {
      if (t === track) {
        hasTrack = true;
        return;
      }
      audio.srcObject.removeTrack(t);
      try { t.stop(); } catch (e) {}
    });
    if (!hasTrack) {
      audio.srcObject.addTrack(track);
    }

    audio.volume = 1;
    // Unmute early so first recruiter audio is not delayed behind mute+play race
    audio.muted = false;
    if (!this.remoteAudioStarted) {
      this.remoteAudioStarted = true;
      this.onRemoteAudio();
    }
    this.ensureRemoteAudioPlaying();
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
    this.clearResponseAudioFallback();
    clearTimeout(this.wrapUpTimer);
    clearTimeout(this.submitUnlockTimer);
    this.wrapUpTimer = null;
    this.submitUnlockTimer = null;
    this.submittingAnswer = false;
    this.speechActive = false;
    this.hasUncommittedAudio = false;
    this.awaitingTranscript = false;
    this.pendingUserTranscript = '';
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
