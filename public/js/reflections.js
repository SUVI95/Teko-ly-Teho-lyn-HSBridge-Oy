// Shared reflection saving functionality — wrapped in IIFE to avoid global conflicts
(function() {
var _API = window.location.origin + '/api';

window.saveReflectionToAPI = async function(moduleId) {
  var reflectionTextarea = document.getElementById('reflectionText');
  if (!reflectionTextarea) { return; }
  var txt = reflectionTextarea.value.trim();
  if (!txt) { alert('Kirjoita ensin ajatuksesi!'); return; }
  try {
    var response = await fetch(_API + '/reflections/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ moduleId: moduleId, reflectionText: txt })
    });
    if (response.ok) {
      var confirmEl = document.getElementById('reflConfirm');
      if (confirmEl) {
        confirmEl.style.display = 'block';
        setTimeout(function() { confirmEl.style.display = 'none'; }, 3000);
      } else {
        alert('Ajatus tallennettu!');
      }
      try { localStorage.setItem(moduleId + '_reflection', txt); } catch(e) {}
    } else {
      if (response.status === 401) {
        alert('Kirjaudu sisään tallentaaksesi ajatuksesi.');
        window.location.href = '/login';
      } else {
        try { localStorage.setItem(moduleId + '_reflection', txt); } catch(e) {}
        alert('Ajatus tallennettu paikallisesti.');
      }
    }
  } catch(error) {
    try { localStorage.setItem(moduleId + '_reflection', txt); } catch(e) {}
    alert('Ajatus tallennettu paikallisesti (yhteysvirhe).');
  }
};

window.loadReflection = async function(moduleId) {
  var reflectionTextarea = document.getElementById('reflectionText');
  if (!reflectionTextarea) return;
  try {
    var response = await fetch(_API + '/reflections/module/' + moduleId, { credentials: 'include' });
    if (response.ok) {
      var data = await response.json();
      if (data.reflection && data.reflection.reflection_text) {
        reflectionTextarea.value = data.reflection.reflection_text;
        return;
      }
    }
  } catch(error) {}
  try {
    var saved = localStorage.getItem(moduleId + '_reflection');
    if (saved) { reflectionTextarea.value = saved; }
  } catch(e) {}
};

window.saveClosingAction = async function() {
  var actionTextarea = document.getElementById('closingActionInput');
  if (!actionTextarea) { return; }
  var txt = actionTextarea.value.trim();
  if (!txt) { alert('Kirjoita ensin päätös!'); return; }
  try {
    var response = await fetch(_API + '/reflections/closing-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ actionText: txt })
    });
    if (response.ok) {
      alert('Päätös tallennettu!');
    } else if (response.status === 401) {
      alert('Kirjaudu sisään tallentaaksesi päätöksesi.');
      window.location.href = '/login';
    } else {
      alert('Tallennus epäonnistui. Yritä uudelleen.');
    }
  } catch(error) {
    alert('Tallennus epäonnistui. Yritä uudelleen.');
  }
};
})();
