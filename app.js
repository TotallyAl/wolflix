/* ═══════════════════════════════════════════════════════════════
   WOLFLIX - Application principale
   ═══════════════════════════════════════════════════════════════ */

// ====== ÉTAT GLOBAL ======
let films = {};
let profils = {};
let profilActif = null;
let blague = null;

// ====== CHARGEMENT CONFIG ======
async function loadConfig(url = 'config.json') {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} — fichier « ${url} » introuvable ?`);
    const cfg = await response.json();
    films = cfg.films || {};
  } catch (e) {
    console.error(`Impossible de charger ${url}:`, e);
    films = {};
    showLoadError(e);
    throw e;
  }
}

async function loadProfiles() {
  try {
    const response = await fetch('profiles.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const cfg = await response.json();
    profils = cfg.profils || {};
  } catch (e) {
    console.error('Impossible de charger profiles.json:', e);
    // Profil de secours pour que l'app reste utilisable
    profils = { invite: { nom: 'La Meute', emoji: '🐺', couleur: '#3ee87a' } };
  }
}

async function loadBlague() {
  try {
    const response = await fetch('blague.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    blague = await response.json();
  } catch (e) {
    console.error('Impossible de charger blague.json:', e);
    // Quiz de secours
    blague = {
      titre: 'Récupération du mot de passe',
      sousTitre: 'Réponds à la question de sécurité',
      questions: [{
        question: 'Quel est le mot de passe ?',
        propositions: ['Je ne sais pas', 'Aucune idée', 'Vraiment aucune idée'],
        reponse: "Nous non plus. Bien essayé. 🐺"
      }],
      messageFinal: "La récupération a échoué avec succès. Demande au staff !",
      boutonFinal: 'Retour'
    };
  }
}

function showLoadError(error) {
  const content = document.getElementById('content');
  const isFileProtocol = window.location.protocol === 'file:';
  content.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">Impossible de charger la configuration</div>
      ${isFileProtocol ? `
        <p style="margin-top:1rem;max-width:500px;margin-left:auto;margin-right:auto;line-height:1.6;">
          Il faut lancer Wolflix via un serveur local ou via Firefox.<br><br>
          <strong>Solution rapide :</strong> ouvre un terminal dans le dossier Wolflix et tape :<br>
          <code>python -m http.server 8000</code><br>
          puis va sur <code>http://localhost:8000/wolflix.html</code>
        </p>
      ` : `<p>Vérifie que config.json existe et que sa syntaxe JSON est valide.</p>`}
      <p style="margin-top:1rem;font-size:0.85rem;color:var(--text-dim);">Erreur : ${error.message}</p>
    </div>
  `;
}

// ====== SPLASH ======
function createStars() {
  const starsEl = document.getElementById('stars');
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 70 + '%';
    s.style.animationDelay = Math.random() * 3 + 's';
    s.style.width = s.style.height = (Math.random() * 2 + 1) + 'px';
    starsEl.appendChild(s);
  }
}

function endSplash() {
  const splash = document.getElementById('splash');
  if (!splash || splash.classList.contains('gone')) return;
  splash.classList.add('gone');
  showProfiles();
  setTimeout(() => splash.remove(), 900);
}

// ====== CHOIX DU PROFIL ======
function createProfilesStars() {
  const starsEl = document.getElementById('profilesStars');
  for (let i = 0; i < 50; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 60 + '%';
    s.style.animationDelay = Math.random() * 3 + 's';
    s.style.width = s.style.height = (Math.random() * 2 + 1) + 'px';
    starsEl.appendChild(s);
  }
}

function renderProfiles() {
  const grid = document.getElementById('profilesGrid');
  grid.innerHTML = '';
  Object.values(profils).forEach((profil, i) => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.style.animationDelay = (0.15 + i * 0.12) + 's';
    card.style.setProperty('--profile-color', profil.couleur || 'var(--green-bright)');

    const avatar = document.createElement('div');
    avatar.className = 'profile-avatar';
    if (profil.image) {
      avatar.style.backgroundImage = `url('${profil.image}')`;
    } else {
      avatar.textContent = profil.emoji || '🐺';
    }

    const name = document.createElement('div');
    name.className = 'profile-name';
    name.textContent = profil.nom || 'Sans nom';

    card.appendChild(avatar);

    if (profil.motDePasse) {
      const lock = document.createElement('div');
      lock.className = 'profile-lock';
      lock.textContent = '🔒';
      card.appendChild(lock);
    }

    card.appendChild(name);
    card.onclick = () => {
      if (profil.motDePasse) {
        openPasswordPrompt(profil);
      } else {
        selectProfile(profil);
      }
    };
    grid.appendChild(card);
  });
}

function showProfiles() {
  const profilesEl = document.getElementById('profiles');
  profilesEl.classList.remove('hidden', 'gone');
  renderProfiles();
}

async function selectProfile(profil) {
  profilActif = profil;
  updateNavProfile();

  // Charge le catalogue propre au profil (config.json par défaut)
  try {
    await loadConfig(profil.films || 'config.json');
    render();
  } catch (e) {
    // showLoadError a déjà affiché le message dans #content
  }

  const profilesEl = document.getElementById('profiles');
  const app = document.getElementById('app');
  profilesEl.classList.add('gone');
  app.classList.add('visible');
  window.scrollTo({ top: 0 });
  setTimeout(() => profilesEl.classList.add('hidden'), 900);
}

// ====== MOT DE PASSE ======
let profilEnAttente = null;

function openPasswordPrompt(profil) {
  profilEnAttente = profil;
  const overlay = document.getElementById('passwordOverlay');
  const box = document.getElementById('passwordBox');
  const avatar = document.getElementById('passwordAvatar');
  const title = document.getElementById('passwordTitle');
  const input = document.getElementById('passwordInput');
  const error = document.getElementById('passwordError');

  box.style.setProperty('--profile-color', profil.couleur || 'var(--green-bright)');
  avatar.style.setProperty('--profile-color', profil.couleur || 'var(--green-bright)');
  if (profil.image) {
    avatar.style.backgroundImage = `url('${profil.image}')`;
    avatar.textContent = '';
  } else {
    avatar.style.backgroundImage = '';
    avatar.textContent = profil.emoji || '🐺';
  }
  title.textContent = profil.nom || 'Profil verrouillé';
  input.value = '';
  error.classList.remove('visible');

  overlay.classList.add('open');
  setTimeout(() => input.focus(), 100);
}

function closePasswordPrompt() {
  profilEnAttente = null;
  document.getElementById('passwordOverlay').classList.remove('open');
}

function submitPassword() {
  if (!profilEnAttente) return;
  const input = document.getElementById('passwordInput');
  const error = document.getElementById('passwordError');
  const box = document.getElementById('passwordBox');

  if (input.value === String(profilEnAttente.motDePasse)) {
    const profil = profilEnAttente;
    closePasswordPrompt();
    selectProfile(profil);
  } else {
    error.classList.add('visible');
    input.value = '';
    input.focus();
    // Relance l'animation de secousse
    box.classList.remove('shake');
    void box.offsetWidth;
    box.classList.add('shake');
  }
}

function updateNavProfile() {
  const navProfile = document.getElementById('navProfile');
  if (!profilActif) return;
  navProfile.style.setProperty('--profile-color', profilActif.couleur || 'var(--green-bright)');
  if (profilActif.image) {
    navProfile.style.backgroundImage = `url('${profilActif.image}')`;
    navProfile.textContent = '';
  } else {
    navProfile.style.backgroundImage = '';
    navProfile.textContent = profilActif.emoji || '🐺';
  }
  navProfile.title = `${profilActif.nom} — Changer de profil`;
}

function changeProfile() {
  const app = document.getElementById('app');
  app.classList.remove('visible');
  window.scrollTo({ top: 0 });
  showProfiles();
}

// ====== PAGE D'ATTENTE ======
function createWelcomeStars() {
  const starsEl = document.getElementById('welcomeStars');
  for (let i = 0; i < 50; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 60 + '%';
    s.style.animationDelay = Math.random() * 3 + 's';
    s.style.width = s.style.height = (Math.random() * 2 + 1) + 'px';
    starsEl.appendChild(s);
  }
}

function createFireflies(count = 25) {
  const container = document.getElementById('fireflies');
  for (let i = 0; i < count; i++) {
    const f = document.createElement('div');
    f.className = 'firefly';
    // Position de départ aléatoire
    f.style.left = Math.random() * 100 + '%';
    f.style.top = (20 + Math.random() * 70) + '%';
    // Durées et délais aléatoires pour que chaque luciole ait son propre rythme
    const driftDur = 8 + Math.random() * 10;
    const glowDur = 1.5 + Math.random() * 2.5;
    f.style.setProperty('--drift-duration', driftDur + 's');
    f.style.setProperty('--glow-duration', glowDur + 's');
    f.style.setProperty('--drift-delay', -Math.random() * driftDur + 's');
    f.style.setProperty('--glow-delay', -Math.random() * glowDur + 's');
    // Trajectoires aléatoires
    f.style.setProperty('--dx1', (Math.random() * 80 - 40) + 'px');
    f.style.setProperty('--dy1', (Math.random() * 60 - 50) + 'px');
    f.style.setProperty('--dx2', (Math.random() * 80 - 40) + 'px');
    f.style.setProperty('--dy2', (Math.random() * 60 - 50) + 'px');
    f.style.setProperty('--dx3', (Math.random() * 80 - 40) + 'px');
    f.style.setProperty('--dy3', (Math.random() * 60 - 50) + 'px');
    container.appendChild(f);
  }
}

function setupMouseInteraction() {
  // Léger parallaxe : les lucioles dérivent doucement avec la souris
  const fireflies = document.getElementById('fireflies');
  const welcome = document.getElementById('welcome');
  welcome.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    fireflies.style.transform = `translate(${x}px, ${y}px)`;
  });
}

function startSplash() {
  const welcome = document.getElementById('welcome');
  const splash = document.getElementById('splash');
  if (!welcome || welcome.classList.contains('gone')) return;

  // On retire la classe "hidden" du splash et on lance ses animations
  splash.classList.remove('hidden');

  // On fait disparaître la page d'attente
  welcome.classList.add('gone');
  setTimeout(() => welcome.remove(), 900);

  // On programme la fin du splash comme avant
  setTimeout(endSplash, 3500);
}

// ====== FAUX QUIZ DE RÉCUPÉRATION ======
let quizIndex = 0;

function openQuiz() {
  closePasswordPrompt();
  quizIndex = 0;
  document.getElementById('quizTitle').textContent = blague.titre || 'Récupération du mot de passe';
  document.getElementById('quizSubtitle').textContent = blague.sousTitre || '';
  document.getElementById('quizOverlay').classList.add('open');
  renderQuizQuestion();
}

function closeQuiz() {
  document.getElementById('quizOverlay').classList.remove('open');
}

function renderQuizQuestion() {
  const body = document.getElementById('quizBody');
  const step = document.getElementById('quizStep');
  const questions = blague.questions || [];

  if (quizIndex >= questions.length) {
    renderQuizFinal();
    return;
  }

  const q = questions[quizIndex];
  step.textContent = `Question ${quizIndex + 1} / ${questions.length}`;

  body.innerHTML = '';
  const questionEl = document.createElement('div');
  questionEl.className = 'password-title';
  questionEl.style.fontSize = '1.15rem';
  questionEl.style.marginBottom = '1.2rem';
  questionEl.textContent = q.question;

  const options = document.createElement('div');
  options.className = 'quiz-options';
  (q.propositions || []).forEach(prop => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = prop;
    // Peu importe le choix... la réponse est la même 😈
    btn.onclick = () => showQuizReponse(q);
    options.appendChild(btn);
  });

  body.appendChild(questionEl);
  body.appendChild(options);
}

function showQuizReponse(q) {
  const body = document.getElementById('quizBody');
  body.innerHTML = '';

  const reponse = document.createElement('div');
  reponse.className = 'quiz-reponse';
  reponse.innerHTML = `<div class="quiz-reponse-emoji">❌</div>`;
  const texte = document.createElement('div');
  texte.textContent = q.reponse || 'Mauvaise réponse !';
  reponse.appendChild(texte);

  const next = document.createElement('button');
  next.className = 'btn quiz-next';
  const isLast = quizIndex >= (blague.questions || []).length - 1;
  next.textContent = isLast ? 'Voir le résultat' : 'Question suivante';
  next.onclick = () => {
    quizIndex++;
    renderQuizQuestion();
  };

  body.appendChild(reponse);
  body.appendChild(next);
}

function renderQuizFinal() {
  const body = document.getElementById('quizBody');
  const step = document.getElementById('quizStep');
  step.textContent = 'Résultat';
  body.innerHTML = '';

  const final = document.createElement('div');
  final.className = 'quiz-reponse';
  final.innerHTML = `<div class="quiz-reponse-emoji">🐺</div>`;
  const texte = document.createElement('div');
  texte.textContent = blague.messageFinal || 'La récupération a échoué. Demande au staff !';
  final.appendChild(texte);

  const back = document.createElement('button');
  back.className = 'btn quiz-next';
  back.textContent = blague.boutonFinal || 'Retour';
  back.onclick = closeQuiz;

  body.appendChild(final);
  body.appendChild(back);
}

// ====== HELPERS ======
function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:.*v=|embed\/|shorts\/)|youtu\.be\/)([^&?\s]+)/);
  return m ? m[1] : null;
}

function getVimeoId(url) {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

function isLocalVideo(url) {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url);
}

function getAutoThumb(film) {
  if (film.image) return film.image;
  const yt = getYouTubeId(film.url);
  if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
  return null;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ====== RENDU ======
function render() {
  const content = document.getElementById('content');
  content.innerHTML = '';

  const filmsArray = Object.values(films);

  if (filmsArray.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🐺</div>
        <div class="empty-state-title">La meute attend...</div>
        <p>Ajoute des films dans <code>config.json</code>.</p>
      </div>
    `;
    return;
  }

  // Grouper par catégorie (ordre d'apparition préservé grâce à Map)
  const byCategory = new Map();
  filmsArray.forEach(film => {
    const cat = film.categorie || 'Autres';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(film);
  });

  byCategory.forEach((catFilms, catName) => {
    const row = document.createElement('div');
    row.className = 'category-row';
    row.innerHTML = `
      <div class="category-header">
        <h2 class="category-title">${escapeHtml(catName)}</h2>
      </div>
      <div class="row-scroll"></div>
    `;
    const scroll = row.querySelector('.row-scroll');
    catFilms.forEach(film => scroll.appendChild(createCard(film)));
    content.appendChild(row);
  });
}

function createCard(film) {
  const card = document.createElement('div');
  card.className = 'card';
  const thumb = getAutoThumb(film);
  const thumbHTML = thumb
    ? `<div class="card-thumb" style="background-image:url('${escapeHtml(thumb)}')"></div>`
    : `<div class="card-placeholder">🐺</div>`;

  card.innerHTML = `
    ${thumbHTML}
    <div class="card-play"></div>
    <div class="card-content">
      <div class="card-title">${escapeHtml(film.titre || 'Sans titre')}</div>
    </div>
  `;
  card.onclick = () => openPlayer(film);
  return card;
}

// ====== PLAYER ======
function openPlayer(film) {
  const overlay = document.getElementById('playerOverlay');
  const content = document.getElementById('playerContent');
  content.innerHTML = '';

  const ytId = getYouTubeId(film.url);
  const vmId = getVimeoId(film.url);

  if (ytId) {
    content.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
  } else if (vmId) {
    content.innerHTML = `<iframe src="https://player.vimeo.com/video/${vmId}?autoplay=1" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  } else if (isLocalVideo(film.url)) {
    content.innerHTML = `<video src="${escapeHtml(film.url)}" controls autoplay></video>`;
  } else {
    content.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;color:var(--cream);padding:2rem;text-align:center;">
        <div style="font-size:3rem;margin-bottom:1rem;">🔗</div>
        <div style="margin-bottom:1.5rem;font-family:'Cinzel',serif;">Lien non reconnu</div>
        <a href="${escapeHtml(film.url)}" target="_blank" class="btn" style="text-decoration:none;">Ouvrir dans un nouvel onglet</a>
      </div>
    `;
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePlayer() {
  document.getElementById('playerOverlay').classList.remove('open');
  document.getElementById('playerContent').innerHTML = '';
  document.body.style.overflow = '';
}

// On expose closePlayer au scope global pour le bouton onclick dans le HTML
window.closePlayer = closePlayer;

// ====== ÉVÉNEMENTS ======
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  nav.classList.toggle('scrolled', window.scrollY > 50);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (document.getElementById('quizOverlay').classList.contains('open')) {
      closeQuiz();
    } else if (document.getElementById('passwordOverlay').classList.contains('open')) {
      closePasswordPrompt();
    } else {
      closePlayer();
    }
  }
});

document.getElementById('passwordSubmit').addEventListener('click', submitPassword);
document.getElementById('passwordCancel').addEventListener('click', closePasswordPrompt);
document.getElementById('passwordForgot').addEventListener('click', openQuiz);
document.getElementById('passwordInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitPassword();
});
document.getElementById('passwordOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'passwordOverlay') closePasswordPrompt();
});
document.getElementById('quizOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'quizOverlay') closeQuiz();
});

document.getElementById('playerOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'playerOverlay') closePlayer();
});

document.getElementById('welcomeBtn').addEventListener('click', startSplash);

document.getElementById('navProfile').addEventListener('click', changeProfile);

// On garde la possibilité de skip le splash en cliquant dessus
document.getElementById('splash').addEventListener('click', endSplash);

// ====== INIT ======
(async function init() {
  createWelcomeStars();
  createFireflies(25);
  setupMouseInteraction();
  createStars();
  createProfilesStars();
  await loadProfiles();
  await loadBlague();
  // Le catalogue de films est chargé au moment de la sélection du profil
  // Le splash ne démarre plus automatiquement : il attend le clic du bouton
})();
