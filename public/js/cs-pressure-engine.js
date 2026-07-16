/**
 * Silence / pressure timing for live CS call (browser port of lib/cs-call/pressure-engine.ts).
 */
(function (global) {
  'use strict';

  var SILENCE_THRESHOLDS_MS = {
    avaus: 6000,
    ongelma: 5000,
    kiristyminen: 3000,
    ratkaisu: 5000
  };

  function csPhaseToPressurePhase(phaseId) {
    switch (phaseId) {
      case 'opening': return 'avaus';
      case 'problem': return 'ongelma';
      case 'escalation': return 'kiristyminen';
      case 'resolution': return 'ratkaisu';
      default: return 'ongelma';
    }
  }

  function createInitialPressureState() {
    return { silenceStartedAt: null, totalSilenceMsThisPhase: 0, escalationLevel: 0 };
  }

  function tickPressure(state, agentIsSpeaking, now, phase) {
    var threshold = SILENCE_THRESHOLDS_MS[phase] || 5000;
    if (agentIsSpeaking) {
      return { silenceStartedAt: null, totalSilenceMsThisPhase: 0, escalationLevel: 0 };
    }
    var silenceStartedAt = state.silenceStartedAt != null ? state.silenceStartedAt : now;
    var silenceDuration = now - silenceStartedAt;
    var escalationLevel = 0;
    if (silenceDuration > threshold * 3) escalationLevel = 3;
    else if (silenceDuration > threshold * 2) escalationLevel = 2;
    else if (silenceDuration > threshold) escalationLevel = 1;
    return {
      silenceStartedAt: silenceStartedAt,
      totalSilenceMsThisPhase: silenceDuration,
      escalationLevel: escalationLevel
    };
  }

  function pressureLevelToCustomerInstruction(level) {
    var lock =
      'ROOLI (sisäinen — älä sano ääneen): Olet VAIN asiakas. Tuotos = vain asiakkaan puhe suomeksi. ' +
      'Älä koskaan sano: ymmärrän, tarkistan, palaan asiaan, autan sua.';
    switch (level) {
      case 0: return null;
      case 1:
        return lock + '\nPUHU NYT: Yksi lyhyt lause — lievä kärsimättömyys, yhä kohtelias.';
      case 2:
        return lock + '\nPUHU NYT: Kysy omin sanoin miksi kestää niin kauan — selvästi ärtynyt.';
      case 3:
        return lock + '\nPUHU NYT: Ilmaise turhautuminen — mainitse esimies tai puhelun lopettaminen, 1–2 lausetta.';
      default: return null;
    }
  }

  global.CsPressureEngine = {
    csPhaseToPressurePhase: csPhaseToPressurePhase,
    createInitialPressureState: createInitialPressureState,
    tickPressure: tickPressure,
    pressureLevelToCustomerInstruction: pressureLevelToCustomerInstruction
  };
})(typeof window !== 'undefined' ? window : global);
