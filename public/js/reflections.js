// Shared reflection saving functionality
const API_URL = window.location.origin + '/api';

// Save reflection to database
window.saveReflectionToAPI = async function(moduleId) {
  const reflectionTextarea = document.getElementById('reflectionText');
  if (!reflectionTextarea) {
    console.error('Reflection textarea not found');
    return;
  }
  
  const txt = reflectionTextarea.value.trim();
  if (!txt) {
    alert('Kirjoita ensin ajatuksesi!');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/reflections/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        moduleId: moduleId,
        reflectionText: txt
      })
    });
    
    if (response.ok) {
      // Show confirmation
      const confirmEl = document.getElementById('reflConfirm');
      if (confirmEl) {
        confirmEl.style.display = 'block';
        setTimeout(() => {
          confirmEl.style.display = 'none';
        }, 3000);
      } else {
        // Fallback: show alert
        alert('✅ Ajatus tallennettu!');
      }
      
      // Also save to localStorage as backup
      try {
        localStorage.setItem(`${moduleId}_reflection`, txt);
      } catch (e) {
        // Ignore localStorage errors
      }
    } else {
      const data = await response.json();
      if (response.status === 401) {
        alert('Kirjaudu sisään tallentaaksesi ajatuksesi.');
        window.location.href = '/login';
      } else {
        console.error('Failed to save reflection:', data.error);
        // Fallback to localStorage
        try {
          localStorage.setItem(`${moduleId}_reflection`, txt);
          alert('✅ Ajatus tallennettu paikallisesti (kirjaudu sisään tallentaaksesi palvelimelle).');
        } catch (e) {
          alert('Tallennus epäonnistui. Yritä uudelleen.');
        }
      }
    }
  } catch (error) {
    console.error('Error saving reflection:', error);
    // Fallback to localStorage
    try {
      localStorage.setItem(`${moduleId}_reflection`, txt);
      alert('✅ Ajatus tallennettu paikallisesti (yhteysvirhe).');
    } catch (e) {
      alert('Tallennus epäonnistui. Yritä uudelleen.');
    }
  }
}

// Load reflection from database
window.loadReflection = async function(moduleId) {
  const reflectionTextarea = document.getElementById('reflectionText');
  if (!reflectionTextarea) return;
  
  try {
    const response = await fetch(`${API_URL}/reflections/module/${moduleId}`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.reflection && data.reflection.reflection_text) {
        reflectionTextarea.value = data.reflection.reflection_text;
        return;
      }
    }
  } catch (error) {
    console.error('Error loading reflection:', error);
  }
  
  // Fallback to localStorage
  try {
    const saved = localStorage.getItem(`${moduleId}_reflection`);
    if (saved) {
      reflectionTextarea.value = saved;
    }
  } catch (e) {
    // Ignore localStorage errors
  }
}

// Save closing action (Module 10)
window.saveClosingAction = async function() {
  const actionTextarea = document.getElementById('closingActionInput');
  if (!actionTextarea) {
    console.error('Closing action textarea not found');
    return;
  }
  
  const txt = actionTextarea.value.trim();
  if (!txt) {
    alert('Kirjoita ensin päätös!');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/reflections/closing-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        actionText: txt
      })
    });
    
    if (response.ok) {
      alert('✅ Päätös tallennettu!');
    } else {
      const data = await response.json();
      if (response.status === 401) {
        alert('Kirjaudu sisään tallentaaksesi päätöksesi.');
        window.location.href = '/login';
      } else {
        console.error('Failed to save closing action:', data.error);
        alert('Tallennus epäonnistui. Yritä uudelleen.');
      }
    }
  } catch (error) {
    console.error('Error saving closing action:', error);
    alert('Tallennus epäonnistui. Yritä uudelleen.');
  }
}
