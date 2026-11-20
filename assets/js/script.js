const API = 'https://www.thesportsdb.com/api/v1/json/123';

const form = document.querySelector('#searchForm');
const input = document.querySelector('#searchInput');
const favContainer = document.querySelector('#favoritesContainer');
const resultsContainer = document.querySelector('#searchResultsContainer');


const detailsContainer = document.createElement('div');
detailsContainer.className = 'mt-4';
resultsContainer.after(detailsContainer);

let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let foundTeams = [];   
let selectedId = null; 


const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));


form.addEventListener('submit', async (e) => {
	e.preventDefault();
	const team = input.value.trim();
	resultsContainer.textContent = 'Ricerca in corso…';
	detailsContainer.innerHTML = '';

	try {
		const response = await fetch(`${API}/searchteams.php?t=${encodeURIComponent(team)}`);
		const data = await response.json();

		if (!data.teams) {
			foundTeams = [];
			resultsContainer.textContent = `Nessuna squadra trovata per “${team}”.`;
			return;
		}

		foundTeams = data.teams;
		selectedId = foundTeams[0].idTeam;
		showFoundTeams();
		showFavorites();
		loadEvents(foundTeams[0].idTeam, foundTeams[0].strTeam, false);
	} catch (error) {
		console.error(error);
		resultsContainer.textContent = 'Errore nel caricamento dei dati. Riprova.';
	}
});


async function loadEvents(idTeam, name, scroll) {
	detailsContainer.textContent = 'Carico partite e risultati…';
	if (scroll) detailsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

	try {
		const [nextRes, lastRes] = await Promise.all([
			fetch(`${API}/eventsnext.php?id=${idTeam}`),
			fetch(`${API}/eventslast.php?id=${idTeam}`),
		]);
		const next = await nextRes.json();
		const last = await lastRes.json();

		
		if (idTeam !== selectedId) return;

		detailsContainer.innerHTML = `
			<div class="card details-card"><div class="card-body p-4">
				<h3 class="h4 details-title">${esc(name)}</h3>
				<h4 class="section-title">Prossimi eventi</h4>
				${eventList(next.events, false, 'Nessun evento in programma')}
				<h4 class="section-title">Ultimi risultati</h4>
				${eventList(last.results, true, 'Nessun risultato disponibile')}
			</div></div>`;
	} catch (error) {
		console.error(error);
		detailsContainer.textContent = 'Errore nel caricamento degli eventi.';
	}
}

function eventList(events, withScore, emptyText) {
	if (!events) return `<p class="fst-italic text-body-secondary">${emptyText}</p>`;

	return '<ul class="event-list">' + events.map((ev) => {
		const [y, m, d] = ev.dateEvent.split('-');
		const score = withScore && ev.intHomeScore !== null
			? `<span class="badge score-badge">${ev.intHomeScore} – ${ev.intAwayScore}</span>` : '';
		return `<li class="event-item d-flex justify-content-between align-items-center">
			<div><div class="event-date">${d}/${m}/${y}</div><div class="fw-semibold">${esc(ev.strEvent)}</div></div>
			${score}</li>`;
	}).join('') + '</ul>';
}


function teamCard(team, isFavoriteList) {
	const selected = team.idTeam === selectedId ? ' is-selected' : '';
	let button;
	if (isFavoriteList) {
		button = `<button class="btn btn-sm btn-fav-remove w-100" data-remove="${team.idTeam}">Rimuovi</button>`;
	} else {
		button = `<button class="btn btn-sm btn-fav-add w-100" data-add="${team.idTeam}">Aggiungi ai preferiti</button>`;
	}
	return `
		<div class="col">
			<div class="card team-card h-100 text-center${selected}" data-open="${team.idTeam}" data-name="${esc(team.strTeam)}">
				<div class="card-body">
					<img class="team-badge mx-auto mb-3" src="${esc(team.strBadge)}/small" alt="${esc(team.strTeam)}">
					<h3 class="h6 fw-bold mb-1">${esc(team.strTeam)}</h3>
					<p class="team-meta mb-0">${esc(team.strLeague)}</p>
					<p class="team-meta mb-3">${esc(team.strCountry)}</p>
					${button}
				</div>
			</div>
		</div>`;
}

const grid = (html) => `<div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-3">${html}</div>`;

function showFoundTeams() {
	
	const toShow = foundTeams.filter((t) => !favorites.some((f) => f.idTeam === t.idTeam));

	if (toShow.length === 0) {
		resultsContainer.innerHTML = '<p class="text-body-secondary fst-italic">Questa squadra è già nei tuoi preferiti: clicca la sua card in alto per vedere partite e risultati.</p>';
		return;
	}
	resultsContainer.innerHTML = grid(toShow.map((t) => teamCard(t, false)).join(''));
}


function showFavorites() {
	if (favorites.length === 0) {
		favContainer.innerHTML = '<p class="text-body-secondary fst-italic">Non hai ancora salvato nessuna squadra. Cercane una qui sopra e aggiungila ai preferiti.</p>';
		return;
	}
	favContainer.innerHTML = grid(favorites.map((t) => teamCard(t, true)).join(''));
}

function saveFavorites() {
	localStorage.setItem('favorites', JSON.stringify(favorites));
}

document.addEventListener('click', (e) => {
	
	const addBtn = e.target.closest('[data-add]');
	if (addBtn) {
		const team = foundTeams.find((t) => t.idTeam === addBtn.dataset.add);
		if (team && !favorites.some((f) => f.idTeam === team.idTeam)) {
			favorites.push({
				idTeam: team.idTeam,
				strTeam: team.strTeam,
				strBadge: team.strBadge,
				strLeague: team.strLeague,
				strCountry: team.strCountry,
			});
			saveFavorites();
		}
		showFavorites();
		showFoundTeams();
		return;
	}

	const removeBtn = e.target.closest('[data-remove]');
	if (removeBtn) {
		favorites = favorites.filter((f) => f.idTeam !== removeBtn.dataset.remove);
		saveFavorites();
		showFavorites();
		if (foundTeams.length) showFoundTeams();
		return;
	}

	
	const card = e.target.closest('[data-open]');
	if (card) {
		selectedId = card.dataset.open;
		showFavorites();
		if (foundTeams.length) showFoundTeams();
		loadEvents(selectedId, card.dataset.name, true);
	}
});


const themeToggle = document.querySelector('#themeToggle');
const themeIcon = document.querySelector('#themeIcon');

function applyTheme(theme) {
	document.documentElement.setAttribute('data-bs-theme', theme);
	themeIcon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
}

applyTheme(localStorage.getItem('theme') || 'light');

themeToggle.addEventListener('click', () => {
	const next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
	applyTheme(next);
	localStorage.setItem('theme', next);
});


showFavorites();
loadFavoritesResults();