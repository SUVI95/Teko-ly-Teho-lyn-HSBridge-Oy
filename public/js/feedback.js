// Shared feedback functionality
if (typeof window._HSBRIDGE_API_URL === 'undefined') { window._HSBRIDGE_API_URL = window.location.origin + '/api'; }
const _FB_API = window._HSBRIDGE_API_URL;

// Save feedback
window.saveFeedback = async function(moduleId, questionType, feedbackText, rating) {
  try {
    const response = await fetch(`${_FB_API}/feedback/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        moduleId: moduleId,
        questionType: questionType,
        feedbackText: feedbackText,
        rating: rating || null
      })
    });
    
    if (response.ok) {
      return { success: true };
    } else {
      const data = await response.json();
      if (response.status === 401) {
        alert('Kirjaudu sisään tallentaaksesi palautteen.');
        window.location.href = '/login';
        return { success: false, error: 'Not authenticated' };
      }
      return { success: false, error: data.error || 'Failed to save feedback' };
    }
  } catch (error) {
    console.error('Error saving feedback:', error);
    return { success: false, error: 'Network error' };
  }
};

// Save "what learned" feedback
window.saveWhatLearned = async function(moduleId) {
  const textarea = document.getElementById(`whatLearned_${moduleId}`);
  if (!textarea) return { success: false, error: 'Textarea not found' };
  
  const text = textarea.value.trim();
  if (!text) {
    alert('Kirjoita ensin mitä opit!');
    return { success: false, error: 'Empty feedback' };
  }
  
  const result = await window.saveFeedback(moduleId, 'what_learned', text);
  if (result.success) {
    const confirmEl = document.getElementById(`whatLearnedConfirm_${moduleId}`);
    if (confirmEl) {
      confirmEl.style.display = 'block';
      setTimeout(() => { confirmEl.style.display = 'none'; }, 3000);
    }
  }
  return result;
};

// Save "learned new" feedback
window.saveLearnedNew = async function(moduleId) {
  const textarea = document.getElementById(`learnedNew_${moduleId}`);
  if (!textarea) return { success: false, error: 'Textarea not found' };
  
  const text = textarea.value.trim();
  if (!text) {
    alert('Kirjoita ensin vastauksesi!');
    return { success: false, error: 'Empty feedback' };
  }
  
  const result = await window.saveFeedback(moduleId, 'learned_new', text);
  if (result.success) {
    const confirmEl = document.getElementById(`learnedNewConfirm_${moduleId}`);
    if (confirmEl) {
      confirmEl.style.display = 'block';
      setTimeout(() => { confirmEl.style.display = 'none'; }, 3000);
    }
  }
  return result;
};
