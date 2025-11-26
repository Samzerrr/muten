/* Créé par Sambo */
/* Utilitaires */
const DISABLE_MOTION = true; // désactiver les grosses animations GSAP pour fluidité
const ENABLE_CARD_3D = false; // désactiver l'effet 3D lourd sur les cartes du carrousel
const qs = (s, el=document) => el.querySelector(s);
const qsa = (s, el=document) => [...el.querySelectorAll(s)];

/* Créé par Sambo | Gestion écran de chargement */
window.addEventListener('load', ()=>{
  const loader = qs('#loader');
  if(loader){
    // Attendre que l'animation se joue au moins 2 secondes pour voir l'effet
    setTimeout(()=>{
      loader.classList.add('hidden');
      // Retirer le loader du DOM après la transition
      setTimeout(()=>{
        loader.remove();
        // Essayer de démarrer non-muet après le loader
        const bg = qs('#bg-music');
        if(bg){
          const fadeToSavedVolume = ()=>{
            try{
              const saved = parseInt(localStorage.getItem('muten-volume') ?? '50');
              const target = Math.max(0, Math.min(100, isNaN(saved)?50:saved)) / 100;
              bg.volume = 0;
              bg.muted = false;
              bg.play().catch(()=>{});
              const t0 = performance.now();
              const dur = 800;
              function step(){
                const p = Math.min(1, (performance.now()-t0)/dur);
                bg.volume = target * p;
                if(p < 1) requestAnimationFrame(step);
              }
              requestAnimationFrame(step);
            }catch(_){ /* ignore */ }
          };
          // Première tentative immédiate
          fadeToSavedVolume();
          // Tentatives supplémentaires si le navigateur bloque encore
          let retries = 3;
          const retryId = setInterval(()=>{
            if(retries-- <= 0){ clearInterval(retryId); return; }
            if(bg.paused || bg.muted){ fadeToSavedVolume(); }
          }, 1200);
          // Réessayer quand l'onglet redevient visible
          const onVis = ()=>{ if(document.visibilityState==='visible'){ fadeToSavedVolume(); } };
          document.addEventListener('visibilitychange', onVis, { once: true });
        }
      }, 600);
    }, 2000); // Afficher l'animation pendant 2 secondes minimum
  }
});

/* Créé par Sambo | Gestion audio globale */
window.addEventListener('load', ()=>{
  const bgMusic = qs('#bg-music');
  const sfx = qs('#sfx-engine');
  const audioToggle = qs('.audio-toggle');
  const volumeSlider = qs('#volume-slider');
  let allowSound = false;

  // Fonction pour mettre à jour le volume
  function updateVolume(value){
    const volume = value / 100;
    if(bgMusic) bgMusic.volume = volume;
    if(sfx) sfx.volume = volume;
  }

  // Initialiser le volume
  if(volumeSlider){
    const savedVolume = localStorage.getItem('muten-volume');
    if(savedVolume !== null){
      volumeSlider.value = savedVolume;
      updateVolume(parseInt(savedVolume));
    } else {
      updateVolume(50); // Volume par défaut à 50%
    }

    // Gérer les changements de volume
    volumeSlider.addEventListener('input', (e)=>{
      const value = parseInt(e.target.value);
      updateVolume(value);
      localStorage.setItem('muten-volume', value);
    });
  }

  if(audioToggle && bgMusic){
    // Activer le son par défaut
    allowSound = true;
    audioToggle.style.color = '#fff';
    
    // Démarrer en muet pour l'autoplay, puis démuter plus tard
    try{ bgMusic.muted = true; bgMusic.play().catch(()=>{}); }catch(_){}
    
    // Tenter de lancer la musique automatiquement non muet
    bgMusic.play().then(()=>{ try{ bgMusic.muted = true; }catch(_){} }).catch(() => {
      // Si l'autoplay est bloqué, on attend une interaction utilisateur
      const enableAudio = () => {
        try{ bgMusic.muted = false; }catch(_){}
        bgMusic.play().catch(() => {});
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('touchstart', enableAudio);
        document.removeEventListener('pointerdown', enableAudio);
        document.removeEventListener('keydown', enableAudio);
      };
      document.addEventListener('click', enableAudio, { once: true });
      document.addEventListener('touchstart', enableAudio, { once: true });
      document.addEventListener('pointerdown', enableAudio, { once: true });
      document.addEventListener('keydown', enableAudio, { once: true });
    });
    
    audioToggle.addEventListener('click', ()=>{
      allowSound = !allowSound;
      audioToggle.style.color = allowSound ? '#fff' : '';
      
      // Contrôler la musique de fond
      if(allowSound){
        bgMusic.play().catch(() => {}); // Ignorer les erreurs d'autoplay
      } else {
        bgMusic.pause();
      }
    });
  }
});

/* Créé par Sambo | Smooth scroll bouton Entrer */
qsa('[data-scroll-to]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const sel = btn.getAttribute('data-scroll-to');
    const target = qs(sel);
    if(target){ target.scrollIntoView({behavior:'smooth', block:'start'}); }
  });
});

/* GSAP de base */
window.addEventListener('load', ()=>{
  if(DISABLE_MOTION) return;
  gsap.registerPlugin(ScrollTrigger);

  // Apparition HERO
  const tlHero = gsap.timeline({defaults:{ease:'power3.out'}});
  tlHero
    .from('.logo-wrap', {scale:.7, rotate:-8, opacity:0, filter:'blur(8px)', duration:0.8})
    .from('.title .jp', {y:20, opacity:0, duration:0.4}, '-=0.3')
    .from('.title .en', {y:16, opacity:0, duration:0.4}, '-=0.28')
    .from('.subtitle', {y:12, opacity:0, duration:0.35}, '-=0.25')
    .from('.btn-enter', {y:10, opacity:0, duration:0.35}, '-=0.2');

  // Parallaxe
  gsap.to('.layer-back', {y:100, ease:'none', scrollTrigger:{scrub:true}});
  gsap.to('.layer-mid', {y:180, ease:'none', scrollTrigger:{scrub:true}});
  gsap.to('.layer-front', {y:260, ease:'none', scrollTrigger:{scrub:true}});

  // Glow sur titres à l'apparition
  qsa('.section-title').forEach(el=>{
    gsap.fromTo(el, {opacity:0, y:20, filter:'blur(6px)'}, {opacity:1, y:0, filter:'blur(0px)', duration:0.6, ease:'power3.out', scrollTrigger:{trigger:el, start:'top 85%'}});
  });

  // Apparition douce des sections (catégories)
  qsa('.section').forEach(sec=>{
    // Ne pas réappliquer à la HERO déjà animée
    if(sec.id === 'home') return;
    gsap.from(sec, {
      opacity: 0,
      y: 40,
      scale: 0.985,
      duration: 0.9,
      ease: 'power3.out',
      clearProps: 'transform,opacity',
      scrollTrigger: {
        trigger: sec,
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      }
    });
  });

  // Respect des préférences d'accessibilité
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduceMotion){
    // Révélations groupées (batch) avec décalage visible
    function batchReveal(selector, opts={}){
      const elements = qsa(selector);
      if(elements.length === 0) return;
      gsap.set(elements, {opacity:0, y: opts.y ?? 26, scale: opts.scale ?? 0.98});
      ScrollTrigger.batch(elements, {
        start: opts.start ?? 'top 85%',
        onEnter: batch => gsap.to(batch, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: opts.duration ?? 0.6,
          ease: opts.ease ?? 'power3.out',
          stagger: { each: 0.08, from: 'start' }
        })
      });
    }

    batchReveal('.objectif-card', { y: 26, duration: 0.65 });
    batchReveal('.course-card', { y: 26, duration: 0.65 });
    batchReveal('.vehicule-card', { y: 28, duration: 0.65 });
    batchReveal('.grades-table tbody tr', { y: 16, duration: 0.55 });
    batchReveal('.territoire-card', { y: 30, duration: 0.7 });
    batchReveal('.history-block', { y: 30, duration: 0.7 });
    batchReveal('.activites-block', { y: 30, duration: 0.7 });

    // Parallaxe légère sur certaines images
    gsap.utils.toArray('.vehicule-image img').forEach(img => {
      gsap.to(img, { y: -30, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true }});
    });
    gsap.utils.toArray('.territoire-image img').forEach(img => {
      gsap.to(img, { y: -40, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true }});
    });

    // Mise en surbrillance du lien actif de la nav selon la section
    qsa('section.section[id]').forEach(sec=>{
      const id = sec.getAttribute('id');
      const link = qs(`.nav-links a[href="#${id}"]`);
      if(!link) return;
      ScrollTrigger.create({
        trigger: sec,
        start: 'top center',
        end: 'bottom center',
        onEnter: ()=> link.classList.add('active'),
        onEnterBack: ()=> link.classList.add('active'),
        onLeave: ()=> link.classList.remove('active'),
        onLeaveBack: ()=> link.classList.remove('active')
      });
    });
  }

  // Animation des barres de graphique
  const chartFills = qsa('.chart-fill');
  chartFills.forEach((bar, index)=>{
    const width = bar.style.width;
    bar.style.width = '0%';
    ScrollTrigger.create({
      trigger: bar.closest('.activites-chart'),
      start: 'top 80%',
      onEnter: ()=>{
        gsap.to(bar, {
          width: width,
          duration: 1.2,
          ease: 'power2.out',
          delay: index * 0.2
        });
      }
    });
  });
});

/* Carrousel Personnages */
window.addEventListener('load', ()=>{
  const charactersSection = qs('.characters');
  const viewport = qs('.carousel-viewport');
  const track = qs('.carousel-track');
  const cards = qsa('.carousel-track > .card', track);
  const prev = qs('.carousel-btn.prev');
  const next = qs('.carousel-btn.next');
  const sfx = qs('#sfx-engine');
  const audioToggle = qs('.audio-toggle');
  const gridContainer = qs('.characters-grid');
  const viewToggleBtns = qsa('.view-toggle-btn');

  if(!viewport || !track || cards.length === 0) return;

  // Vérifier l'état du son depuis le toggle global
  function getAllowSound(){
    return audioToggle?.style.color === 'rgb(255, 255, 255)' || audioToggle?.style.color === '#fff';
  }

  // Clone pour boucle infinie : clones au début ET à la fin
  const clonesStart = cards.map(c => c.cloneNode(true));
  const clonesEnd = cards.map(c => c.cloneNode(true));
  
  // Ajouter les clones au début
  clonesStart.reverse().forEach(cl => track.insertBefore(cl, track.firstChild));
  // Ajouter les clones à la fin
  clonesEnd.forEach(cl => track.appendChild(cl));
  
  // Ajouter les event listeners aux clones aussi
  const allCards = qsa('.card[data-character]', track);
  const allCardsEls = qsa('.card', track); // cache pour l'animation

  function attachCardHandlers(nodeList){
    nodeList.forEach(card => {
      card.addEventListener('click', (e) => {
        if(e.target.closest('.carousel-btn')) return;
        const characterId = card.getAttribute('data-character');
        if(characterId) openCharacterModal(characterId);
      });
    });
  }
  attachCardHandlers(allCards);

  if(gridContainer){
    const fragment = document.createDocumentFragment();
    cards.forEach(card=>{
      const clone = card.cloneNode(true);
      fragment.appendChild(clone);
    });
    gridContainer.appendChild(fragment);
    attachCardHandlers(qsa('.characters-grid .card'));
    gridContainer.setAttribute('aria-hidden','true');
  }
  viewport?.setAttribute('aria-hidden','false');

  // Dimensions
  const gap = 16; // CSS gap
  let currentCardWidth = 300;
  function recomputeCardWidth(){
    const w = cards[0]?.getBoundingClientRect().width;
    currentCardWidth = w ? w + gap : 300;
  }
  recomputeCardWidth();

  // Position courante
  const originalCardsWidth = currentCardWidth * cards.length;
  let x = -originalCardsWidth; // Commencer après les clones du début (au début des originaux)
  let auto = true;
  let gridMode = false;
  let carouselPausedByModal = false;

  function layout(){
    // set perspective pour effet 3D léger
    if(viewport) viewport.style.perspective = '1000px';
    // Recalculer la position initiale après resize
    recomputeCardWidth();
    const newOriginalWidth = currentCardWidth * cards.length;
    if(Math.abs(x) > newOriginalWidth * 2){
      x = -newOriginalWidth;
    }
  }
  layout();
  window.addEventListener('resize', layout);

  // Animation frame
  let isInView = true;
  // Observer de visibilité pour pauser l'animation hors écran
  if('IntersectionObserver' in window && viewport){
    const io = new IntersectionObserver((entries)=>{
      isInView = entries[0]?.isIntersecting ?? true;
      if(isInView) requestAnimationFrame(tick);
    }, { root: null, threshold: 0 });
    io.observe(viewport);
  }

  document.addEventListener('visibilitychange', ()=>{
    isInView = document.visibilityState === 'visible';
    if(isInView) requestAnimationFrame(tick);
  });

  function tick(){
    if(!viewport || !track) return;
    if(!isInView){ return; }
    if(gridMode){
      track.style.transform = '';
      if(!carouselPausedByModal){
        requestAnimationFrame(tick);
      }
      return;
    }
    
    if(auto){ x -= 0.25; } // vitesse auto légèrement réduite pour plus de fluidité
    
    const cardW = currentCardWidth;
    const originalWidth = cardW * cards.length;
    
    // Boucle infinie fluide
    // Quand on dépasse la fin des originaux (on voit les clones de fin), 
    // on saute invisiblement au début des originaux
    if(Math.abs(x) >= originalWidth){
      x += originalWidth;
    }
    // Quand on va en arrière et qu'on dépasse le début des originaux (on voit les clones du début),
    // on saute invisiblement à la fin des originaux
    if(x >= 0){
      x -= originalWidth;
    }

    // appliquer transform
    track.style.transform = `translate3d(${x}px,0,0)`;

    // effets 3D sur les cartes visibles (optionnels car coûteux)
    if(ENABLE_CARD_3D){
      const vw = viewport.getBoundingClientRect();
      allCardsEls.forEach((card)=>{
        const r = card.getBoundingClientRect();
        const center = r.left + r.width/2;
        const delta = (center - (vw.left + vw.width/2)) / vw.width; // -0.5 à 0.5 env
        const rotateY = -delta * 18; // max 18°
        const scale = 1 - Math.min(Math.abs(delta)*0.15, 0.15);
        card.style.transform = `translateZ(0) rotateY(${rotateY}deg) scale(${scale})`;
      });
    }

    if(!carouselPausedByModal){
      requestAnimationFrame(tick);
    }
  }
  requestAnimationFrame(tick);

  // Contrôles
  function nudge(dir){
    if(gridMode) return;
    auto = false;
    const dist = currentCardWidth;
    const targetX = x + (dir * -dist);
    const startX = x;
    const startTime = performance.now();
    const duration = 800;
    
    function animate(){
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
      x = startX + (targetX - startX) * eased;
      
      if(progress < 1){
        requestAnimationFrame(animate);
      } else {
        clearTimeout(nudge._t);
        nudge._t = setTimeout(()=>{ auto = true; }, 1600);
      }
    }
    requestAnimationFrame(animate);
    
    // Jouer le son
    if(getAllowSound() && sfx){ try { sfx.currentTime = 0; sfx.play(); } catch(_){} }
  }
  if(prev) prev.addEventListener('click', ()=> nudge(-1));
  if(next) next.addEventListener('click', ()=> nudge(1));

  // Pause au survol
  viewport.addEventListener('mouseenter', ()=> auto = false);
  viewport.addEventListener('mouseleave', ()=> auto = true);

  // Molette horizontale
  viewport.addEventListener('wheel', (e)=>{
    if(gridMode) return;
    e.preventDefault();
    x -= e.deltaY * 0.6; // défilement plus doux
    auto = false;
    clearTimeout(viewport._wT);
    viewport._wT = setTimeout(()=> auto = true, 1200);
  }, {passive:false});

  // Gestion des clics sur les cartes pour afficher l'histoire
  const characterStories = {
    pulsar: {
      name: "Pulsar",
      role: "Tenshi \"Bosu\" Musashi",
      grade: "Kaichō (会長)",
      image: "pulsar.png",
      backgroundLink: "https://docs.google.com/document/d/16AqsCfc3i801LIqd61iqpWQq21HGGjmp00UDvs6KLsM/edit?usp=sharing",
      fight: 78,
      drive: 75,
      bosu: 100,
      story: `<p>Tenshi Musashi, dit <strong>Bōsu</strong>, est né dans l'ombre d'un mécanicien mort sur une route de Tokyo. Fils d'un père qui a vendu sa vie à la vitesse, il a hérité bien plus qu'un nom : une rage silencieuse et un don pour comprendre les machines comme personne.</p>
      <p>À 16 ans, il a fondé le Muten Club dans un garage abandonné de Yokohama. Il n'a jamais cherché à être chef, mais quand il parlait, tout le monde écoutait. Quand il montait sur sa Hayabusa rouge, la route devenait son temple.</p>
      <p>On raconte qu'il pilote les yeux fermés, guidé uniquement par le son du moteur. Pour lui, la vitesse n'est pas une fuite, c'est une vérité : <em>"La route ne ment jamais. Elle t'offre la vérité que le monde te refuse."</em></p>
      <p>Une nuit d'hiver, lors d'une course-poursuite légendaire, il aurait sauté un pont inachevé sous la pluie, atterrissant de l'autre côté sans une égratignure. Depuis, la rumeur dit qu'il a vendu son âme à la route.</p>`
    },
    sambo: {
      name: "Sambo",
      role: "Ken \"Draken\" Genryusai",
      grade: "Kyōryokuteki (強力的)",
      image: "sambo.png",
      fight: 92,
      drive: 91,
      proxenetisme: 100,
      backgroundLink: "https://www.canva.com/design/DAG2es-FoVc/LesWo442POzq4_aU9lTBIQ/edit?utm_content=DAG2es-FoVc&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
      story: `<p>Ken Genryusai, surnommé <strong>Draken</strong>, est une figure redoutée du Muten. Né et élevé dans un bordel de Yokohama, il a grandi parmi les cris, la fumée et les néons, apprenant très tôt que le pouvoir ne se mendie pas — il se prend. Là où d'autres rêvaient de fuir, lui s'est juré d'en devenir le maître. Son ambition : bâtir son propre empire de la nuit, devenir un proxénète respecté et intouchable.</p>
      <p>Ancien champion de courses illégales, Draken a croisé la route de Tenshi sur les pentes d'Hakone. Leur duel est resté dans les mémoires — une défaite pour Draken, mais aussi une révélation. Depuis ce jour, il roule sous les couleurs du Muten, forgeant sa légende dans la vitesse, la sueur et le sang.</p>
      <p>Charismatique, brutal et fidèle à son code, il est l'homme qu'on appelle quand il faut calmer les esprits ou régler les dettes.</p>
      <p>Il pilote une ZR350 modifiée, bête d'acier au rugissement infernal, symbole de sa rage contenue.</p>
      <p>Sa devise : <em>« Celui qui possède la nuit possède le monde. »</em></p>`
    },
    replayy: {
      name: "Replayy",
      role: "KURO \"Kaze\" Genryusai",
      grade: "Kyōryokuteki (強力的)",
      image: "replay.png",
      backgroundLink: "https://www.canva.com/design/DAG5uDWw3xs/FJVw_anh1EjPAUf8Hoynag/view?utm_content=DAG5uDWw3xs&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hff204a8679",
      fight: 85,
      drive: 100,
      driveFlames: true,
      aigrisText: "1000",
      aigrisPercent: 100,
      story: `<p>KURO Genryusai, surnommé <strong>Kaze</strong> (le vent), est un lieutenant redoutable du Muten Club. Frère spirituel de Draken, il partage la même passion pour la vitesse et l'honneur.</p>
      <p>Il est connu pour son style de conduite agressif et imprévisible, comme un vent de tempête qui balaie tout sur son passage. Sa technique de pilotage est unique, mélangeant précision chirurgicale et audace folle.</p>
      <p>Kaze est celui qu'on envoie quand il faut faire passer un message. Sa présence seule suffit à faire trembler les crews rivaux. Il vit pour la route et mourrait pour le clan.</p>`
    },
    tako: {
      name: "Tako",
      role: "Ryo \"Raijin\" Takahashi",
      grade: "Kyōryokuteki (強力的)",
      image: "tako.png",
      backgroundLink: "https://www.canva.com/design/DAG5sKW77fE/M_UJ1u8muX-fhXyzVEaeSg/edit",
      fight: 80,
      drive: 91,
      bdgText: "100",
      bdgPercent: 100,
      bdgLabel: "Chouchou des nanas",
      story: `<p>Ryo Takahashi, dit <strong>Raijin</strong> (le dieu du tonnerre), est un lieutenant craint et respecté. Son nom vient de sa façon de conduire : rapide comme l'éclair, bruyant comme le tonnerre.</p>
      <p>Il excelle dans les courses de nuit, où sa voiture noire se fond dans l'obscurité avant de surgir comme un éclair. Sa technique de dépassement est légendaire : il frappe sans prévenir.</p>
      <p>Raijin est le protecteur de la nuit, celui qui veille sur les membres pendant les runs clandestins. Sa loyauté au Muten est aussi forte que la foudre qu'il représente.</p>`
    },
    alpha: {
      name: "Alpha",
      role: "Akira \"Mad Dog\" Fujimoto",
      grade: "Kōhai (後輩)",
      image: "alpha.png",
      fight: 90,
      drive: 50,
      flow: 85,
      mechanic: 94,
      mechanicFlames: true,
      mechanicLabel: "Réparation véhicule",
      backgroundLink: "https://docs.google.com/presentation/d/1KJLQXRaHvl25_WmrECgvc7HkbjmHmf1on1182McovO4/edit?usp=sharing",
      story: `<p>Akira Fujimoto, surnommé <strong>Mad Dog</strong>, est le mécano du clan. Il a rejoint le Muten à 15 ans, après avoir sauvé la moto du Bōsu d'une mort certaine dans son garage de fortune.</p>
      <p>Il connaît chaque vis, chaque boulon, chaque secret mécanique. Il transforme des carcasses en bêtes de course, donne vie aux machines avec ses mains expertes.</p>
      <p>Mad Dog est celui qui fait confiance aux moteurs quand personne d'autre ne le peut. Il dit souvent : <em>"Un moteur, c'est comme un cœur. Il faut le comprendre avant de le réparer."</em></p>`
    },
    angel: {
      name: "Angel",
      role: "Renji \"Hayabusa\" Nomura",
      grade: "Shatei (舎弟)",
      image: "angel.png",
      fight: 68,
      drive: 85,
      begaiementText: "100",
      begaiementPercent: 100,
      backgroundLink: "https://www.canva.com/design/DAG3zH-awvA/icZlvG5kZlaN0GTAAMWdhQ/edit?utm_content=DAG3zH-awvA&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
      story: `<p>Renji Nomura, connu sous le nom de <strong>Hayabusa</strong> (le faucon pèlerin), est un membre précieux du clan. Son nom vient de sa capacité à fendre l'air comme un oiseau de proie.</p>
      <p>Il excelle dans les courses de vitesse pure, où sa technique de pilotage atteint des niveaux presque surnaturels. Il est le faucon de la nuit, celui qui chasse dans l'obscurité.</p>
      <p>Hayabusa représente l'essence même du Muten : la liberté, la vitesse, l'honneur. Il vole pour le clan et revient toujours.</p>`
    },
    bozo: {
      name: "Bozo",
      role: "Tosoa \"Bozo\" Mura",
      grade: "Shatei (舎弟)",
      image: "bozo.png",
      backgroundLink: "https://docs.google.com/presentation/d/1w15yLaq3IMWQFCrjHzUMn-b9qNQ3-WR1ddGtngDfXCM/edit?usp=sharing",
      fight: 10,
      drive: 10,
      crackhead: 100,
      story: `<p>Bozo aka Tosoa, 22 ans, erre dans les rues de Yokohama, casque sur la tête et joint au bec. Passionné de vitesse, il passe ses nuits à faire rugir sa moto trafiquée sous les néons.</p>
      <p>La weed est son échappatoire, la route son unique liberté. Entre la fumée et le bitume, il fuit un quotidien trop lent pour lui.</p>
      <p>Dans le vacarme du moteur, il se sent enfin vivant.</p>`
    },
    gamxo: {
      name: "Gamxo",
      role: "Akihiko \"Kurai\" Mori",
      grade: "Shatei (舎弟)",
      image: "gamxo.png",
      backgroundLink: "https://www.canva.com/design/DAG5lR9lAYU/YbN-USe8iLYuq-sqvE9L8g/edit?utm_content=DAG5lR9lAYU&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
      fight: 74,
      drive: 98,
      pngText: "100",
      pngPercent: 100,
      story: `<p>Akihiko Mori, surnommé <strong>Kurai</strong> (l'ombre), est un membre discret mais redoutable. Il opère dans l'ombre, collectant des informations et protégeant le clan de manière invisible.</p>
      <p>Sa technique de pilotage est aussi silencieuse que son nom. Il peut suivre n'importe qui sans être détecté, disparaître dans un instant. Il est l'ombre dans la nuit, celle qui veille.</p>
      <p>Kurai est celui qui sait tout, voit tout, mais ne dit rien. Sa loyauté est aussi profonde que l'obscurité dans laquelle il évolue.</p>`
    },
    patoche: {
      name: "Patoche",
      role: "Shinichiro \"SHIN\" Kanzaki",
      grade: "Shatei (舎弟)",
      image: "patoche.png",
      backgroundLink: "https://docs.google.com/document/d/1eBcI2k4N1_J-X198yQg9Ex8rajtOnKWoHNdwbxPMDT8/edit?usp=share_link",
      fight: 66,
      drive: 80,
      belleBiteText: "100",
      belleBitePercent: 100,
      story: `<p>Shinichiro Kanzaki, dit <strong>SHIN</strong>, représente la nouvelle génération du Muten Club. Jeune et talentueux, il s'est forgé seul, déterminé à tracer sa propre voie.</p>
      <p>Il apporte une énergie nouvelle et une perspective moderne au clan, tout en respectant les traditions et l'honneur du Muten. Sa soif d'apprendre et de progresser est infinie.</p>
      <p>SHIN est l'avenir du clan, celui qui portera la flamme du Muten quand les anciens passeront le relais. Il conduit avec passion et respect, honorant ceux qui l'ont précédé.</p>`
    },
    burger: {
      name: "Burger",
      role: "Takashi \"Taka\" Kanzaki",
      grade: "Shatei (舎弟)",
      image: "burger.png",
      backgroundLink: "https://docs.google.com/document/d/1fbdrjUXnYDRVPp7XtC3UgvEmEAvxjvoLWCk1fLHX41s/edit?usp=sharing",
      fight: 58,
      drive: 72,
      intello: 100,
      story: `<p>Takashi Kanzaki, surnommé <strong>Taka</strong>, est le fidèle compagnon du clan. Il a rejoint le Muten pour partager sa passion de la vitesse avec ceux qui comprennent vraiment ce que cela signifie.</p>
      <p>Sa loyauté est inébranlable, sa détermination sans faille. Il est celui sur qui on peut toujours compter, celui qui ne laisse jamais tomber ses frères.</p>
      <p>Taka est le cœur stable du clan, celui qui maintient l'unité et la fraternité. Il conduit avec honneur et protège ceux qu'il aime avec une ferveur inégalée.</p>`
    }
  };

  // Fonction pour ouvrir le modal
  function openCharacterModal(characterId){
    const character = characterStories[characterId];
    if(!character) return;

    const modal = qs('#character-modal');
    const modalName = qs('.modal-name', modal);
    const modalRole = qs('.modal-role', modal);
    const modalGrade = qs('.modal-grade', modal);
    const modalImage = qs('.modal-image', modal);
    const modalStory = qs('.modal-story', modal);
    const modalStats = qs('.modal-stats', modal);

    modalName.textContent = character.name;
    modalRole.textContent = character.role;
    modalGrade.textContent = character.grade;
    
    if(character.image){
      modalImage.style.backgroundImage = `url('${character.image}')`;
    } else {
      modalImage.style.backgroundImage = 'linear-gradient(135deg, rgba(255,255,255,.1), rgba(255,255,255,.05))';
    }
    
    const modalStoryContent = qs('.modal-story-content', modal);
    if(modalStoryContent){
      modalStoryContent.innerHTML = character.story;
    } else {
      modalStory.innerHTML = character.story;
    }
    
    // Mettre à jour le lien du bouton background
    const backgroundBtn = qs('.modal-background-btn', modal);
    if(backgroundBtn && character.backgroundLink){
      backgroundBtn.href = character.backgroundLink;
      backgroundBtn.style.display = 'inline-flex';
    } else if(backgroundBtn && !character.backgroundLink){
      backgroundBtn.style.display = 'none';
    }
    
    // Stats
    const fight = Number.isFinite(character.fight) ? Math.max(0, Math.min(100, character.fight)) : 50;
    const drive = Number.isFinite(character.drive) ? Math.max(0, Math.min(100, character.drive)) : 50;
    const driveLabelText = character.driveFlames ? 'Conduite 🔥🔥' : 'Conduite';
    const mechanic = Number.isFinite(character.mechanic) ? Math.max(0, Math.min(100, character.mechanic)) : null;
    const baseMechLabel = character.mechanicLabel ?? 'Mécanique';
    const mechanicLabelText = character.mechanicFlames ? `${baseMechLabel} 🔥🔥` : baseMechLabel;

    let statsHtml = `
      <div class="stat" aria-label="Stat baston">
        <div class="stat-label"><span>Baston</span><span class="stat-value">${fight}</span></div>
        <div class="stat-track"><div class="stat-fill" style="width:${fight}%"></div></div>
      </div>
      <div class="stat" aria-label="Stat conduite">
        <div class="stat-label"><span>${driveLabelText}</span><span class="stat-value">${drive}</span></div>
        <div class="stat-track"><div class="stat-fill" style="width:${drive}%"></div></div>
      </div>`;

    // Flow: défini ou calculé (moyenne baston/conduite)
    const flowValue = Number.isFinite(character.flow)
      ? Math.max(0, Math.min(100, character.flow))
      : Math.round((fight + drive) / 2);
    statsHtml += `
      <div class="stat" aria-label="Stat flow">
        <div class="stat-label"><span>Flow</span><span class="stat-value">${flowValue}</span></div>
        <div class="stat-track"><div class="stat-fill" style="width:${flowValue}%"></div></div>
      </div>`;

    if(mechanic !== null){
      statsHtml += `
      <div class="stat" aria-label="Stat mécanique">
        <div class="stat-label"><span>${mechanicLabelText}</span><span class="stat-value">${mechanic}</span></div>
        <div class="stat-track"><div class="stat-fill" style="width:${mechanic}%"></div></div>
      </div>`;
    }

    // Stat spéciale Bozo: Crackhead
    if(Number.isFinite(character.crackhead)){
      const crack = Math.max(0, Math.min(100, character.crackhead));
      statsHtml += `
      <div class="stat" aria-label="Stat crackhead">
        <div class="stat-label"><span>Crackhead</span><span class="stat-value">${crack}</span></div>
        <div class="stat-track"><div class="stat-fill" style="width:${crack}%"></div></div>
      </div>`;
    }

    // Stat Sambo: Proxénétisme
    if(Number.isFinite(character.proxenetisme)){
      const prox = Math.max(0, Math.min(100, character.proxenetisme));
      statsHtml += `
      <div class="stat" aria-label="Stat proxénétisme">
        <div class="stat-label"><span>Proxénétisme</span><span class="stat-value">${prox}</span></div>
        <div class="stat-track"><div class="stat-fill" style="width:${prox}%"></div></div>
      </div>`;
    }

    // Stat Pulsar: Bosu
    if(Number.isFinite(character.bosu)){
      const bosu = Math.max(0, Math.min(100, character.bosu));
      statsHtml += `
      <div class="stat" aria-label="Stat bosu">
        <div class="stat-label"><span>Bosu</span><span class="stat-value">${bosu}</span></div>
        <div class="stat-track"><div class="stat-fill" style="width:${bosu}%"></div></div>
      </div>`;
    }

    // Stat Replayy: Aigris (affichage texte personnalisé)
    if(character.aigrisText){
      const aigrisWidth = Number.isFinite(character.aigrisPercent) ? Math.max(0, Math.min(100, character.aigrisPercent)) : 100;
      statsHtml += `
      <div class="stat" aria-label="Stat aigris">
        <div class="stat-label"><span>Aigris</span><span class="stat-value">${character.aigrisText}</span></div>
        <div class="stat-track"><div class="stat-fill" style="width:${aigrisWidth}%"></div></div>
      </div>`;
    }

    // Stat Tako: BDG (affichage texte personnalisé)
    if(character.bdgText){
      const bdgWidth = Number.isFinite(character.bdgPercent) ? Math.max(0, Math.min(100, character.bdgPercent)) : 100;
      const bdgLabel = character.bdgLabel ?? 'BDG';
      statsHtml += `
      <div class="stat" aria-label="Stat ${bdgLabel}">
        <div class="stat-label"><span>${bdgLabel}</span><span class="stat-value">${character.bdgText}</span></div>
        <div class="stat-track"><div class="stat-fill" style="width:${bdgWidth}%"></div></div>
      </div>`;
    }

    // Stat Zgeg (affichage texte personnalisé)
    if(character.zgegText){
      const zgegWidth = Number.isFinite(character.zgegPercent) ? Math.max(0, Math.min(100, character.zgegPercent)) : 100;
      statsHtml += `
      <div class="stat" aria-label="Stat Zgeg">
        <div class="stat-label"><span>Zgeg</span><span class="stat-value">${character.zgegText}</span></div>
        <div class="stat-track"><div class="stat-fill" style="width:${zgegWidth}%"></div></div>
      </div>`;
    }

    // Stat Patoche: Belle Bite (affichage texte personnalisé)
    if(character.belleBiteText){
      const belleBiteWidth = Number.isFinite(character.belleBitePercent) ? Math.max(0, Math.min(100, character.belleBitePercent)) : 100;
      statsHtml += `
      <div class="stat" aria-label="Stat Belle Bite">
        <div class="stat-label"><span>Belle Bite</span><span class="stat-value">${character.belleBiteText}</span></div>
        <div class="stat-track"><div class="stat-fill" style="width:${belleBiteWidth}%"></div></div>
      </div>`;
    }

    // Stat Gamxo: Pnj (affichage texte personnalisé)
    if(character.pngText){
      const pngWidth = Number.isFinite(character.pngPercent) ? Math.max(0, Math.min(100, character.pngPercent)) : 100;
      statsHtml += `
      <div class="stat" aria-label="Stat Pnj">
        <div class="stat-label"><span>Pnj</span><span class="stat-value">${character.pngText}</span></div>
        <div class="stat-track"><div class="stat-fill" style="width:${pngWidth}%"></div></div>
      </div>`;
    }

    // Stat BDF (affichage texte personnalisé)
    if(character.bdfText){
      const bdfWidth = Number.isFinite(character.bdfPercent) ? Math.max(0, Math.min(100, character.bdfPercent)) : 100;
      statsHtml += `
      <div class="stat" aria-label="Stat BDF">
        <div class="stat-label"><span>BDF</span><span class="stat-value">${character.bdfText}</span></div>
        <div class="stat-track"><div class="stat-fill" style="width:${bdfWidth}%"></div></div>
      </div>`;
    }

    // Stat Angel: Bégaiement (affichage texte personnalisé)
    if(character.begaiementText){
      const begWidth = Number.isFinite(character.begaiementPercent) ? Math.max(0, Math.min(100, character.begaiementPercent)) : 100;
      statsHtml += `
      <div class="stat" aria-label="Stat Bégaiement">
        <div class="stat-label"><span>Bégaiement</span><span class="stat-value">${character.begaiementText}</span></div>
        <div class="stat-track"><div class="stat-fill" style="width:${begWidth}%"></div></div>
      </div>`;
    }

    // Stat Burger: Intello
    if(Number.isFinite(character.intello)){
      const intello = Math.max(0, Math.min(100, character.intello));
      statsHtml += `
      <div class="stat" aria-label="Stat intello">
        <div class="stat-label"><span>Intello</span><span class="stat-value">${intello}</span></div>
        <div class="stat-track"><div class="stat-fill" style="width:${intello}%"></div></div>
      </div>`;
    }

    modalStats.innerHTML = statsHtml;
    // Thème par personnage
    modal.setAttribute('data-character', characterId);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Mettre en pause le carrousel pendant l'ouverture du modal
    carouselPausedByModal = true;
    auto = false;
  }

  // Fonction pour fermer le modal
  function closeCharacterModal(){
    const modal = qs('#character-modal');
    modal.classList.remove('active');
    modal.removeAttribute('data-character');
    document.body.style.overflow = '';

    // Relancer le carrousel une fois le modal fermé
    carouselPausedByModal = false;
    auto = true;
    requestAnimationFrame(tick);
  }

  function setViewMode(mode){
    if(!charactersSection) return;
    const isGrid = mode === 'grid';
    gridMode = isGrid;
    charactersSection.classList.toggle('grid-mode', isGrid);
    viewToggleBtns.forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.view === mode);
    });
    if(isGrid){
      auto = false;
      track.style.transform = '';
      viewport?.setAttribute('aria-hidden','true');
      gridContainer?.setAttribute('aria-hidden','false');
    } else {
      auto = true;
      viewport?.setAttribute('aria-hidden','false');
      gridContainer?.setAttribute('aria-hidden','true');
      requestAnimationFrame(tick);
    }
  }

  viewToggleBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const mode = btn.dataset.view;
      if(!mode) return;
      if((mode === 'grid' && gridMode) || (mode === 'carousel' && !gridMode)) return;
      setViewMode(mode);
    });
  });

  setViewMode('carousel');

  const modalClose = qs('.modal-close');
  const modalOverlay = qs('.modal-overlay');
  
  if(modalClose) modalClose.addEventListener('click', closeCharacterModal);
  if(modalOverlay) modalOverlay.addEventListener('click', closeCharacterModal);


  // Fermer avec la touche Escape
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){
      closeCharacterModal();
    }
  });
});
